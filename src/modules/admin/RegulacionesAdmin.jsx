import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function RegulacionesAdmin() {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    version: "",
    source_url: "",
  });

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API}/api/admin/regulations`, {
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      // el backend devuelve array plano; si usaste PowerShell antes, era objeto con "value"
      setRegs(Array.isArray(data) ? data : data.value ?? []);
    } catch (e) {
      setErr(e.message || "Error cargando regulaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (!form.code || !form.name) {
        throw new Error("Completa 'code' y 'name'");
      }
      const res = await fetch(`${API}/api/admin/regulations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await safeJson(res);
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      setForm({ code: "", name: "", version: "", source_url: "" });
      setShowForm(false);
      await load();
    } catch (e) {
      setErr(e.message || "Error creando regulación");
    }
  };

  return (
    <div className="page-container">
      <h1>Regulaciones (Admin)</h1>

      <div style={{ margin: "12px 0" }}>
        <button
          className="btn-primary"
          onClick={() => setShowForm((s) => !s)}
          style={{ padding: "8px 14px" }}
        >
          {showForm ? "Cerrar" : "Nueva regulación"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="g-card" style={{ maxWidth: 720 }}>
          <div className="row">
            <label>Código *</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SOX / GDPR"
              required
            />
          </div>
          <div className="row">
            <label>Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sarbanes–Oxley Act"
              required
            />
          </div>
          <div className="row">
            <label>Versión</label>
            <input
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              placeholder="2002 / 2016 / etc."
            />
          </div>
          <div className="row">
            <label>Fuente (URL)</label>
            <input
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: 12 }}>
            Guardar
          </button>
        </form>
      )}

      {loading && <p>Cargando…</p>}
      {err && (
        <p style={{ color: "#c62828", marginTop: 8 }}>
          {err}
        </p>
      )}

      {!loading && !err && regs.length === 0 && (
        <p>No hay regulaciones todavía.</p>
      )}

      {!loading && !err && regs.length > 0 && (
        <div className="g-card" style={{ padding: 0, overflowX: "auto" }}>
          <table className="g-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Código</th>
                <th style={th}>Nombre</th>
                <th style={th}>Versión</th>
                <th style={th}>Activa</th>
                <th style={th}>Creada</th>
              </tr>
            </thead>
            <tbody>
              {regs.map((r) => (
                <tr key={r.id}>
                  <td style={tdMono}>{r.code}</td>
                  <td style={td}>{r.name}</td>
                  <td style={td}>{r.version || "-"}</td>
                  <td style={td}>{r.is_active ? "Sí" : "No"}</td>
                  <td style={td}>{formatDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function formatDate(iso) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

const th = { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #e6e6e6" };
const td = { padding: "10px 12px", borderBottom: "1px solid #f0f0f0" };
const tdMono = { ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" };
