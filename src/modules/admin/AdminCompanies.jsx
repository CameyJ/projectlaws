// src/modules/admin/AdminCompanies.jsx
import { useEffect, useState } from "react";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminCompanies() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // form
  const [name, setName] = useState("");
  const [nit, setNit] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const normalizeCompany = (raw) => ({
    id: raw.id,
    name: raw.name || "",
    nit: raw.tax_id || "",           // <— NIT desde tax_id
    address: raw.address || "",
    phone: raw.phone || "",
    active: !!raw.is_active,         // <— Estado desde is_active
    created_at: raw.created_at || null,
  });

  async function fetchList() {
    try {
      setLoading(true);
      setErr("");
      const r = await fetch(`${API}/api/admin/empresas`, { headers: authHeader() || {} });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const list = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      setRows(list.map(normalizeCompany));
    } catch (e) {
      console.error("GET /api/admin/empresas ->", e);
      setErr("No se pudieron cargar las empresas.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  async function createCompany(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setErr("");
      const body = {
        name: name.trim(),
        tax_id: nit.trim() || null,   // <— enviar tax_id
        address: address.trim() || null,
        phone: phone.trim() || null,
      };
      const r = await fetch(`${API}/api/admin/empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeader() || {}) },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

      // añadir al listado
      setRows((prev) => [normalizeCompany(data), ...prev]);
      setName(""); setNit(""); setAddress(""); setPhone("");
    } catch (e) {
      console.error("POST /api/admin/empresas ->", e);
      alert("No se pudo crear la empresa.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCompany(id) {
    try {
      const r = await fetch(`${API}/api/admin/empresas/${id}/toggle`, {
        method: "PATCH",
        headers: authHeader() || {},
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
      setRows((prev) =>
        prev.map((x) => (x.id === id ? { ...x, active: !!data.is_active } : x))
      );
    } catch (e) {
      console.error("PATCH /api/admin/empresas/:id/toggle ->", e);
      alert("No se pudo actualizar el estado.");
    }
  }

  async function deleteCompany(id) {
    if (!confirm("¿Eliminar esta empresa?")) return;
    try {
      const r = await fetch(`${API}/api/admin/empresas/${id}`, {
        method: "DELETE",
        headers: authHeader() || {},
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error("DELETE /api/admin/empresas/:id ->", e);
      alert("No se pudo eliminar.");
    }
  }

  const chip = (active) => (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        color: active ? "#1b5e20" : "#555",
        background: active ? "#c8e6c9" : "#eeeeee",
        border: "1px solid #e0e0e0",
      }}
    >
      {active ? "Activo" : "Inactivo"}
    </span>
  );

  return (
    <div className="page-container">
      <h1>Empresas</h1>

      {err && (
        <div style={{ background:"#fdecea", color:"#b71c1c", padding:"10px 12px", borderRadius:8, marginBottom:12 }}>
          <strong>Error:</strong> {err}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"360px 1fr", gap:20 }}>
        {/* Formulario */}
        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 10px rgba(0,0,0,.06)", padding:16 }}>
          <h3 style={{ marginTop:0 }}>Nueva empresa</h3>
          <form onSubmit={createCompany}>
            <label>Nombre *</label>
            <input value={name} onChange={(e)=>setName(e.target.value)} required style={inp}/>
            <label>NIT</label>
            <input value={nit} onChange={(e)=>setNit(e.target.value)} style={inp}/>
            <label>Dirección</label>
            <input value={address} onChange={(e)=>setAddress(e.target.value)} style={inp}/>
            <label>Teléfono</label>
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} style={inp}/>
            <button disabled={loading} style={btnPrimary}>
              {loading ? "Creando…" : "Crear"}
            </button>
          </form>
        </div>

        {/* Listado */}
        <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 2px 10px rgba(0,0,0,.06)", padding:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:16, borderBottom:"1px solid #eee" }}>
            <h3 style={{ margin:0 }}>Listado</h3>
            <button onClick={fetchList} disabled={loading} style={btnLite}>
              {loading ? "Actualizando…" : "Actualizar"}
            </button>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead style={{ background:"#fafafa" }}>
                <tr>
                  <th style={th}>Nombre</th>
                  <th style={th}>NIT</th>
                  <th style={th}>Teléfono</th>
                  <th style={th}>Dirección</th>
                  <th style={th}>Estado</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding:16, textAlign:"center", color:"#666" }}>
                      {loading ? "Cargando…" : "Sin registros."}
                    </td>
                  </tr>
                ) : rows.map((c) => (
                  <tr key={c.id} style={{ borderTop:"1px solid #f0f0f0" }}>
                    <td style={td}>{c.name}</td>
                    <td style={td}>{c.nit || "—"}</td>
                    <td style={td}>{c.phone || "—"}</td>
                    <td style={td}>{c.address || "—"}</td>
                    <td style={td}>{chip(c.active)}</td>
                    <td style={{ ...td, textAlign:"right", whiteSpace:"nowrap" }}>
                      <button onClick={() => toggleCompany(c.id)} style={btnLite}>
                        {c.active ? "Desactivar" : "Activar"}
                      </button>{" "}
                      <button onClick={() => deleteCompany(c.id)} style={btnDanger}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = { width:"100%", margin:"6px 0 12px", padding:"8px", border:"1px solid #ddd", borderRadius:6 };
const th  = { textAlign:"left", padding:"10px 12px", color:"#555", fontWeight:600, borderBottom:"1px solid #eee" };
const td  = { padding:"10px 12px", color:"#333" };

const btnPrimary = {
  padding:"10px 16px", border:"none", background:"#6a1b9a", color:"#fff", borderRadius:8, cursor:"pointer"
};
const btnLite = {
  padding:"8px 12px", border:"1px solid #ddd", background:"#fff", borderRadius:8, cursor:"pointer"
};
const btnDanger = {
  padding:"8px 12px", border:"1px solid #e57373", background:"#ffebee", color:"#c62828", borderRadius:8, cursor:"pointer"
};
