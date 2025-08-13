// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const auth = require('./middlewares/auth');
const requireAdmin = require('./middlewares/requireAdmin');

const authRoutes = require('./routes/authRoutes');
const evaRoutes  = require('./routes/evaRoutes');

// Routers de admin
const adminRegRoutes    = require('./routes/adminRegRoutes');     // CRUD regs/artículos/controles
const adminUploadRoutes = require('./routes/adminUploadRoutes');  // Upload + parse PDF

const app = express();

// --- Seguridad (Helmet) ---
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// --- Logs (mejor antes de parsers) ---
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// --- CORS ---
const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
const corsCfg = {
  origin(origin, cb) {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsCfg));
// 👇 importante para preflight de navegadores


// --- Parsers ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Health ---
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Rutas públicas (auth) ---
app.use('/api/auth', authRoutes);

// --- Rutas privadas (evaluación) ---
app.use('/api', auth, evaRoutes);

// --- Archivos subidos (solo dev/local) ---
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// --- Rutas admin ---
// Nota: cada router ya valida auth + rol admin internamente.
// Si prefieres centralizar, podrías usar:
// app.use('/api/admin', auth, requireAdmin, adminRegRoutes);
// app.use('/api/admin', auth, requireAdmin, adminUploadRoutes);
app.use('/api/admin', adminRegRoutes);
app.use('/api/admin', adminUploadRoutes);

// Ping admin de ejemplo
app.get('/api/admin/ping', auth, requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// --- 404 ---
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// --- Handler de errores ---
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor backend corriendo en puerto ${PORT}`));
