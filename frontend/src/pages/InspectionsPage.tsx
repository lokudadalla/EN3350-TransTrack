import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type Status = "Completed" | "In Progress" | "Pending";

interface Inspection {
  inspectionNo: string;
  inspectedDate: string;
  maintenanceDate?: string | "-";
  status: Status;
  favorite?: boolean;
}

interface TransformerMeta {
  id: string;
  poleNo: string;
  type: "Bulk" | "Distribution";
  region: string; 
  location: string;
  lastInspected: string;
}

const ui = {
  bg: "#f6f8fb",
  card: "#ffffff",
  text: "#0f172a",
  sub: "#64748b",
  border: "#e6eaf2",
  primary: "#3f51b5",
  danger: "#dc2626",
  shadow: "0 10px 30px rgba(31,41,55,.08)",
};

function pill(status: Status): React.CSSProperties {
  if (status === "Completed")
    return {
      display: "inline-flex",
      padding: "6px 12px",
      borderRadius: 999,
      fontWeight: 800,
      background: "rgba(34,197,94,.12)",
      color: "#16a34a",
    };
  if (status === "In Progress")
    return {
      display: "inline-flex",
      padding: "6px 12px",
      borderRadius: 999,
      fontWeight: 800,
      background: "rgba(250,204,21,.20)", 
      color: "#ca8a04",
    };
  return {
    display: "inline-flex",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 800,
    background: "rgba(244,63,94,.12)",
    color: "#f43f5e",
  };
}

const chip: React.CSSProperties = {
  background: "#eef2ff",
  border: "1px solid #e0e7ff",
  borderRadius: 16,
  padding: "14px 18px",
  minWidth: 140,
  textAlign: "center",
  boxShadow: "0 6px 14px rgba(79,70,229,0.12)",
};

const primaryBtn: React.CSSProperties = {
  background: ui.primary,
  color: "#fff",
  border: "1px solid transparent",
  padding: "12px 18px",
  borderRadius: 14,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(63,81,181,.25)",
};

const ghostDangerBtn: React.CSSProperties = {
  background: ui.danger,
  color: "#fff",
  border: 0,
  padding: "10px 16px",
  borderRadius: 12,
  fontWeight: 800,
  cursor: "pointer",
};

const actionIconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  display: "grid",
  placeItems: "center",
  background: "#fff",
  border: "1px solid #e0e7ff",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
};

/* ----------------- Dummy data ----------------- */
const DUMMY: Record<string, Inspection[]> = {
  "TX-1001": [
    { inspectionNo: "00012358", inspectedDate: "Mon(21), May, 2023 12:55pm", maintenanceDate: "-", status: "Completed", favorite: true },
    { inspectionNo: "00012359", inspectedDate: "Tue(22), May, 2023 01:55pm", maintenanceDate: "-", status: "In Progress" },
  ],
  "TX-1002": [
    { inspectionNo: "00012360", inspectedDate: "Wed(23), May, 2023 02:55pm", maintenanceDate: "-", status: "Pending" },
    { inspectionNo: "00012361", inspectedDate: "Thu(24), May, 2023 03:55pm", maintenanceDate: "-", status: "Completed" },
  ],
};

