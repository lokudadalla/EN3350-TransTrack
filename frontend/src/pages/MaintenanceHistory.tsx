import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listMaintenanceHistory } from "../api/MaintenanceRecords";
import { api, authHeaders } from "../api/Inspections";
import type { MaintenanceRecord } from "../types/models";
import { ui } from "../ui/ui";

function niceDateTime(v?: string | null) {
  return v ? new Date(v).toLocaleString() : "-";
}

export default function MaintenanceHistoryPage() {
  const { transformerId } = useParams<{ transformerId: string }>();
  const navigate = useNavigate();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!transformerId) return;
      setLoading(true);
      setError(null);
      try {
        const hist = await listMaintenanceHistory(transformerId);
        if (!cancelled) setRecords(hist);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transformerId]);

  useEffect(() => {
    let cancelled = false;
    const toRevoke: string[] = [];

    async function loadImages() {
      for (const rec of records) {
        if (!rec.maintenanceImageId || !rec.maintenanceImageUrl) continue;
        if (imageUrls[rec.id]) continue; // already loaded
        try {
          const endpoint = rec.maintenanceImageUrl.startsWith("http")
            ? rec.maintenanceImageUrl
            : api(rec.maintenanceImageUrl);
          const res = await fetch(endpoint, { headers: authHeaders() });
          if (!res.ok) continue;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          toRevoke.push(url);
          if (!cancelled) {
            setImageUrls((prev) => ({ ...prev, [rec.id]: url }));
          }
        } catch {
          /* ignore image load failures */
        }
      }
    }

    loadImages();
    return () => {
      cancelled = true;
      toRevoke.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [records, imageUrls]);

  const sorted = useMemo(
    () => records.slice().sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [records]
  );

  return (
    <div className="vstack" style={{ gap: 14 }}>
      <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Maintenance History</div>
          <div style={{ color: ui.sub, fontWeight: 700 }}>
            Transformer {transformerId ?? "-"} · {sorted.length} record(s)
          </div>
        </div>
        <div className="hstack" style={{ gap: 8 }}>
          <button className="btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>

      {error && <div style={{ color: ui.danger, fontWeight: 800 }}>{error}</div>}

      {loading ? (
        <div>Loading history…</div>
      ) : sorted.length === 0 ? (
        <div style={{ color: ui.sub, fontWeight: 700 }}>No maintenance records found for this transformer.</div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {sorted.map((rec) => {
            const anomalyCount = rec.anomalies?.length ?? 0;
            return (
              <div
                key={rec.id}
                style={{
                  border: `1px solid ${ui.border}`,
                  borderRadius: 14,
                  padding: 14,
                  background: ui.card,
                  boxShadow: ui.shadow,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>Inspection #{rec.inspectionNo}</div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontWeight: 800,
                      background:
                        rec.status === "OK"
                          ? "#dcfce7"
                          : rec.status === "URGENT_ATTENTION"
                          ? "#fee2e2"
                          : "#fef9c3",
                      color:
                        rec.status === "OK"
                          ? "#166534"
                          : rec.status === "URGENT_ATTENTION"
                          ? "#991b1b"
                          : "#92400e",
                      border: `1px solid ${ui.border}`,
                    }}
                  >
                    {rec.status?.replace("_", " ")}
                  </span>
                </div>

                <div style={{ color: ui.sub, fontWeight: 700 }}>
                  Inspection date: <strong>{rec.inspectionDate ?? "-"}</strong> {rec.inspectionTime ?? ""}
                </div>
                <div style={{ color: ui.sub, fontWeight: 700 }}>
                  Record date: <strong>{rec.recordDate ?? "-"}</strong>
                </div>
                <div style={{ color: ui.sub, fontWeight: 700 }}>
                  Created: <strong>{niceDateTime(rec.createdAt)}</strong>
                </div>
                <div style={{ color: ui.sub, fontWeight: 700 }}>
                  Finalized: <strong>{niceDateTime(rec.finalizedAt)}</strong>
                </div>
                <div style={{ color: ui.sub, fontWeight: 700 }}>
                  Inspector: <strong>{rec.inspectorName || "—"}</strong>
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>Electrical readings</div>
                  <div style={{ color: ui.sub, fontWeight: 700 }}>
                    Voltage: <strong>{rec.electricalReadings?.voltage ?? "—"}</strong>
                  </div>
                  <div style={{ color: ui.sub, fontWeight: 700 }}>
                    Current: <strong>{rec.electricalReadings?.current ?? "—"}</strong>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>Recommended action</div>
                  <div style={{ color: ui.sub, fontWeight: 700 }}>{rec.recommendedAction || "—"}</div>
                </div>

                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>Remarks</div>
                  <div style={{ color: ui.sub, fontWeight: 700 }}>{rec.remarks || "—"}</div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>
                    Anomalies ({anomalyCount})
                  </div>
                  {anomalyCount === 0 ? (
                    <div style={{ color: ui.sub, fontWeight: 700 }}>None</div>
                  ) : (
                    <div style={{ display: "grid", gap: 6 }}>
                      {rec.anomalies?.map((a, idx) => (
                        <div
                          key={`${a.id ?? idx}-${a.x}-${a.y}`}
                          style={{
                            border: `1px solid ${ui.border}`,
                            borderRadius: 10,
                            padding: "6px 8px",
                            background: "#f8fafc",
                          }}
                        >
                          <div style={{ fontWeight: 800, color: "#0f172a" }}>
                            {a.label || "Unlabeled"} (#{idx + 1})
                          </div>
                          <div style={{ color: ui.sub, fontWeight: 700 }}>
                            Box: x:{a.x}, y:{a.y}, w:{a.width}, h:{a.height}
                          </div>
                          {a.comment && (
                            <div style={{ color: ui.sub, fontWeight: 700 }}>Note: {a.comment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hstack" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    onClick={() => navigate(`/transformers/${rec.transformerNo}/inspections/${rec.inspectionNo}`)}
                  >
                    Open inspection
                  </button>
                  {rec.maintenanceImageId && (
                    imageUrls[rec.id] ? (
                      <img
                        src={imageUrls[rec.id]}
                        alt="Maintenance"
                        style={{
                          width: "100%",
                          borderRadius: 12,
                          border: `1px solid ${ui.border}`,
                          maxHeight: 220,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div style={{ color: ui.sub, fontWeight: 700 }}>Loading image…</div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
