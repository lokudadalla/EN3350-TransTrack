import type { AnomalyMeta } from "../types/models";
import type { DisplayAnomaly } from "../types/models";

export function toNiceDateTime(d: string, t: string) {
  const dt = new Date(`${d}T${t}`);
  return dt.toLocaleString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function clampThreshold(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function toDisplayAnomalies(list?: AnomalyMeta[]): DisplayAnomaly[] {
  if (!Array.isArray(list)) return [];
  const sanitized: DisplayAnomaly[] = [];
  for (const item of list) {
    if (!item) continue;
    if (!Number.isFinite(item.width) || !Number.isFinite(item.height)) continue;
    if (item.width <= 0 || item.height <= 0) continue;
    if (!Number.isFinite(item.x) || !Number.isFinite(item.y)) continue;
    sanitized.push({ ...item, displayIndex: sanitized.length + 1 });
  }
  return sanitized;
}
