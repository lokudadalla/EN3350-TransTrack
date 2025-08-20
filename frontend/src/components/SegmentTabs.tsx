// src/components/SegmentTabs.tsx
type Props = {
  active: "transformers" | "inspections";
  onChange: (value: "transformers" | "inspections") => void;
};

export default function SegmentTabs({ active, onChange }: Props) {
  const baseBtn: React.CSSProperties = {
    padding: "10px 18px",
    borderRadius: 12,
    border: "1px solid #e8eef8",
    fontWeight: 600,
    cursor: "pointer",
    background: "#fff",
  };

  const activeBtn: React.CSSProperties = {
    ...baseBtn,
    background: "#3f51b5",
    color: "#fff",
    boxShadow: "0 6px 18px rgba(63,81,181,0.25)",
    border: "1px solid #3f51b5",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        background: "#f4f7ff",
        borderRadius: 14,
        padding: 6,
        gap: 6,
        boxShadow: "0 3px 18px rgba(36,57,131,0.06)",
      }}
    >
      <button
        style={active === "transformers" ? activeBtn : baseBtn}
        onClick={() => onChange("transformers")}
      >
        Transformers
      </button>
      <button
        style={active === "inspections" ? activeBtn : baseBtn}
        onClick={() => onChange("inspections")}
      >
        Inspections
      </button>
    </div>
  );
}
