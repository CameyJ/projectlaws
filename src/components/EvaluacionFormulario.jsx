// src/components/EvaluacionFormulario.jsx
import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authHeader } from "../../utils/authHeader";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function EvaluacionFormulario({ normativaSeleccionada }) {
  const [controles, setControles] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const resultadoRef = useRef();

  useEffect(() => {
    if (!normativaSeleccionada) return;
    (async () => {
      try {
        setControles([]);
        setRespuestas({});
        setResultado(null);

        const res = await fetch(`${API}/api/controles/${normativaSeleccionada}`, {
          headers: { ...authHeader() }
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setControles(arr);
        const inicial = {};
        arr.forEach((c) => (inicial[c.clave] = ''));
        setRespuestas(inicial);
      } catch (e) {
        console.error('Error cargando controles:', e);
        setControles([]);
        setRespuestas({});
      }
    })();
  }, [normativaSeleccionada]);

  const handleRespuesta = (clave, valor) =>
    setRespuestas((prev) => ({ ...prev, [clave]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { empresa: 'Farmacia Vida', normativa: normativaSeleccionada, respuestas };
    try {
      const res = await fetch(`${API}/api/evaluar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      const data = await res.json();
      setResultado(data);
    } catch (err) {
      console.error('Error evaluando:', err);
      setResultado(null);
      alert('No se pudo evaluar. Reintenta más tarde.');
    }
  };

  // Rangos de madurez UI: 0–33 Básico, 34–66 Intermedio, 67–100 Avanzado
  const nivelFromPct = (pct = 0) => {
    if (pct >= 67) return 'Avanzado';
    if (pct >= 34) return 'Intermedio';
    return 'Básico';
  };

  const colorNivel = (pct = 0) => {
    if (pct >= 67) return '#2e7d32'; // verde
    if (pct >= 34) return '#f9a825'; // ámbar
    return '#c62828';               // rojo
  };

  // ---- Descargar PDF con encabezado de la ley ----
  const downloadPdf = () => {
    const input = resultadoRef.current;
    if (!input) return;

    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Encabezado
      const ley = String(normativaSeleccionada || '').trim();
      const fecha = new Date().toISOString().slice(0,10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.text(`Resultado de evaluación — ${ley}`, 40, 40);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Fecha: ${fecha}`, 40, 58);

      // Área disponible bajo el encabezado
      const topMargin = 70; // espacio para el header
      const availableHeight = pdfHeight - topMargin - 30; // margen inferior

      // Calcular tamaño imagen manteniendo proporción
      const imgProps = pdf.getImageProperties(imgData);
      const targetWidth = pdfWidth - 40 * 2; // márgenes laterales 40
      let targetHeight = (imgProps.height * targetWidth) / imgProps.width;

      // Si la imagen excede el alto disponible, la ajustamos
      if (targetHeight > availableHeight) {
        targetHeight = availableHeight;
      }

      pdf.addImage(imgData, 'PNG', 40, topMargin, targetWidth, targetHeight);

      // Nombre de archivo
      const safe = (s) => s.replace(/[^\w\-]+/g, '_');
      pdf.save(`Evaluacion_${safe(ley)}_${fecha}.pdf`);
    });
  };

  const pct = resultado?.cumplimiento ?? 0;
  const nivelUI = nivelFromPct(pct);

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ color: '#6a1b9a' }}>Evaluación: {normativaSeleccionada}</h2>
        <form onSubmit={handleSubmit}>
          {controles.map((control) => (
            <div key={control.clave} style={{ marginBottom: 20 }}>
              <p style={{ marginBottom: 8 }}><strong>{control.pregunta}</strong></p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button"
                  onClick={() => handleRespuesta(control.clave, 'true')}
                  style={{
                    backgroundColor: respuestas[control.clave] === 'true' ? '#4CAF50' : '#e0e0e0',
                    color: respuestas[control.clave] === 'true' ? 'white' : 'black',
                    padding: '8px 12px', border: 'none', borderRadius: 5, cursor: 'pointer'
                  }}
                >✔️ Sí</button>
                <button type="button"
                  onClick={() => handleRespuesta(control.clave, 'partial')}
                  style={{
                    backgroundColor: respuestas[control.clave] === 'partial' ? '#FFC107' : '#e0e0e0',
                    color: respuestas[control.clave] === 'partial' ? 'white' : 'black',
                    padding: '8px 12px', border: 'none', borderRadius: 5, cursor: 'pointer'
                  }}
                >⚠️ Parcial</button>
                <button type="button"
                  onClick={() => handleRespuesta(control.clave, 'false')}
                  style={{
                    backgroundColor: respuestas[control.clave] === 'false' ? '#F44336' : '#e0e0e0',
                    color: respuestas[control.clave] === 'false' ? 'white' : 'black',
                    padding: '8px 12px', border: 'none', borderRadius: 5, cursor: 'pointer'
                  }}
                >❌ No</button>
              </div>
            </div>
          ))}

          <button
            type="submit"
            style={{
              marginTop: 20,
              backgroundColor: '#ff6b00',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: 8,
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Evaluar Cumplimiento
          </button>
        </form>
      </div>

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
            <p><strong>Cumplimiento:</strong> {pct}%</p>
            <p><strong>Nivel:</strong>{' '}
              <span
                style={{
                  backgroundColor: colorNivel(pct),
                  color: 'white',
                  padding: '0.3rem 0.6rem',
                  borderRadius: 5,
                }}
              >
                {nivelUI}
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
