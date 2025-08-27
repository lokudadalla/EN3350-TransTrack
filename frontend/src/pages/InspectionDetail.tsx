import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";


type Status = "Completed" | "In Progress" | "Pending";
type ImageType = "BASELINE" | "MAINTENANCE";
type Condition = "SUNNY" | "CLOUDY" | "RAINY";

type InspectionDTO = {
  inspectionNo: number;
  transformerNo: string;
  branch: string;
  status: string;
  inspectionDate: string; // YYYY-MM-DD
  inspectionTime: string; // HH:mm:ss
  createdAt: string;      
};

type ImageMeta = {
  id: number;
  type: ImageType;
  fileName: string;
  contentType: string;
  size?: number;
  uploadedAt: string; // ISO
  url?: string;       // server gives /inspections/{id}/images/{imageId}/file
  uploader?: string;
  condition?: Condition;
};

type TransformerHeader = {
  transformerNo: string;
  poleNo?: string;
  branch?: string;
  inspectedBy?: string;
  status: Status;
  lastUpdated: string;
};

const ui = {
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

/* Small helpers */
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

function api(path: string) {
  return `${API_BASE}${path}`;
}

function toNiceDateTime(d: string, t: string) {
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

function pill(status: Status): React.CSSProperties {
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
function Chip({ title, value }: { title: string; value?: string }) {
  return (
    <div style={chipWrap}>
      <div style={{ fontWeight: 900, color: "#111827" }}>{value ?? "-"}</div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{title}</div>
    </div>
  );
}

async function resolveImageUrl(
  inspectionId: number,
  meta: ImageMeta,
  setUrl: (u: string) => void
) {
  try {
    if (meta.url) {
      const full = meta.url.startsWith("http") ? meta.url : `${API_BASE}${meta.url}`;
      setUrl(full);
      return;
    }
    const res = await fetch(api(`/inspections/${inspectionId}/images/${meta.id}/file`));
    if (!res.ok) throw new Error("Failed to fetch image");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
  } catch (e) {
    console.error(e);
  }
}

/*  Page  */
export default function InspectionDetail() {
  const { transformerId, inspectionNo } = useParams<{ transformerId: string; inspectionNo: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const numericInspectionId = useMemo(() => Number(inspectionNo), [inspectionNo]);

  // Header / meta
  const [header, setHeader] = useState<TransformerHeader>({
    transformerNo: transformerId ?? "-",
    branch: "-",
    poleNo: "-",
    inspectedBy: "-",
    status: "Pending",
    lastUpdated: "-",
  });

  // Images
  const [baselineMeta, setBaselineMeta] = useState<ImageMeta | null>(null);
  const [maintMeta, setMaintMeta] = useState<ImageMeta | null>(null);
  const [baselineUrl, setBaselineUrl] = useState<string | null>(null);
  const [maintUrl, setMaintUrl] = useState<string | null>(null);

  // Weather condition (dropdown)
  const [condition, setCondition] = useState<Condition>("SUNNY");

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadingType, setUploadingType] = useState<ImageType | null>(null); // kept for parity
  const activeXhr = useRef<XMLHttpRequest | null>(null);


  const [error, setError] = useState<string | null>(null);

  /* Load inspection header  */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);

        // prefer state passed from list page
        const fromState = (location.state as any)?.inspection;
        if (fromState?.inspectedDate) {
          setHeader((h) => ({
            ...h,
            transformerNo: transformerId ?? h.transformerNo,
            branch: (location.state as any)?.transformer?.region ?? h.branch,
            poleNo: (location.state as any)?.transformer?.poleNo ?? h.poleNo,
            status: fromState.status as Status,
            lastUpdated: fromState.inspectedDate,
          }));
        } else {
          // fetch from backend by numeric inspection id
          const res = await fetch(api(`/inspections/${numericInspectionId}`));
          if (!res.ok) throw new Error(`Failed to load inspection ${numericInspectionId}`);
          const dto: InspectionDTO = await res.json();

          setHeader({
            transformerNo: dto.transformerNo,
            poleNo: "-", 
            branch: dto.branch,
            inspectedBy: "-",
            status: (dto.status as Status) || "Pending",
            lastUpdated: toNiceDateTime(dto.inspectionDate, dto.inspectionTime),
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load inspection");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [numericInspectionId, transformerId, location.state]);

  /* Load image metadata */
  useEffect(() => {
    let cancelled = false;

    async function fetchType(t: ImageType) {
      const res = await fetch(api(`/inspections/${numericInspectionId}/images?type=${t}`));
      if (!res.ok) return null;
      const list: ImageMeta[] = await res.json();
      const latest =
        list?.slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0] ?? null;
      return latest ?? null;
    }

    (async () => {
      if (!numericInspectionId) return;
      const [b, m] = await Promise.all([fetchType("BASELINE"), fetchType("MAINTENANCE")]);
      if (cancelled) return;

      setBaselineMeta(b);
      setMaintMeta(m);

      if (b) resolveImageUrl(numericInspectionId, b, (u: string) => setBaselineUrl(u));
      if (m) resolveImageUrl(numericInspectionId, m, (u: string) => setMaintUrl(u));
    })();

    return () => {
      cancelled = true;
    };
  }, [numericInspectionId]);

  /*  Helpers: view/delete/upload */
  function goBack() {
    if (window.history.length > 1) navigate(-1);
    else navigate("/transformers");
  }

  async function view(meta: ImageMeta | null, url: string | null) {
    if (!meta) return;
    if (url) {
      window.open(url, "_blank");
      return;
    }
    await resolveImageUrl(numericInspectionId, meta, (u: string) => window.open(u, "_blank"));
  }

  async function remove(meta: ImageMeta | null, onDone: () => void) {
    if (!meta) return;
    if (!confirm("Delete this image?")) return;
    const res = await fetch(api(`/inspections/${numericInspectionId}/images/${meta.id}`), { method: "DELETE" });
    if (res.status === 204) onDone();
    else alert("Delete failed");
  }

  function startUpload(t: ImageType, file: File) {
    // keep your original XHR flow
    setUploadingType(t);
    setUploadPct(0);
    setShowUpload(true);

    const url = new URL(api(`/inspections/${numericInspectionId}/images`));
    url.searchParams.set("type", t);
    url.searchParams.set("uploader", "web");
    url.searchParams.set("condition", condition);

    const fd = new FormData();
    fd.append("files", file);

    const xhr = new XMLHttpRequest();
    activeXhr.current = xhr;

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      setUploadPct(pct);
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const list: ImageMeta[] = JSON.parse(xhr.responseText);
          const latest = list?.[0];
          if (t === "BASELINE") {
            setBaselineMeta(latest || null);
            if (latest) resolveImageUrl(numericInspectionId, latest, (u: string) => setBaselineUrl(u));
          } else {
            setMaintMeta(latest || null);
            if (latest) resolveImageUrl(numericInspectionId, latest, (u: string) => setMaintUrl(u));
          }
        } catch {
          
        }
      } else {
        alert(`Upload error (HTTP ${xhr.status})`);
      }

      setShowUpload(false);
      setUploadingType(null);
      activeXhr.current = null;
    };

    xhr.open("POST", url.toString(), true);
    xhr.send(fd);
  }

  function cancelUpload() {
    activeXhr.current?.abort();
    setShowUpload(false);
    setUploadingType(null);
    setUploadPct(0);
  }

  /* Clean up object URLs when they change / unmount */
  useEffect(() => {
    return () => {
      if (baselineUrl?.startsWith("blob:")) URL.revokeObjectURL(baselineUrl);
      if (maintUrl?.startsWith("blob:")) URL.revokeObjectURL(maintUrl);
    };
  }, [baselineUrl, maintUrl]);

  /* File pickers */
  const baseInputRef = useRef<HTMLInputElement | null>(null);
  const maintInputRef = useRef<HTMLInputElement | null>(null);

  function onPickBaseline(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) startUpload("BASELINE", f);
    e.currentTarget.value = ""; 
  }
  function onPickMaintenance(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) startUpload("MAINTENANCE", f);
    e.currentTarget.value = ""; 
  }

  /* Render */
  return (
    <div style={{ background: ui.bg, minHeight: "100vh", padding: 24 }}>
      {/* HEADER CARD */}
      <div
        style={{
          marginBottom: 16,
          padding: 18,
          background: ui.card,
          border: `1px solid ${ui.border}`,
          borderRadius: 16,
          boxShadow: ui.shadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          {/* Left: back + title */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: ui.text, lineHeight: 1.2 }}>
                {String(numericInspectionId).padStart(8, "0")}
              </div>
              <div style={{ color: ui.sub, fontWeight: 700, marginTop: 4 }}>{header.lastUpdated}</div>
            </div>
          </div>

          {/* Right: status + Baseline pill */}
          <div style={{ display: "grid", gap: 10, justifyItems: "end" }}>
            <div>
              <span style={{ fontWeight: 800, color: ui.sub, marginRight: 8 }}>Last updated:</span>
              <span style={{ fontWeight: 800 }}>{header.lastUpdated}</span>
              <span style={{ marginLeft: 12 }} />
              <span style={pill(header.status)}>{header.status}</span>
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
              title="Click to upload/replace the baseline image"
            >
              <input
                ref={baseInputRef}
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
                    view(baselineMeta, baselineUrl);
                  }}
                  disabled={!baselineMeta}
                  style={iconBtn(!baselineMeta)}
                >
                  👁️
                </button>
                <button
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(baselineMeta, () => {
                      setBaselineMeta(null);
                      if (baselineUrl?.startsWith("blob:")) URL.revokeObjectURL(baselineUrl);
                      setBaselineUrl(null);
                    });
                  }}
                  disabled={!baselineMeta}
                  style={iconBtn(!baselineMeta, true)}
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chips row */}
        <div style={{ display: "flex", gap: 14, marginTop: 16, alignItems: "stretch", flexWrap: "wrap" }}>
          <Chip title="Transformer No" value={header.transformerNo} />
          <Chip title="Pole No" value={header.poleNo} />
          <Chip title="Branch" value={header.branch} />
          <Chip title="Inspected By" value={header.inspectedBy} />
        </div>
      </div>

      {/* LEFT/RIGHT SECTION */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18 }}>
        {/* LEFT CARD: uploader (maintenance) */}
        <div
          style={{
            background: ui.card,
            border: `1px solid ${ui.border}`,
            borderRadius: 16,
            boxShadow: ui.shadow,
            padding: 16,
            height: "fit-content",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Thermal Image</div>
            <span style={pill("Pending")}>Pending</span>
          </div>

          <p style={{ color: ui.sub, marginTop: 10 }}>
            Upload a thermal image of the transformer to identify potential issues.
          </p>

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
              Weather Condition
            </label>

            {/* Dropdown */}
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${ui.border}`,
                fontWeight: 700,
                color: "#334155",
              }}
            >
              <option value="SUNNY">Sunny</option>
              <option value="CLOUDY">Cloudy</option>
              <option value="RAINY">Rainy</option>
            </select>
          </div>

          <input
            ref={maintInputRef}
            type="file"
            accept="image/*"
            onChange={onPickMaintenance}
            style={{ display: "none" }}
          />

          <button
            onClick={() => maintInputRef.current?.click()}
            style={{
              marginTop: 14,
              background: ui.primary,
              color: "#fff",
              border: 0,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 10px 25px rgba(63,81,181,.25)",
            }}
          >
            Upload thermal image
          </button>
        </div>

        {/* RIGHT: Comparison panel */}
        <div
          style={{
            background: ui.card,
            border: `1px solid ${ui.border}`,
            borderRadius: 16,
            boxShadow: ui.shadow,
            padding: 16,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 12 }}>Thermal Image Comparison</div>

          {baselineUrl || maintUrl ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                alignItems: "stretch",
              }}
            >
              {/* Baseline */}
              <Figure title="Baseline" date={baselineMeta?.uploadedAt}>
                {baselineUrl ? (
                  <img
                    src={baselineUrl}
                    alt="Baseline"
                    style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                  />
                ) : (
                  <EmptySlot text="No baseline image" />
                )}
              </Figure>

              {/* Current Maintenance Image */}
              <Figure title="Current" date={maintMeta?.uploadedAt}>
                {maintUrl ? (
                  <img
                    src={maintUrl}
                    alt="Current"
                    style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }}
                  />
                ) : (
                  <EmptySlot text="No maintenance image" />
                )}
              </Figure>
            </div>
          ) : (
            <div style={{ color: ui.sub, fontWeight: 700 }}>
              Upload a Baseline and a Maintenance image to see the side-by-side comparison.
            </div>
          )}
        </div>
      </div>

      {/*  */}
      {error && (
        <div style={{ marginTop: 16, color: ui.danger, fontWeight: 800 }}>
          {error}
        </div>
      )}

      {/* Uploading modal */}
      {showUpload && (
        <div
          role="dialog"
          onClick={cancelUpload}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.45)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(820px, 92vw)",
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow: ui.shadow,
              border: `1px solid ${ui.border}`,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, textAlign: "center", marginBottom: 6 }}>
              Thermal image uploading.
            </div>
            <div style={{ color: ui.sub, textAlign: "center", marginBottom: 16, fontWeight: 700 }}>
              Thermal image is being uploaded and Reviewed.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background: "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${uploadPct}%`,
                    background: ui.primary,
                    transition: "width .2s ease",
                  }}
                />
              </div>
              <div style={{ width: 60, textAlign: "right", fontWeight: 800, color: ui.sub }}>{uploadPct}%</div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
              <button
                onClick={cancelUpload}
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: `1px solid ${ui.border}`,
                  background: "#fff",
                  fontWeight: 800,
                  color: "#334155",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ marginTop: 24, color: "#64748b", fontSize: 12 }}>
        © 2025 TransTrack • University of Moratuwa
      </footer>
    </div>
  );
}

