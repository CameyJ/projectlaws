// components/Navbar.jsx
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useMemo } from "react";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 1) Ocultar navbar en /login
  if (pathname.startsWith("/login")) return null;

  // 2) Leer token y user de forma segura
  const token = useMemo(() => {
    try { return localStorage.getItem("token"); } catch { return null; }
  }, []);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  }, []);

  // 3) Si no hay token, no mostrar navbar
  if (!token) return null;

  const isAdmin =
    !!user &&
    (String(user?.rol || "").toUpperCase() === "ADMIN" || Number(user?.role_id) === 1);

  const onLogout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch {}
    navigate("/login", { replace: true });
  };

  const linkStyle = ({ isActive }) => ({
    color: isActive ? "#fff" : "#c7b6ff",
    textDecoration: "none",
    fontWeight: 500,
    padding: "4px 6px",
    borderRadius: 6,
    background: isActive ? "rgba(255,255,255,.1)" : "transparent",
  });

  const adminLinkStyle = ({ isActive }) => ({
    color: isActive ? "#1a0833" : "#ffd27a",
    textDecoration: "none",
    fontWeight: 600,
    padding: "4px 6px",
    borderRadius: 6,
    background: isActive ? "#ffd27a" : "transparent",
  });

  return (
    <header
      style={{
        display: "flex",
        gap: 16,
        padding: "10px 16px",
        background: "#1a0833",
        color: "#fff",
        alignItems: "center",
      }}
    >
      <strong style={{ marginRight: 16 }}>LawComply</strong>

      <nav style={{ display: "flex", gap: 12 }}>
        <NavLink to="/home" style={linkStyle}>Inicio</NavLink>
        <NavLink to="/laws" style={linkStyle}>Evaluación</NavLink>
        <NavLink to="/results" style={linkStyle}>Resultados</NavLink>

        {isAdmin && (
          <>
            <NavLink to="/admin" style={adminLinkStyle}>Admin</NavLink>
            <NavLink to="/admin/empresas" style={adminLinkStyle}>Empresas</NavLink> {/* ⬅️ NUEVO */}
            <NavLink to="/admin/regulaciones" style={adminLinkStyle}>Regulaciones</NavLink>
           
            {/* Opcionales */}
            <NavLink to="/admin/articulos" style={adminLinkStyle}>Artículos</NavLink>
           
            {/* Importador de PDF */}
            <NavLink to="/admin/importar" style={adminLinkStyle}>Importar PDF</NavLink>
          </>
        )}
      </nav>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ opacity: 0.85 }}>
          {user?.nombre || user?.name || user?.email || ""}
        </span>
        <button
          onClick={onLogout}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "none",
            background: "#ff6b00",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
