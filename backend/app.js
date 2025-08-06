const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Rutas de autenticación
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// ✅ Rutas de evaluación legal
const evaRoutes = require('./routes/evaRoutes');
app.use('/api', evaRoutes); // expone /api/evaluar y /api/controles/:normativa

// Puerto
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en puerto ${PORT}`);
}); // <- Asegúrate de cerrar esta función correctamente
