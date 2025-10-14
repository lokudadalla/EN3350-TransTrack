import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getUser } from "../auth"; // adjust path if needed
import type { ZoomHandle, DisplayAnomaly, AnomalyMeta } from "../types/models";
import { ZoomableImage, isFiniteNumber } from "../components/ZoomableImage";
import type { InspectionDTO, ImageMeta, TransformerHeader, Status, ImageType, Condition } from "../types/models";
import { pollUntilAnomalies, resolveImageUrl, authHeaders, api } from "../api/Inspections";
import { Figure } from "../components/Figure";
import { AnomalyLegend } from "../components/AnomalyLegend";



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

function clampThreshold(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
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

function toDisplayAnomalies(list?: AnomalyMeta[]): DisplayAnomaly[] {
  if (!Array.isArray(list)) return [];
  const sanitized: DisplayAnomaly[] = [];
  for (const item of list) {
    if (!item) continue;
    if (!isFiniteNumber(item.width) || !isFiniteNumber(item.height)) continue;
    if (item.width <= 0 || item.height <= 0) continue;
    if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) continue;
    sanitized.push({ ...item, displayIndex: sanitized.length + 1 });
  }
  return sanitized;
}





/* ---------- Page ---------- */
export default function InspectionDetail() {
  const { transformerId, inspectionNo } = useParams<{ transformerId: string; inspectionNo: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const numericInspectionId = useMemo(() => Number(inspectionNo), [inspectionNo]);

  const [header, setHeader] = useState<TransformerHeader>({
    transformerNo: transformerId ?? "-",
    branch: "-",
    poleNo: "-",
    inspectedBy: "-",
    status: "Pending",
    lastUpdated: "-",
  });

  const [inspection, setInspection] = useState<InspectionDTO | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [baselineMeta, setBaselineMeta] = useState<ImageMeta | null>(null);
  const [baselineUrl, setBaselineUrl] = useState<string | null>(null);
  const [baselineOwnerInspectionId, setBaselineOwnerInspectionId] = useState<number | null>(null);

  const [maintMeta, setMaintMeta] = useState<ImageMeta | null>(null);
  const [maintUrl, setMaintUrl] = useState<string | null>(null);

  const baselineAnomalies = useMemo(() => toDisplayAnomalies(baselineMeta?.anomalies), [baselineMeta]);
  const maintAnomalies = useMemo(() => toDisplayAnomalies(maintMeta?.anomalies), [maintMeta]);

  const [condition, setCondition] = useState<Condition>("SUNNY");

  const [showUpload, setShowUpload] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const activeXhr = useRef<XMLHttpRequest | null>(null);

  const [error, setError] = useState<string | null>(null);

  /* ----- Load inspection header ----- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setError(null);
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
        }

        const res = await fetch(api(`/inspections/${numericInspectionId}`), {
          headers: { ...authHeaders() },
        });
        if (!res.ok) throw new Error(`Failed to load inspection ${numericInspectionId}`);
        const dto: InspectionDTO = await res.json();
        if (cancelled) return;
        setInspection(dto);
        setHeader({
          transformerNo: dto.transformerNo,
          poleNo: "-",
          branch: dto.branch,
          inspectedBy: "-",
          status: (dto.status as Status) || "Pending",
          lastUpdated: toNiceDateTime(dto.inspectionDate, dto.inspectionTime),
        });
        setTemperature(typeof dto.inferenceThreshold === "number" ? clampThreshold(dto.inferenceThreshold) : null);

      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load inspection");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [numericInspectionId, transformerId, location.state]);

  /* ----- Load image metadata (baseline & maintenance) ----- */
  useEffect(() => {
    let cancelled = false;

    async function latestBaselineForTransformer(): Promise<{ meta: ImageMeta; owner: number } | null> {
      if (!transformerId) return null;
      const insRes = await fetch(api(`/inspections/by-no?no=${encodeURIComponent(transformerId)}`), {
          headers: { ...authHeaders() }, 
        });
      if (!insRes.ok) return null;
      const list: InspectionDTO[] = await insRes.json();
      list.sort((a, b) => {
        const at =
          new Date(`${a.inspectionDate}T${a.inspectionTime}`).getTime() ||
          new Date(a.createdAt).getTime();
        const bt =
          new Date(`${b.inspectionDate}T${b.inspectionTime}`).getTime() ||
          new Date(b.createdAt).getTime();
        return bt - at;
      });
      const metas: { meta: ImageMeta; owner: number }[] = [];
      for (const it of list) {
        const r = await fetch(api(`/inspections/${it.inspectionNo}/images?type=BASELINE`), {
          headers: { ...authHeaders() }, 
        });
        if (!r.ok) continue;
        const arr: ImageMeta[] = await r.json();
        if (arr?.length) {
          const latest =
            arr.slice().sort((x, y) => new Date(y.uploadedAt).getTime() - new Date(x.uploadedAt).getTime())[0];
          metas.push({ meta: latest, owner: it.inspectionNo });
        }
      }
      if (!metas.length) return null;
      metas.sort((a, b) => new Date(b.meta.uploadedAt).getTime() - new Date(a.meta.uploadedAt).getTime());
      return metas[0];
    }

    async function maintenanceForThisInspection(): Promise<ImageMeta | null> {
      const r = await fetch(api(`/inspections/${numericInspectionId}/images?type=MAINTENANCE`), {
          headers: { ...authHeaders() }, 
        });
      if (!r.ok) return null;
      const arr: ImageMeta[] = await r.json();
      if (!arr?.length) return null;
      return arr.slice().sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    }

    (async () => {
      if (!numericInspectionId) return;
      const [globalBase, maint] = await Promise.all([latestBaselineForTransformer(), maintenanceForThisInspection()]);
      if (cancelled) return;

      if (globalBase) {
        setBaselineMeta(globalBase.meta);
        setBaselineOwnerInspectionId(globalBase.owner);
        resolveImageUrl(globalBase.owner, globalBase.meta, (u) => setBaselineUrl(u));
      } else {
        setBaselineMeta(null);
        setBaselineOwnerInspectionId(null);
        setBaselineUrl(null);
      }

      setMaintMeta(maint);
      if (maint) resolveImageUrl(numericInspectionId, maint, (u) => setMaintUrl(u));
      else setMaintUrl(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [numericInspectionId, transformerId]);

  /* ----- Helpers: view/delete/upload ----- */
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
    const owner = meta.type === "BASELINE" ? baselineOwnerInspectionId ?? numericInspectionId : numericInspectionId;
    await resolveImageUrl(owner, meta, (u) => window.open(u, "_blank"));
  }

  async function remove(meta: ImageMeta | null, onDone: () => void) {
    if (!meta) return;
    if (!confirm("Delete this image?")) return;
    const owner = meta.type === "BASELINE" ? baselineOwnerInspectionId ?? numericInspectionId : numericInspectionId;
    const res = await fetch(api(`/inspections/${owner}/images/${meta.id}`), { method: "DELETE", headers: authHeaders() });
    if (res.status === 204) onDone();
    else alert("Delete failed");
  }

  // NEW: list all inspections for this transformer
  async function getInspectionIdsForTransformer(transformerNo?: string): Promise<number[]> {
    if (!transformerNo) return [];
    try {
      const res = await fetch(api(`/inspections/by-no?no=${encodeURIComponent(transformerNo)}`), {
        headers: { ...authHeaders() },
      });
      if (!res.ok) return [];
      const list: InspectionDTO[] = await res.json();
      // sort newest first just in case (not strictly required)
      list.sort((a, b) => {
        const at = new Date(`${a.inspectionDate}T${a.inspectionTime}`).getTime() || new Date(a.createdAt).getTime();
        const bt = new Date(`${b.inspectionDate}T${b.inspectionTime}`).getTime() || new Date(b.createdAt).getTime();
        return bt - at;
      });
      return list.map(x => x.inspectionNo);
    } catch {
      return [];
    }
  }

  // NEW: post the file to a specific inspection (no progress UI; used for “other” inspections)
  async function uploadImageToInspection(opts: {
    inspectionId: number;
    type: ImageType;
    file: File | Blob;
    condition: Condition;
    uploader?: string;
  }) {
    const { inspectionId, type, file, condition, uploader = "web" } = opts;
    const url = new URL(api(`/inspections/${inspectionId}/images`));
    url.searchParams.set("type", type);
    url.searchParams.set("uploader", uploader);
    url.searchParams.set("condition", condition);

    const fd = new FormData();
    // IMPORTANT: if `file` is a Blob copy, give it a filename so backend saves correctly.
    const named = file instanceof File ? file : new File([file], `baseline${inspectionId}.jpg`, { type: "image/jpeg" });
    fd.append("files", named);

    await fetch(url.toString(), {
      method: "POST",
      headers: { ...authHeaders() }, // X-User-Id
      body: fd,
    }).catch(() => { /* swallow – we don’t want to break the primary upload UX */ });
  }

  // CHANGED: startUpload — baseline path uploads to ALL inspections for the transformer
  function startUpload(t: ImageType, file: File) {
    setUploadPct(0);
    setShowUpload(true);

    // We keep your existing XHR progress UX for the "primary" upload (current inspection).
    const primaryUrl = new URL(api(`/inspections/${numericInspectionId}/images`));
    primaryUrl.searchParams.set("type", t);
    primaryUrl.searchParams.set("uploader", "web");
    primaryUrl.searchParams.set("condition", condition);

    const fd = new FormData();
    fd.append("files", file);

    const xhr = new XMLHttpRequest();
    activeXhr.current = xhr;

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = Math.round((evt.loaded / evt.total) * 100);
      setUploadPct(pct);
    };

    xhr.onreadystatechange = async () => {
      if (xhr.readyState !== 4) return;

      // We’ll finish the UI state at the end no matter what
      const finish = () => {
        setShowUpload(false);
        activeXhr.current = null;
      };

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const list: ImageMeta[] = JSON.parse(xhr.responseText);
          const latest = list?.[0];

          if (t === "BASELINE") {
            // Update local UI for baseline pointing at *this* inspection (as before)
            setBaselineMeta(latest || null);
            setBaselineOwnerInspectionId(numericInspectionId);
            if (latest) resolveImageUrl(numericInspectionId, latest, (u) => setBaselineUrl(u));

            // NEW: fan-out upload to all other inspections for the same transformer
            // Reuse the same bytes: clone the file into a Blob so we can send it again.
            const blob = file.slice(0, file.size, file.type);
            const allIds = await getInspectionIdsForTransformer(header.transformerNo);
            const others = allIds.filter(id => id !== numericInspectionId);

            // fire in parallel but don’t block UI — we still complete the modal below
            // (No progress aggregation here to keep the UI simple.)
            Promise.all(
              others.map(id =>
                uploadImageToInspection({
                  inspectionId: id,
                  type: "BASELINE",
                  file: blob,
                  condition,
                  uploader: "web",
                })
              )
            ).catch(() => { /* ignore per-inspection failures here; user already got success for the current one */ });

          } else {
            // MAINTENANCE flow stays the same
            setMaintMeta(latest || null);
            if (latest) {
              resolveImageUrl(numericInspectionId, latest, (u) => setMaintUrl(u));
              pollUntilAnomalies({
                ownerInspectionId: numericInspectionId,
                imageId: latest.id,
                setMeta: (m) => setMaintMeta(m),
              });

            }
          }
        } catch {
          alert("Upload succeeded but response couldn’t be parsed");
        }
        finish();
      } else {
        alert("Upload failed");
        finish();
      }
    };

    xhr.open("POST", primaryUrl.toString(), true);
    const u = getUser();
    if (u && typeof u.id === "number" && Number.isFinite(u.id)) {
      xhr.setRequestHeader("X-User-Id", String(u.id));
    }
    xhr.send(fd);
  }

  function cancelUpload() {
    activeXhr.current?.abort();
    setShowUpload(false);
    setUploadPct(0);
  }

  /* ----- File pickers ----- */
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

  const thermalStatus: Status = (maintMeta || maintUrl) ? "Completed" : (showUpload ? "In Progress" : "Pending");

  // shared zoom ref for maintenance image
  const zoomRef = useRef<ZoomHandle | null>(null);
  const hasMaint = Boolean(maintUrl);
  const hasAnyAnomalies = baselineAnomalies.length > 0 || maintAnomalies.length > 0;


  const numericThreshold = (() => {
    if (typeof temperature === "number") return clampThreshold(temperature);
    if (typeof inspection?.inferenceThreshold === "number") return clampThreshold(inspection.inferenceThreshold);
    return null;
  })();
  const sliderValue = numericThreshold ?? 0.5;

  const onSliderChange = (value: string) => {
    const num = parseFloat(value);
    if (Number.isNaN(num)) {
      setTemperature(null);
      return;
    }
    setTemperature(clampThreshold(num));
  };

  const onNumberChange = (value: string) => {
    if (value.trim() === "") {
      setTemperature(null);
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setTemperature(clampThreshold(num));
  };

  const onNumberBlur = () => {
    if (typeof temperature === "number") {
      setTemperature(clampThreshold(temperature));
    }
  };

  const saveThreshold = useCallback(async () => {
    if (!inspection) {
      setSaveError("Inspection data not loaded yet");
      return;
    }
    try {
      setSaveError(null);
      setSaveSuccess(null);
      setSaving(true);
      const nextThreshold =
        typeof temperature === "number"
          ? clampThreshold(temperature)
          : (typeof inspection.inferenceThreshold === "number"
              ? clampThreshold(inspection.inferenceThreshold)
              : undefined);
      const payload: InspectionDTO = {
        ...inspection,
        inferenceThreshold: nextThreshold,
      };

      const res = await fetch(api(`/inspections/${numericInspectionId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to save inspection ${numericInspectionId}`);
      const updated: InspectionDTO = await res.json();
      setInspection(updated);
      setTemperature(
        typeof updated.inferenceThreshold === "number"
          ? clampThreshold(updated.inferenceThreshold)
          : null
      );
      setHeader({
        transformerNo: updated.transformerNo,
        poleNo: "-",
        branch: updated.branch,
        inspectedBy: "-",
        status: (updated.status as Status) || "Pending",
        lastUpdated: toNiceDateTime(updated.inspectionDate, updated.inspectionTime),
      });
      setSaveSuccess("Inference threshold saved successfully.");
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }, [inspection, numericInspectionId, temperature]);

  /* ----- Render ----- */
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
                      setBaselineOwnerInspectionId(null);
                      if (baselineUrl) URL.revokeObjectURL(baselineUrl);
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

        {/* Chips row like before */}
        <div style={{ display: "flex", gap: 14, marginTop: 16, alignItems: "stretch", flexWrap: "wrap" }}>
          <Chip title="Transformer No" value={header.transformerNo} />
          <Chip title="Pole No" value={header.poleNo} />
          <Chip title="Branch" value={header.branch} />
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
            <span style={pill(thermalStatus)}>{thermalStatus}</span>
          </div>

          <p style={{ color: ui.sub, marginTop: 10 }}>
            Upload a thermal image of the transformer to identify potential issues.
          </p>

          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
              Weather Condition
            </label>
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

          <div style={{ marginTop: 16 }}>
            <label style={{ display: "block", fontWeight: 800, color: ui.sub, marginBottom: 6 }}>
              Inference Threshold
            </label>
            <p style={{ margin: 0, color: ui.sub, fontSize: 12, fontWeight: 600 }}>
              Adjust the threshold (0-1) used when running thermal inference.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={sliderValue}
                onChange={(e) => onSliderChange(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={numericThreshold ?? ""}
                onChange={(e) => onNumberChange(e.target.value)}
                onBlur={onNumberBlur}
                style={{
                  width: 72,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${ui.border}`,
                  fontWeight: 700,
                  textAlign: "center",
                }}
              />
            </div>
            <button
              onClick={saveThreshold}
              disabled={saving || !inspection}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: 0,
                fontWeight: 800,
                cursor: saving || !inspection ? "not-allowed" : "pointer",
                background: saving ? "#c7d2fe" : ui.primary,
                color: "#fff",
                boxShadow: "0 6px 16px rgba(63,81,181,.25)",
                transition: "background .2s ease",
              }}
            >
              {saving ? "Saving..." : "Save inference threshold"}
            </button>
            {saveError && (
              <div style={{ color: ui.danger, fontWeight: 700, marginTop: 8 }}>{saveError}</div>
            )}
            {saveSuccess && !saveError && (
              <div style={{ color: ui.ok, fontWeight: 700, marginTop: 8 }}>{saveSuccess}</div>
            )}
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
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 16,
                  alignItems: "stretch",
                }}
              >
                <Figure title="Baseline" date={baselineMeta?.uploadedAt}>
                  <ZoomableImage
                    src={baselineUrl}
                    alt="Baseline"
                    emptyText="No baseline image"
                    interactive={false}
                    anomalies={baselineAnomalies}
                  />
                </Figure>

                <Figure title="Current" date={maintMeta?.uploadedAt}>
                  <ZoomableImage
                    ref={zoomRef}
                    src={maintUrl}
                    alt="Current"
                    emptyText="No maintenance image"
                    anomalies={maintAnomalies}
                  />
                </Figure>
              </div>

              {hasAnyAnomalies && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {baselineAnomalies.length > 0 && (
                    <AnomalyLegend title="Baseline anomalies" items={baselineAnomalies} />
                  )}
                  {maintAnomalies.length > 0 && (
                    <AnomalyLegend title="Current anomalies" items={maintAnomalies} />
                  )}
                </div>
              )}

              {/* Shared zoom control bar below the two images */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginTop: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
                  Tip: Drag the image to reposition.
                </span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => zoomRef.current?.zoomOut()}
                    disabled={!hasMaint}
                    style={zoomBtnStyle(!hasMaint)}
                  >
                    Zoom Out
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomRef.current?.resetView()}
                    disabled={!hasMaint}
                    style={zoomBtnStyle(!hasMaint)}
                  >
                    Reset View
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomRef.current?.zoomIn()}
                    disabled={!hasMaint}
                    style={zoomBtnStyle(!hasMaint)}
                  >
                    Zoom In
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: ui.sub, fontWeight: 700 }}>
              Upload a Baseline and a Maintenance image to see the side-by-side comparison.
            </div>
          )}
        </div>
      </div>

      {/* Error line */}
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

/* ---------- Tiny UI bits ---------- */
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
const zoomBtnStyle = (disabled: boolean): React.CSSProperties => ({
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