import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

type Status = "Completed" | "In Progress" | "Pending";

interface Inspection {
  inspectionNo: string;
  inspectedDate: string;
  status: Status;
}

interface TransformerMeta {
  id: string;
  poleNo: string;
  type: "Bulk" | "Distribution";
  region: string;
  location: string;
  lastInspected: string;
}

type LocState = {
  inspection?: Inspection;
  transformer?: TransformerMeta;
};

const color = {
  bg: "#f6f8fb",
  card: "#ffffff",
  text: "#0f172a",
  subtext: "#64748b",
  primary: "#3f51b5",
  danger: "#dc2626",
  border: "#e6eaf2",
  shadow: "0 10px 30px rgba(31,41,55,0.08)",
};

function statusPillStyle(s: Status): React.CSSProperties {
  if (s === "Completed")
    return {
      display: "inline-flex",
      padding: "6px 12px",
      borderRadius: 999,
      fontWeight: 700,
      background: "rgba(34,197,94,.12)",
      color: "#16a34a",
    };
  if (s === "In Progress")
    return {
      display: "inline-flex",
      padding: "6px 12px",
      borderRadius: 999,
      fontWeight: 700,
      background: "rgba(250,204,21,.20)", // yellow
      color: "#ca8a04",
    };
  return {
    display: "inline-flex",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 700,
    background: "rgba(244,63,94,.12)",
    color: "#f43f5e",
  };
}

const chip: React.CSSProperties = {
  background: "#eef2ff",
  border: "1px solid #e0e7ff",
  borderRadius: 14,
  padding: "10px 14px",
  minWidth: 120,
  textAlign: "center",
  boxShadow: "0 6px 14px rgba(79,70,229,0.12)",
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "12px 18px",
  borderRadius: 14,
  fontWeight: 800,
  color: "#fff",
  background: color.primary,
  border: "1px solid transparent",
  cursor: "pointer",
  boxShadow: "0 10px 25px rgba(63,81,181,.25)",
  width: "100%",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  outline: "none",
  fontSize: 15,
};

