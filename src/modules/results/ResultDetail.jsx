import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ev, setEv] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const h = authHeader() || {};
        const r = await fetch(`${API}/api/evaluaciones/${id}`, { headers: { ...h } });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status} ${t}`);
        }
        const data = await r.json();
        setEv(data);
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el detalle de la evaluación.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const colorNivel = (pct) => (pct >= 80 ? "#2e7d32" : pct >= 60 ? "#f9a825" : pct >= 40 ? "#ef6c00" : "#c62828");

  if (loading) return <div className="page-container"><p>Cargando…</p></div>;
  if (err)     return <div className="page-container"><p style={{ color: "#c62828" }}>{err}</p></div>;
  if (!ev)     return null;

  const pct   = ev.pct ?? ev.cumplimiento ?? 0;
  const level = ev.level ?? ev.nivel ?? "-";
  const answers = ev.answers || ev.respuestas || [];

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Evaluación</h1>
        <button className="btn-secondary" onClick={() => navigate(-1)}>Volver</button>
      </div>

      <div className="g-card" style={{ padding: 16, marginBottom: 16 }}>
        <p><strong>Empresa:</strong> {ev.company_name || ev.empresa || "-"}</p>
        <p><strong>Normativa:</strong> {ev.regulation || ev.normativa}</p>
        <p><strong>Cumplimiento:</strong> {pct}%</p>
        <p><strong>Nivel:</strong>{" "}
          <span style={{ backgroundColor: colorNivel(pct), color: "white", padding: "2px 8px", borderRadius: 6 }}>
            {level}
          </span>
        </p>
        <div style={{ fontSize: 13, marginTop: 8 }}>
          {ev.started_at && <div><strong>Fecha inicio:</strong> {new Date(ev.started_at).toLocaleString()}</div>}
          {ev.due_at     && <div><strong>Fecha límite:</strong> {new Date(ev.due_at).toLocaleString()}</div>}
          {ev.status     && <div><strong>Estado:</strong> {ev.status}</div>}
        </div>
      </div>

      <h3>Respuestas</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {answers.length === 0 && <div className="g-card" style={{ padding: 12 }}>Sin respuestas.</div>}

        {answers.map((a, i) => (
          <div key={i} className="g-card" style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div>
                <strong>{a.control_key || a.clave || `Control ${i + 1}`}</strong>
                {a.question && <div style={{ opacity: 0.8, fontSize: 13 }}>{a.question}</div>}
              </div>
              <div>
                <span style={{ background: "#eee", padding: "2px 8px", borderRadius: 6, marginRight: 8 }}>
                  {a.value ?? a.valor ?? "-"}
                </span>
              </div>
            </div>

            {(a.comment ?? a.comentario) && (
              <div style={{ marginTop: 8 }}>
                <strong>Comentario:</strong>
                <div style={{ whiteSpace: "pre-wrap" }}>{a.comment ?? a.comentario}</div>
              </div>
            )}

            {Array.isArray(a.evidence) && a.evidence.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <strong>Evidencias:</strong>{" "}
                {a.evidence.map((f, idx) => (
                  <a
                    key={idx}
                    href={`${API}${f.url || f}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginRight: 10 }}
                  >
                    {f.filename || f.name || `archivo-${idx + 1}`}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
