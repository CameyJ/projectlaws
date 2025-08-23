// src/modules/results/ResultDetail.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ev, setEv] = useState(null);
  const [resultado, setResultado] = useState({ incumplimientos: [], comentarios: [] });
  const [saving, setSaving] = useState({});
  const [saveMsg, setSaveMsg] = useState({});
  const resultadoRef = useRef();

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
        setEv({
          id: data.id,
          company_name: data.company_name,
          normativa: data.normativa,
          started_at: data.started_at,
          due_at: data.due_at,
          pct: data.cumplimiento ?? data.pct ?? 0,
          level: data.nivel ?? data.level ?? "-",
          status: data.status,
          answers: data.respuestas || [],
        });
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el detalle de la evaluación.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const colorNivel = (pct) =>
    pct >= 80 ? "#2e7d32" : pct >= 60 ? "#f9a825" : pct >= 40 ? "#ef6c00" : "#c62828";

  const fmtArt = (a) => {
    if (!a) return null;
    const num = String(a).replace(/^Art\.?\s*/i, "").trim();
    return `Art. ${num}`;
  };

  const downloadPdf = () => {
    const el = resultadoRef.current;
    if (!el) return;
    html2canvas(el, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const ley = String(ev?.normativa || "").trim();
      const fecha = new Date().toISOString().slice(0, 10);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text(`Resultado de evaluación — ${ley}`, 40, 40);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Empresa: ${ev?.company_name || "-"}`, 40, 56);
      pdf.text(`Fecha: ${fecha}`, 40, 70);

      const top = 84, bottom = 30;
      const availH = pdfH - top - bottom;
      const img = pdf.getImageProperties(imgData);
      const w = pdfW - 80;
      let h = (img.height * w) / img.width;
      if (h > availH) h = availH;
      pdf.addImage(imgData, "PNG", 40, top, w, h);

      const safe = (s) => s.replace(/[^\w\-]+/g, "_");
      pdf.save(`Evaluacion_${safe(ley)}_${fecha}.pdf`);
    });
  };

  const setAnswerField = (clave, field, value) => {
    setEv((prev) => ({
      ...prev,
      answers: prev.answers.map((a) =>
        (a.control_clave || a.control_key || a.clave) === clave ? { ...a, [field]: value } : a
      ),
    }));
  };

  const saveControl = async (clave) => {
    try {
      setSaving((s) => ({ ...s, [clave]: true }));
      setSaveMsg((m) => ({ ...m, [clave]: "" }));

      const a = ev.answers.find((x) => (x.control_clave || x.control_key || x.clave) === clave);
      const valor = a?.valor ?? a?.value ?? "false";
      const comentario = a?.comentario ?? a?.comment ?? "";

      const h = authHeader() || {};
      const r = await fetch(`${API}/api/evaluaciones/${ev.id}/respuestas/${encodeURIComponent(clave)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...h },
        body: JSON.stringify({ valor, comentario }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }
      const data = await r.json();

      // Actualizar cabecera + panel resultado
      setEv((prev) => ({
        ...prev,
        pct: data.cumplimiento ?? data.pct ?? prev.pct,
        level: data.nivel ?? data.level ?? prev.level,
      }));
      setResultado({
        incumplimientos: Array.isArray(data.incumplimientos) ? data.incumplimientos : [],
        comentarios: Array.isArray(data.comentarios) ? data.comentarios : [],
      });

      setSaveMsg((m) => ({ ...m, [clave]: "Guardado ✔" }));
      setTimeout(() => setSaveMsg((m) => ({ ...m, [clave]: "" })), 2000);
    } catch (e) {
      console.error("saveControl Error:", e);
      setSaveMsg((m) => ({ ...m, [clave]: "No se pudo guardar." }));
    } finally {
      setSaving((s) => ({ ...s, [clave]: false }));
    }
  };

  if (loading) return <div className="page-container"><p>Cargando…</p></div>;
  if (err)     return <div className="page-container"><p style={{ color: "#c62828" }}>{err}</p></div>;
  if (!ev)     return null;

  const answers = ev.answers || [];

  return (
    <div className="page-container" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Evaluación — {ev.normativa}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => navigate(-1)}>Volver</button>
          <button className="btn-secondary" onClick={downloadPdf}>📄 Descargar PDF</button>
        </div>
      </div>

      {/* Panel Resultado (igual estilo al formulario) */}
      <div
        ref={resultadoRef}
        className="g-card"
        style={{
          backgroundColor: "#e3f2fd",
          border: "1px solid #90caf9",
          borderRadius: 8,
          padding: "1rem",
        }}
      >
        <h3 style={{ color: "#1565c0", marginBottom: 8 }}>Resultado</h3>
        <p><strong>Empresa:</strong> {ev.company_name || "-"}</p>
        <p><strong>Cumplimiento:</strong> {ev.pct}%</p>
        <p>
          <strong>Nivel:</strong>{" "}
          <span
            style={{
              backgroundColor: colorNivel(ev.pct),
              color: "white",
              padding: "0.25rem 0.5rem",
              borderRadius: 5,
            }}
          >
            {ev.level}
          </span>
        </p>

        {resultado.incumplimientos?.length > 0 && (
          <>
            <h4 style={{ marginTop: 12 }}>Controles no cumplidos:</h4>
            <ul style={{ paddingLeft: "1.1rem" }}>
              {resultado.incumplimientos.map((item, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <strong>{item.control}</strong> — {item.recomendacion}{" "}
                  {(item.articulo || item.articulo_titulo) && (
                    <em>
                      (
                      {item.articulo ? `Art. ${item.articulo}` : "Art."}
                      {item.articulo_titulo ? `. ${item.articulo_titulo}` : ""}
                      )
                    </em>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {resultado.comentarios?.length > 0 && (
          <>
            <h4 style={{ marginTop: 12 }}>Comentarios agregados:</h4>
            <ul style={{ paddingLeft: "1.1rem" }}>
              {resultado.comentarios.map((c, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {c.articulo ? <strong>{fmtArt(c.articulo)}{c.articulo_titulo ? `: ${c.articulo_titulo}` : ""}:</strong> : null}{" "}
                  <em>{c.comentario}</em>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Cabecera simple */}
      <div className="g-card" style={{ padding: 14 }}>
        <p><strong>Normativa:</strong> {ev.normativa}</p>
        <p><strong>Estado:</strong> {ev.status}{ev.status === 'open' ? " (editable)" : ""}</p>
        <div style={{ fontSize: 13, marginTop: 6 }}>
          {ev.started_at && <div><strong>Fecha inicio:</strong> {new Date(ev.started_at).toLocaleString()}</div>}
          {ev.due_at     && <div><strong>Fecha límite:</strong> {new Date(ev.due_at).toLocaleString()}</div>}
        </div>
      </div>

      {/* Respuestas */}
      <h3>Respuestas</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {answers.length === 0 && <div className="g-card" style={{ padding: 12 }}>Sin respuestas.</div>}

        {answers.map((a, i) => {
          const clave = a.control_clave || a.control_key || a.clave || `Control ${i + 1}`;
          const valor = a.valor ?? a.value ?? "false";
          const comentario = a.comentario ?? a.comment ?? "";

          return (
            <div key={clave} className="g-card" style={{ padding: 12 }}>
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                {a.pregunta || a.question || clave}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setAnswerField(clave, "valor", "true")}
                  style={{
                    backgroundColor: valor === "true" ? "#4CAF50" : "#e0e0e0",
                    color: valor === "true" ? "white" : "black",
                    padding: "6px 10px", border: "none", borderRadius: 5, cursor: "pointer"
                  }}
                >✔️ Sí</button>
                <button
                  type="button"
                  onClick={() => setAnswerField(clave, "valor", "partial")}
                  style={{
                    backgroundColor: valor === "partial" ? "#FFC107" : "#e0e0e0",
                    color: valor === "partial" ? "white" : "black",
                    padding: "6px 10px", border: "none", borderRadius: 5, cursor: "pointer"
                  }}
                >⚠️ Parcial</button>
                <button
                  type="button"
                  onClick={() => setAnswerField(clave, "valor", "false")}
                  style={{
                    backgroundColor: valor === "false" ? "#F44336" : "#e0e0e0",
                    color: valor === "false" ? "white" : "black",
                    padding: "6px 10px", border: "none", borderRadius: 5, cursor: "pointer"
                  }}
                >❌ No</button>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: 6 }}>Comentario</label>
                <textarea
                  rows={2}
                  style={{ width: "100%", padding: 8 }}
                  value={comentario}
                  onChange={(e) => setAnswerField(clave, "comentario", e.target.value)}
                />
              </div>

              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => saveControl(clave)}
                  className="btn-secondary"
                  disabled={!!saving[clave]}
                >
                  {saving[clave] ? "Guardando…" : "Guardar cambios"}
                </button>
                {saveMsg[clave] && (
                  <small style={{ color: saveMsg[clave].includes("✔") ? "#2e7d32" : "#c62828" }}>
                    {saveMsg[clave]}
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
