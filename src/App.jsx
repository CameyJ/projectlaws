import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./modules/auth/Login";
import Home from "./modules/home/Home";
import Laws from "./modules/laws/Laws";
import Results from "./modules/results/Results";

import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import AuthenticatedLayout from "./components/AuthenticatedLayout";

// ⚠️ Asegúrate que EXISTE este archivo con este nombre EXACTO (singular):
import AdminDashboard from "./modules/admin/AdminDashboard";
import ControlesAdmin from "./modules/admin/ControlesAdmin";
import RegulacionesAdmin from "./modules/admin/RegulacionesAdmin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pública (sin navbar) */}
        <Route path="/login" element={<Login />} />

        {/* Privadas (con navbar mediante AuthenticatedLayout) */}
        <Route element={<PrivateRoute />}>
          <Route element={<AuthenticatedLayout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/laws" element={<Laws />} />
            <Route path="/results" element={<Results />} />

            {/* Solo Admin */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/controles" element={<ControlesAdmin />} />
              <Route path="/admin/regulaciones" element={<RegulacionesAdmin />} />
            </Route>
          </Route>
        </Route>

        {/* Raíz -> login; cualquier otra ruta desconocida -> login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
