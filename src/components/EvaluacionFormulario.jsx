import { useEffect, useState } from 'react';
import { authHeader } from "../../utils/authHeader";

function EvaluacionFormulario({ normativaSeleccionada }) {
  const [controles, setControles] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);

  // Cargar controles al seleccionar normativa
  useEffect(() => {
    if (normativaSeleccionada) {
       fetch(`http://localhost:4000/api/controles/${normativaSeleccionada}`, {
       headers: { ...authHeader() }
       })
        .then((res) => res.json())
        .then((data) => {
          setControles(data);
          const estadoInicial = {};
          data.forEach((control) => {
            estadoInicial[control.clave] = '';
          });
          setRespuestas(estadoInicial);
        });
    }
  }, [normativaSeleccionada]);

  const handleRespuesta = (clave, valor) => {
    setRespuestas((prev) => ({ ...prev, [clave]: valor }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      empresa: 'Farmacia Vida',
      normativa: normativaSeleccionada,
      respuestas,
    };

    const res = await fetch('http://localhost:4000/api/evaluar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setResultado(data);
  };

  return (
    <div>
      <h2>Evaluación: {normativaSeleccionada}</h2>

      <form onSubmit={handleSubmit}>
        {controles.map((control) => (
          <div key={control.clave} style={{ marginBottom: '20px' }}>
            <p><strong>{control.pregunta}</strong></p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleRespuesta(control.clave, 'true')}
                style={{
                  backgroundColor: respuestas[control.clave] === 'true' ? '#4CAF50' : '#e0e0e0',
                  color: respuestas[control.clave] === 'true' ? 'white' : 'black',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                ✔️ Sí
              </button>
              <button
                type="button"
                onClick={() => handleRespuesta(control.clave, 'partial')}
                style={{
                  backgroundColor: respuestas[control.clave] === 'partial' ? '#FFC107' : '#e0e0e0',
                  color: respuestas[control.clave] === 'partial' ? 'white' : 'black',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                ⚠️ Parcial
              </button>
              <button
                type="button"
                onClick={() => handleRespuesta(control.clave, 'false')}
                style={{
                  backgroundColor: respuestas[control.clave] === 'false' ? '#F44336' : '#e0e0e0',
                  color: respuestas[control.clave] === 'false' ? 'white' : 'black',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                ❌ No
              </button>
            </div>
          </div>
        ))}

        <button type="submit" style={{ marginTop: '20px', padding: '10px 15px' }}>
          Evaluar Cumplimiento
        </button>
      </form>

      {resultado && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Resultado</h3>
          <p><strong>Cumplimiento:</strong> {resultado.cumplimiento}%</p>
          <p><strong>Nivel:</strong> {resultado.nivel}</p>

          <h4>Controles no cumplidos:</h4>
          <ul>
            {resultado.incumplimientos.map((item, index) => (
              <li key={index}>
                <strong>{item.control}</strong> – {item.recomendacion} ({item.articulo})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default EvaluacionFormulario;