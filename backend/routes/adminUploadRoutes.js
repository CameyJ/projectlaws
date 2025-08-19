// backend/routes/adminUploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');

const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');
const db = require('../config/db');

// ─────────────────────────────────────────────
// Multer en memoria (20 MB)
// ─────────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const q = (text, params) => db.query(text, params);

// Helper robusto para obtener un cliente transaccional
async function acquireClient() {
  if (typeof db.connect === 'function') {
    // pg.Pool nativo
    return await db.connect();
  }
  if (typeof db.getClient === 'function') {
    // wrapper propio (como en tu otro router)
    return await db.getClient();
  }
  return null; // sin soporte de cliente explícito
}

// ─────────────────────────────────────────────
// Normalización y partición de artículos
// ─────────────────────────────────────────────
function normalizeText(txt) {
  if (!txt) return '';
  return (txt || '')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Soporta Art./Artículo/ARTÍCULO y Section/Sec. */
function splitIntoArticles({ fullText, profile = 'GDPR', customRegex }) {
  const text = normalizeText(fullText);
  let pattern;

  const P = (profile || 'GDPR').toUpperCase();
  if (P === 'SOX') {
    pattern = /^(?:Section|Sec\.)\s+(\d+)\s*(.*)$/gmi;
  } else if (P === 'CUSTOM' && customRegex) {
    pattern = new RegExp(customRegex, 'gmi');
  } else {
    pattern = /^(?:Art(?:í|i)culo|Art\.?)\s+(\d+)\s*(.*)$/gmi;
  }

  const headers = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    headers.push({ index: m.index, code: m[1], title: (m[2] || '').trim() });
  }

  if (!headers.length) {
    return [
      { code: 'DOC', title: 'Documento', body: text, sort_index: 1 }
    ];
  }

  const parts = [];
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i < headers.length - 1 ? headers[i + 1].index : text.length;
    const slice = text.slice(start, end).trim();
    parts.push({
      code: `Art. ${headers[i].code}`,
      title: headers[i].title || null,
      body: slice,
      sort_index: i + 1,
    });
  }
  return parts;
}

// ─────────────────────────────────────────────
// Ping de diagnóstico
// ─────────────────────────────────────────────
router.get('/upload/ping', auth, requireAdmin, (_req, res) => {
  res.json({ ok: true, where: 'adminUploadRoutes', msg: 'uploader montado' });
});

// ─────────────────────────────────────────────
// Handler común (ambas rutas)
// ─────────────────────────────────────────────
async function handleUpload(req, res) {
  try {
    const regulation_id = req.params.id || req.body.regulation_id;
    const profile = (req.body.profile || 'GDPR').toUpperCase();
    const customRegex = req.body.customRegex;

    if (!regulation_id) return res.status(400).json({ error: 'regulation_id es requerido' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'Falta archivo PDF (key: file)' });

    // 1) Verifica regulación
    const reg = await q(
      `SELECT id, code, name, is_active
       FROM public.regulations
       WHERE id = $1 AND is_active = true`,
      [regulation_id]
    );
    if (reg.rowCount === 0) {
      return res.status(404).json({ error: 'Regulación no encontrada o inactiva' });
    }

    // 2) Parse PDF
    let parsed;
    try {
      parsed = await pdfParse(req.file.buffer);
    } catch (err) {
      console.error('pdf-parse error:', err);
      return res.status(400).json({ error: 'No se pudo leer texto del PDF. ¿Es un escaneo sin OCR?' });
    }
    const fullText = parsed.text || '';

    // 3) Split
    const parts = splitIntoArticles({ fullText, profile, customRegex });

    // 4) Inserción (con transacción si hay cliente; si no, sin transacción)
    const client = await acquireClient();
    const runQuery = client ? client.query.bind(client) : q;

    try {
      if (client) await runQuery('BEGIN');

      let inserted = 0;
      let skipped = 0;

      for (const a of parts) {
        const ex = await runQuery(
          `SELECT id FROM public.articles
             WHERE regulation_id = $1 AND code ILIKE $2
             LIMIT 1`,
          [regulation_id, a.code]
        );
        if (ex.rowCount > 0) { skipped++; continue; }

        await runQuery(
          `INSERT INTO public.articles
             (id, regulation_id, code, title, body, sort_index, created_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, now())`,
          [regulation_id, a.code, a.title, a.body, a.sort_index || null]
        );
        inserted++;
      }

      if (client) await runQuery('COMMIT');

      return res.json({
        ok: true,
        regulation_id,
        parsed_chars: fullText.length,
        total_detected: parts.length,
        inserted,
        skipped,
        profile,
      });
    } catch (e) {
      if (client) await runQuery('ROLLBACK');
      throw e;
    } finally {
      if (client) client.release();
    }
  } catch (e) {
    console.error('POST /api/admin/upload/pdf', e);
    res.status(500).json({ error: 'Error procesando PDF' });
  }
}

// Rutas compatibles
router.post('/upload/pdf', auth, requireAdmin, upload.single('file'), handleUpload);
router.post('/regulaciones/:id/upload-pdf', auth, requireAdmin, upload.single('file'), handleUpload);

module.exports = router;
