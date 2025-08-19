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

/**
 * Divide el texto en artículos.
 * Soporta:
 *  - Español:  "Artículo 1", "Art. 1", "ARTÍCULO 1"
 *  - Inglés:   "Article 1", "ARTICLE 1"
 *  - SOX:      "Section 1", "Sec. 1"
 * Captura el título de la misma línea (tras :, ., –, — opcionales).
 */
function splitIntoArticles({ fullText }) {
  const text = normalizeText(fullText);

  // Encabezado tolerante con variantes y signos de puntuación
  // Grupos:
  //  1 = número/código del artículo (permite sufijos tipo 5bis)
  //  2 = título (resto de la línea)
  const headerRe = new RegExp(
    String.raw`^ *(?:Art(?:[íi]culo)?\.?|Artículo|Article|SECTION|Section|Sec\.)\s*` + // palabra clave
    String.raw`(\d+[A-Za-z\-]*)` +                                                    // número (p.ej. 5, 5bis)
    String.raw`\s*(?:[:.\-–—])?\s*` +                                                 // separador opcional
    String.raw`(.*)$`,                                                                // título de la línea
    'gmi'
  );

  // Encontramos encabezados + posiciones
  const headers = [];
  let m;
  while ((m = headerRe.exec(text)) !== null) {
    headers.push({
      index: m.index,
      num: (m[1] || '').trim(),
      title: (m[2] || '').trim(),
      line: (text.slice(m.index, text.indexOf('\n', m.index) === -1 ? text.length : text.indexOf('\n', m.index)) || '').trim()
    });
  }

  if (!headers.length) {
    // Sin encabezados → 1 bloque
    return [{ code: 'DOC', title: 'Documento', body: text, sort_index: 1 }];
  }

  const parts = [];
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i < headers.length - 1 ? headers[i + 1].index : text.length;
    let slice = text.slice(start, end).trim();

    // Quitar la primera línea (el encabezado) del cuerpo
    const firstNewline = slice.indexOf('\n');
    if (firstNewline !== -1) {
      slice = slice.slice(firstNewline + 1).trim();
    } else {
      slice = '';
    }

    parts.push({
      code: `Art. ${headers[i].num}`,
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

    // 3) Split mejorado (incluye "Article N")
    const parts = splitIntoArticles({ fullText });

    // 4) Inserción (sin transacción, simple y robusto)
    let inserted = 0;
    let skipped = 0;

    for (const a of parts) {
      const ex = await q(
        `SELECT id FROM public.articles
           WHERE regulation_id = $1 AND code ILIKE $2
           LIMIT 1`,
        [regulation_id, a.code]
      );
      if (ex.rowCount > 0) { skipped++; continue; }

      await q(
        `INSERT INTO public.articles
           (id, regulation_id, code, title, body, sort_index, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, now())`,
        [regulation_id, a.code, a.title, a.body, a.sort_index || null]
      );
      inserted++;
    }

    return res.json({
      ok: true,
      regulation_id,
      parsed_chars: fullText.length,
      total_detected: parts.length,
      inserted,
      skipped,
    });
  } catch (e) {
    console.error('POST /api/admin/upload/pdf', e);
    res.status(500).json({ error: 'Error procesando PDF' });
  }
}

// Rutas compatibles
router.post('/upload/pdf', auth, requireAdmin, upload.single('file'), handleUpload);
router.post('/regulaciones/:id/upload-pdf', auth, requireAdmin, upload.single('file'), handleUpload);

module.exports = router;
