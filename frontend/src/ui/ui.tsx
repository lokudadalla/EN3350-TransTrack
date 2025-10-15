import React from "react";
import type { Status } from "../types/models";

export const ui = {
  bg: "#f6f8fb",
  card: "#fff",
  text: "#0f172a",
  sub: "#64748b",
  border: "#e6eaf2",
  primary: "#3f51b5",
  danger: "#dc2626",
  warnBg: "rgba(250,204,21,.20)",
  warn: "#ca8a04",
  okBg: "rgba(34,197,94,.12)",
  ok: "#16a34a",
  errBg: "rgba(244,63,94,.12)",
  err: "#f43f5e",
  shadow: "0 10px 30px rgba(31,41,55,.08)",
};

export function pill(status: Status): React.CSSProperties {
  if (status === "Completed")
    return { display: "inline-flex", padding: "6px 12px", borderRadius: 999, fontWeight: 800, background: ui.okBg, color: ui.ok };
  if (status === "In Progress")
    return { display: "inline-flex", padding: "6px 12px", borderRadius: 999, fontWeight: 800, background: ui.warnBg, color: ui.warn };
  return { display: "inline-flex", padding: "6px 12px", borderRadius: 999, fontWeight: 800, background: ui.errBg, color: ui.err };
}

const chipWrap: React.CSSProperties = {
  background: "#eef2ff",
  border: "1px solid #e0e7ff",
  borderRadius: 16,
  padding: "12px 16px",
  minWidth: 110,
  textAlign: "center",
  boxShadow: "0 6px 14px rgba(79,70,229,0.12)",
};

export function Chip({ title, value }: { title: string; value?: string }) {
  return (
    <div style={chipWrap}>
      <div style={{ fontWeight: 900, color: "#111827" }}>{value ?? "-"}</div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{title}</div>
    </div>
  );
}

export function iconBtn(disabled: boolean, danger?: boolean): React.CSSProperties {
  return {
    width: 30,
    height: 30,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    border: "1px solid #e0e7ff",
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 16,
    lineHeight: 1,
    boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
    opacity: disabled ? 0.5 : 1,
    color: danger ? "#dc2626" : "#4338ca",
  };
}

export const zoomBtnStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 10,
  border: `1px solid ${ui.border}`,
  background: disabled ? "#f8fafc" : "#fff",
  color: disabled ? "#94a3b8" : ui.text,
  fontWeight: 800,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  boxShadow: "0 6px 14px rgba(15,23,42,0.08)",
  transition: "transform .15s ease, box-shadow .15s ease",
});