/* Tiny UI bits */
function iconBtn(disabled: boolean, danger?: boolean): React.CSSProperties {
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

function Figure({
  title,
  date,
  children,
  badgeRight,
  badgeColor,
}: {
  title: string;
  date?: string;
  children: React.ReactNode;
  badgeRight?: string;
  badgeColor?: string;
}) {
  return (
    <div
      style={{
        background: "#0b1a4a",
        borderRadius: 16,
        padding: 10,
        minHeight: 360,
        display: "grid",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span
          style={{
            background: "#111827",
            color: "#fff",
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 999,
            opacity: 0.85,
            fontWeight: 800,
          }}
        >
          {title}
        </span>
        {badgeRight && (
          <span
            style={{
              background: badgeColor ?? "#111827",
              color: "#fff",
              fontSize: 12,
              padding: "4px 8px",
              borderRadius: 999,
              opacity: 0.9,
              fontWeight: 800,
            }}
          >
            {badgeRight}
          </span>
        )}
      </div>
      <div
        style={{
          background: "#0b1a4a",
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <div style={{ color: "#cbd5e1", fontSize: 12, marginTop: 6, textAlign: "right" }}>
        {date ? new Date(date).toLocaleString() : ""}
      </div>
    </div>
  );
}

function EmptySlot({ text }: { text: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: 320,
        display: "grid",
        placeItems: "center",
        color: "#cbd5e1",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}