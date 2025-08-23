// app.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const auth = require('./middlewares/auth');
const requireAdmin = require('./middlewares/requireAdmin');

// ---------- Rutas ----------
const authRoutes           = require('./routes/authRoutes');          // /api/auth/*
const companyRoutes        = require('./routes/companyRoutes');       // /api/empresas (público con token)
const evaRoutes            = require('./routes/evaRoutes');           // /api/controles/:normativa ...
const evidenceRoutes       = require('./routes/evidenceRoutes');      // /api/evidencias
const evaluationRoutes     = require('./routes/evaluationRoutes');    // /api/evaluaciones

// Admin
const adminRegRoutes       = require('./routes/adminRegRoutes');      // /api/admin/regulaciones...
const adminUploadRoutes    = require('./routes/adminUploadRoutes');   // /api/admin/importar...
const adminCompaniesRoutes = require('./routes/adminCompaniesRoutes');// /api/admin/empresas...

const app = express();

// ---------- Seguridad ----------
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Logs
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ---------- CORS ----------
const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Origen no permitido por CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ---------- Parsers ----------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------- Health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ---------- Públicas ----------
app.use('/api/auth', authRoutes);

// Empresas (quedan fuera de auth para que el selector funcione con cualquier rol autenticado
// si tu companyRoutes ya valida user en middleware interno, puedes moverlo a protegidas)
app.use('/api', companyRoutes);

// ---------- Protegidas (requieren token) ----------
// Controles (preguntas de la normativa)
app.use('/api', auth, evaRoutes);

// Evidencias (multipart) y Evaluaciones (guardar/listar/detalle)
app.use('/api', auth, evidenceRoutes);
app.use('/api', auth, evaluationRoutes);

// ---------- Admin (token + rol admin) ----------
app.use('/api/admin', auth, requireAdmin, adminCompaniesRoutes);
app.use('/api/admin', auth, requireAdmin, adminRegRoutes);
app.use('/api/admin', auth, requireAdmin, adminUploadRoutes);

// ---------- Archivos subidos (solo dev) ----------
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Ping admin (protegida)
app.get('/api/admin/ping', auth, requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// ---------- 404 ----------
app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// ---------- Error handler ----------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor backend corriendo en puerto ${PORT}`));
