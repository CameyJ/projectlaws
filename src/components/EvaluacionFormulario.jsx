import { useEffect, useState } from "react";
import { API, authHeaders } from "../../api";

export default function EvaluacionFormulario({ normativaSeleccionada }) {
  const [controles, setControles] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!normativaSeleccionada) return;
    setControles([]); setRespuestas({}); setResultado(null);

    fetch(`${API}/api/controles/${normativaSeleccionada}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setControles(data);
        const init = {};
        data.forEach(c => init[c.id || c.clave || c.pregunta] = "");
        setRespuestas(init);
      })
      .catch(console.error);
  }, [normativaSeleccionada]);

  const handleRespuesta = (clave, valor) =>
    setRespuestas(prev => ({ ...prev, [clave]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      empresa: "Farmacia Vida",
      normativa: normativaSeleccionada,
      respuestas,
    };
    const res = await fetch(`${API}/api/evaluar`, {
      method: "POST",
      headers: authHeaders({ "Content-Type":"application/json" }),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setResultado(data);
  };

  return (
    <div className="eval-layout">
      <div className="eval-form">
        <h2>Evaluación: {normativaSeleccionada}</h2>

        <form onSubmit={handleSubmit}>
          {controles.map((c, idx) => {
            const key = c.id || c.clave || `c_${idx}`;
            return (
              <div key={key} className="q-card">
                <div className="eval-title">
                  <h2>{c.pregunta || c.question}</h2>
                </div>

                {/* opcional: muestra referencia de artículo */}
                {(c.articulo_codigo || c.articulo_titulo) && (
                  <div className="eval-intro" style={{marginBottom:8}}>
                    <small>
                      {c.articulo_codigo ? <strong>{c.articulo_codigo}</strong> : null}
                      {c.articulo_titulo ? <> — {c.articulo_titulo}</> : null}
                    </small>
                  </div>
                )}

                <div className="eval-questions">
                  <button type="button"
                    onClick={()=>handleRespuesta(key, "true")}
                    className={respuestas[key]==="true"?"btn-yes active":"btn-yes"}>✔ Sí</button>
                  <button type="button"
                    onClick={()=>handleRespuesta(key, "partial")}
                    className={respuestas[key]==="partial"?"btn-partial active":"btn-partial"}>⚠ Parcial</button>
                  <button type="button"
                    onClick={()=>handleRespuesta(key, "false")}
                    className={respuestas[key]==="false"?"btn-no active":"btn-no"}>✖ No</button>
                </div>
              </div>
            );
          })}

          {!!controles.length && (
            <button type="submit" className="btn-primary" style={{marginTop:16}}>
              Evaluar Cumplimiento
            </button>
          )}
        </form>
      </div>

      {/* panel de resultado (tal como ya lo tenías) */}
      {resultado && (
        <div className="g-card" style={{marginLeft:24, minWidth:360}}>
          <h3>Resultado</h3>
          <p><strong>Cumplimiento:</strong> {resultado.cumplimiento}%</p>
          <p><strong>Nivel:</strong> {resultado.nivel}</p>
          {!!resultado.incumplimientos?.length && (
            <>
              <h4>Controles no cumplidos</h4>
              <ul>
                {resultado.incumplimientos.map((i, k)=>(
                  <li key={k}><strong>{i.control}</strong> — {i.recomendacion} <em>({i.articulo})</em></li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
