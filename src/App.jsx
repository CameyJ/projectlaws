import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from './modules/auth/Login';
import Home from './modules/home/Home';
import Laws from './modules/laws/Laws';
import Results from './modules/results/Results';
import Contact from './modules/contact/Contact';
import SoxEvaluation from './modules/laws/SoxEvaluation'; // ✅ Importación añadida
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas privadas */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/laws"
          element={
            <PrivateRoute>
              <Laws />
            </PrivateRoute>
          }
        />
        <Route
          path="/results"
          element={
            <PrivateRoute>
              <Results />
            </PrivateRoute>
          }
        />
        <Route
          path="/contact"
          element={
            <PrivateRoute>
              <Contact />
            </PrivateRoute>
          }
        />

        {/* ✅ Nueva ruta privada para evaluación SOX */}
        <Route
          path="/evaluacion/sox"
          element={
            <PrivateRoute>
              <SoxEvaluation />
            </PrivateRoute>
          }
        />

        {/* Ruta por defecto (404) redirige al login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
