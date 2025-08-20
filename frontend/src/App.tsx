// src/App.tsx
import { Routes, Route, Link } from "react-router-dom";
import Transformers from "./pages/Transformers";
import TransformerDetail from "./pages/TransformerDetail";

export default function App() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <h2>Admin Dashboard</h2>
        <nav><Link to="/">Transformers</Link></nav>
      </header>

      <Routes>
        <Route path="/" element={<Transformers />} />
        <Route path="/transformers/:id" element={<TransformerDetail />} />
      </Routes>
    </div>
  );
}
