// components/AdminRoute.jsx
import { Navigate, Outlet } from "react-router-dom";

export default function AdminRoute() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user") || "null"); } catch {}

  const isAdmin = !!user && (
    String(user?.rol || "").toUpperCase() === "ADMIN" ||
    Number(user?.role_id) === 1
  );

  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
