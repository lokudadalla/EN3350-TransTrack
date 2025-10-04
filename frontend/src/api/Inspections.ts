import { getUser } from "../auth";

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