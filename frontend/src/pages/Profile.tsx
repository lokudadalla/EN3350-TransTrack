// src/pages/Profile.tsx
import { useState } from "react";

export default function Profile() {
  const [name, setName] = useState("Trans Track");
  const [email, setEmail] = useState("transtrack@gmail.com");
  const [role, setRole] = useState("Electronic Engineer");

  function save(e: React.FormEvent) {
    e.preventDefault();
  
    alert("Saved (mock): " + JSON.stringify({ name, email, role }, null, 2));
  }

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <h2 style={{ margin: 0 }}>Profile</h2>

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={save} className="vstack" style={{ gap: 12 }}>
          <div className="vstack">
            <label className="subtle">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="vstack">
            <label className="subtle">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="vstack">
            <label className="subtle">Role</label>
            <input
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role"
            />
          </div>

          <div className="hstack" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn-ghost" type="button" onClick={() => window.history.back()}>
              Cancel
            </button>
            <button className="btn-cta" type="submit">
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
