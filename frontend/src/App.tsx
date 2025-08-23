import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Transformers from "./pages/Transformers";
import TransformerDetail from "./pages/TransformerDetail";
import InspectionsPage from "./pages/InspectionsPage"; 
import InspectionDetail from "./pages/InspectionDetail"; 
import Profile from "./pages/Profile";
import SegmentTabs from "./components/SegmentTabs";
import UserMenu from "./components/UserMenu";
import "./index.css";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const active = location.pathname.startsWith("/inspections")
    ? "inspections"
    : "transformers";

  return (
    <div>
      {/* Line 1 — Brand + User */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 28px",
          borderBottom: "1px solid #eef1f6",
          background: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "#3f51b5",
              color: "#fff",
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
            }}
          >
            TT
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>TransTrack Admin</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>EN3350 • Phase 1</div>
          </div>
        </div>

        {/* User menu ) */}
        <UserMenu
          user={{
            name: "Trans Track",
            email: "transtrack@gmail.com",
            avatarUrl:
              "https://i.pravatar.cc/64?img=12", 
          }}
          onNavigateProfile={() => navigate("/profile")}
          onSignOut={() => alert("Sign out: plug your auth here")}
        />
      </header>

      {/* Line 2 — Segmented tabs */}
      <div style={{ padding: "16px 28px 0 28px" }}>
        <SegmentTabs
          active={active}
          onChange={(value) => {
            if (value === "transformers") navigate("/transformers");
            else navigate("/inspections");
          }}
        />
      </div>

      {/* Body */}
      <main style={{ padding: "18px 28px 32px 28px" }}>
        <Routes>
          <Route path="/" element={<Transformers />} />
          <Route path="/transformers" element={<Transformers />} />
          <Route path="/transformers/:id" element={<TransformerDetail />} />
          <Route path="/transformers/:transformerId/inspections" element={<InspectionsPage />} /> {/* Updated route */}
          <Route path="/transformers/:transformerId/inspections/:inspectionNo" element={<InspectionDetail />} /> {/* ✅ New detail route */}
          <Route path="/profile" element={<Profile />} />
        </Routes>

        <footer style={{ marginTop: 28, color: "#64748b", fontSize: 12 }}>
          © 2025 TransTrack • University of Moratuwa
        </footer>
      </main>
    </div>
  );
}
