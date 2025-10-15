import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getUser } from "../auth"; // adjust path if needed
import type { ZoomHandle } from "../types/models";
import { ZoomableImage } from "../components/ZoomableImage";
import type { InspectionDTO, ImageMeta, TransformerHeader, Status, ImageType, Condition } from "../types/models";
import { pollUntilAnomalies, resolveImageUrl, authHeaders, api, maintenanceForThisInspection, getInspectionIdsForTransformer, uploadImageToInspection, saveImageAnomalies, deleteImageAnomaly } from "../api/Inspections";
import { Figure } from "../components/Figure";
import { AnomalyLegend } from "../components/AnomalyLegend";

// moved out
import { ui, pill, Chip, iconBtn, zoomBtnStyle } from "../ui/ui";
import { toNiceDateTime, clampThreshold, toDisplayAnomalies } from "../utils/utils";

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

  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  async function saveEditsForIndex(idx: number) {
    if (!maintMeta?.id) return;
    const all = (maintMeta.anomalies ?? []).map(a => ({
      id: a.id,
      x: a.x, y: a.y, width: a.width, height: a.height,
      label: a.label, score: a.score, size: a.size,
    }));

    if (!all[idx]) return;

    try {
      setSavingIdx(idx);
      setSaveError(null);
      setSaveSuccess(null);

      const updated = await saveImageAnomalies({
        ownerInspectionId: numericInspectionId,
        imageId: maintMeta.id,
        anomalies: all,
      });

      if (updated) setMaintMeta(updated); // if API returns fresh ImageMeta
      setSaveSuccess(`Anomaly #${idx + 1} saved.`);
    } catch (e: any) {
      setSaveError(e?.message ?? `Failed to save anomaly #${idx + 1}`);
    } finally {
      setSavingIdx(null);
    }
  }

  async function deleteAnomalyAtIndex(idx: number) {
    if (!maintMeta?.id) return;
    const current = maintMeta.anomalies ?? [];
    const target = current[idx];
    if (!target) return;

    try {
      setDeletingIdx(idx);
      setSaveError(null);
      setSaveSuccess(null);

      // Prefer DELETE when id exists; otherwise PUT filtered list
      let updated: ImageMeta | null = null;

      if (typeof target.id === "number" && Number.isFinite(target.id)) {
        updated = await deleteImageAnomaly({
          ownerInspectionId: numericInspectionId,
          imageId: maintMeta.id,
          anomalyId: target.id,
        });
        // If backend doesn’t return updated meta, update UI optimistically:
        if (!updated) {
          const next = current.filter((_, i) => i !== idx);
          setMaintMeta(m => (m ? { ...m, anomalies: next } : m));
        } else {
          setMaintMeta(updated);
        }
      } else {
        // No id: PUT all anomalies except this one
        const next = current.filter((_, i) => i !== idx).map(a => ({
          id: a.id,
          x: a.x, y: a.y, width: a.width, height: a.height,
          label: a.label, score: a.score, size: a.size,
        }));
        updated = await deleteImageAnomaly({
          ownerInspectionId: numericInspectionId,
          imageId: maintMeta.id,
          nextAnomalies: next,
        });
        setMaintMeta(updated ?? (m => (m ? { ...m!, anomalies: next } : m)));
      }

      setSaveSuccess(`Anomaly #${idx + 1} deleted.`);
    } catch (e: any) {
      setSaveError(e?.message ?? `Failed to delete anomaly #${idx + 1}`);
    } finally {
      setDeletingIdx(null);
    }
  }

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

    (async () => {
      if (!numericInspectionId) return;
      const [globalBase, maint] = await Promise.all([latestBaselineForTransformer(), maintenanceForThisInspection(numericInspectionId)]);
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

  // CHANGED: startUpload — baseline path uploads to ALL inspections for the transformer
  function startUpload(t: ImageType, file: File) {
    setUploadPct(0);
    setShowUpload(true);

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

      const finish = () => {
        setShowUpload(false);
        activeXhr.current = null;
      };

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const list: ImageMeta[] = JSON.parse(xhr.responseText);
          const latest = list?.[0];

          if (t === "BASELINE") {
            setBaselineMeta(latest || null);
            setBaselineOwnerInspectionId(numericInspectionId);
            if (latest) resolveImageUrl(numericInspectionId, latest, (u) => setBaselineUrl(u));

            const blob = file.slice(0, file.size, file.type);
            const allIds = await getInspectionIdsForTransformer(header.transformerNo);
            const others = allIds.filter(id => id !== numericInspectionId);

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
            ).catch(() => {});
          } else {
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
                    editable
                    onChangeAnomalies={(next) => {
                      setMaintMeta((m) => (m ? { ...m, anomalies: next } : m));
                    }}
                  />
                </Figure>
              </div>

              {(baselineAnomalies.length > 0 || maintAnomalies.length > 0) && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 16,
                    marginTop: 12,
                    alignItems: "start",
                  }}
                >
                  {baselineAnomalies.length > 0 && (
                    <AnomalyLegend title="Baseline anomalies" items={baselineAnomalies} />
                  )}

                  {maintAnomalies.length > 0 && (
                    <AnomalyLegend
                      title="Current anomalies"
                      items={maintAnomalies}
                      rightRenderer={(_, i) => (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => saveEditsForIndex(i)}
                            disabled={savingIdx === i || deletingIdx === i}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid #c3d21aff",
                              background: savingIdx === i ? "#1f2a44" : "#0b1224",
                              color: "#e2e8f0",
                              fontWeight: 800,
                              cursor: savingIdx === i || deletingIdx === i ? "not-allowed" : "pointer",
                              boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
                              minWidth: 88,
                            }}
                            title="Save edited bbox"
                          >
                            {savingIdx === i ? "saving..." : "save edits"}
                          </button>

                          <button
                            onClick={() => deleteAnomalyAtIndex(i)}
                            disabled={savingIdx === i || deletingIdx === i}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid #c3d21aff",
                              background: deletingIdx === i ? "#3b0f13" : "#1a0f12",
                              color: "#fecaca",
                              fontWeight: 800,
                              cursor: savingIdx === i || deletingIdx === i ? "not-allowed" : "pointer",
                              boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
                              minWidth: 72,
                            }}
                            title="Delete this anomaly"
                          >
                            {deletingIdx === i ? "deleting..." : "delete"}
                          </button>
                        </div>
                      )}
                    />
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

    </div>
  );
}
