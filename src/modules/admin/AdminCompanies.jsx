// src/modules/admin/AdminCompanies.jsx
import { useEffect, useMemo, useState } from "react";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function AdminCompanies() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: "",
    tax_id: "",    // NIT
    address: "",
    phone: "",
  });

  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const r = await fetch(`${API}/api/admin/empresas`, { headers: authHeader() });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setErr("No se pudieron cargar las empresas.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((it) =>
      (it.name || "").toLowerCase().includes(q) ||
      (it.tax_id || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const resetForm = () =>
    setForm({ name: "", tax_id: "", address: "", phone: "" });

  const create = async () => {
    if (!form.name.trim()) {
      alert("El nombre es requerido.");
      return;
    }
    try {
      setErr("");
      const body = {
        name: form.name.trim(),
        tax_id: form.tax_id.trim() || null, // NIT
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
      };

      const r = await fetch(`${API}/api/admin/empresas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const created = await r.json();
      setRows((prev) => [created, ...prev]);
      resetForm();
    } catch (e) {
      console.error(e);
      setErr("Error creando empresa.");
    }
  };

  const toggle = async (id) => {
    try {
      const r = await fetch(`${API}/api/admin/empresas/${id}/toggle`, {
        method: "PATCH",
        headers: { ...authHeader() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const upd = await r.json();
      setRows((prev) => prev.map((x) => (x.id === id ? upd : x)));
    } catch (e) {
      console.error(e);
      alert("No se pudo cambiar el estado.");
    }
  };

  const removeOne = async (id) => {
    if (!confirm("¿Eliminar esta empresa?")) return;
    try {
      const r = await fetch(`${API}/api/admin/empresas/${id}`, {
        method: "DELETE",
        headers: { ...authHeader() },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setRows((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar.");
    }
  };

  return (
    <div className="page-container">
      <h1>Empresas</h1>

      {err && (
        <div
          style={{
            background: "#ffe3e3",
            color: "#8a1a1a",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <strong>Error:</strong> {err}
          <button onClick={() => window.location.reload()} className="btn-secondary" style={{ marginLeft: 8 }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Alta */}
      <div className="g-card" style={{ maxWidth: 480, marginBottom: 16 }}>
        <h3>Nueva empresa</h3>
        <div style={{ display: "grid", gap: 8 }}>
          <label>
            Nombre *
            <input name="name" value={form.name} onChange={onChange} />
          </label>

          <label>
            NIT
            <input name="tax_id" value={form.tax_id} onChange={onChange} />
          </label>

          <label>
            Dirección
            <input name="address" value={form.address} onChange={onChange} />
          </label>

          <label>
            Teléfono
            <input name="phone" value={form.phone} onChange={onChange} />
          </label>

          <div>
            <button onClick={create} className="btn-primary">Crear</button>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="g-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <input
            placeholder="Buscar por nombre o NIT…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <small>Total: {filtered.length}</small>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="g-table" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>NIT</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "#777" }}>Sin registros.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.tax_id || "-"}</td>
                  <td>{r.phone || "-"}</td>
                  <td>{r.address || "-"}</td>
                  <td>{r.is_active ? "Activa" : "Inactiva"}</td>
                  <td style={{ display: "flex", gap: 8 }}>
                    <button className="btn-secondary" onClick={() => toggle(r.id)}>
                      {r.is_active ? "Desactivar" : "Activar"}
                    </button>
                    <button className="btn-danger" onClick={() => removeOne(r.id)}>
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
  );
}
