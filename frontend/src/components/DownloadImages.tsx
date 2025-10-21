import React from "react";
import type { ImageMeta, AnomalyMeta } from "../types/models";
import { toDisplayAnomalies } from "../utils/utils";
import {zoomBtnStyle } from "../ui/ui";

/* ------------ types ------------ */
type Props = {
  maintMeta: ImageMeta | null;
  transformerNo: string;
  inspectionId: string | number;
  className?: string;
  style?: React.CSSProperties;
  buttonClassName?: string;
};

/* ------------ local helpers (copied/adapted from InspectionDetail) ------------ */
function sameBox(a: AnomalyMeta, b: AnomalyMeta, tol = 2): boolean {
  if (typeof a.id === "number" && typeof b.id === "number" && a.id === b.id) return true;
  const close = (p: number, q: number) => Math.abs(p - q) <= tol;
  const labelSame = (a.label ?? "").trim().toLowerCase() === (b.label ?? "").trim().toLowerCase();
  return close(a.x, b.x) && close(a.y, b.y) && close(a.width, b.width) && close(a.height, b.height) && labelSame;
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildFeedbackLog(
  maintMeta: ImageMeta | null,
  transformerNo: string,
  inspectionId: string | number
) {
  if (!maintMeta) return null;

  // AI + USER anomalies (same logic as mergedLogs)
  const ai = toDisplayAnomalies(maintMeta.aiAnomalies ?? []);
  const user = toDisplayAnomalies(maintMeta.anomalies ?? []);
  const userOnly = user.filter(u => !ai.some(aiBox => sameBox(aiBox, u)));
  const file_name = maintMeta.fileName;

  return {
    imageId: `${file_name}`,
    transformerId: transformerNo,
    inspectionId: String(inspectionId),
    modelPredictedAnomalies: ai,
    finalAcceptedAnnotations: userOnly,
    annotatorMetadata: {
      uploadedAt: maintMeta.uploadedAt,
      uploadedBy: maintMeta.uploader ?? null,
      lastEdited:
        maintMeta.anomalies?.map(a => ({
          id: a.id,
          lastEditedBy: a.lastEditedBy,
          lastEditedAt: a.lastEditedAt,
          origin: a.origin,
          comment: a.comment,
        })) ?? [],
    },
  };
}

/** simple CSV escaping: wrap in quotes, double-escape inner quotes */
function q(v: unknown) {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/* ------------ component ------------ */
export default function DownloadImage({
  maintMeta,
  transformerNo,
  inspectionId,
  className,
  style,
  buttonClassName,
}: Props) {
  const disabled = !maintMeta;

  const downloadJSON = () => {
    const log = buildFeedbackLog(maintMeta, transformerNo, inspectionId);
    if (!log) return;
    downloadBlob(
      JSON.stringify(log, null, 2),
      "application/json;charset=utf-8",
      `logs_${log.transformerId}_${log.inspectionId}.json`
    );
  };

  const downloadCSV = () => {
    const log = buildFeedbackLog(maintMeta, transformerNo, inspectionId);
    if (!log) return;

    const rows: Record<string, unknown>[] = [];

    (log.modelPredictedAnomalies ?? []).forEach(a =>
      rows.push({
        imageId: log.imageId,
        transformerId: log.transformerId,
        inspectionId: log.inspectionId,
        source: "AI GENERATED",
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        label: a.label ?? "",
        score: a.score ?? "",
        comment: a.comment ?? "",
        editedBy: a.lastEditedBy ?? "",
        editedAt: a.lastEditedAt ?? "",
      })
    );

    (log.finalAcceptedAnnotations ?? []).forEach(a =>
      rows.push({
        imageId: log.imageId,
        transformerId: log.transformerId,
        inspectionId: log.inspectionId,
        source: a.origin,
        id: a.id ?? "",
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        label: a.label ?? "",
        score: a.score ?? "",
        comment: a.comment ?? "",
        editedBy: a.lastEditedBy ?? "",
        editedAt: a.lastEditedAt ?? "",
      })
    );

    if (rows.length === 0) return;

    const header = Object.keys(rows[0]);
    const csv = [
      header.map(q).join(","), // header line
      ...rows.map(r => header.map(h => q(r[h])).join(",")),
    ].join("\n");

    downloadBlob(csv, "text/csv;charset=utf-8", `logs_${log.transformerId}_${log.inspectionId}.csv`);
  };

  return (
    <div className={className} style={style}>
      <button onClick={downloadJSON} disabled={disabled} aria-disabled={disabled} className={buttonClassName} style={zoomBtnStyle(false)}>
        Download JSON
      </button>
      <button onClick={downloadCSV} disabled={disabled} aria-disabled={disabled} className={buttonClassName} style={zoomBtnStyle(false)}>
        Download CSV
      </button>
    </div>
  );
}

/* ------------ optional named exports if you want to call programmatically ------------ */
export function downloadInspectionJSON(maintMeta: ImageMeta | null, transformerNo: string, inspectionId: string | number) {
  const log = buildFeedbackLog(maintMeta, transformerNo, inspectionId);
  if (!log) return;
  downloadBlob(JSON.stringify(log, null, 2), "application/json;charset=utf-8", `logs_${log.transformerId}_${log.inspectionId}.json`);
}
export function downloadInspectionCSV(maintMeta: ImageMeta | null, transformerNo: string, inspectionId: string | number) {
  const log = buildFeedbackLog(maintMeta, transformerNo, inspectionId);
  if (!log) return;

  const rows: Record<string, unknown>[] = [];
  (log.modelPredictedAnomalies ?? []).forEach(a =>
    rows.push({ imageId: log.imageId, transformerId: log.transformerId, inspectionId: log.inspectionId, source: "AI GENERATED", x: a.x, y: a.y, width: a.width, height: a.height, label: a.label ?? "", score: a.score ?? "", comment: a.comment ?? "", editedBy: a.lastEditedBy ?? "", editedAt: a.lastEditedAt ?? "" })
  );
  (log.finalAcceptedAnnotations ?? []).forEach(a =>
    rows.push({ imageId: log.imageId, transformerId: log.transformerId, inspectionId: log.inspectionId, source: a.origin, id: a.id ?? "", x: a.x, y: a.y, width: a.width, height: a.height, label: a.label ?? "", score: a.score ?? "", comment: a.comment ?? "", editedBy: a.lastEditedBy ?? "", editedAt: a.lastEditedAt ?? "" })
  );

  if (rows.length === 0) return;
  const header = Object.keys(rows[0]);
  const csv = [header.map(q).join(","), ...rows.map(r => header.map(h => q(r[h])).join(","))].join("\n");
  downloadBlob(csv, "text/csv;charset=utf-8", `logs_${log.transformerId}_${log.inspectionId}.csv`);
}
