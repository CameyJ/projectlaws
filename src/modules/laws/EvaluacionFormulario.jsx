import { useEffect, useState } from 'react';

function EvaluacionFormulario({ normativaSeleccionada }) {
  const [controles, setControles] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (normativaSeleccionada) {
      const token = localStorage.getItem("token");

      // Reinicia los estados completamente al cambiar normativa
      setControles([]);
      setRespuestas({});
      setResultado(null);

      fetch(`http://localhost:4000/api/controles/${normativaSeleccionada}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then((res) => res.ok ? res.json() : Promise.reject("Error al obtener controles"))
        .then((data) => {
          setControles(data);
          const estadoInicial = {};
          data.forEach(control => {
            estadoInicial[control.clave] = false;
          });
          setRespuestas(estadoInicial);
        })
        .catch((err) => console.error(err));
    }
  }, [normativaSeleccionada]);

  const handleChange = (clave, valor) => {
    setRespuestas({ ...respuestas, [clave]: valor === 'true' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const payload = {
      empresa: 'Farmacia Vida',
      normativa: normativaSeleccionada,
      respuestas,
    };

    const res = await fetch('http://localhost:4000/api/evaluar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setResultado(data);
  };

  // Color dinámico para el nivel, tomando en cuenta también el % de cumplimiento
  const getColorForNivel = (nivel, cumplimiento) => {
    const nivelLower = nivel.toLowerCase();
    if (nivelLower === 'alto' || cumplimiento >= 80) return '#2e7d32';     // Verde
    if (nivelLower === 'medio' || nivelLower === 'intermedio' || (cumplimiento >= 60 && cumplimiento < 80)) return '#f9a825'; // Amarillo
    if (nivelLower === 'bajo' || (cumplimiento >= 40 && cumplimiento < 60)) return '#ef6c00'; // Naranja
    return '#c62828'; // Rojo (menor al 40%)
  };

  return (
    <div style={{ display: 'flex', padding: '2rem', gap: '2rem' }}>
      {/* FORMULARIO */}
      <div style={{ flex: 1 }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', color: '#6a1b9a' }}>
          Evaluación: {normativaSeleccionada}
        </h2>

        <form onSubmit={handleSubmit}>
          {controles.map((control) => (
            <div
              key={control.clave}
              style={{
                marginBottom: '1rem',
                backgroundColor: '#f3f4f6',
                padding: '1rem',
                borderRadius: '8px',
              }}
            >
              <label>{control.pregunta}</label>
              <select
                value={respuestas[control.clave]}
                onChange={(e) => handleChange(control.clave, e.target.value)}
                style={{ marginLeft: '1rem', padding: '0.4rem' }}
              >
                <option value="true">✔️ Sí</option>
                <option value="false">❌ No</option>
              </select>
            </div>
          ))}

          <button
            type="submit"
            style={{
              backgroundColor: '#00695c',
              color: '#fff',
              padding: '0.6rem 1.2rem',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Evaluar Cumplimiento
          </button>
        </form>
      </div>

      {/* RESULTADO */}
      {resultado && (
        <div style={{
          flex: 1,
          backgroundColor: '#e3f2fd',
          border: '1px solid #90caf9',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.4rem', color: '#1565c0' }}>Resultado</h3>
          <p><strong>Cumplimiento:</strong> {resultado.cumplimiento}%</p>
          <p>
            <strong>Nivel:</strong>{" "}
            <span
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '5px',
                backgroundColor: getColorForNivel(resultado.nivel, resultado.cumplimiento),
                color: 'white',
              }}
            >
              {resultado.nivel}
            </span>
          </p>

          <h4 style={{ marginTop: '1rem' }}>Controles no cumplidos:</h4>
          <ul style={{ paddingLeft: '1.2rem' }}>
            {resultado.incumplimientos.map((item, index) => (
              <li key={index} style={{ marginBottom: '0.5rem' }}>
                <strong>{item.control}</strong> — {item.recomendacion} <em>({item.articulo})</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default EvaluacionFormulario;
