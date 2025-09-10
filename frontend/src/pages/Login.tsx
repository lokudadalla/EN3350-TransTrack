// import { useState } from "react";
// import axios from "axios";
// import { saveUser } from "../auth";

// const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

// export default function Login() {
//   const [mode, setMode] = useState<"login" | "register">("login");
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [msg, setMsg] = useState("");

//   const submit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setMsg("");
//     try {
//       const url = `${API}/auth/${mode}`;
//       const { data } = await axios.post(url, { username, password });
//       saveUser(data);
//       window.location.href = "/";
//     } catch (err: any) {
//       setMsg(err?.response?.data?.message ?? "Failed");
//     }
//   };

//   return (
//     <div style={{ maxWidth: 420, margin: "10vh auto", padding: 24, border: "1px solid #444", borderRadius: 12 }}>
//       <h2>{mode === "login" ? "Login" : "Register"}</h2>
//       <form onSubmit={submit}>
//         <div style={{ marginBottom: 12 }}>
//           <label>Username</label>
//           <input value={username} onChange={e => setUsername(e.target.value)} required style={{ width: "100%" }} />
//         </div>
//         <div style={{ marginBottom: 12 }}>
//           <label>Password</label>
//           <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: "100%" }} />
//         </div>
//         {msg && <p style={{ color: "tomato" }}>{msg}</p>}
//         <button type="submit" style={{ width: "100%", padding: 8 }}>
//           {mode === "login" ? "Login" : "Create account"}
//         </button>
//       </form>
//       <p style={{ marginTop: 12 }}>
//         {mode === "login" ? "No account?" : "Have an account?"}{" "}
//         <a onClick={() => setMode(mode === "login" ? "register" : "login")} style={{ cursor: "pointer" }}>
//           {mode === "login" ? "Register" : "Login"}
//         </a>
//       </p>
//     </div>
//   );
// }





import { useEffect, useMemo, useRef, useState } from "react";
import axios, { AxiosError } from "axios";
import { saveUser } from "../auth";

const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

type Mode = "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const userInputRef = useRef<HTMLInputElement>(null);

  // Focus username on mount / mode change
  useEffect(() => {
    userInputRef.current?.focus();
  }, [mode]);

  // Reset message when inputs change
  useEffect(() => {
    if (msg) setMsg("");
  }, [username, password]);

  const title = useMemo(() => (mode === "login" ? "Login" : "Register"), [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const uname = username.trim();
    const pwd = password;

    // Minimal client-side validation (kept conservative)
    if (uname.length < 2) {
      setMsg("Username must be at least 2 characters.");
      return;
    }
    if (pwd.length < 2) {
      setMsg("Password must be at least 2 characters.");
      return;
    }

    setMsg("");
    setLoading(true);

    // Cancel in-flight if any
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const url = `${API}/auth/${mode}`;
      const { data } = await axios.post(
        url,
        { username: uname, password: pwd },
        {
          signal: abortRef.current.signal,
          // If your API uses cookies for sessions, withCredentials is safer.
          // Flip to true only if your backend is configured for it.
          withCredentials: false,
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        }
      );
      saveUser(data);
      window.location.href = "/";
    } catch (error) {
      // Keep error details minimal to avoid leaking specifics to attackers.
      const ax = error as AxiosError<any>;
      const serverMsg =
        ax?.response?.data?.message && typeof ax.response.data.message === "string"
          ? ax.response.data.message
          : null;

      // Show a gentle generic message; include server message only if it’s not too long.
      const safeServerMsg = serverMsg && serverMsg.length <= 140 ? serverMsg : null;
      setMsg(safeServerMsg ?? (ax.code === "ECONNABORTED" ? "Request timed out. Try again." : "Sign in failed. Check your details and try again."));
    } finally {
      setLoading(false);
    }
  };

  const swapMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setPassword("");
    setMsg("");
  };

  const onPasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // best-effort Caps Lock hint
    const caps = e.getModifierState && e.getModifierState("CapsLock");
    setCapsOn(!!caps);
  };

  return (
      <div
        style={{
          minHeight: "100vh",
          backgroundImage: "url('/login.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "rgba(0,0,0,0.6)", 
          backgroundBlendMode: "multiply",    
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >

       <div
          style={{
            background: "rgba(0,0,0,0.6)",   // semi-transparent dark bg
            padding: "24px 32px",
            borderRadius: "12px",
            maxWidth: "400px",
            width: "100%",
            color: "#fff",
          }}
        >

      <h2 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h2>

      <form onSubmit={submit} noValidate>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="username" style={{ display: "block", marginBottom: 6 }}>
            Username
          </label>
          <input
            id="username"
            ref={userInputRef}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            inputMode="text"
            spellCheck={false}
            minLength={3}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #3a3a3a",
              background: "#111",
              color: "#fff",
              outline: "none",
            }}
            onFocus={(e) => e.currentTarget.select()}
            aria-invalid={!!msg}
          />
        </div>

        <div style={{ marginBottom: 6 }}>
          <label htmlFor="password" style={{ display: "block", marginBottom: 6 }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={onPasswordKey}
              onKeyDown={onPasswordKey}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              style={{
                width: "100%",
                padding: "10px 44px 10px 12px",
                borderRadius: 10,
                border: "1px solid #3a3a3a",
                background: "#111",
                color: "#fff",
                outline: "none",
              }}
              aria-invalid={!!msg}
            />
            <button
              type="button"
              onClick={() => setShowPwd((s) => !s)}
              aria-label={showPwd ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 6,
                top: 6,
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #2f2f2f",
                background: "#1a1a1a",
                color: "#ddd",
                cursor: "pointer",
              }}
            >
              {showPwd ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {capsOn && (
          <div style={{ marginBottom: 8, fontSize: 12, color: "#ffb86c" }}>
            Caps Lock is on
          </div>
        )}

        {msg && (
          <p
            role="alert"
            aria-live="assertive"
            style={{ color: "#ff6b6b", margin: "8px 0 0 0", minHeight: 18 }}
          >
            {msg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            marginTop: 12,
            borderRadius: 10,
            border: "1px solid #3a3a3a",
            background: loading ? "#2a2a2a" : "#1f6feb",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        {mode === "login" ? "No account?" : "Have an account?"}{" "}
        <button
          type="button"
          onClick={swapMode}
          style={{
            cursor: "pointer",
            background: "transparent",
            border: "none",
            color: "#58a6ff",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {mode === "login" ? "Register" : "Login"}
        </button>
      </p>
      </div>
    </div>
  );
}
