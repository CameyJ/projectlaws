// components/PrivateRoute.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function PrivateRoute() {
  const { pathname } = useLocation();
  let token = null;
  try { token = localStorage.getItem("token"); } catch {}

  if (!token) {
    // si no hay token, te mando al login
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  return <Outlet />;
}
