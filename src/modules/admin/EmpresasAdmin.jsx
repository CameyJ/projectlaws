// src/modules/admin/EmpresasAdmin.jsx
import { useEffect, useState } from "react";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function EmpresasAdmin() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ nombre: "", rfc: "", contacto: "" });

  const load = async () => {
    try {
      setErr("");
      const r = await fetch(`${API}/api/empresas`, { headers: authHeader() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(data);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las empresas.");
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      setErr("");
      const r = await fetch(`${API}/api/admin/empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const t = await r.text().catch(()=> "");
        throw new Error(`HTTP ${r.status} ${t}`);
      }
      setForm({ nombre: "", rfc: "", contacto: "" });
      await load();
      alert("Empresa creada.");
    } catch (e) {
      console.error(e);
      setErr("Error creando empresa.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Empresas</h1>

      {err && <div style={{background:"#ffe3e3",color:"#8a1a1a",padding:12,borderRadius:8,marginBottom:12}}>
        <strong>Error:</strong> {err}
      </div>}

      <form onSubmit={create} className="g-card" style={{maxWidth:720, marginBottom:16}}>
        <label>Nombre *</label>
        <input value={form.nombre} onChange={e=>setForm(f=>({...f, nombre:e.target.value}))} required />
        <label style={{marginTop:8}}>RFC / Tax ID</label>
        <input value={form.rfc} onChange={e=>setForm(f=>({...f, rfc:e.target.value}))} />
        <label style={{marginTop:8}}>Contacto (email/teléfono)</label>
        <input value={form.contacto} onChange={e=>setForm(f=>({...f, contacto:e.target.value}))} />
        <button type="submit" className="btn-primary" disabled={busy} style={{marginTop:12}}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
      </form>

      <div className="g-card" style={{maxWidth:900}}>
        <h3 style={{marginBottom:12}}>Activas</h3>
        <table className="g-table" style={{minWidth:700}}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>RFC/Tax ID</th>
              <th>Contacto</th>
            </tr>
          </thead>
          <tbody>
            {items.map(x=>(
              <tr key={x.id}>
                <td>{x.nombre}</td>
                <td>{x.rfc || "-"}</td>
                <td>{x.contacto || "-"}</td>
              </tr>
            ))}
            {items.length===0 && (
              <tr><td colSpan={3} style={{textAlign:"center",color:"#777"}}>Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
