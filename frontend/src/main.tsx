// import React, { type ReactNode } from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import App from "./App";
// import Login from "./pages/Login";
// import { isAuthed } from "./auth";
// import "./index.css";

// function Private({ children }: { children: ReactNode }) {
//   return isAuthed() ? <>{children}</> : <Navigate to="/login" replace />;
// }

// ReactDOM.createRoot(document.getElementById("root")!).render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <Routes>
//         <Route path="/login" element={<Login />} />
//         <Route path="/*" element={<Private><App/></Private>} />
//       </Routes>
//     </BrowserRouter>
//   </React.StrictMode>
// );



import React, { type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import Login from "./pages/Login";
import { isAuthed } from "./auth";
import { UserProvider } from "./UserContext";
import "./index.css";

function Private({ children }: { children: ReactNode }) {
  return isAuthed() ? <>{children}</> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
       <UserProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Private><App/></Private>} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
