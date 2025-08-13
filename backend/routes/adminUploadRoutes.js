// backend/routes/adminUploadRoutes.js
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs/promises');
const path = require('path');

const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');
const db = require('../config/db');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// POST /api/admin/regulations/:id/upload
router.post('/regulations/:id/upload', auth, requireAdmin, upload.single('file'), async (req, res) => {
  const { id: regulation_id } = req.params;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Archivo requerido' });

  try {
    // 1) Parsear PDF
    const dataBuffer = await fs.readFile(file.path);
    const parsed = await pdfParse(dataBuffer);

    // 2) Registrar fuente (en dev file_url = ruta local; en prod usa Nhost Storage)
    const insertSrc = `
      INSERT INTO regulation_sources (id, regulation_id, file_url, file_name, mime_type, page_count, parsed)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, true)
      RETURNING *;
    `;
    const { rows: srcRows } = await db.query(insertSrc, [
      regulation_id,
      file.path,
      file.originalname,
      file.mimetype,
      parsed.numpages || null
    ]);

    // 3) Heurística simple para “pre-artículos”
    const text = parsed.text || '';
    const chunks = text
      .split(/\n\s*\n\s*\n/)        // separa por saltos grandes
      .filter(s => s.trim().length > 60)
      .slice(0, 50);                // limita por seguridad

    const inserted = [];
    for (let i = 0; i < chunks.length; i++) {
      const body = chunks[i].trim();
      const code = `AUTO-${i + 1}`;
      const qArt = `
        INSERT INTO articles (id, regulation_id, code, title, body, sort_index, created_at)
        VALUES (uuid_generate_v4(), $1, $2, NULL, $3, $4, now())
        RETURNING *;
      `;
      const { rows } = await db.query(qArt, [regulation_id, code, body, i + 1]);
      inserted.push(rows[0]);
    }

    // 4) Limpia archivo temporal
    await fs.unlink(file.path).catch(() => {});

    return res.json({
      source: srcRows[0],
      parsed_count: inserted.length,
      sample: inserted.slice(0, 3)
    });
  } catch (e) {
    console.error('POST /api/admin/regulations/:id/upload', e);
    return res.status(500).json({ error: 'Error al procesar PDF' });
  }
});

module.exports = router;
