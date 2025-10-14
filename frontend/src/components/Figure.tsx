export function Figure({
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
          width: "100%",
          minHeight: 320,
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