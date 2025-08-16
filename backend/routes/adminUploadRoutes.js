// backend/routes/adminUploadRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const iconv = require('iconv-lite');

const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');
const db = require('../config/db');

const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB

// --- helpers --------------------------------------------------------
function normalizeText(txt) {
  if (!txt) return '';
  // pdf-parse normalmente ya entrega UTF-8, pero si llega “raro”, limpiamos:
  let t = txt;

  // Arreglos comunes de CP1252 y ligaduras
  t = t.replace(/\u00A0/g, ' ');           // NBSP -> espacio
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"); // comillas tipográficas
  t = t.replace(/\uFB01/g, 'fi').replace(/\uFB02/g, 'fl'); // ligaduras
  // Quita dobles espacios y espacios delante de saltos
  t = t.replace(/[ \t]+/g, ' ').replace(/[ \t]+\n/g, '\n');

  return t.trim();
}

/**
 * Divide el texto en artículos.
 * Soporta dos perfiles básicos:
 *  - "GDPR"   : cortes por /^Art(?:í|i)\.? +\d+[^\S\r\n]*(.*)$/mi
 *  - "SOX"    : cortes por /^(Section|Sec\.) +\d+[^\S\r\n]*(.*)$/mi
 *  - "CUSTOM" : recibe regex en el body (opcional)
 */
function splitIntoArticles({ fullText, profile = 'GDPR', customRegex }) {
  const text = normalizeText(fullText);

  let pattern;
  if (profile === 'SOX') {
    pattern = /^(?:Section|Sec\.)\s+(\d+)\s*(.*)$/gmi;
  } else if (profile === 'CUSTOM' && customRegex) {
    pattern = new RegExp(customRegex, 'gmi');
  } else {
    // GDPR (español):  Art. 1  /  Artículo 1 (si tu PDF usa esa palabra, puedes ampliarlo)
    pattern = /^(?:Art(?:í|i)\.?|Artículo)\s+(\d+)\s*(.*)$/gmi;
  }

  // Encontramos encabezados de artículo con sus índices
  const headers = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    headers.push({
      index: m.index,
      code: m[1],                   // número (1, 2,...)
      title: (m[2] || '').trim(),   // resto de la línea
    });
  }
  if (headers.length === 0) return [];

  // Cortamos el cuerpo de cada artículo
  const articles = [];
  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i < headers.length - 1 ? headers[i + 1].index : text.length;
    const slice = text.slice(start, end).trim();

    const code = headers[i].code;
    const title = headers[i].title;
    const body = slice;

    articles.push({
      code: `Art. ${code}`,
      title: title || null,
      body,
      sort_index: i + 1,
    });
  }
  return articles;
}
// -------------------------------------------------------------------

/**
 * POST /api/admin/regulaciones/:id/upload-pdf
 * multipart/form-data
 *  - file: PDF
 *  - profile: 'GDPR' | 'SOX' | 'CUSTOM'
 *  - customRegex: opcional (si profile = CUSTOM)
 */
router.post(
  '/regulaciones/:id/upload-pdf',
  auth,
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const profile = (req.body.profile || 'GDPR').toUpperCase();
      const customRegex = req.body.customRegex;

      if (!req.file) {
        return res.status(400).json({ error: 'Falta archivo PDF' });
      }

      // 1) Leemos el PDF
      const parsed = await pdfParse(req.file.buffer);
      const fullText = parsed.text || '';

      // 2) Partimos en artículos
      const articles = splitIntoArticles({ fullText, profile, customRegex });
      if (!articles.length) {
        return res.status(400).json({ error: 'No se detectaron artículos' });
      }

      // 3) Guardamos en BD en una transacción
      const client = await db.getClient();
      try {
        await client.query('BEGIN');

        const insertQ = `
          INSERT INTO public.articulos
            (id, regulacion_id, codigo, titulo, cuerpo, orden, creado_en)
          VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, now())
        `;
        for (const a of articles) {
          await client.query(insertQ, [id, a.code, a.title, a.body, a.sort_index]);
        }

        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }

      res.json({ ok: true, created: articles.length, profile });
    } catch (e) {
      console.error('upload-pdf error:', e);
      res.status(500).json({ error: 'Error procesando PDF' });
    }
  }
);

module.exports = router;
