import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from './modules/auth/Login';
import Home from './modules/home/Home';
import Laws from './modules/laws/Laws';
import Results from './modules/results/Results';
//import About from './modules/about/About';
import Contact from './modules/contact/Contact';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Todas estas rutas son privadas, solo con login */}
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

        {/* Si no existe la ruta, redirige a login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
