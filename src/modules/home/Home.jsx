import Navbar from "../../components/Navbar";
import "../../styles/PageLayout.css";

const Home = () => (
  <>
    <Navbar />
    <div className="page-container">
      <h1>Bienvenido a la página de inicio</h1>
      <p>¡Has iniciado sesión correctamente!</p>
    </div>
  </>
);

export default Home;
