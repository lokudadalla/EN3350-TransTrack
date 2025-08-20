// src/components/UserMenu.tsx
import { useEffect, useRef, useState } from "react";

type Props = {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  onNavigateProfile: () => void;
  onSignOut: () => void;
};

export default function UserMenu({ user, onNavigateProfile, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const chipStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 10px",
    borderRadius: 999,
    background: "#f5f7ff",
    boxShadow: "0 3px 14px rgba(36,57,131,0.08)",
    border: "1px solid #e8eef8",
    cursor: "pointer",
    userSelect: "none",
  };

  const avatarStyle: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    objectFit: "cover",
    background: "#e2e8f0",
  };

  const nameStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 14,
    lineHeight: 1.1,
  };

  const emailStyle: React.CSSProperties = {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.1,
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div style={chipStyle} onClick={() => setOpen((v) => !v)}>
        <img
          src={user.avatarUrl || ""}
          alt={user.name}
          style={avatarStyle}
          onError={(e) => ((e.currentTarget.style.visibility = "hidden"))}
        />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={nameStyle}>{user.name}</span>
          <span style={emailStyle}>{user.email}</span>
        </div>
        <span aria-hidden>▾</span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            background: "#fff",
            border: "1px solid #e8eef8",
            borderRadius: 12,
            boxShadow: "0 12px 28px rgba(36,57,131,0.18)",
            minWidth: 200,
            overflow: "hidden",
            zIndex: 50,
          }}
        >
          <button
            onClick={() => {
              setOpen(false);
              onNavigateProfile();
            }}
            style={menuBtn}
          >
            Profile
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            style={{ ...menuBtn, color: "#dc2626" }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

const menuBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: 0,
  padding: "10px 14px",
  fontWeight: 600,
  cursor: "pointer",
};
