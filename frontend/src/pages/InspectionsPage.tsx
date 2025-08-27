import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTransformerByNo } from "../api/transformers";
import { REGIONS_SL } from "../constants/regions";

// Types
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

// UI tokens ---
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

//  Inspections backend client
type InspectionDTO = {
  inspectionNo: number;
  transformerNo: string;
  branch: string;
  status: string;
  inspectionDate: string;
  inspectionTime: string;
  createdAt: string;
  maintenanceDate?: string;
};

type ImageType = "BASELINE" | "MAINTENANCE";
type Condition = "SUNNY" | "CLOUDY" | "RAINY";
type ImageMeta = {
  id: number;
  type: ImageType;
  fileName: string;
  contentType: string;
  size?: number;
  uploadedAt: string;
  url?: string;
  uploader?: string;
  condition?: Condition;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const api = (p: string) => `${API_BASE}${p}`;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

const InspectionsAPI = {
  listAll(): Promise<InspectionDTO[]> {
    return http<InspectionDTO[]>("/inspections");
  },
  listByTransformerNo(no: string) {
    return http<InspectionDTO[]>(`/inspections/by-no?no=${encodeURIComponent(no)}`);
  },
  create(payload: Omit<InspectionDTO, "inspectionNo" | "createdAt">) {
    return http<InspectionDTO>("/inspections", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  getById(id: number) {
    return http<InspectionDTO>(`/inspections/${id}`);
  },
  update(id: number, payload: InspectionDTO) {
    return http<InspectionDTO>(`/inspections/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  remove(id: number) {
    return http<void>(`/inspections/${id}`, { method: "DELETE" });
  },
};

// Mappers & formatters
function pad8(n: number | string) {
  const num = typeof n === "string" ? Number(n) : n;
  return String(num).padStart(8, "0");
}

function joinDateTime(dateISO: string, time: string): string {
  const dt = new Date(`${dateISO}T${time}`);
  return dt.toLocaleString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(dateISO?: string) {
  if (!dateISO) return "-";
  const d = new Date(`${dateISO}T00:00:00`);
  return d.toLocaleString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function mapDTOtoUI(d: InspectionDTO): Inspection {
  return {
    inspectionNo: pad8(d.inspectionNo),
    inspectedDate: joinDateTime(d.inspectionDate, d.inspectionTime),
    maintenanceDate: d.maintenanceDate ? formatDateOnly(d.maintenanceDate) : "-",
    status: (d.status as Status) || "Pending",
  };
}

async function resolveImageUrl(inspectionId: number, meta: ImageMeta, setUrl: (u: string) => void) {
  try {
    if (meta.url) {
      const full = meta.url.startsWith("http") ? meta.url : `${API_BASE}${meta.url}`;
      setUrl(full);
      return;
    }
    const res = await fetch(api(`/inspections/${inspectionId}/images/${meta.id}/file`));
    if (!res.ok) throw new Error("failed");
    const blob = await res.blob();
    setUrl(URL.createObjectURL(blob));
  } catch {
    setUrl("");
  }
}

// Component
export default function InspectionsPage() {
  const navigate = useNavigate();
  const { transformerId } = useParams<{ transformerId: string }>();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ownedInspectionIds, setOwnedInspectionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [branch, setBranch] = useState("Nugegoda");
  const [dateStr, setDateStr] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [timeStr, setTimeStr] = useState<string>("07:00");

  const baseTransformer: TransformerMeta = useMemo(
    () => ({
      id: transformerId ?? "TX-1001",
      poleNo: "",
      type: "Distribution",
      region: "",
      location: "",
      lastInspected: "-",
    }),
    [transformerId]
  );
  const [transformer, setTransformer] = useState<TransformerMeta>(baseTransformer);

  const [baselineMeta, setBaselineMeta] = useState<ImageMeta | null>(null);
  const [baselineUrl, setBaselineUrl] = useState<string | null>(null);
  const [baselineOwnerInspectionId, setBaselineOwnerInspectionId] = useState<number | null>(null);

  const baseInputRef = useRef<HTMLInputElement | null>(null);
  const activeXhr = useRef<XMLHttpRequest | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editBranch, setEditBranch] = useState<string>("Nugegoda");
  const [editStatus, setEditStatus] = useState<Status>("Pending");
  const [editDate, setEditDate] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("07:00");
  const [editMaintDate, setEditMaintDate] = useState<string>("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadTransformer() {
      if (!transformerId) return;
      try {
        const t = await getTransformerByNo(transformerId);
        if (!cancelled) {
          setTransformer((prev) => ({
            ...prev,
            id: t.id,
            poleNo: t.poleNo,
            type: t.type,
            region: t.region,
            location: t.locationDetails,
          }));
        }
      } catch (e: any) {
        if (!cancelled) setError((old) => old ?? "Failed to load transformer details");
      }
    }
    loadTransformer();
    return () => {
      cancelled = true;
    };
  }, [transformerId]);

  //Load inspections from backend
  useEffect(() => {
    let cancelled = false;
    async function loadInspections() {
      if (!transformerId) return;
      setLoading(true);
      setError(null);
      try {
        const mine = await InspectionsAPI.listByTransformerNo(transformerId);
        mine.sort((a, b) => {
          const at =
            new Date(`${a.inspectionDate}T${a.inspectionTime}`).getTime() ||
            new Date(a.createdAt).getTime();
          const bt =
            new Date(`${b.inspectionDate}T${b.inspectionTime}`).getTime() ||
            new Date(b.createdAt).getTime();
          return bt - at;
        });
        const rows = mine.map(mapDTOtoUI);
        if (!cancelled) {
          setInspections(rows);
          setOwnedInspectionIds(mine.map((m) => m.inspectionNo));
          setTransformer((t) => ({
            ...t,
            lastInspected: mine[0]
              ? joinDateTime(mine[0].inspectionDate, mine[0].inspectionTime)
              : "-",
          }));
        }
        const metas: { meta: ImageMeta; owner: number }[] = await Promise.all(
          mine.map(async (m) => {
            const r = await fetch(api(`/inspections/${m.inspectionNo}/images?type=BASELINE`));
            if (!r.ok) return null as any;
            const arr: ImageMeta[] = await r.json();
            const latest =
              arr?.slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0] ??
              null;
            return latest ? { meta: latest, owner: m.inspectionNo } : null;
          })
        ).then((x) => x.filter(Boolean) as { meta: ImageMeta; owner: number }[]);
        if (!cancelled) {
          if (metas.length) {
            metas.sort(
              (a, b) =>
                new Date(b.meta.uploadedAt).getTime() - new Date(a.meta.uploadedAt).getTime()
            );
            const pick = metas[0];
            setBaselineMeta(pick.meta);
            setBaselineOwnerInspectionId(pick.owner);
            resolveImageUrl(pick.owner, pick.meta, (u) => setBaselineUrl(u));
          } else {
            setBaselineMeta(null);
            setBaselineOwnerInspectionId(null);
            setBaselineUrl(null);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load inspections");
          setInspections([]);
          setOwnedInspectionIds([]);
          setTransformer((t) => ({ ...t, lastInspected: "-" }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInspections();
    return () => {
      cancelled = true;
    };
  }, [transformerId]);

  // baseline handlers
  function onPickBaseline(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const targetInspectionId = ownedInspectionIds[0];
    if (!targetInspectionId) {
      alert("Please create an inspection first.");
      e.currentTarget.value = "";
      return;
    }
    const urlObj = new URL(api(`/inspections/${targetInspectionId}/images`));
    urlObj.searchParams.set("type", "BASELINE");
    urlObj.searchParams.set("uploader", "web");
    urlObj.searchParams.set("condition", "SUNNY");
    const fd = new FormData();
    fd.append("files", f);
    const xhr = new XMLHttpRequest();
    activeXhr.current = xhr;
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const list: ImageMeta[] = JSON.parse(xhr.responseText);
          const latest = list?.[0];
          setBaselineMeta(latest || null);
          setBaselineOwnerInspectionId(targetInspectionId);
          if (latest) resolveImageUrl(targetInspectionId, latest, (u) => setBaselineUrl(u));
        } catch {}
      } else {
        alert(`Upload error (HTTP ${xhr.status})`);
      }
      activeXhr.current = null;
    };
    xhr.open("POST", urlObj.toString(), true);
    xhr.send(fd);
    e.currentTarget.value = "";
  }
  function viewBaseline() {
    if (!baselineMeta) return;
    if (baselineUrl) window.open(baselineUrl, "_blank");
    else if (baselineOwnerInspectionId)
      resolveImageUrl(baselineOwnerInspectionId, baselineMeta, (u) => window.open(u, "_blank"));
  }
  async function deleteBaseline() {
    if (!baselineMeta || !baselineOwnerInspectionId) return;
    if (!confirm("Delete baseline image?")) return;
    const res = await fetch(
      api(`/inspections/${baselineOwnerInspectionId}/images/${baselineMeta.id}`),
      { method: "DELETE" }
    );
    if (res.status === 204) {
      setBaselineMeta(null);
      setBaselineOwnerInspectionId(null);
      if (baselineUrl?.startsWith("blob:")) URL.revokeObjectURL(baselineUrl);
      setBaselineUrl(null);
    } else {
      alert("Delete failed");
    }
  }

  // add inspection
  async function addInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!transformerId) return;
    try {
      const inspectionDate = dateStr;
      const inspectionTime = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
      const created = await InspectionsAPI.create({
        transformerNo: transformerId,
        branch,
        status: "Pending",
        inspectionDate,
        inspectionTime,
      });
      const row = mapDTOtoUI(created);
      setInspections((prev) => [row, ...prev]);
      setOwnedInspectionIds((prev) => [created.inspectionNo, ...prev]);
      setTransformer((t) => ({
        ...t,
        lastInspected: joinDateTime(created.inspectionDate, created.inspectionTime),
      }));
      setOpenModal(false);
    } catch (err: any) {
      alert(err?.message ?? "Create failed");
    }
  }

  // edit inspection
  async function openEditFor(row: Inspection) {
    try {
      const id = Number(row.inspectionNo);
      setEditOpen(true);
      setEditLoading(true);
      setEditId(id);
      const dto = await InspectionsAPI.getById(id);
      setEditBranch(dto.branch);
      setEditStatus((dto.status as Status) || "Pending");
      setEditDate(dto.inspectionDate);
      setEditTime((dto.inspectionTime || "07:00:00").slice(0, 5));
      setEditMaintDate(dto.maintenanceDate || "");
    } catch (e: any) {
      alert(e?.message ?? "Load failed");
      setEditOpen(false);
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    try {
      const current = await InspectionsAPI.getById(editId);
      const payload: InspectionDTO = {
        inspectionNo: editId,
        transformerNo: current.transformerNo,
        branch: editBranch,
        status: editStatus,
        inspectionDate: editDate,
        inspectionTime: editTime.length === 5 ? `${editTime}:00` : editTime,
        createdAt: current.createdAt,
        maintenanceDate: editMaintDate || undefined,
      };
      const updated = await InspectionsAPI.update(editId, payload);
      const mapped = mapDTOtoUI(updated);
      setInspections((prev) =>
        prev
          .map((r) => (r.inspectionNo === pad8(editId) ? { ...r, ...mapped } : r))
          .sort((a, b) => {
            const at = new Date(a.inspectedDate).getTime();
            const bt = new Date(b.inspectedDate).getTime();
            return bt - at;
          })
      );
      setEditOpen(false);
    } catch (err: any) {
      alert(err?.message ?? "Save failed");
    }
  }

  async function removeInspection(row: Inspection) {
    try {
      if (!confirm("Delete this inspection?")) return;
      const id = Number(row.inspectionNo);

      const types: ImageType[] = ["BASELINE", "MAINTENANCE"];
      for (const t of types) {
        const r = await fetch(api(`/inspections/${id}/images?type=${t}`));
        if (r.ok) {
          const imgs: ImageMeta[] = await r.json();
          await Promise.all(
            (imgs || []).map((m) =>
              fetch(api(`/inspections/${id}/images/${m.id}`), { method: "DELETE" })
            )
          );
        }
      }

      await InspectionsAPI.remove(id);
      setInspections((prev) => prev.filter((r) => r.inspectionNo !== row.inspectionNo));
      setOwnedInspectionIds((prev) => prev.filter((n) => n !== id));
    } catch (e: any) {
      alert(e?.message ?? "Delete failed");
    }
  }

  // navigation
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

  // Render
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
        {/* Top line */}
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
              <div style={{ fontSize: 26, fontWeight: 900, color: ui.text, lineHeight: 1.2 }}>
                {transformer.id}
              </div>
              <div style={{ color: ui.sub, fontWeight: 700, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {transformer.region || "—"} <span style={{ marginLeft: 8 }}>📍 {transformer.location || "—"}</span>
              </div>
            </div>
          </div>

          {/* Right cluster */}
          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <div style={{ fontWeight: 800, color: ui.sub }}>
              <span style={{ color: ui.text }}>Last Inspected Date:</span> {transformer.lastInspected}
            </div>

            {/* Baseline pill */}
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
              onClick={() => baseInputRef.current?.click()}
            >
              <input
                ref={baseInputRef}
                id="baseline-upload"
                type="file"
                accept="image/*"
                onChange={onPickBaseline}
                style={{ display: "none" }}
              />
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
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  title="View"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewBaseline();
                  }}
                  disabled={!baselineMeta}
                  style={{
                    ...actionIconBtn,
                    color: "#4338ca",
                    cursor: baselineMeta ? "pointer" : "not-allowed",
                    opacity: baselineMeta ? 1 : 0.5,
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
                  disabled={!baselineMeta}
                  style={{
                    ...actionIconBtn,
                    color: ui.danger,
                    cursor: baselineMeta ? "pointer" : "not-allowed",
                    opacity: baselineMeta ? 1 : 0.5,
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chips row — Pole No & Type */}
        <div style={{ display: "flex", gap: 14, marginTop: 16, alignItems: "stretch", flexWrap: "wrap" }}>
          <Chip title="Pole No" value={transformer.poleNo || "—"} />
          <Chip title="Type" value={transformer.type} />
        </div>

        {/* Right-aligned add button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button style={primaryBtn} onClick={() => setOpenModal(true)}>
            Add Inspection
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 10, color: "#dc2626", fontWeight: 700 }}>
            {error}
          </div>
        )}
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
                        onClick={() => openEditFor(row)}
                        style={{
                          background: "#fff",
                          color: "#111827",
                          border: `1px solid ${ui.border}`,
                          padding: "8px 16px",
                          borderRadius: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                          boxShadow: "0 6px 18px rgba(17,24,39,.08)",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeInspection(row)}
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

      {/* Modal*/}
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
                <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
                  Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${ui.border}`,
                    background: "#fff",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  {REGIONS_SL.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
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
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
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
                    type="time"
                    value={timeStr}
                    onChange={(e) => setTimeStr(e.target.value)}
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

      {editOpen && (
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
          onClick={() => setEditOpen(false)}
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
            <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Edit Inspection</div>
            <form onSubmit={saveEdit} style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
                  Branch
                </label>
                <select
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  disabled={editLoading}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${ui.border}`,
                    background: "#fff",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  {REGIONS_SL.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    disabled={editLoading}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${ui.border}`,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
                    Time
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    disabled={editLoading}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: `1px solid ${ui.border}`,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as Status)}
                  disabled={editLoading}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${ui.border}`,
                    background: "#fff",
                    fontWeight: 700,
                    color: "#334155",
                  }}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
                  Maintenance Date
                </label>
                <input
                  type="date"
                  value={editMaintDate}
                  onChange={(e) => setEditMaintDate(e.target.value)}
                  disabled={editLoading}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: `1px solid ${ui.border}`,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                <button type="submit" disabled={editLoading} style={{ ...primaryBtn, boxShadow: "0 12px 28px rgba(63,81,181,.3)" }}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={editLoading}
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

// little chip component
function Chip({ title, value }: { title: string; value: string }) {
  return (
    <div style={chip}>
      <div style={{ fontWeight: 900, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{title}</div>
    </div>
  );
}