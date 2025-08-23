// src/modules/laws/EvaluacionFormulario.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function EvaluacionFormulario({ normativaSeleccionada }) {
  // Empresas
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [compBusy, setCompBusy] = useState(false);
  const [compErr, setCompErr] = useState("");

  // Controles / Evaluación
  const [controles, setControles] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [comentarios, setComentarios] = useState({});
  const [resultado, setResultado] = useState(null);

  // Evidencias
  const [evidencias, setEvidencias] = useState({});
  const resultadoRef = useRef();

  const selectedCompanyName = useMemo(() => {
    const found = companies.find(c => c.id === companyId);
    return found?.name || "";
  }, [companies, companyId]);

  const normalizeCompanies = (raw) =>
    (Array.isArray(raw) ? raw : [])
      .map(x => ({ id: x.id || x.uuid || x.company_id || "", name: x.name ?? x.nombre ?? "" }))
      .filter(x => x.id && x.name);

  // Cargar empresas
  useEffect(() => {
    (async () => {
      setCompBusy(true);
      setCompErr("");
      try {
        const h = authHeader() || {};
        let r = await fetch(`${API}/api/empresas`, { headers: { ...h } });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          console.warn('GET /api/empresas:', r.status, t);
          // Fallback admin (si el usuario tiene permisos)
          r = await fetch(`${API}/api/admin/empresas`, { headers: { ...h } });
          if (!r.ok) {
            const t2 = await r.text().catch(() => "");
            throw new Error(`No se pudieron cargar empresas. HTTP ${r.status} ${t2}`);
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

  // Cargar controles
  useEffect(() => {
    if (!normativaSeleccionada) return;
    (async () => {
      try {
        setControles([]); setRespuestas({}); setComentarios({}); setResultado(null); setEvidencias({});
        const h = authHeader() || {};
        const r = await fetch(`${API}/api/controles/${normativaSeleccionada}`, { headers: { ...h } });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          throw new Error(`Error cargando controles: HTTP ${r.status} ${t}`);
        }
        const data = await r.json();
        const arr = Array.isArray(data) ? data : [];
        setControles(arr);

        const iniR = {}, iniC = {}, ev = {};
        arr.forEach(c => {
          iniR[c.clave] = '';
          iniC[c.clave] = '';
          ev[c.clave] = { filesToSend: [], uploaded: [], uploading: false, err: '' };
        });
        setRespuestas(iniR); setComentarios(iniC); setEvidencias(ev);
      } catch (e) {
        console.error(e);
        setControles([]); setRespuestas({}); setComentarios({});
      }
    })();
  }, [normativaSeleccionada]);

  const handleRespuesta  = (clave, valor) => setRespuestas(prev => ({ ...prev, [clave]: valor }));
  const handleComentario = (clave, texto) => setComentarios(prev => ({ ...prev, [clave]: texto }));

  const onPickFiles = (clave, fileList) => {
    const files = Array.from(fileList || []);
    setEvidencias(prev => ({ ...prev, [clave]: { ...(prev[clave]||{}), filesToSend: files, err: '' }}));
  };

  const uploadEvidence = async (clave) => {
    try {
      setEvidencias(prev => ({ ...prev, [clave]: { ...(prev[clave]||{}), uploading: true, err: '' }}));
      const item = evidencias[clave] || { filesToSend: [] };
      if (!item.filesToSend.length) {
        setEvidencias(prev => ({ ...prev, [clave]: { ...(prev[clave]||{}), uploading: false, err: 'Selecciona archivo(s) primero.' }}));
        return;
      }
      const fd = new FormData();
      fd.append('normativa', (normativaSeleccionada || '').toUpperCase());
      fd.append('clave', clave);
      item.filesToSend.forEach(f => fd.append('files', f));

      const h = authHeader() || {};
      const r = await fetch(`${API}/api/evidencias`, { method:'POST', headers:{ ...h }, body: fd });
      if (!r.ok) {
        const t = await r.text().catch(()=> '');
        throw new Error(`HTTP ${r.status} ${t}`);
      }
      const data = await r.json();
      setEvidencias(prev => ({ ...prev, [clave]: { filesToSend: [], uploaded: data.files || [], uploading: false, err: '' }}));
      alert('Evidencia subida correctamente.');
    } catch (e) {
      console.error('uploadEvidence', e);
      setEvidencias(prev => ({ ...prev, [clave]: { ...(prev[clave]||{}), uploading: false, err: 'Error subiendo evidencias.' }}));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const respuestasPayload = {};
    controles.forEach(c => {
      respuestasPayload[c.clave] = {
        valor: respuestas[c.clave] || '',
        comentario: (comentarios[c.clave] || '').trim()
      };
    });

    try {
      const h = authHeader() || {};
      const r = await fetch(`${API}/api/evaluaciones`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...h },
        body: JSON.stringify({
          empresa: selectedCompanyName || "",
          company_id: companyId || null,
          normativa: (normativaSeleccionada || '').toUpperCase(),
          respuestas: respuestasPayload
        })
      });
      if (!r.ok) {
        const t = await r.text().catch(()=> "");
        throw new Error(`Error evaluando: HTTP ${r.status} ${t}`);
      }
      const data = await r.json();
      // El backend devuelve: cumplimiento, nivel, incumplimientos, started_at, due_at, normativa...
      setResultado(data);
      alert('Evaluación guardada.');
    } catch (err) {
      console.error('Error evaluando:', err);
      alert('No se pudo completar la evaluación.');
    }
  };

  const colorNivel = (pct) => (pct>=80 ? '#2e7d32' : pct>=60 ? '#f9a825' : pct>=40 ? '#ef6c00' : '#c62828');

  const downloadPdf = () => {
    const el = resultadoRef.current;
    if (!el) return;
    html2canvas(el, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p','pt','a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const ley = String(normativaSeleccionada||'').trim();
      const fecha = new Date().toISOString().slice(0,10);

      pdf.setFont('helvetica','bold'); pdf.setFontSize(16);
      pdf.text(`Resultado de evaluación — ${ley}`, 40, 40);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
      pdf.text(`Empresa: ${selectedCompanyName || '-'}`, 40, 56);
      pdf.text(`Fecha: ${fecha}`, 40, 70);

      const top = 84, bottom = 30;
      const availH = pdfH - top - bottom;
      const img = pdf.getImageProperties(imgData);
      const w = pdfW - 80;
      let h = (img.height * w) / img.width;
      if (h > availH) h = availH;
      pdf.addImage(imgData, 'PNG', 40, top, w, h);

      const safe = (s) => s.replace(/[^\w\-]+/g,'_');
      pdf.save(`Evaluacion_${safe(ley)}_${fecha}.pdf`);
    });
  };

  const showEvidenceBlock = (val) => val === 'true' || val === 'partial';

  return (
    <div style={{ display:'flex', gap:'2rem', alignItems:'flex-start' }}>
      <div style={{ flex:1 }}>
        <h2 style={{ color:'#6a1b9a' }}>Evaluación: {normativaSeleccionada}</h2>

        <div className="g-card" style={{ padding:12, marginBottom:12 }}>
          <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <span>Empresa</span>
            <select disabled={compBusy || companies.length===0}
                    value={companyId}
                    onChange={(e)=> setCompanyId(e.target.value)}>
              {companies.length===0 && <option value="">(sin empresas activas)</option>}
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {compErr && <small style={{ color:'#c62828' }}>{compErr}</small>}
        </div>

        <form onSubmit={handleSubmit}>
          {controles.map(control => {
            const val = respuestas[control.clave] || '';
            const ev  = evidencias[control.clave] || { filesToSend:[], uploaded:[], uploading:false, err:'' };
            return (
              <div key={control.clave} style={{ marginBottom:22 }}>
                <p style={{ marginBottom:8 }}><strong>{control.pregunta}</strong></p>

                <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                  <button type="button"
                    onClick={()=> handleRespuesta(control.clave,'true')}
                    style={{ backgroundColor: val==='true' ? '#4CAF50' : '#e0e0e0', color: val==='true' ? 'white' : 'black',
                             padding:'8px 12px', border:'none', borderRadius:5, cursor:'pointer' }}>✔️ Sí</button>
                  <button type="button"
                    onClick={()=> handleRespuesta(control.clave,'partial')}
                    style={{ backgroundColor: val==='partial' ? '#FFC107' : '#e0e0e0', color: val==='partial' ? 'white' : 'black',
                             padding:'8px 12px', border:'none', borderRadius:5, cursor:'pointer' }}>⚠️ Parcial</button>
                  <button type="button"
                    onClick={()=> handleRespuesta(control.clave,'false')}
                    style={{ backgroundColor: val==='false' ? '#F44336' : '#e0e0e0', color: val==='false' ? 'white' : 'black',
                             padding:'8px 12px', border:'none', borderRadius:5, cursor:'pointer' }}>❌ No</button>
                </div>

                {/* Comentario */}
                <div style={{ marginTop:10 }}>
                  <label style={{ display:'block', marginBottom:6 }}>Comentario (opcional)</label>
                  <textarea rows={3} style={{ width:'100%', padding:8 }}
                    placeholder="Añade detalles, condicionantes, links internos, etc."
                    value={comentarios[control.clave] || ''}
                    onChange={(e)=> handleComentario(control.clave, e.target.value)} />
                </div>

                {/* Evidencia: visible si marcó Sí o Parcial */}
                {showEvidenceBlock(val) && (
                  <div style={{ marginTop:10, background:'#f5f8ff', border:'1px dashed #90caf9', padding:12, borderRadius:8 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                      <input type="file" multiple accept="image/*,application/pdf"
                        onChange={(e)=> onPickFiles(control.clave, e.target.files)} />
                      <button type="button" onClick={()=> uploadEvidence(control.clave)}
                        disabled={ev.uploading || !(ev.filesToSend?.length)}
                        className="btn-secondary" style={{ padding:'8px 12px' }}>
                        {ev.uploading ? 'Subiendo…' : 'Subir evidencia'}
                      </button>
                      {ev.err && <span style={{ color:'#c62828' }}>{ev.err}</span>}
                    </div>
                    {ev.filesToSend?.length>0 && (
                      <div style={{ marginTop:6 }}>
                        <small><strong>Seleccionados:</strong> {ev.filesToSend.map(f=>f.name).join(', ')}</small>
                      </div>
                    )}
                    {ev.uploaded?.length>0 && (
                      <div style={{ marginTop:6 }}>
                        <small><strong>Subidos:</strong>{' '}
                          {ev.uploaded.map((f,i)=>(
                            <a key={i} href={`${API}${f.url}`} target="_blank" rel="noreferrer" style={{ marginRight:10 }}>
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

          <button type="submit" disabled={!companyId || controles.length===0}
            style={{ marginTop:20, backgroundColor:'#ff6b00', color:'white', padding:'12px 20px',
                     border:'none', borderRadius:8, fontSize:'1rem', cursor:'pointer',
                     opacity: (!companyId || controles.length===0) ? 0.7 : 1 }}>
            Evaluar Cumplimiento
          </button>
        </form>
      </div>

      {resultado && (
        <>
          <div ref={resultadoRef}
            style={{ flex:1, backgroundColor:'#e3f2fd', border:'1px solid #90caf9', borderRadius:8, padding:'1.5rem' }}>
            <h3 style={{ color:'#1565c0', marginBottom:12 }}>Resultado</h3>
            <p><strong>Empresa:</strong> {selectedCompanyName || '-'}</p>
            <p><strong>Cumplimiento:</strong> {resultado.cumplimiento ?? 0}%</p>
            <p><strong>Nivel:</strong>{' '}
              <span style={{ backgroundColor: colorNivel(resultado.cumplimiento ?? 0), color:'white',
                             padding:'0.3rem 0.6rem', borderRadius:5 }}>
                {resultado.nivel ?? '-'}
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

            {/* Fechas (si el backend las envía) */}
            {(resultado.started_at || resultado.due_at) && (
              <div style={{ marginTop: 12, fontSize: 13 }}>
                {resultado.started_at && <div><strong>Fecha inicio:</strong> {new Date(resultado.started_at).toLocaleString()}</div>}
                {resultado.due_at && <div><strong>Fecha límite:</strong> {new Date(resultado.due_at).toLocaleString()}</div>}
              </div>
            )}
          </div>

          <button onClick={downloadPdf}
            style={{ marginTop:20, backgroundColor:'#00695c', color:'white', padding:'10px 16px',
                     border:'none', borderRadius:5, cursor:'pointer' }}>
            📄 Descargar PDF
          </button>
        </>
      )}
    </div>
  );
}
