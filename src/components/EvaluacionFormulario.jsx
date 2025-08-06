import { useEffect, useState } from 'react';

function EvaluacionFormulario({ normativaSeleccionada }) {
  const [controles, setControles] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);

  // Cargar controles al seleccionar normativa
  useEffect(() => {
    if (normativaSeleccionada) {
      fetch(`http://localhost:4000/api/controles/${normativaSeleccionada}`)
        .then((res) => res.json())
        .then((data) => {
          setControles(data);
          // Inicializar todas las respuestas como false
          const estadoInicial = {};
          data.forEach((control) => {
            estadoInicial[control.clave] = false;
          });
          setRespuestas(estadoInicial);
        });
    }
  }, [normativaSeleccionada]);

  const handleChange = (clave, valor) => {
    setRespuestas({
      ...respuestas,
      [clave]: valor === 'true',
    });
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
      headers: { 'Content-Type': 'application/json' },
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
          <div key={control.clave}>
            <label>{control.pregunta}</label>
            <select
              value={respuestas[control.clave]}
              onChange={(e) => handleChange(control.clave, e.target.value)}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
        ))}

        <button type="submit">Evaluar Cumplimiento</button>
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
