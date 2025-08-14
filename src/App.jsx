import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./modules/auth/Login";
import Home from "./modules/home/Home";
import Laws from "./modules/laws/Laws";
import Results from "./modules/results/Results";

import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import AuthenticatedLayout from "./components/AuthenticatedLayout";

// Admin
import AdminDashboard from "./modules/admin/AdminDashboard";
import ControlesAdmin from "./modules/admin/ControlesAdmin";
import RegulacionesAdmin from "./modules/admin/RegulacionesAdmin";
import AdminArticles from "./modules/admin/AdminArticles";          // ⬅️ nuevo
import AdminControlBuilder from "./modules/admin/AdminControlBuilder"; // ⬅️ nuevo

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública */}
        <Route path="/login" element={<Login />} />

        {/* Privadas (con navbar) */}
        <Route element={<PrivateRoute />}>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/laws" element={<Laws />} />
            <Route path="/results" element={<Results />} />

            {/* Solo Admin */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/regulaciones" element={<RegulacionesAdmin />} />
              <Route path="/admin/controles" element={<ControlesAdmin />} />
              <Route path="/admin/articulos" element={<AdminArticles />} />
              <Route path="/admin/controles/nuevo" element={<AdminControlBuilder />} />
              {/* opcional: artículos filtrados por regulación */}
              <Route path="/admin/regulaciones/:id/articulos" element={<AdminArticles />} />
            </Route>
          </Route>
        </Route>

        {/* Redirecciones */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
