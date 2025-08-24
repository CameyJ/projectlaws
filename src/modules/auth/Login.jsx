import React, { useState } from "react";
import "./Login.css";
import logo from "../../assets/logoLOGIN.png";
import rocketImg from "../../assets/Rocket-PNG-High-Quality-Image.png";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = atob(b64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    try {
      const body = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
      };

      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        const message =
          data?.error ||
          (res.status === 401 ? "Usuario o contraseña incorrectos" : "No se pudo iniciar sesión");
        throw new Error(message);
      }

      if (!data?.token) throw new Error("Respuesta inválida del servidor (falta token)");

      localStorage.setItem("token", data.token);

      let user = data.user ?? null;
      if (!user) {
        const payload = decodeJwt(data.token);
        if (payload) {
          user = {
            id: payload.id ?? payload.sub ?? null,
            name: payload.name ?? payload.nombre ?? "",
            email: payload.email ?? "",
            role: payload.role ?? payload.rol ?? "user",
          };
        }
      }
      if (user) localStorage.setItem("user", JSON.stringify(user));

      setMsg("Login exitoso. Redirigiendo…");
      setTimeout(() => navigate("/home"), 800);
    } catch (err) {
      setMsg(err.message || "Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Columna izquierda: tarjeta centrada vertical y horizontalmente */}
      <div className="login-left">
        <div className="login-box">
          <img src={logo} alt="Logo" className="login-logo" />
          <h2>Iniciar sesión</h2>

          <form onSubmit={handleSubmit} noValidate>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          {msg && <div className="login-error">{msg}</div>}
        </div>
      </div>

      {/* Columna derecha: ilustración grande centrada */}
      <div className="login-right">
        <div className="login-illustration">
          <img src={rocketImg} alt="Rocket" />
        </div>
      </div>
    </div>
  );
};

export default Login;
