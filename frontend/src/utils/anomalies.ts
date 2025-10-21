import { getUser } from "../auth";
import type { AnomalyMeta } from "../types/models";

export const CANON_LABELS = [
  "Loose Joint (Faulty)",
  "Loose Joint (Potential)",
  "Point Overload (Faulty)",
  "Point Overload (Potential)",
  "Full Wire Overload",
] as const;

export type CanonLabel = typeof CANON_LABELS[number];

export function normalizeLabel(input?: string | null): CanonLabel | "" {
  if (!input) return "";
  const s = input.trim().toLowerCase();

  for (const c of CANON_LABELS) if (c.toLowerCase() === s) return c;

  if (s === "loose joint faulty") return "Loose Joint (Faulty)";
  if (s === "loose joint potential") return "Loose Joint (Potential)";
  if (s === "point overload faulty") return "Point Overload (Faulty)";
  if (s === "point overload potential") return "Point Overload (Potential)";
  if (s === "full wire overload") return "Full Wire Overload";

  const key = s.replace(/[^a-z0-9]/g, "");
  const table: Record<string, CanonLabel> = {
    loosejointfaulty: "Loose Joint (Faulty)",
    loosejointpotential: "Loose Joint (Potential)",
    pointoverloadfaulty: "Point Overload (Faulty)",
    pointoverloadpotential: "Point Overload (Potential)",
    fullwireoverload: "Full Wire Overload",
  };
  return table[key] ?? "";
}

export function sameBox(a: AnomalyMeta, b: AnomalyMeta, tol = 2): boolean {
  if (typeof a.id === "number" && typeof b.id === "number" && a.id === b.id) return true;
  const close = (p: number, q: number) => Math.abs(p - q) <= tol;
  const labelSame =
    (a.label ?? "").trim().toLowerCase() === (b.label ?? "").trim().toLowerCase();
  return close(a.x, b.x) && close(a.y, b.y) && close(a.width, b.width) && close(a.height, b.height) && labelSame;
}

// keeps current behavior (uses getUser)
export function editorName(a?: AnomalyMeta): string {
  if (!a) return "-";
  if (a.origin === "AI_GENERATED" || a.lastEditedBy == null) return "AI Generated";
  const me = getUser();
  if (me && a.lastEditedBy === me.id && me.username) return me.username;
  return `User #${a.lastEditedBy}`;
}
