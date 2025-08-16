import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav>
      <Link to="/home">Inicio</Link>
      <Link to="/laws">Evaluación</Link>
      <Link to="/results">Resultados</Link>

      {/* Sección Admin */}
      <Link to="/admin">Admin</Link>
      <Link to="/admin/regulaciones">Regulaciones</Link>
      <Link to="/admin/controles">Controles</Link>
      <Link to="/admin/importar">Importar PDF</Link> {/* ⬅️ Nuevo enlace */}
    </nav>
  );
}
