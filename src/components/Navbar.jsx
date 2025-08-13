// components/Navbar.jsx
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useMemo } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 1) NO mostrar en /login
  if (pathname.startsWith("/login")) return null;

  // 2) Leer token/user de forma segura (sin romper si no existen)
  const token = useMemo(() => {
    try { return localStorage.getItem("token"); } catch { return null; }
  }, []);

  let user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  }, []);

  // 3) Si no hay token, no muestres el navbar (evita “menú en login”)
  if (!token) return null;

  const isAdmin = !!user && (
    String(user?.rol || "").toUpperCase() === "ADMIN" ||
    Number(user?.role_id) === 1
  );

  const onLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    navigate("/login", { replace: true });
  };

  return (
    <header style={{ display:"flex", gap:16, padding:"10px 16px", background:"#1a0833", color:"#fff" }}>
      <strong style={{ marginRight: 16 }}>LawComply</strong>

      <nav style={{ display:"flex", gap:12 }}>
        <NavLink to="/home" style={{ color:"#c7b6ff" }}>Inicio</NavLink>
        <NavLink to="/laws" style={{ color:"#c7b6ff" }}>Evaluación</NavLink>
        <NavLink to="/results" style={{ color:"#c7b6ff" }}>Resultados</NavLink>
        {isAdmin && (
          <>
            <NavLink to="/admin" style={{ color:"#ffd27a" }}>Admin</NavLink>
            <NavLink to="/admin/controles" style={{ color:"#ffd27a" }}>Controles</NavLink>
            <NavLink to="/admin/regulaciones" style={{ color:"#ffd27a" }}>Regulaciones</NavLink>
          </>
        )}
      </nav>

      <div style={{ marginLeft:"auto" }}>
        <span style={{ marginRight: 12 }}>
          {user?.nombre || user?.name || user?.email || ""}
        </span>
        <button onClick={onLogout} style={{ padding:"4px 10px" }}>Logout</button>
      </div>
    </header>
  );
}
