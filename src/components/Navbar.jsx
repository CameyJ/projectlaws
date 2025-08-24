// components/Navbar.jsx
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useMemo } from "react";
import "./Navbar.css";
import logo from "../assets/logo.PNG";

export default function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname.startsWith("/login")) return null;

  const token = useMemo(() => {
    try { return localStorage.getItem("token"); } catch { return null; }
  }, []);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  }, []);

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
    padding: "6px 10px",
    borderRadius: 8,
    background: isActive ? "rgba(255,255,255,.12)" : "transparent",
  });

  const adminLinkStyle = ({ isActive }) => ({
    color: isActive ? "#1a0833" : "#ffd27a",
    textDecoration: "none",
    fontWeight: 700,
    padding: "6px 10px",
    borderRadius: 8,
    background: isActive ? "#ffd27a" : "transparent",
  });

  return (
    <header className="navbar">
      <div className="navbar-logo">
        <img src={logo} alt="LawComply" />
      </div>

      <nav>
        <ul className="navbar-links">
          <li><NavLink to="/home" style={linkStyle}>Inicio</NavLink></li>
          <li><NavLink to="/laws" style={linkStyle}>Evaluación</NavLink></li>
          <li><NavLink to="/results" style={linkStyle}>Resultados</NavLink></li>

          {isAdmin && (
            <>
              <li><NavLink to="/admin/empresas" style={adminLinkStyle}>Empresas</NavLink></li>
              <li><NavLink to="/admin/regulaciones" style={adminLinkStyle}>Regulaciones</NavLink></li>
              <li><NavLink to="/admin/articulos" style={adminLinkStyle}>Artículos</NavLink></li>
              <li><NavLink to="/admin/importar" style={adminLinkStyle}>Importar PDF</NavLink></li>
            </>
          )}
        </ul>
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ opacity: 0.9, color: "#fff" }}>
          {user?.nombre || user?.name || user?.email || ""}
        </span>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>
    </header>
  );
}

