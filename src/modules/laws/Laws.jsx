import Navbar from "../../components/Navbar";
import "../../modules/laws/Laws.css";
import evaluacionImg from "../../assets/logo.PNG"; // Cambia el nombre por la imagen que quieras mostrar

const Laws = () => (
  <>
    <Navbar />
    <div className="page-container evaluation-container">
      <div className="evaluation-header">
        <img src={evaluacionImg} alt="Evaluación" className="evaluation-img"/>
        <div>
          <h1>Evaluación de Leyes</h1>
          <p>
            Aquí puedes seleccionar las leyes y regulaciones que deseas evaluar según el marco legal y regulatorio.
            <br />
            Haz clic en cada ley para iniciar la autoevaluación y visualizar el cumplimiento.
          </p>
        </div>
      </div>
      {/* Aquí puedes agregar cards, botones o listas de leyes para evaluar */}
      <div className="laws-list">
        {/* Ejemplo de lista de leyes */}
        <div className="law-card">Ley de Protección de Datos Personales</div>
        <div className="law-card">Ley de Ciberseguridad</div>
        <div className="law-card">GDPR (Europa)</div>
        <div className="law-card">SOX (Estados Unidos)</div>
        {/* Agrega más según tu necesidad */}
      </div>
    </div>
  </>
);

export default Laws;
