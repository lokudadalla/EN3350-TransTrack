import React from "react";
import type { DisplayAnomaly } from "../types/models";
import { isFiniteNumber } from "./ZoomableImage";

type Props = {
  title: string;
  items: DisplayAnomaly[];
  /** Optional: render a right-side action per row (e.g., a save button) */
  rightRenderer?: (item: DisplayAnomaly, index: number) => React.ReactNode;
};

export function AnomalyLegend({ title, items, rightRenderer }: Props) {
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
      <div style={{ color: "#e2e8f0", fontWeight: 800, fontSize: 13, letterSpacing: 0.4 }}>
        {title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => {
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
              {/* left: index + label */}
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

              {/* right: score + optional action */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {isFiniteNumber(item.score) && (
                  <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                    Score: {Number(item.score).toFixed(2)}
                  </span>
                )}
                {rightRenderer ? rightRenderer(item, i) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
