import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.PNG";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => navigate("/home")}>
        <img src={logo} alt="Logo" />
      </div>
      <ul className="navbar-links">
        <li><Link to="/home">Inicio</Link></li>
        <li><Link to="/laws">Evaluación</Link></li>
        <li><Link to="/results">Resultados</Link></li>
        <li><Link to="/contact">Contacto</Link></li>
      </ul>
      {isAuthenticated && (
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      )}
    </nav>
  );
};

export default Navbar;
