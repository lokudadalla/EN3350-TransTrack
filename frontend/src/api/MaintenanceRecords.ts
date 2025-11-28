import type { MaintenanceRecord, MaintenanceStatus } from "../types/models";
import { api, authHeaders } from "./Inspections";

export type MaintenanceRecordUpdate = {
  inspectorName?: string;
  status?: MaintenanceStatus;
  voltage?: string;
  current?: string;
  recommendedAction?: string;
  remarks?: string;
  recordDate?: string; // ISO date
  finalizeRecord?: boolean;
};

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(api(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function getMaintenanceRecord(inspectionId: number): Promise<MaintenanceRecord | null> {
  try {
    return await http<MaintenanceRecord>(`/inspections/${inspectionId}/maintenance-record`);
  } catch {
    return null;
  }
}

export async function createMaintenanceRecord(inspectionId: number): Promise<MaintenanceRecord> {
  return http<MaintenanceRecord>(`/inspections/${inspectionId}/maintenance-record`, {
    method: "POST",
  });
}

export async function updateMaintenanceRecord(recordId: number, body: MaintenanceRecordUpdate): Promise<MaintenanceRecord> {
  return http<MaintenanceRecord>(`/maintenance-records/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function listMaintenanceHistory(transformerNo: string): Promise<MaintenanceRecord[]> {
  return http<MaintenanceRecord[]>(`/transformers/${encodeURIComponent(transformerNo)}/maintenance-records`);
}
