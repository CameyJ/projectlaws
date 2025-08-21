// backend/routes/evaRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

const { evaluarCumplimiento } = require('../controllers/evaluacionController');

// Fallback local (si no hay controles en BD)
const controlesGDPR = require('../data/gdpr');
const controlesSOX  = require('../data/sox');

// Evaluación
router.post('/evaluar', evaluarCumplimiento);

// Controles por código de normativa
router.get('/controles/:normativa', async (req, res) => {
  const normativa = String(req.params.normativa || '').trim().toUpperCase();
  try {
    const q = `
      select c.id, c.clave, c.pregunta, c.recomendacion, c.peso,
             a.code as articulo_codigo, a.title as articulo_titulo
        from public.controls c
        join public.regulations r on r.id = c.regulation_id
   left join public.articles a    on a.id = c.article_id
       where r.code = $1
         and (c.is_active = true or c.is_active is null)
    order by c.clave asc, c.pregunta asc;`;
    const { rows } = await pool.query(q, [normativa]);
    if (rows.length > 0) return res.json(rows);

    switch (normativa) {
      case 'GDPR': return res.json(controlesGDPR);
      case 'SOX' : return res.json(controlesSOX);
      default    : return res.status(404).json({ error: 'Normativa no encontrada' });
    }
  } catch (e) {
    console.error('Error listando controles por normativa:', e);
    return res.status(500).json({ error: 'Error de servidor' });
  }
});

// Controles por regulacion_id (opcional)
router.get('/controles/por-regulacion/:regulacionId', async (req, res) => {
  const { regulacionId } = req.params;
  try {
    const q = `
      select c.id, c.clave, c.pregunta, c.recomendacion, c.peso,
             a.code as articulo_codigo, a.title as articulo_titulo
        from public.controls c
   left join public.articles a on a.id = c.article_id
       where c.regulation_id = $1
         and (c.is_active = true or c.is_active is null)
    order by c.clave asc, c.pregunta asc;`;
    const { rows } = await pool.query(q, [regulacionId]);
    return res.json(rows);
  } catch (e) {
    console.error('Error listando controles por regulacion_id:', e);
    return res.status(500).json({ error: 'Error de servidor' });
  }
});

// NUEVO: Empresas activas (para el selector en la evaluación)
router.get('/empresas', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, ruc, address, telefono
         FROM public.companies
        WHERE is_active = true
        ORDER BY name ASC`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /api/empresas', e);
    res.status(500).json({ error: 'Error listando empresas' });
  }
});

module.exports = router;
