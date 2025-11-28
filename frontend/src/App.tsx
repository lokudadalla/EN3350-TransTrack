import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import Transformers from "./pages/Transformers";
import TransformerDetail from "./pages/TransformerDetail";
import InspectionsPage from "./pages/InspectionsPage";
import InspectionDetail from "./pages/InspectionDetail";
import MaintenanceHistoryPage from "./pages/MaintenanceHistory";
import Profile from "./pages/Profile";
import SegmentTabs from "./components/SegmentTabs";
import UserMenu from "./components/UserMenu";
import "./index.css";
import { isAuthed, logout, getUser } from "./auth";

export default function App() {
  if (!isAuthed()) return <Navigate to="/login" replace />;

  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();

  const email = user?.username ?? " ";
  const name = email.split("@")[0];

  const active = location.pathname.startsWith("/inspections") ? "inspections" : "transformers";

  return (
    <div>
      {/* Line 1 – Brand + User */}
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
            <div style={{ fontSize: 12, color: "#64748b" }}>EN3350 – Phase 1</div>
          </div>
        </div>

        <UserMenu
          user={{
            name,
            email,
            avatarUrl: `https://i.pravatar.cc/64?u=${encodeURIComponent(email)}`,
          }}
          onNavigateProfile={() => navigate("/profile")}
          onSignOut={() => {
            logout();
            navigate("/login", { replace: true });
          }}
        />
      </header>

      {/* Line 2 – Segmented tabs */}
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
          <Route path="/transformers/:transformerId/inspections" element={<InspectionsPage />} />
          <Route path="/transformers/:transformerId/inspections/:inspectionNo" element={<InspectionDetail />} />
          <Route path="/transformers/:transformerId/history" element={<MaintenanceHistoryPage />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>

        <footer style={{ marginTop: 28, color: "#64748b", fontSize: 12 }}>
          Ac 2025 TransTrack – University of Moratuwa
        </footer>
      </main>
    </div>
  );
}
