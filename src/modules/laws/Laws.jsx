import Navbar from "../../components/Navbar";
import "../../modules/laws/Laws.css";
import evaluacionImg from "../../assets/logoLOGIN.png";
import { useState } from "react";
import EvaluacionFormulario from "./EvaluacionFormulario";

const Laws = () => {
  const [normativaSeleccionada, setNormativaSeleccionada] = useState(null);

  return (
    <>
      <Navbar />
      <div className="page-container evaluation-container">
        <div className="evaluation-header">
          <img src={evaluacionImg} alt="Evaluación" className="evaluation-img" />
          <div>
            <h1>Evaluación de Leyes</h1>
            <p>
              Aquí puedes seleccionar las leyes y regulaciones que deseas evaluar según el marco legal y regulatorio.
              <br />
              Haz clic en cada ley para iniciar la autoevaluación y visualizar el cumplimiento.
            </p>
          </div>
        </div>

        <div className="laws-list">
          <div className="law-card" onClick={() => setNormativaSeleccionada('GDPR')}>
            GDPR (Europa)
          </div>
          <div className="law-card" onClick={() => setNormativaSeleccionada('SOX')}>
            SOX (Estados Unidos)
          </div>
        </div>

        {normativaSeleccionada && (
          <EvaluacionFormulario normativaSeleccionada={normativaSeleccionada} />
        )}
      </div>
    </>
  );
};

export default Laws;
