import { Routes, Route, NavLink } from "react-router-dom";
import Transformers from "./pages/Transformers";
import TransformerDetail from "./pages/TransformerDetail";

export default function App() {
  return (
    <div>
      <header className="header">
        <div className="container header-inner">
          <div className="brand">
            <div className="badge">TT</div>
            <div>
              <div style={{fontWeight:700, fontSize:18}}>TransTrack Admin</div>
              <div className="subtle" style={{fontSize:12}}>EN3350 • Phase 1</div>
            </div>
          </div>

          <nav className="hstack">
            <NavLink to="/" style={({isActive}) => ({
              fontWeight: 700,
              color: isActive ? "var(--primary)" : "inherit"
            })}>
              Transformers
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="container center-top">
        <div style={{width:"100%", maxWidth:1100}}>
          <Routes>
            <Route path="/" element={<Transformers/>} />
            <Route path="/transformers/:id" element={<TransformerDetail/>} />
          </Routes>
        </div>
      </main>

      <footer className="container footer">
        © {new Date().getFullYear()} TransTrack • University of Moratuwa
      </footer>
    </div>
  );
}
