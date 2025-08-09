import React, { useState } from "react";
import "./Login.css";
import logo from "../../assets/logoLOGIN.png";
import rocketImg from "../../assets/Rocket-PNG-High-Quality-Image.png";
import { useNavigate } from "react-router-dom";

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
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.token);
        setMsg("Login exitoso. Redirigiendo...");
        setTimeout(() => {
          navigate("/home");
        }, 1200); // 1.2 segundos antes de redirigir
      } else {
        setMsg(data.error || "Error de autenticación");
      }
    } catch {
      setMsg("Error de conexión al servidor");
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <img src={logo} alt="Logo" className="login-logo"/>
        <h2>Iniciar sesión</h2>
        <form onSubmit={handleSubmit}>
          <label>Correo electrónico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <label>Contraseña</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</button>
        </form>
        {msg && <div className="login-error">{msg}</div>}
      </div>
      <div className="login-illustration">
        <img src={rocketImg} alt="Rocket" />
      </div>
    </div>
  );
};

export default Login;