/* ----------------- Component ----------------- */
export default function InspectionsPage() {
  const navigate = useNavigate();
  const { transformerId } = useParams<{ transformerId: string }>();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [baselineUrl, setBaselineUrl] = useState<string | null>(null);

  // simple modal state
  const [openModal, setOpenModal] = useState(false);
  const [branch, setBranch] = useState("Nugegoda");
  const [dateStr, setDateStr] = useState("Mon(21), May, 2023");
  const [timeStr, setTimeStr] = useState("7.00am");

  // transformer's display meta
  const transformer: TransformerMeta = useMemo(
    () => ({
      id: transformerId ?? "TX-1001",
      poleNo: "EN-122-A",
      type: "Bulk",
      region: "Nugegoda",
      location: `"Keels", Embuldeniya`,
      lastInspected:
        (DUMMY[transformerId ?? "TX-1001"]?.[0]?.inspectedDate as string) ??
        "Mon(21), May, 2023 12:55pm",
    }),
    [transformerId]
  );

  // load dummy items
  useEffect(() => {
    setLoading(true);
    const list = DUMMY[transformer.id] ?? [];
    setTimeout(() => {
      setInspections(list);
      setLoading(false);
    }, 200);
  }, [transformer.id]);

  // baseline handlers
  function onPickBaseline(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    if (baselineUrl) URL.revokeObjectURL(baselineUrl);
    setBaselineUrl(url);
  }
  function viewBaseline() {
    if (baselineUrl) window.open(baselineUrl, "_blank");
  }
  function deleteBaseline() {
    if (baselineUrl) URL.revokeObjectURL(baselineUrl);
    setBaselineUrl(null);
  }

  // add inspection
  function addInspection(e: React.FormEvent) {
    e.preventDefault();
    const nextNo = String(
      (Number(inspections[inspections.length - 1]?.inspectionNo ?? "00012358") || 12358) + 1
    ).padStart(8, "0");

    const newItem: Inspection = {
      inspectionNo: nextNo,
      inspectedDate: `${dateStr} ${timeStr}`,
      maintenanceDate: "-",
      status: "Pending",
    };
    setInspections((prev) => [...prev, newItem]);
    setOpenModal(false);
  }

  function goDetail(row: Inspection) {
    navigate(`/transformers/${transformer.id}/inspections/${row.inspectionNo}`, {
      state: {
        inspection: row,
        transformer,
      },
    });
  }

  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/transformers");
  }

  return (
    <div style={{ background: ui.bg }}>
      {/* HEADER CARD */}
      <div
        style={{
          margin: "18px 28px 16px 28px",
          padding: 18,
          background: ui.card,
          border: `1px solid ${ui.border}`,
          borderRadius: 16,
          boxShadow: ui.shadow,
        }}
      >
        {/* Top line: Back + Transformer ID on the left, Last inspected + Baseline on the right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {/* Left cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <button
              aria-label="Back"
              onClick={goBack}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: ui.primary,
                color: "#fff",
                border: 0,
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 8px 18px rgba(63,81,181,.35)",
              }}
            >
              ←
            </button>
            <div style={{ minWidth: 0 }}>
              {/* Big transformer number */}
              <div style={{ fontSize: 26, fontWeight: 900, color: ui.text, lineHeight: 1.2 }}>
                {transformer.id}
              </div>
              {/* Region + location (small line) */}
              <div style={{ color: ui.sub, fontWeight: 700, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {transformer.region} <span style={{ marginLeft: 8 }}>📍 {transformer.location}</span>
              </div>
            </div>
          </div>

          {/* Right cluster */}
          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <div style={{ fontWeight: 800, color: ui.sub }}>
              <span style={{ color: ui.text }}>Last Inspected Date:</span> {transformer.lastInspected}
            </div>

            {/* Baseline pill (label left, icons right) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#eef2ff",
                border: "1px solid #e0e7ff",
                borderRadius: 14,
                padding: "10px 14px",
                height: 44,
                cursor: "pointer",
                minWidth: 260,
              }}
              onClick={() => document.getElementById("baseline-upload")?.click()}
            >
              <input
                id="baseline-upload"
                type="file"
                accept="image/*"
                onChange={onPickBaseline}
                style={{ display: "none" }}
              />

              {/* left: emoji + text */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 6,
                    background: "#e0e7ff",
                    fontSize: 16,
                  }}
                >
                  🖼️
                </span>
                <span style={{ fontWeight: 900, color: "#111827" }}>Baseline Image</span>
              </div>

              {/* spacer pushes icons to the right */}
              <div style={{ flex: 1 }} />

              {/* right: view + delete */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  title="View"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewBaseline();
                  }}
                  disabled={!baselineUrl}
                  style={{
                    ...actionIconBtn,
                    color: "#4338ca",
                    cursor: baselineUrl ? "pointer" : "not-allowed",
                    opacity: baselineUrl ? 1 : 0.5,
                  }}
                >
                  👁️
                </button>
                <button
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBaseline();
                  }}
                  disabled={!baselineUrl}
                  style={{
                    ...actionIconBtn,
                    color: ui.danger,
                    cursor: baselineUrl ? "pointer" : "not-allowed",
                    opacity: baselineUrl ? 1 : 0.5,
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chips row */}
        <div style={{ display: "flex", gap: 14, marginTop: 16, alignItems: "stretch", flexWrap: "wrap" }}>
          <Chip title="Pole No" value={transformer.poleNo} />
          <Chip title="Type" value={transformer.type} />
        </div>

        {/* Right-aligned add button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button style={primaryBtn} onClick={() => setOpenModal(true)}>
            Add Inspection
          </button>
        </div>
      </div>

      {/* TABLE CARD */}
      <div
        style={{
          margin: "0 28px 24px 28px",
          background: ui.card,
          border: `1px solid ${ui.border}`,
          borderRadius: 16,
          boxShadow: ui.shadow,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 900, padding: "16px 18px", borderBottom: `1px solid ${ui.border}` }}>
          Transformer Inspections
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7fafc", textAlign: "left" }}>
              <th style={{ width: 48 }}></th>
              <th style={{ padding: "12px 18px" }}>Inspection No</th>
              <th style={{ padding: "12px 18px" }}>Inspected Date</th>
              <th style={{ padding: "12px 18px" }}>Maintenance Date</th>
              <th style={{ padding: "12px 18px" }}>Status</th>
              <th style={{ padding: "12px 18px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: "16px 18px" }}>
                  Loading…
                </td>
              </tr>
            ) : inspections.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "16px 18px", color: ui.sub }}>
                  No inspections yet.
                </td>
              </tr>
            ) : (
              inspections.map((row) => (
                <tr key={row.inspectionNo} style={{ borderTop: `1px solid ${ui.border}` }}>
                  <td style={{ textAlign: "center" }}>
                    <button
                      aria-label="favorite"
                      title={row.favorite ? "Unfavorite" : "Favorite"}
                      onClick={() =>
                        setInspections((prev) =>
                          prev.map((r) =>
                            r.inspectionNo === row.inspectionNo ? { ...r, favorite: !r.favorite } : r
                          )
                        )
                      }
                      style={{
                        background: "transparent",
                        border: 0,
                        fontSize: 18,
                        cursor: "pointer",
                        color: row.favorite ? ui.primary : "#94a3b8",
                      }}
                    >
                      {row.favorite ? "★" : "☆"}
                    </button>
                  </td>
                  <td style={{ padding: "16px 18px", fontWeight: 900 }}>{row.inspectionNo}</td>
                  <td style={{ padding: "16px 18px" }}>{row.inspectedDate}</td>
                  <td style={{ padding: "16px 18px", color: "#94a3b8" }}>{row.maintenanceDate ?? "-"}</td>
                  <td style={{ padding: "16px 18px" }}>
                    <span style={pill(row.status)}>{row.status}</span>
                  </td>
                  <td style={{ padding: "12px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                      <button
                        onClick={() => goDetail(row)}
                        style={{
                          background: "#3f51b5",
                          color: "#fff",
                          border: 0,
                          padding: "8px 16px",
                          borderRadius: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 6px 18px rgba(63,81,181,.25)",
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() =>
                          setInspections((prev) => prev.filter((r) => r.inspectionNo !== row.inspectionNo))
                        }
                        style={ghostDangerBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {openModal && (
        <div
          role="dialog"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
          }}
          onClick={() => setOpenModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(720px, 92vw)",
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: ui.shadow,
              border: `1px solid ${ui.border}`,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>New Inspection</div>
            <form onSubmit={addInspection} style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>Branch</label>
                <input
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${ui.border}`,
                  }}
                  placeholder="Branch"
                />
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
                  Transformer No
                </label>
                <input
                  value={transformer.id}
                  readOnly
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${ui.border}`,
                    background: "#f8fafc",
                    color: "#334155",
                    fontWeight: 800,
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
                    Date of Inspection
                  </label>
                  <input
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    placeholder="Mon(21), May, 2023"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${ui.border}`,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>Time</label>
                  <input
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
                    placeholder="7.00am"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${ui.border}`,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                <button type="submit" style={{ ...primaryBtn, boxShadow: "0 12px 28px rgba(63,81,181,.3)" }}>
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setOpenModal(false)}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 14,
                    border: `1px solid ${ui.border}`,
                    background: "#fff",
                    fontWeight: 800,
                    color: "#334155",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/*  little chip component */
function Chip({ title, value }: { title: string; value: string }) {
  return (
    <div style={chip}>
      <div style={{ fontWeight: 900, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{title}</div>
    </div>
  );
}







