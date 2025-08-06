import { Navigate } from "react-router-dom";

// children: el componente que debe mostrarse si el usuario está logeado
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("token");
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
