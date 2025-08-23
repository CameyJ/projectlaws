// src/modules/laws/EvaluacionFormulario.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function EvaluacionFormulario({ normativaSeleccionada }) {
  // Empresas
  const [companies, setCompanies]   = useState([]);
  const [companyId, setCompanyId]   = useState("");
  const [compBusy, setCompBusy]     = useState(false);
  const [compErr, setCompErr]       = useState("");

  // Controles / Evaluación
  const [controles, setControles]     = useState([]);
  const [respuestas, setRespuestas]   = useState({});
  const [comentarios, setComentarios] = useState({}); // 👈 comentarios por control
  const [resultado, setResultado]     = useState(null);

  // Evidencias por control
  const [evidencias, setEvidencias] = useState({}); // { [clave]: { filesToSend: File[], uploaded: [{filename,url}], uploading: bool, err?: string } }

  const resultadoRef = useRef();

  // Nombre de empresa seleccionado (derivado)
  const selectedCompanyName = useMemo(() => {
    const found = companies.find(c => c.id === companyId);
    return found?.name || "";
  }, [companies, companyId]);

  // ---------- Helpers ----------
  const normalizeCompanies = (raw) => {
    // Acepta distintas formas: {id, name} o {id, nombre}
    return (Array.isArray(raw) ? raw : [])
      .map(x => ({
        id: x.id || x.uuid || x.company_id || "",
        name: x.name ?? x.nombre ?? x.razon_social ?? "",
      }))
      .filter(x => x.id && x.name);
  };

  // 1) Cargar empresas (con fallback)
  useEffect(() => {
    (async () => {
      setCompBusy(true);
      setCompErr("");
      try {
        const h = authHeader() || {};

        // 1. Ruta para selector de evaluación
        let r = await fetch(`${API}/api/empresas`, { headers: { ...h } });

        // Si falla, probamos con la de admin
        if (!r.ok) {
          const firstErr = await r.text().catch(() => "");
          console.warn("GET /api/empresas falló:", r.status, firstErr);

          r = await fetch(`${API}/api/admin/empresas`, { headers: { ...h } });
          if (!r.ok) {
            const secondErr = await r.text().catch(() => "");
            throw new Error(`No se pudieron cargar empresas. HTTP ${r.status} ${secondErr}`);
          }
        }

        const raw = await r.json();
        const arr = normalizeCompanies(raw);
        setCompanies(arr);

        if (arr.length && !companyId) setCompanyId(arr[0].id);
      } catch (e) {
        console.error(e);
        setCompanies([]);
        setCompErr("No se pudieron cargar las empresas.");
      } finally {
        setCompBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Cargar controles de la normativa
  useEffect(() => {
    if (!normativaSeleccionada) return;
    (async () => {
      try {
        setControles([]);
        setRespuestas({});
        setComentarios({}); // 👈 reiniciar comentarios
        setResultado(null);
        setEvidencias({});

        const h = authHeader() || {};
        const res = await fetch(`${API}/api/controles/${normativaSeleccionada}`, {
          headers: { ...h }
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Error cargando controles: HTTP ${res.status} ${txt}`);
        }

        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setControles(arr);

        const inicialResp = {};
        const inicialCom  = {};
        const ev = {};
        arr.forEach((c) => {
          inicialResp[c.clave] = '';
          inicialCom[c.clave]  = '';
          ev[c.clave] = { filesToSend: [], uploaded: [], uploading: false, err: '' };
        });
        setRespuestas(inicialResp);
        setComentarios(inicialCom);
        setEvidencias(ev);
      } catch (e) {
        console.error('Error cargando controles:', e);
        setControles([]);
        setRespuestas({});
        setComentarios({});
      }
    })();
  }, [normativaSeleccionada]);

  const handleRespuesta = (clave, valor) => {
    setRespuestas((prev) => ({ ...prev, [clave]: valor }));
  };

  const handleComentario = (clave, valor) => {
    setComentarios((prev) => ({ ...prev, [clave]: valor }));
  };

  const onPickFiles = (clave, fileList) => {
    const files = Array.from(fileList || []);
    setEvidencias((prev) => ({
      ...prev,
      [clave]: { ...(prev[clave] || {}), filesToSend: files, err: '' }
    }));
  };

  const uploadEvidence = async (clave) => {
    try {
      setEvidencias(prev => ({
        ...prev,
        [clave]: { ...(prev[clave] || {}), uploading: true, err: '' }
      }));
      const item = evidencias[clave] || { filesToSend: [] };
      if (!item.filesToSend.length) {
        setEvidencias(prev => ({
          ...prev,
          [clave]: { ...(prev[clave] || {}), uploading: false, err: 'Selecciona archivo(s) primero.' }
        }));
        return;
      }

      const fd = new FormData();
      fd.append('normativa', normativaSeleccionada);
      fd.append('clave', clave);
      item.filesToSend.forEach(f => fd.append('files', f));

      const h = authHeader() || {};
      const res = await fetch(`${API}/api/evidencias`, {
        method: 'POST',
        headers: { ...h }, // No setear Content-Type manualmente
        body: fd
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Error subiendo evidencia: HTTP ${res.status} ${t}`);
      }

      const data = await res.json();
      setEvidencias(prev => ({
        ...prev,
        [clave]: { filesToSend: [], uploaded: data.files || [], uploading: false, err: '' }
      }));
      alert('Evidencia subida correctamente.');
    } catch (e) {
      console.error('uploadEvidence', e);
      setEvidencias(prev => ({
        ...prev,
        [clave]: { ...(prev[clave] || {}), uploading: false, err: 'Error subiendo evidencias.' }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      empresa: selectedCompanyName || "",
      company_id: companyId || null,
      normativa: normativaSeleccionada,
      respuestas,
      comentarios, // 👈 enviar comentarios al backend
    };

    try {
      const h = authHeader() || {};
      const res = await fetch(`${API}/api/evaluar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Error evaluando: HTTP ${res.status} ${t}`);
      }

      const data = await res.json();
      setResultado(data);
    } catch (err) {
      console.error(err);
      alert("No se pudo completar la evaluación.");
    }
  };

  const colorNivel = (pct) => {
    if (pct >= 80) return '#2e7d32';
    if (pct >= 60) return '#f9a825';
    if (pct >= 40) return '#ef6c00';
    return '#c62828';
  };

  // ► PDF con encabezado (ley + empresa)
  const downloadPdf = () => {
    const input = resultadoRef.current;
    if (!input) return;

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const ley = String(normativaSeleccionada || '').trim();
      const fecha = new Date().toISOString().slice(0, 10);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(`Resultado de evaluación — ${ley}`, 40, 40);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Empresa: ${selectedCompanyName || '-'}`, 40, 56);
      pdf.text(`Fecha: ${fecha}`, 40, 70);

      const topMargin = 84;
      const bottomMargin = 30;
      const availableHeight = pdfHeight - topMargin - bottomMargin;

      const imgProps = pdf.getImageProperties(imgData);
      const targetWidth = pdfWidth - 80;
      let targetHeight = (imgProps.height * targetWidth) / imgProps.width;
      if (targetHeight > availableHeight) targetHeight = availableHeight;

      pdf.addImage(imgData, 'PNG', 40, topMargin, targetWidth, targetHeight);

      const safe = (s) => s.replace(/[^\w\-]+/g, '_');
      pdf.save(`Evaluacion_${safe(ley)}_${fecha}.pdf`);
    });
  };

  const showEvidenceBlock = (valor) => valor === 'true' || valor === 'partial';

  // Para mostrar comentarios no vacíos en la tarjeta de resultado
  const comentariosNoVacios = controles
    .filter(c => (comentarios[c.clave] || '').trim().length > 0)
    .map(c => ({ clave: c.clave, pregunta: c.pregunta, comentario: comentarios[c.clave].trim() }));

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      {/* FORMULARIO */}
      <div style={{ flex: 1 }}>
        <h2 style={{ color: '#6a1b9a' }}>Evaluación: {normativaSeleccionada}</h2>

        {/* Selector Empresa */}
        <div className="g-card" style={{ padding: 12, marginBottom: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>Empresa</span>
            <select
              disabled={compBusy || companies.length === 0}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {companies.length === 0 && <option value="">(sin empresas activas)</option>}
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          {compErr && <small style={{ color: '#c62828' }}>{compErr}</small>}
        </div>

        <form onSubmit={handleSubmit}>
          {controles.map((control) => {
            const val = respuestas[control.clave] || '';
            const ev = evidencias[control.clave] || { filesToSend: [], uploaded: [], uploading: false, err: '' };
            return (
              <div key={control.clave} style={{ marginBottom: 22 }}>
                <p style={{ marginBottom: 8 }}><strong>{control.pregunta}</strong></p>

                {/* Botones de respuesta */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleRespuesta(control.clave, 'true')}
                    style={{
                      backgroundColor: val === 'true' ? '#4CAF50' : '#e0e0e0',
                      color: val === 'true' ? 'white' : 'black',
                      padding: '8px 12px', border: 'none', borderRadius: 5, cursor: 'pointer'
                    }}
                  >✔️ Sí</button>
                  <button
                    type="button"
                    onClick={() => handleRespuesta(control.clave, 'partial')}
                    style={{
                      backgroundColor: val === 'partial' ? '#FFC107' : '#e0e0e0',
                      color: val === 'partial' ? 'white' : 'black',
                      padding: '8px 12px', border: 'none', borderRadius: 5, cursor: 'pointer'
                    }}
                  >⚠️ Parcial</button>
                  <button
                    type="button"
                    onClick={() => handleRespuesta(control.clave, 'false')}
                    style={{
                      backgroundColor: val === 'false' ? '#F44336' : '#e0e0e0',
                      color: val === 'false' ? 'white' : 'black',
                      padding: '8px 12px', border: 'none', borderRadius: 5, cursor: 'pointer'
                    }}
                  >❌ No</button>
                </div>

                {/* Comentario por control */}
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 14, color: '#333', display: 'block', marginBottom: 6 }}>
                    Comentario (opcional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Agrega un comentario o contexto sobre esta respuesta…"
                    value={comentarios[control.clave] || ''}
                    onChange={(e) => handleComentario(control.clave, e.target.value)}
                    style={{
                      width: '100%',
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #ccd6e0',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Evidencia (solo para Sí o Parcial) */}
                {showEvidenceBlock(val) && (
                  <div
                    style={{
                      marginTop: 10,
                      background: '#f5f8ff',
                      border: '1px dashed #90caf9',
                      padding: 12,
                      borderRadius: 8
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={(e) => onPickFiles(control.clave, e.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => uploadEvidence(control.clave)}
                        disabled={ev.uploading || !(ev.filesToSend?.length)}
                        className="btn-secondary"
                        style={{ padding: '8px 12px' }}
                      >
                        {ev.uploading ? 'Subiendo…' : 'Subir evidencia'}
                      </button>
                      {ev.err && <span style={{ color: '#c62828' }}>{ev.err}</span>}
                    </div>

                    {ev.filesToSend?.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <small><strong>Seleccionados:</strong> {ev.filesToSend.map(f => f.name).join(', ')}</small>
                      </div>
                    )}

                    {ev.uploaded?.length > 0 && (
                      <div style={{ marginTop: 6 }}>
                        <small><strong>Subidos:</strong>{' '}
                          {ev.uploaded.map((f, i) => (
                            <a key={i}
                               href={`${API}${f.url}`}
                               target="_blank" rel="noreferrer"
                               style={{ marginRight: 10 }}>
                              {f.filename}
                            </a>
                          ))}
                        </small>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="submit"
            disabled={!companyId || controles.length === 0}
            style={{
              marginTop: 20,
              backgroundColor: '#ff6b00',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: 8,
              fontSize: '1rem',
              cursor: 'pointer',
              opacity: (!companyId || controles.length === 0) ? 0.7 : 1
            }}
          >
            Evaluar Cumplimiento
          </button>
        </form>
      </div>

      {/* RESULTADO */}
      {resultado && (
        <>
          <div
            ref={resultadoRef}
            style={{
              flex: 1,
              backgroundColor: '#e3f2fd',
              border: '1px solid #90caf9',
              borderRadius: 8,
              padding: '1.5rem',
            }}
          >
            <h3 style={{ color: '#1565c0', marginBottom: 12 }}>Resultado</h3>
            <p><strong>Empresa:</strong> {selectedCompanyName || '-'}</p>
            <p><strong>Cumplimiento:</strong> {resultado.cumplimiento}%</p>
            <p><strong>Nivel:</strong>{' '}
              <span
                style={{
                  backgroundColor: colorNivel(resultado.cumplimiento),
                  color: 'white',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 5,
                }}
              >
                {resultado.nivel}
              </span>
            </p>

            {Array.isArray(resultado.incumplimientos) && resultado.incumplimientos.length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}>Controles no cumplidos:</h4>
                <ul style={{ paddingLeft: '1.2rem' }}>
                  {resultado.incumplimientos.map((item, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <strong>{item.control}</strong> — {item.recomendacion} {item.articulo ? <em>({item.articulo})</em> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Comentarios agregados */}
            {comentariosNoVacios.length > 0 && (
              <>
                <h4 style={{ marginTop: 18 }}>Comentarios agregados</h4>
                <ul style={{ paddingLeft: '1.2rem' }}>
                  {comentariosNoVacios.map((c, idx) => (
                    <li key={idx} style={{ marginBottom: 6 }}>
                      <strong>{c.clave}:</strong> {c.pregunta}
                      <div style={{ marginTop: 4, fontStyle: 'italic' }}>
                        {c.comentario}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <button
            onClick={downloadPdf}
            style={{
              marginTop: 20,
              backgroundColor: '#00695c',
              color: 'white',
              padding: '10px 16px',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
            }}
          >
            📄 Descargar PDF
          </button>
        </>
      )}
    </div>
  );
}

export default EvaluacionFormulario;
