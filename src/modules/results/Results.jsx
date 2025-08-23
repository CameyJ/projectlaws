// src/modules/results/Results.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Results() {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const fetchList = async () => {
    try {
      setBusy(true);
      setErr("");
      const h = authHeader() || {};
      const r = await fetch(`${API}/api/evaluaciones`, { headers: { ...h } });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || "Error listando evaluaciones");
      }
      const data = await r.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      setErr("No se pudieron cargar las evaluaciones.");
      setItems([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = (id) => {
    // Antes: alert(`Abrir evaluación ${id} (TODO)`)
    navigate(`/results/${id}`);
  };

  return (
    <div className="page-container">
      <h1>Resultados</h1>
      <p>Visualiza los resultados de tus evaluaciones aquí.</p>

      {err && (
        <div
          style={{
            background: "#fdecea",
            color: "#b71c1c",
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <strong>Error:</strong> {err}
        </div>
      )}

      <div
        style={{
          background: "white",
          borderRadius: 12,
          boxShadow: "0 2px 10px rgba(0,0,0,.06)",
          overflow: "hidden",
          maxWidth: 780,
        }}
      >
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3 style={{ margin: 0 }}>Evaluaciones</h3>
          <button
            onClick={fetchList}
            disabled={busy}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: busy ? "#f3f3f3" : "white",
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Empresa</th>
                <th style={th}>Normativa</th>
                <th style={th}>%</th>
                <th style={th}>Nivel</th>
                <th style={th}>Vence</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#666" }}>
                    {busy ? "Cargando…" : "Sin evaluaciones"}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                    <td style={td}>
                      {it.started_at ? new Date(it.started_at).toLocaleString() : "—"}
                    </td>
                    <td style={td}>{it.company_name || "—"}</td>
                    <td style={td}>{it.normativa || "—"}</td>
                    <td style={td}>{typeof it.pct === "number" ? `${Math.round(it.pct)}%` : "—"}</td>
                    <td style={td}>{it.level || "—"}</td>
                    <td style={td}>{it.due_at ? new Date(it.due_at).toLocaleString() : "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      <button
                        onClick={() => openDetail(it.id)}
                        style={{
                          padding: "8px 14px",
                          border: "1px solid #ddd",
                          background: "white",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px 12px",
  color: "#555",
  fontWeight: 600,
  borderBottom: "1px solid #eee",
};

const td = { padding: "10px 12px", color: "#333" };
