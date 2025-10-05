// // src/pages/Profile.tsx
// import { useState } from "react";
// import { useUser } from "../UserContext";
// import { getUser, saveUser, isAuthed } from "../auth";

// export default function Profile() {
//   const { setUser } = useUser();
//   const [name, setName] = useState("Trans Track");
//   const [email, setEmail] = useState("transtrack@gmail.com");
//   const [role, setRole] = useState("Electronic Engineer");

//   function save(e: React.FormEvent) {
//     e.preventDefault();
//     // TODO: connect to backend when ready
//     const updated = { name, email, role };
//     setUser(updated);
//     alert("Saved (mock): " + JSON.stringify({ name, email, role }, null, 2));
//   }

//   return (
//     <div className="vstack" style={{ gap: 16 }}>
//       <h2 style={{ margin: 0 }}>Profile</h2>

//       <div className="card" style={{ maxWidth: 640 }}>
//         <form onSubmit={save} className="vstack" style={{ gap: 12 }}>
//           <div className="vstack">
//             <label className="subtle">Name</label>
//             <input
//               className="input"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               placeholder="Full name"
//             />
//           </div>
//           <div className="vstack">
//             <label className="subtle">Email</label>
//             <input
//               className="input"
//               type="email"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               placeholder="email@example.com"
//             />
//           </div>
//           <div className="vstack">
//             <label className="subtle">Role</label>
//             <input
//               className="input"
//               value={role}
//               onChange={(e) => setRole(e.target.value)}
//               placeholder="Role"
//             />
//           </div>

//           <div className="hstack" style={{ justifyContent: "flex-end", gap: 10 }}>
//             <button className="btn-ghost" type="button" onClick={() => window.history.back()}>
//               Cancel
//             </button>
//             <button className="btn-cta" type="submit">
//               Save changes
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }




import { useState } from "react";
import { Navigate } from "react-router-dom";
import { getUser, saveUser, isAuthed } from "../auth";

export default function Profile() {
  if (!isAuthed()) return <Navigate to="/login" replace />;

  const u = getUser();

  // email is stored inside username
  const email = u?.username ?? "";
  const baseName = email.includes("@") ? email.split("@")[0] : email;

  const [name, setName] = useState(baseName);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!u) return;

    // save user again with same id and full email in username
    // we keep full email as "username" field, but show first-part as display name
    const updated = { id: u.id, username: email };
    saveUser(updated);

    alert(
      "Saved (mock): " +
        JSON.stringify({ displayName: name, email }, null, 2)
    );
  }

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <h2 style={{ margin: 0 }}>Profile</h2>

      <div className="card" style={{ maxWidth: 640 }}>
        <form onSubmit={save} className="vstack" style={{ gap: 12 }}>
          <div className="vstack">
            <label className="subtle">Display Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (before @)"
            />
          </div>

          <div className="vstack">
            <label className="subtle">Email</label>
            <input className="input" type="email" value={email} disabled />
          </div>

          <div className="hstack" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => window.history.back()}
            >
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
