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
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [inspectorFilter, setInspectorFilter] = useState<string>("");
  const [dateFromFilter, setDateFromFilter] = useState<string>("");
  const [dateToFilter, setDateToFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "status">("newest");

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

  // Get unique inspectors for filter dropdown
  const uniqueInspectors = useMemo(() => {
    const inspectors = records
      .map(r => r.inspectorName)
      .filter((name): name is string => !!name);
    return Array.from(new Set(inspectors));
  }, [records]);

  // Apply filters and sorting
  const filtered = useMemo(() => {
    let result = records.slice();

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter(r => r.status === statusFilter);
    }

    // Inspector filter
    if (inspectorFilter) {
      result = result.filter(r => 
        r.inspectorName?.toLowerCase().includes(inspectorFilter.toLowerCase())
      );
    }

    // Date range filter
    if (dateFromFilter) {
      const from = new Date(dateFromFilter).getTime();
      result = result.filter(r => {
        const recordDate = r.recordDate ? new Date(r.recordDate).getTime() : 0;
        return recordDate >= from;
      });
    }
    if (dateToFilter) {
      const to = new Date(dateToFilter).getTime();
      result = result.filter(r => {
        const recordDate = r.recordDate ? new Date(r.recordDate).getTime() : 0;
        return recordDate <= to;
      });
    }

    // Sorting
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime());
    } else if (sortBy === "status") {
      const statusOrder = { "URGENT_ATTENTION": 0, "NEEDS_MAINTENANCE": 1, "OK": 2 };
      result.sort((a, b) => {
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
        return aOrder - bOrder;
      });
    }

    return result;
  }, [records, statusFilter, inspectorFilter, dateFromFilter, dateToFilter, sortBy]);

  const hasActiveFilters = statusFilter !== "ALL" || inspectorFilter || dateFromFilter || dateToFilter;
  
  const clearFilters = () => {
    setStatusFilter("ALL");
    setInspectorFilter("");
    setDateFromFilter("");
    setDateToFilter("");
  };

  return (
    <div className="vstack" style={{ gap: 14 }}>
      <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Maintenance History</div>
          <div style={{ color: ui.sub, fontWeight: 700 }}>
            Transformer {transformerId ?? "-"} · {filtered.length} of {records.length} record(s)
          </div>
        </div>
        <div className="hstack" style={{ gap: 8 }}>
          <button className="btn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div style={{
        border: `1px solid ${ui.border}`,
        borderRadius: 14,
        padding: 16,
        background: ui.card,
        boxShadow: ui.shadow,
        display: "grid",
        gap: 12,
      }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>
          🔍 Filter & Sort
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {/* Status Filter */}
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: ui.sub }}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${ui.border}`,
                fontWeight: 700,
                background: "white",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OK">OK</option>
              <option value="NEEDS_MAINTENANCE">Needs Maintenance</option>
              <option value="URGENT_ATTENTION">Urgent Attention</option>
            </select>
          </div>

          {/* Inspector Filter */}
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: ui.sub }}>Inspector</label>
            <input
              type="text"
              placeholder="Search by inspector..."
              value={inspectorFilter}
              onChange={(e) => setInspectorFilter(e.target.value)}
              list="inspectors-list"
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${ui.border}`,
                fontWeight: 700,
              }}
            />
            <datalist id="inspectors-list">
              {uniqueInspectors.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {/* Date From */}
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: ui.sub }}>Date From</label>
            <input
              type="date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${ui.border}`,
                fontWeight: 700,
              }}
            />
          </div>

          {/* Date To */}
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: ui.sub }}>Date To</label>
            <input
              type="date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${ui.border}`,
                fontWeight: 700,
              }}
            />
          </div>

          {/* Sort By */}
          <div style={{ display: "grid", gap: 4 }}>
            <label style={{ fontWeight: 700, fontSize: 13, color: ui.sub }}>Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1px solid ${ui.border}`,
                fontWeight: 700,
                background: "white",
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="status">By Status (Urgent → OK)</option>
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <div className="hstack" style={{ gap: 8 }}>
            <button
              onClick={clearFilters}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${ui.border}`,
                background: "#fee2e2",
                color: "#991b1b",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ Clear Filters
            </button>
            <span style={{ color: ui.sub, fontWeight: 700 }}>
              Showing {filtered.length} of {records.length} records
            </span>
          </div>
        )}
      </div>

      {error && <div style={{ color: ui.danger, fontWeight: 800 }}>{error}</div>}

      {loading ? (
        <div>Loading history…</div>
      ) : records.length === 0 ? (
        <div style={{ color: ui.sub, fontWeight: 700 }}>No maintenance records found for this transformer.</div>
      ) : filtered.length === 0 ? (
        <div style={{ 
          padding: 24, 
          textAlign: "center",
          border: `1px dashed ${ui.border}`,
          borderRadius: 14,
          color: ui.sub,
          fontWeight: 700 
        }}>
          No records match your filters. Try adjusting your search criteria.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {filtered.map((rec) => {
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
