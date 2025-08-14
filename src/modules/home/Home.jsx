// src/modules/home/Home.jsx
import { Link } from "react-router-dom";

import "../../styles/PageLayout.css";

export default function Home() {
  return (
    <>


      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero__inner">
          <div className="home-hero__badge">Plataforma de Evaluación</div>
          <h1 className="home-hero__title">Bienvenido a <span>Leyes-App</span></h1>
          <p className="home-hero__subtitle">
            Evalúa el cumplimiento de marcos legales como <strong>GDPR</strong> y <strong>SOX</strong>.
            Responde controles, visualiza tu porcentaje y genera un informe con nivel de madurez
            y recomendaciones.
          </p>

          <div className="home-hero__cta">
            <Link to="/laws" className="btn btn-primary">Comenzar evaluación</Link>
            <a href="#como-funciona" className="btn btn-ghost">Ver cómo funciona</a>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="home-steps">
        <div className="home-steps__grid">
          <article className="card step">
            <div className="step__icon">📂</div>
            <h3 className="step__title">1. Selecciona la norma</h3>
            <p className="step__text">
              Elige GDPR o SOX.
            </p>
          </article>

          <article className="card step">
            <div className="step__icon">✅</div>
            <h3 className="step__title">2. Responde los controles</h3>
            <p className="step__text">
              Marca <em>Sí</em>, <em>Parcial</em> o <em>No</em> y observa tu porcentaje de cumplimiento.
            </p>
          </article>

          <article className="card step">
            <div className="step__icon">📄</div>
            <h3 className="step__title">3. Descarga el informe</h3>
            <p className="step__text">
              Genera un PDF con nivel de madurez y recomendaciones puntuales.
            </p>
          </article>
        </div>
      </section>

      {/* Normativas */}
      <section className="laws-section">
        <h2 className="laws-title">Normativas Disponibles</h2>

        <div className="laws-grid">
          <article className="card law">
            <div className="law__icon">🛡️</div>
            <h3 className="law__title">GDPR (Europa)</h3>
            <p className="law__text">
              Reglamento General de Protección de Datos. Marco clave para privacidad y protección de datos.
            </p>
            <div className="law__actions">
              <a
                className="btn btn-light"
                href="https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32016R0679"
                target="_blank"
                rel="noopener noreferrer"
              >
                Leer norma
              </a>
              <Link to="/laws" className="btn btn-primary">Evaluar GDPR</Link>
            </div>
          </article>

          <article className="card law">
            <div className="law__icon">📊</div>
            <h3 className="law__title">SOX (Estados Unidos)</h3>
            <p className="law__text">
              Sarbanes-Oxley. Controles sobre integridad financiera, auditoría y reporte.
            </p>
            <div className="law__actions">
              <a
                className="btn btn-light"
                href="https://www.dol.gov/agencies/oalj/PUBLIC/WHISTLEBLOWER/REFERENCES/STATUTES/SARBANES_OXLEY_ACT_OF_2002"
                target="_blank"
                rel="noopener noreferrer"
              >
                Leer norma
              </a>
              <Link to="/laws" className="btn btn-primary">Evaluar SOX</Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}