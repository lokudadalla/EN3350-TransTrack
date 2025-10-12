import type { DisplayAnomaly } from "../types/models";
import { isFiniteNumber } from "./ZoomableImage";

export function AnomalyLegend({ title, items }: { title: string; items: DisplayAnomaly[] }) {
  return (
    <div
      style={{
        background: "#111827",
        borderRadius: 12,
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 13, letterSpacing: 0.4 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => {
          const label = item.label?.trim() ? item.label : "Unlabeled anomaly";
          return (
            <div
              key={item.displayIndex}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                color: "#f1f5f9",
                fontWeight: 700,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "rgba(250,204,21,0.2)",
                    color: "#facc15",
                    fontWeight: 900,
                  }}
                >
                  {item.displayIndex}
                </span>
                <span>{label}</span>
              </div>
              {isFiniteNumber(item.score) && (
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                  Score: {Number(item.score).toFixed(2)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
