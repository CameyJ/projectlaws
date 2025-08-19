// backend/routes/evaRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // pool/cliente PG
const { evaluarCumplimiento } = require('../controllers/evaluacionController');

// Fallback local (si BD no tiene controles)
const controlesGDPR = require('../data/gdpr');
const controlesSOX  = require('../data/sox');

// Helper query
const q = (text, params) => db.query(text, params);

/* -------------------------------------------------------
   POST: evaluar cumplimiento (sin cambios)
------------------------------------------------------- */
router.post('/evaluar', evaluarCumplimiento);

/* -------------------------------------------------------
   GET: Controles por código de normativa (GDPR | SOX | ...)
   Lee DESDE BD usando tablas en inglés:
   - public.regulations (code)
   - public.articles     (code, title, is_enabled)
   - public.controls     (is_active)
   Solo devuelve controles cuyo artículo esté habilitado.
   Si no hay datos en BD -> fallback a JSON local.
------------------------------------------------------- */
router.get('/controles/:normativa', async (req, res) => {
  const normativa = String(req.params.normativa || '').trim().toUpperCase();

  try {
    const sql = `
      SELECT
        c.id,
        c.clave,
        c.pregunta,
        c.recomendacion,
        c.peso,
        a.code  AS articulo_codigo,
        a.title AS articulo_titulo
      FROM public.controls  AS c
      JOIN public.regulations AS r ON r.id = c.regulation_id
      LEFT JOIN public.articles    AS a ON a.id = c.article_id
      WHERE r.code = $1
        AND COALESCE(c.is_active, true) = true
        AND (a.id IS NULL OR COALESCE(a.is_enabled, true) = true)
      ORDER BY
        COALESCE((regexp_match(a.code, '([0-9]+)'))[1]::int, 2147483647),
        c.clave ASC, c.pregunta ASC;
    `;
    const { rows } = await q(sql, [normativa]);

    if (rows.length > 0) {
      return res.json(rows);
    }

    // Fallback si no hay en BD
    switch (normativa) {
      case 'GDPR': return res.json(controlesGDPR);
      case 'SOX':  return res.json(controlesSOX);
      default:     return res.status(404).json({ error: 'Normativa no encontrada' });
    }
  } catch (e) {
    console.error('Error listando controles por normativa:', e);
    return res.status(500).json({ error: 'Error de servidor' });
  }
});

/* -------------------------------------------------------
   GET: Controles por ID de regulación (UUID)
   (sin fallback; es ID de BD)
------------------------------------------------------- */
router.get('/controles/por-regulacion/:regulacionId', async (req, res) => {
  const { regulacionId } = req.params;

  try {
    const sql = `
      SELECT
        c.id,
        c.clave,
        c.pregunta,
        c.recomendacion,
        c.peso,
        a.code  AS articulo_codigo,
        a.title AS articulo_titulo
      FROM public.controls  AS c
      LEFT JOIN public.articles AS a ON a.id = c.article_id
      WHERE c.regulation_id = $1
        AND COALESCE(c.is_active, true) = true
        AND (a.id IS NULL OR COALESCE(a.is_enabled, true) = true)
      ORDER BY
        COALESCE((regexp_match(a.code, '([0-9]+)'))[1]::int, 2147483647),
        c.clave ASC, c.pregunta ASC;
    `;
    const { rows } = await q(sql, [regulacionId]);
    return res.json(rows); // siempre array
  } catch (e) {
    console.error('Error listando controles por regulacion_id:', e);
    return res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;
