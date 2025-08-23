// src/modules/results/ResultDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate, useParams } from "react-router-dom";
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ResultDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // cabecera evaluación
  const [ev, setEv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // metadatos de preguntas
  const [controles, setControles] = useState([]);

  // estados por control
  const [answers, setAnswers] = useState({});      // { clave: "true|partial|false" }
  const [comments, setComments] = useState({});    // { clave: "..." }

  // evidencias por control
  const [evidencias, setEvidencias] = useState({}); // { clave: { filesToSend:[], uploaded:[], uploading:false, err:"" } }

  const resultRef = useRef();

  const colorNivel = (pct) =>
    pct >= 80 ? "#2e7d32" : pct >= 60 ? "#f9a825" : pct >= 40 ? "#ef6c00" : "#c62828";

  /* ---------------------- carga evaluación + controles ---------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const h = authHeader() || {};
        // detalle evaluación
        const r = await fetch(`${API}/api/evaluaciones/${id}`, { headers: { ...h } });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(`HTTP ${r.status} ${t}`);
        }
        const data = await r.json();
        setEv(data);

        // respuestas iniciales
        const a = {};
        const c = {};
        (data.respuestas || []).forEach((row) => {
          a[row.control_clave || row.clave] = row.valor || "";
          c[row.control_clave || row.clave] = row.comentario || "";
        });
        setAnswers(a);
        setComments(c);

        // metadatos de controles
        if (data.normativa) {
          const rr = await fetch(`${API}/api/controles/${data.normativa}`, {
            headers: { ...h },
          });
          const list = (await rr.json()) || [];
          setControles(Array.isArray(list) ? list : []);
        }

        // inicial de evidencias
        const evd = {};
        (data.respuestas || []).forEach((row) => {
          const k = row.control_clave || row.clave;
          evd[k] = { filesToSend: [], uploaded: [], uploading: false, err: "" };
        });
        setEvidencias(evd);
      } catch (e) {
        console.error(e);
        setErr("No se pudo cargar el detalle de la evaluación.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const controlesByKey = useMemo(() => {
    const m = new Map();
    controles.forEach((c) => m.set(c.clave, c));
    return m;
  }, [controles]);

  const fmtNivel = (pct) => (pct >= 80 ? "Alto" : pct >= 60 ? "Medio" : pct >= 40 ? "Bajo" : "Crítico");

  /* ----------------------------- handlers UI ----------------------------- */

  const setAnswer = (clave, value) =>
    setAnswers((p) => ({ ...p, [clave]: value }));

  const setComment = (clave, value) =>
    setComments((p) => ({ ...p, [clave]: value }));

  const showEvidenceBlock = (val) => val === "true" || val === "partial";

  const onPickFiles = (clave, fileList) => {
    const files = Array.from(fileList || []);
    setEvidencias((prev) => ({
      ...prev,
      [clave]: { ...(prev[clave] || {}), filesToSend: files, err: "" },
    }));
  };

  const uploadEvidence = async (clave) => {
    try {
      setEvidencias((prev) => ({
        ...prev,
        [clave]: { ...(prev[clave] || {}), uploading: true, err: "" },
      }));

      const item = evidencias[clave] || { filesToSend: [] };
      if (!item.filesToSend.length) {
        setEvidencias((prev) => ({
          ...prev,
          [clave]: { ...(prev[clave] || {}), uploading: false, err: "Selecciona archivo(s) primero." },
        }));
        return;
      }

      const fd = new FormData();
      fd.append("normativa", String(ev?.normativa || "").toUpperCase());
      fd.append("clave", clave);
      // si tu backend ya soporta evaluation_id, descomenta:
      // fd.append("evaluation_id", id);
      item.filesToSend.forEach((f) => fd.append("files", f));

      const h = authHeader() || {};
      const r = await fetch(`${API}/api/evidencias`, {
        method: "POST",
        headers: { ...h },
        body: fd,
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status} ${t}`);
      }
      const data = await r.json();
      setEvidencias((prev) => ({
        ...prev,
        [clave]: {
          filesToSend: [],
          uploaded: data.files || [],
          uploading: false,
          err: "",
        },
      }));
      alert("Evidencia subida correctamente.");
    } catch (e) {
      console.error("uploadEvidence", e);
      setEvidencias((prev) => ({
        ...prev,
        [clave]: { ...(prev[clave] || {}), uploading: false, err: "Error subiendo evidencias." },
      }));
    }
  };

  const saveControl = async (clave) => {
    try {
      const h = authHeader() || {};
      const r = await fetch(
        `${API}/api/evaluaciones/${id}/respuestas/${encodeURIComponent(clave)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...h },
          body: JSON.stringify({
            valor: answers[clave] || "",
            comentario: (comments[clave] || "").trim(),
          }),
        }
      );
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || "No se pudo guardar");
      }
      const data = await r.json();
      // refrescar cabecera con el mismo estilo que evaluación
      setEv((prev) =>
        prev
          ? {
              ...prev,
              cumplimiento: data.cumplimiento ?? prev.cumplimiento,
              nivel: data.nivel ?? prev.nivel,
            }
          : prev
      );
      alert("Guardado.");
    } catch (e) {
      console.error("saveControl", e);
      alert("No se pudo guardar.");
    }
  };

  /* -------------------------------- PDF -------------------------------- */
  const downloadPdf = () => {
    const el = resultRef.current;
    if (!el) return;
    html2canvas(el, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const top = 40;
      const bottom = 30;
      const availH = pdfH - top - bottom;
      const img = pdf.getImageProperties(imgData);
      const w = pdfW - 60;
      let h = (img.height * w) / img.width;
      if (h > availH) h = availH;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(`Evaluación — ${ev?.normativa || ""}`, 30, 28);
      pdf.addImage(imgData, "PNG", 30, top, w, h);
      pdf.save(
        `Evaluacion_${String(ev?.normativa || "NORMATIVA")
          .replace(/[^\w\-]+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    });
  };

  if (loading) return <div className="page-container"><p>Cargando…</p></div>;
  if (err) return <div className="page-container"><p style={{ color: "#c62828" }}>{err}</p></div>;
  if (!ev) return null;

  const pct = ev.cumplimiento ?? ev.pct ?? 0;
  const nivel = ev.nivel || fmtNivel(pct);

  return (
    <div className="page-container" style={{ paddingTop: 18 }}>
      {/* encabezado */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Evaluación — {ev.normativa}</h1>
        <button className="btn-link" onClick={() => navigate(-1)} style={{ marginLeft: 6 }}>
          Volver
        </button>
        <button className="btn-link" onClick={downloadPdf}>Descargar PDF</button>
      </div>

      {/* layout responsive: sidebar izquierda + contenido */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* Sidebar */}
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <div className="g-card" style={{ padding: 14 }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#1565c0" }}>Resultado</h3>
            <p><strong>Empresa:</strong> {ev.company_name || "-"}</p>
            <p><strong>Cumplimiento:</strong> {pct}%</p>
            <p>
              <strong>Nivel:</strong>{" "}
              <span
                style={{
                  backgroundColor: colorNivel(pct),
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {nivel}
              </span>
            </p>
          </div>

          <div className="g-card" style={{ padding: 14 }}>
            <p><strong>Normativa:</strong> {ev.normativa}</p>
            <p><strong>Estado:</strong> {ev.status || "open"} <small>(editable)</small></p>
            {ev.started_at && (
              <p style={{ marginTop: 8 }}>
                <small>
                  <strong>Fecha inicio:</strong>{" "}
                  {new Date(ev.started_at).toLocaleString()}
                </small>
                <br />
                <small>
                  <strong>Fecha límite:</strong>{" "}
                  {new Date(ev.due_at).toLocaleString()}
                </small>
              </p>
            )}
          </div>
        </div>

        {/* Contenido (respuestas + evidencias) */}
        <div ref={resultRef}>
          <h3 style={{ marginTop: 0 }}>Respuestas</h3>

          <div style={{ display: "grid", gap: 14 }}>
            {(ev.respuestas || []).map((row, idx) => {
              const clave = row.control_clave || row.clave;
              const val = answers[clave] || "";
              const ctrl = controlesByKey.get(clave) || {};
              const evd = evidencias[clave] || { filesToSend: [], uploaded: [], uploading: false, err: "" };

              return (
                <div key={clave || idx} className="g-card" style={{ padding: 12 }}>
                  {/* título */}
                  <div style={{ marginBottom: 8, fontWeight: 600 }}>
                    {ctrl.pregunta ? ctrl.pregunta : `Art. ${clave}`}
                    {ctrl.articulo ? (
                      <span style={{ opacity: 0.7, fontWeight: 400 }}>
                        {" "}
                        <em>(Art. {ctrl.articulo}{ctrl.articulo_titulo ? `, ${ctrl.articulo_titulo}` : ""})</em>
                      </span>
                    ) : null}
                  </div>

                  {/* botones */}
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                    <button
                      type="button"
                      onClick={() => setAnswer(clave, "true")}
                      style={{
                        background: val === "true" ? "#4caf50" : "#eee",
                        color: val === "true" ? "#fff" : "#111",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ✔️ Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer(clave, "partial")}
                      style={{
                        background: val === "partial" ? "#ffc107" : "#eee",
                        color: val === "partial" ? "#111" : "#111",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ⚠️ Parcial
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswer(clave, "false")}
                      style={{
                        background: val === "false" ? "#f44336" : "#eee",
                        color: val === "false" ? "#fff" : "#111",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 10px",
                        cursor: "pointer",
                      }}
                    >
                      ❌ No
                    </button>
                  </div>

                  {/* comentario */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: "block", marginBottom: 4 }}>Comentario</label>
                    <textarea
                      rows={2}
                      style={{ width: "100%", padding: 8 }}
                      value={comments[clave] || ""}
                      onChange={(e) => setComment(clave, e.target.value)}
                    />
                  </div>

                  {/* evidencias (igual que en evaluación) */}
                  {showEvidenceBlock(val) && (
                    <div
                      style={{
                        margin: "10px 0",
                        background: "#f5f8ff",
                        border: "1px dashed #90caf9",
                        padding: 12,
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={(e) => onPickFiles(clave, e.target.files)}
                        />
                        <button
                          type="button"
                          onClick={() => uploadEvidence(clave)}
                          disabled={evd.uploading || !(evd.filesToSend?.length)}
                          className="btn-secondary"
                          style={{ padding: "6px 10px" }}
                        >
                          {evd.uploading ? "Subiendo…" : "Subir evidencia"}
                        </button>
                        {evd.err && <span style={{ color: "#c62828" }}>{evd.err}</span>}
                      </div>

                      {evd.filesToSend?.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <small>
                            <strong>Seleccionados:</strong> {evd.filesToSend.map((f) => f.name).join(", ")}
                          </small>
                        </div>
                      )}

                      {evd.uploaded?.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <small>
                            <strong>Subidos:</strong>{" "}
                            {evd.uploaded.map((f, i) => (
                              <a
                                key={i}
                                href={`${API}${f.url}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ marginRight: 10 }}
                              >
                                {f.filename}
                              </a>
                            ))}
                          </small>
                        </div>
                      )}
                    </div>
                  )}

                  {/* guardar */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-primary"
                      onClick={() => saveControl(clave)}
                      style={{
                        background: "#5b6bff",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 14px",
                        cursor: "pointer",
                      }}
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
