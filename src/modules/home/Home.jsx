import Navbar from "../../components/Navbar";
import "../../styles/PageLayout.css";

const Home = () => (
  <>
    <Navbar />
    <div className="page-container">
      <h1>Bienvenido a Leyes-App</h1>
      <p className="lead">
        Esta herramienta te permite autoevaluar el cumplimiento de distintos marcos 
        legales y regulatorios (por ejemplo GDPR y SOX). Selecciona una ley, responde 
        los controles y obtén un informe con tu porcentaje de cumplimiento, nivel de 
        madurez y recomendaciones.
      </p>

      <section className="laws-section">
        <h2>Normativas Disponibles</h2>
        <div className="law-buttons">
          <a
            href="https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32016R0679"
            target="_blank"
            rel="noopener noreferrer"
            className="law-button"
          >
            GDPR (Europa)
          </a>
          <a
            href="https://www.dol.gov/sites/dolgov/files/oalj/PUBLIC/WHISTLEBLOWER/REFERENCES/STATUTES/SARBANES_OXLEY_ACT_OF_2002.PDF"
            target="_blank"
            rel="noopener noreferrer"
            className="law-button"
          >
            SOX (Estados Unidos)
          </a>
        </div>
        <p className="note">
          Haz clic en cualquiera de las normas para revisar el texto oficial. Luego ve 
          a “Evaluación” para comenzar tu autoevaluación.
        </p>
      </section>
    </div>
  </>
);

export default Home;