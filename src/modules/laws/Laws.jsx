import "../../modules/laws/Laws.css";
import evaluacionImg from "../../assets/logoLOGIN.png"; // placeholder para logos
import { useState } from "react";
import EvaluacionFormulario from "./EvaluacionFormulario";

const logoGDPR = evaluacionImg; // cámbialos cuando tengas los logos reales
const logoSOX  = evaluacionImg;

const Laws = () => {
  const [normativaSeleccionada, setNormativaSeleccionada] = useState(null);

  return (
    <>
      <div className="page-container evaluation-container">
        {/* === HERO idéntico al de Home === */}
        <section className="home-hero laws-hero">
          <div className="home-hero__inner">
            <div className="home-hero__badge">Plataforma de Evaluación</div>
            <h1 className="home-hero__title">
              Evaluación de <span>Leyes</span>
            </h1>
            <p className="home-hero__subtitle">
              Aquí puedes seleccionar las leyes y regulaciones que deseas evaluar según el marco legal y regulatorio.
              Responde los controles para visualizar el cumplimiento y generar un informe con recomendaciones.
            </p>
          </div>
        </section>

        {/* === Catálogo de normativas (solo visual) === */}
        <div className="laws-list">
          <div className="law-card" onClick={() => setNormativaSeleccionada("GDPR")}>
            <div className="law-card__logo law-card__logo--violet">
              <img src={logoGDPR} alt="GDPR" />
            </div>
            <div className="law-card__content">
              <h3 className="law-card__title">GDPR (Europa)</h3>
              <p className="law-card__text">
                Reglamento General de Protección de Datos. Marco clave para privacidad y protección de datos.
              </p>
            </div>
          </div>

          <div className="law-card" onClick={() => setNormativaSeleccionada("SOX")}>
            <div className="law-card__logo law-card__logo--indigo">
              <img src={logoSOX} alt="SOX" />
            </div>
            <div className="law-card__content">
              <h3 className="law-card__title">SOX (Estados Unidos)</h3>
              <p className="law-card__text">
                Sarbanes–Oxley. Controles sobre integridad financiera, auditoría y reporte.
              </p>
            </div>
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
