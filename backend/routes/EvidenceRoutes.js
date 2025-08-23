// backend/routes/evidenceRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const auth = require('../middlewares/auth'); // requiere sesión

// Carpeta base para evidencias
const BASE_DIR = path.join(__dirname, '..', 'uploads', 'evidencias');

// Asegura directorio recursivo
function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Storage con subcarpetas: /uploads/evidencias/<normativa>/<clave>/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const normativa = String(req.body.normativa || '').toUpperCase().replace(/[^\w-]+/g, '_');
    const clave = String(req.body.clave || '').replace(/[^\w-]+/g, '_');
    if (!normativa || !clave) {
      return cb(new Error('normativa y clave son requeridos'), '');
    }
    const dest = path.join(BASE_DIR, normativa, clave);
    ensureDirSync(dest);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    cb(null, `${ts}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// POST /api/evidencias  (multipart/form-data)
// fields: normativa, clave, (opcional) nota, files[] (multiple)
router.post('/evidencias', auth, upload.array('files', 10), async (req, res) => {
  try {
    const normativa = String(req.body.normativa || '').toUpperCase();
    const clave = String(req.body.clave || '');
    if (!normativa || !clave) {
      return res.status(400).json({ error: 'normativa y clave son requeridos' });
    }
    const files = (req.files || []).map(f => ({
      filename: f.filename,
      mimetype: f.mimetype,
      size: f.size,
      url: `/uploads/evidencias/${normativa}/${clave}/${f.filename}` // URL pública (en dev)
    }));

    return res.json({ ok: true, normativa, clave, files });
  } catch (e) {
    console.error('POST /api/evidencias', e);
    return res.status(500).json({ error: 'Error subiendo evidencias' });
  }
});

// GET /api/evidencias/:normativa/:clave  -> lista archivos subidos
router.get('/evidencias/:normativa/:clave', auth, async (req, res) => {
  try {
    const normativa = String(req.params.normativa || '').toUpperCase().replace(/[^\w-]+/g, '_');
    const clave = String(req.params.clave || '').replace(/[^\w-]+/g, '_');
    const dir = path.join(BASE_DIR, normativa, clave);
    if (!fs.existsSync(dir)) return res.json({ files: [] });

    const files = fs.readdirSync(dir).map(name => ({
      filename: name,
      url: `/uploads/evidencias/${normativa}/${clave}/${name}`
    }));
    return res.json({ files });
  } catch (e) {
    console.error('GET /api/evidencias/:normativa/:clave', e);
    return res.status(500).json({ error: 'Error listando evidencias' });
  }
});

module.exports = router;
