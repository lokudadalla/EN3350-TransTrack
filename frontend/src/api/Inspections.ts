import { getUser } from "../auth";
import type { ImageMeta } from "../types/models";


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