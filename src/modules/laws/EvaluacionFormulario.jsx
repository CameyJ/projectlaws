import { useEffect, useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function EvaluacionFormulario({ normativaSeleccionada }) {
  const [controles, setControles] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const resultadoRef = useRef();

  useEffect(() => {
    if (!normativaSeleccionada) return;
    setControles([]);
    setRespuestas({});
    setResultado(null);

    fetch(`http://localhost:4000/api/controles/${normativaSeleccionada}`)
      .then((res) => res.json())
      .then((data) => {
        setControles(data);
        const inicial = {};
        data.forEach((c) => (inicial[c.clave] = ''));
        setRespuestas(inicial);
      })
      .catch(console.error);
  }, [normativaSeleccionada]);

  const handleRespuesta = (clave, valor) =>
    setRespuestas((prev) => ({ ...prev, [clave]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { empresa: 'Farmacia Vida', normativa: normativaSeleccionada, respuestas };
    const res = await fetch('http://localhost:4000/api/evaluar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setResultado(data);
  };

  const colorNivel = (pct) => {
    if (pct >= 80) return '#2e7d32';
    if (pct >= 60) return '#f9a825';
    if (pct >= 40) return '#ef6c00';
    return '#c62828';
  };

  // ► Función para descargar PDF (escala a A4)
  const downloadPdf = () => {
    const input = resultadoRef.current;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      // PDF A4
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Escalar imagen manteniendo proporción
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pdfWidth;
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      const finalHeight = imgHeight > pdfHeight ? pdfHeight : imgHeight;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, finalHeight);
      pdf.save(`Evaluacion_${normativaSeleccionada}.pdf`);
    });
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
      {/* FORMULARIO */}
      <div style={{ flex: 1 }}>
        <h2 style={{ color: '#6a1b9a' }}>Evaluación: {normativaSeleccionada}</h2>
        <form onSubmit={handleSubmit}>
          {controles.map((control) => (
            <div key={control.clave} style={{ marginBottom: 20 }}>
              <p style={{ marginBottom: 8 }}><strong>{control.pregunta}</strong></p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => handleRespuesta(control.clave, 'true')}
                  style={{
                    backgroundColor: respuestas[control.clave] === 'true' ? '#4CAF50' : '#e0e0e0',
                    color: respuestas[control.clave] === 'true' ? 'white' : 'black',
                    padding: '8px 12px', border: 'none', borderRadius: 5, cursor: 'pointer'
                  }}
                >✔️ Sí</button>
                <button
                  type="button"
                  onClick={() => handleRespuesta(control.clave, 'partial')}
                  style={{
                    backgroundColor: respuestas[control.clave] === 'partial' ? '#FFC107' : '#e0e0e0',
                    color: respuestas[control.clave] === 'partial' ? 'white' : 'black',
                    padding: '8px 12px', border: 'none', borderRadius: 5, cursor: 'pointer'
                  }}
                >⚠️ Parcial</button>
                <button
                  type="button"
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

      {/* RESULTADO (capturado por el ref) */}
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

            {resultado.incumplimientos.length > 0 && (
              <>
                <h4 style={{ marginTop: 16 }}>Controles no cumplidos:</h4>
                <ul style={{ paddingLeft: '1.2rem' }}>
                  {resultado.incumplimientos.map((item, i) => (
                    <li key={i} style={{ marginBottom: 6 }}>
                      <strong>{item.control}</strong> — {item.recomendacion} <em>({item.articulo})</em>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Botón DESCARGAR PDF, FUERA del ref */}
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