import { getUser } from "../auth";
import type { ImageMeta, ImageType, Condition, AnomalyMeta } from "../types/models";


export type InspectionDTO = {
    inspectionNo: number;          // backend id
    transformerNo: string;
    branch: string;
    status: string;                // "Pending" | "In Progress" | "Completed"
    inspectionDate: string;        // "YYYY-MM-DD"
    inspectionTime: string;        // "HH:mm:ss"
    createdAt: string;             // ISO
  };
  
const BASE = import.meta.env.VITE_API_BASE ?? ""; 
  
async function http<T>(path: string, init?: RequestInit): Promise<T> {
    const u = getUser();
    const res = await fetch(`${BASE}${path}`, {
      headers: {
      "Content-Type": "application/json",
      "X-User-Id": u?.id ? String(u.id) : "",   // <— key line
      ...(init?.headers || {}),
    },
      ...init,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }
  
export const InspectionsAPI = {
    listAll(): Promise<InspectionDTO[]> {
      return http<InspectionDTO[]>("/inspections");
    },
    getById(id: number): Promise<InspectionDTO> {
      return http<InspectionDTO>(`/inspections/${id}`);
    },
    create(payload: Omit<InspectionDTO, "inspectionNo" | "createdAt">) {
      return http<InspectionDTO>("/inspections", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  };




export function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  const u = getUser();
  if (u && typeof u.id === "number" && Number.isFinite(u.id)) {
    h["X-User-Id"] = String(u.id);
  }
  return h; // always a simple object of string->string
}

export const api = (p: string) => `${BASE}${p}`;

// replaces the old fetchImageMeta (works with your backend)
async function fetchImageMeta(ownerInspectionId: number, imageId: number): Promise<ImageMeta | null> {
  try {
    const res = await fetch(api(`/inspections/${ownerInspectionId}/images?type=MAINTENANCE`), {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const arr: ImageMeta[] = await res.json();
    return arr.find(i => i.id === imageId) ?? null;
  } catch {
    return null;
  }
}

export async function maintenanceForThisInspection(numericInspectionId: number): Promise<ImageMeta | null> {
      const r = await fetch(api(`/inspections/${numericInspectionId}/images?type=MAINTENANCE`), {
          headers: { ...authHeaders() }, 
        });
      if (!r.ok) return null;
      const arr: ImageMeta[] = await r.json();
      if (!arr?.length) return null;
      return arr.slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    }


export async function pollUntilAnomalies(opts: {
  ownerInspectionId: number;
  imageId: number;
  setMeta: (m: ImageMeta | null) => void;
  timeoutMs?: number;
  intervalMs?: number;
}) {
  const { ownerInspectionId, imageId, setMeta, timeoutMs = 30000, intervalMs = 1200 } = opts;
  const start = Date.now();
  // simple polling loop until anomalies appear or timeout
  // we also update meta on each tick so scores/labels/UI can refresh progressively
  // (in case backend fills fields in stages)
  while (Date.now() - start < timeoutMs) {
    const meta = await fetchImageMeta(ownerInspectionId, imageId);
    if (meta) {
      setMeta(meta);
      if (Array.isArray(meta.anomalies) && meta.anomalies.length > 0) return;
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

export async function resolveImageUrl(ownerInspectionId: number, meta: ImageMeta, setUrl: (u: string) => void) {
  try {
    const endpoint = meta.url
      ? (meta.url.startsWith("http") ? meta.url : `${BASE}${meta.url}`)
      : api(`/inspections/${ownerInspectionId}/images/${meta.id}/file`);

    const res = await fetch(endpoint, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch image");
    const blob = await res.blob();
    setUrl(URL.createObjectURL(blob));
  } catch {}
}


// NEW: list all inspections for this transformer
 export async function getInspectionIdsForTransformer(transformerNo?: string): Promise<number[]> {
    if (!transformerNo) return [];
    try {
      const res = await fetch(api(`/inspections/by-no?no=${encodeURIComponent(transformerNo)}`), {
        headers: { ...authHeaders() },
      });
      if (!res.ok) return [];
      const list: InspectionDTO[] = await res.json();
      // sort newest first just in case (not strictly required)
      list.sort((a, b) => {
        const at = new Date(`${a.inspectionDate}T${a.inspectionTime}`).getTime() || new Date(a.createdAt).getTime();
        const bt = new Date(`${b.inspectionDate}T${b.inspectionTime}`).getTime() || new Date(b.createdAt).getTime();
        return bt - at;
      });
      return list.map(x => x.inspectionNo);
    } catch {
      return [];
    }
  }


  // NEW: post the file to a specific inspection (no progress UI; used for “other” inspections)
  export async function uploadImageToInspection(opts: {
      inspectionId: number;
      type: ImageType;
      file: File | Blob;
      condition: Condition;
      uploader?: string;
    }) {
      const { inspectionId, type, file, condition, uploader = "web" } = opts;
      const url = new URL(api(`/inspections/${inspectionId}/images`));
      url.searchParams.set("type", type);
      url.searchParams.set("uploader", uploader);
      url.searchParams.set("condition", condition);
  
      const fd = new FormData();
      // IMPORTANT: if `file` is a Blob copy, give it a filename so backend saves correctly.
      const named = file instanceof File ? file : new File([file], `baseline${inspectionId}.jpg`, { type: "image/jpeg" });
      fd.append("files", named);
  
      await fetch(url.toString(), {
        method: "POST",
        headers: { ...authHeaders() }, // X-User-Id
        body: fd,
      }).catch(() => { /* swallow – we don’t want to break the primary upload UX */ });
    }




export async function saveImageAnomalies(args: {
  ownerInspectionId: number;
  imageId: number;
  anomalies: AnomalyMeta[];
}) {
  const { ownerInspectionId, imageId, anomalies } = args;
  console.log(`Saving anomalies:${JSON.stringify(anomalies)} and imageId:${imageId} and ownerInspectionId:${ownerInspectionId}`);

  const res = await fetch(
    api(`/inspections/${ownerInspectionId}/images/${imageId}/anomalies`),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(anomalies),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to save anomalies (${res.status}). ${text}`);
  }

  try {
    return (await res.json()) as ImageMeta; // if backend returns updated meta
  } catch {
    return null as unknown as ImageMeta;
  }
}



/**
 * Delete a single anomaly.
 * - If anomalyId provided: call DELETE /.../anomalies/:anomalyId
 * - Else: fall back to PUT the remaining anomalies array (nextAnomalies)
 */
export async function deleteImageAnomaly(
  args:
    | { ownerInspectionId: number; imageId: number; anomalyId: number }
    | { ownerInspectionId: number; imageId: number; nextAnomalies: AnomalyMeta[] }
) {
  if ("anomalyId" in args) {
    const { ownerInspectionId, imageId, anomalyId } = args;
    console.log(`Deleting anomalyId:${anomalyId} for imageId:${imageId} and ownerInspectionId:${ownerInspectionId}`);
    const res = await fetch(
      api(`/inspections/${ownerInspectionId}/images/${imageId}/anomalies/${anomalyId}`),
      { method: "DELETE", headers: { ...authHeaders() } }
    );
    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => "");
      throw new Error(`Failed to delete anomaly (${res.status}). ${text}`);
    }
    // Some backends return updated ImageMeta; try JSON, else return null.
    try { return (await res.json()) as ImageMeta; } catch { return null as unknown as ImageMeta; }
  } else {
    const { ownerInspectionId, imageId, nextAnomalies } = args;
    return await saveImageAnomalies({ ownerInspectionId, imageId, anomalies: nextAnomalies });
  }
}


// POST one anomaly (if your backend supports it); else we'll fall back to PUT-all
export async function createImageAnomaly(args: {
  ownerInspectionId: number;
  imageId: number;
  anomaly: AnomalyMeta;
}) {
  const { ownerInspectionId, imageId, anomaly } = args;
  console.log(`Creating anomaly:${JSON.stringify(anomaly)} for imageId:${imageId} and ownerInspectionId:${ownerInspectionId}`);
  const res = await fetch(
    api(`/inspections/${ownerInspectionId}/images/${imageId}/anomalies`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(anomaly),
    }
  );
  if (!res.ok) throw new Error(`Failed to create anomaly (${res.status})`);
  try { return (await res.json()) as ImageMeta; } catch { return null as unknown as ImageMeta; }
}
