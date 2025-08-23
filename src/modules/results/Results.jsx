// src/modules/results/Results.jsx
import { useEffect, useState } from "react";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Results() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchList() {
    setLoading(true);
    setErr("");
    try {
      const h = authHeader() || {};
      const r = await fetch(`${API}/api/evaluaciones`, { headers: { ...h } });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }
      const data = await r.json().catch(() => ({}));
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las evaluaciones.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  return (
    <div className="page-container">
      <h1>Resultados</h1>
      <p>Visualiza los resultados de tus evaluaciones aquí.</p>

      {err && (
        <div style={{ background: "#fee", color: "#900", padding: "12px", borderRadius: 8, margin: "10px 0" }}>
          <strong>Error:</strong> {err}
        </div>
      )}

      <div className="g-card" style={{ padding: 16, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Evaluaciones</h3>
          <button onClick={fetchList} disabled={loading} className="btn-secondary">
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Fecha</th>
                <th style={{ textAlign: "left", padding: 8 }}>Empresa</th>
                <th style={{ textAlign: "left", padding: 8 }}>Normativa</th>
                <th style={{ textAlign: "right", padding: 8 }}>%</th>
                <th style={{ textAlign: "left", padding: 8 }}>Nivel</th>
                <th style={{ textAlign: "left", padding: 8 }}>Vence</th>
                <th style={{ textAlign: "left", padding: 8 }} />
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 12, opacity: 0.7 }}>
                    Sin evaluaciones
                  </td>
                </tr>
              )}
              {items.map((x) => (
                <tr key={x.id}>
                  <td style={{ padding: 8 }}>
                    {x.started_at ? new Date(x.started_at).toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: 8 }}>{x.company_name || "-"}</td>
                  <td style={{ padding: 8 }}>{x.normativa || "-"}</td>
                  <td style={{ padding: 8, textAlign: "right" }}>
                    {typeof x.pct === "number" ? `${x.pct.toFixed(0)}%` : "-"}
                  </td>
                  <td style={{ padding: 8 }}>{x.level || "-"}</td>
                  <td style={{ padding: 8 }}>
                    {x.due_at ? new Date(x.due_at).toLocaleString() : "-"}
                  </td>
                  <td style={{ padding: 8 }}>
                    {/* Si aún no tienes la vista de detalle, deja este botón en TODO */}
                    <button className="btn-secondary" onClick={() => alert(`Abrir evaluación ${x.id} (TODO)`)}>Abrir</button>
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