export default function InspectionDetail() {
  const navigate = useNavigate();
  const { transformerId, inspectionNo } = useParams<{
    transformerId: string;
    inspectionNo: string;
  }>();
  const location = useLocation();
  const { inspection: passedInspection, transformer: passedTransformer } =
    (location.state as LocState) || {};

  const inspection = useMemo<Inspection>(
    () =>
      passedInspection || {
        inspectionNo: inspectionNo ?? "00000000",
        inspectedDate: "Mon(21), May, 2023 12:55pm",
        status: "In Progress",
      },
    [passedInspection, inspectionNo]
  );

  const transformer = useMemo<TransformerMeta>(
    () =>
      passedTransformer || {
        id: transformerId ?? "TX-1001",
        poleNo: "EN-122-A",
        type: "Bulk",
        region: "Nugegoda",
        location: `"Keels", Embuldeniya`,
        lastInspected: inspection.inspectedDate,
      },
    [passedTransformer, transformerId, inspection.inspectedDate]
  );

  // Baseline image (object URL for preview/view)
  const [baselineImageUrl, setBaselineImageUrl] = useState<string | null>(null);

  // Maintenance upload state
  const [thermalFile, setThermalFile] = useState<File | null>(null);
  const [weather, setWeather] = useState<"Sunny" | "Cloudy" | "Rainy">("Sunny");
  const [uploading, setUploading] = useState(false);

  // Progress steps
  const [stepUpload, setStepUpload] = useState<Status>("Pending");
  const [stepAI, setStepAI] = useState<Status>("Pending");
  const [stepReview, setStepReview] = useState<Status>("Pending");

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (baselineImageUrl) URL.revokeObjectURL(baselineImageUrl);
    };
  }, [baselineImageUrl]);

  //  Baseline handlers 
  function handleBaselinePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (baselineImageUrl) URL.revokeObjectURL(baselineImageUrl);
    setBaselineImageUrl(url);
  }
  function viewBaseline() {
    if (baselineImageUrl) window.open(baselineImageUrl, "_blank");
  }
  function deleteBaseline() {
    if (baselineImageUrl) URL.revokeObjectURL(baselineImageUrl);
    setBaselineImageUrl(null);
  }

  // -------- Thermal upload flow --------
  function startUpload() {
    if (!thermalFile) return;
    setUploading(true);

    setStepUpload("In Progress");
    setStepAI("Pending");
    setStepReview("Pending");


    setTimeout(() => {
      setStepUpload("Completed");
      setStepAI("In Progress");

      setTimeout(() => {
        setStepAI("Completed");
        setStepReview("In Progress");

        setTimeout(() => {
          setStepReview("Completed");
          setUploading(false);
        }, 1200);
      }, 1200);
    }, 1200);
  }

  return (
    <div style={{ background: color.bg, minHeight: "100vh", padding: "14px 0 28px 0" }}>
      {/* HEADER BAR */}
      <div
        style={{
          background: color.card,
          border: `1px solid ${color.border}`,
          borderRadius: 16,
          padding: 18,
          margin: "0 28px 18px 28px",
          boxShadow: color.shadow,
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: 16,
          alignItems: "center",
        }}
      >
        {/* Left: Back + title + chips */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <button
              onClick={() => navigate(-1)}
              title="Back"
              style={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 12,
                background: "#eef2ff",
                border: "1px solid #e0e7ff",
                cursor: "pointer",
                fontSize: 16,
                color: "#111827",
              }}
            >
              ◀
            </button>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: color.text }}>{inspection.inspectionNo}</div>
              <div style={{ fontSize: 12, color: color.subtext, fontWeight: 700 }}>{inspection.inspectedDate}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Chip label="Transformer No" value={transformer.id} />
            <Chip label="Pole No" value={transformer.poleNo} />
            <Chip label="Branch" value={transformer.region} />
            <Chip label="Inspected By" value="A-110" />
          </div>
        </div>

        {/* Center: last updated + status pill */}
        <div style={{ justifySelf: "end", textAlign: "right" }}>
          <div style={{ color: color.subtext, fontWeight: 800 }}>
            Last updated: <span style={{ color: color.text }}>{inspection.inspectedDate}</span>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={statusPillStyle(inspection.status)}>{inspection.status}</span>
          </div>
        </div>

        {/* Right: Baseline Image block */}
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
            lineHeight: 1,
            cursor: "pointer",
          }}
          onClick={() => document.getElementById("baseline-upload-detail")?.click()}
        >
          <input
            id="baseline-upload-detail"
            type="file"
            accept="image/*"
            onChange={handleBaselinePicked}
            style={{ display: "none" }}
          />

          <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, color: "#111827" }}>
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
            <span>Baseline Image</span>
          </span>

          <div style={{ marginLeft: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <button
              title="View"
              onClick={(e) => {
                e.stopPropagation();
                viewBaseline();
              }}
              disabled={!baselineImageUrl}
              style={{
                ...actionIconBtn,
                color: "#4338ca",
                cursor: baselineImageUrl ? "pointer" : "not-allowed",
                opacity: baselineImageUrl ? 1 : 0.5,
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
              disabled={!baselineImageUrl}
              style={{
                ...actionIconBtn,
                color: color.danger,
                cursor: baselineImageUrl ? "pointer" : "not-allowed",
                opacity: baselineImageUrl ? 1 : 0.5,
              }}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 18, padding: "0 28px" }}>
        <div
          style={{
            background: color.card,
            border: `1px solid ${color.border}`,
            borderRadius: 16,
            padding: 18,
            boxShadow: color.shadow,
            height: "fit-content",
          }}
        >
          {/* Card header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: color.text }}>Thermal Image</div>
            <span style={statusPillStyle("Pending")}>Pending</span>
          </div>

          <div style={{ color: color.subtext, fontSize: 14, marginBottom: 14 }}>
            Upload a thermal image of the transformer to identify potential issues.
          </div>

          {/* Weather */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontWeight: 700, display: "block", marginBottom: 6, color: color.subtext }}>
              Weather Condition
            </label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value as "Sunny" | "Cloudy" | "Rainy")}
              style={inputStyle}
            >
              <option value="Sunny">Sunny</option>
              <option value="Cloudy">Cloudy</option>
              <option value="Rainy">Rainy</option>
            </select>
          </div>

          {/* Upload button */}
          <input
            id="thermal-file"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setThermalFile(f);
              if (f) startUpload();
            }}
            style={{ display: "none" }}
          />

          <button
            onClick={() => document.getElementById("thermal-file")?.click()}
            style={{ ...primaryBtn, opacity: uploading ? 0.7 : 1 }}
            disabled={uploading}
          >
            {uploading ? "Processing…" : "Upload thermal image"}
          </button>

          {/* Progress */}
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10, color: color.text }}>Progress</div>
            <ProgressRow title="Thermal Image Upload" status={stepUpload} />
            <ProgressRow title="AI Analysis" status={stepAI} />
            <ProgressRow title="Thermal Image Review" status={stepReview} />
          </div>
        </div>

        {/* RIGHT COLUMN:*/}
        <div></div>
      </div>

      <div style={{ height: 28 }} />
      <footer style={{ color: color.subtext, fontSize: 12, fontWeight: 700, padding: "0 28px" }}>
        © 2025 TransTrack • University of Moratuwa
      </footer>
    </div>
  );
}

/* Helpers  */

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div style={chip}>
      <div style={{ fontWeight: 900, color: "#111827" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>{label}</div>
    </div>
  );
}

function ProgressRow({ title, status }: { title: string; status: Status }) {
  const barColor =
    status === "Completed" ? "#16a34a" : status === "In Progress" ? "#ca8a04" : "#e5e7eb";
  const textColor =
    status === "Completed" ? "#16a34a" : status === "In Progress" ? "#ca8a04" : "#9ca3af";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: barColor }} />
      <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999 }}>
        <div
          style={{
            height: 6,
            width: status === "Completed" ? "100%" : status === "In Progress" ? "55%" : "8%",
            background: barColor,
            borderRadius: 999,
            transition: "width .4s ease",
          }}
        />
      </div>
      <span style={{ fontWeight: 800, color: textColor, fontSize: 13 }}>{status}</span>
    </div>
  );
}

