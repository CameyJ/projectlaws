const express = require('express');
const router = express.Router();
const pool = require('../config/db'); // ⬅️ pool de PG
const { evaluarCumplimiento } = require('../controllers/evaluacionController');

// Fallback local
const controlesGDPR = require('../data/gdpr');
const controlesSOX  = require('../data/sox');

/* -------------------------------------------------------
   POST: evaluar cumplimiento (se mantiene tal cual)
------------------------------------------------------- */
router.post('/evaluar', evaluarCumplimiento);

/* -------------------------------------------------------
   GET: Controles por código de normativa (GDPR | SOX | ...)
   1) Intento traer desde BD por código de regulación (tabla regulaciones)
   2) Si no hay en BD, hago fallback a los JSON locales
------------------------------------------------------- */
router.get('/controles/:normativa', async (req, res) => {
  const normativa = String(req.params.normativa || '').trim().toUpperCase();

  try {
    // 1) Intento buscar en BD por 'codigo' en tabla regulaciones
    const q = `
      select c.id, c.clave, c.pregunta, c.recomendacion, c.peso,
             a.codigo as articulo_codigo, a.titulo as articulo_titulo
        from controles c
        join regulaciones r on r.id = c.regulacion_id
   left join articulos a     on a.id = c.articulo_id
       where r.codigo = $1
         and (c.activo = true or c.activo is null)
    order by c.clave asc, c.pregunta asc;
    `;
    const { rows } = await pool.query(q, [normativa]);

    if (rows.length > 0) {
      return res.json(rows);
    }

    // 2) Fallback a archivos locales si no hay nada en BD
    switch (normativa) {
      case 'GDPR':
        return res.json(controlesGDPR);
      case 'SOX':
        return res.json(controlesSOX);
      default:
        return res.status(404).json({ error: 'Normativa no encontrada' });
    }
  } catch (e) {
    console.error('Error listando controles por normativa:', e);
    return res.status(500).json({ error: 'Error de servidor' });
  }
});

/* -------------------------------------------------------
   GET: Controles por ID de regulación (UUID)
   Para cuando ya trabajes directo con regulacion_id desde el front
------------------------------------------------------- */
router.get('/controles/por-regulacion/:regulacionId', async (req, res) => {
  const { regulacionId } = req.params;

  try {
    const q = `
      select c.id, c.clave, c.pregunta, c.recomendacion, c.peso,
             a.codigo as articulo_codigo, a.titulo as articulo_titulo
        from controles c
   left join articulos a on a.id = c.articulo_id
       where c.regulacion_id = $1
         and (c.activo = true or c.activo is null)
    order by c.clave asc, c.pregunta asc;
    `;
    const { rows } = await pool.query(q, [regulacionId]);

    if (rows.length === 0) {
      return res.json([]); // sin fallback aquí porque el id es de BD
    }

    return res.json(rows);
  } catch (e) {
    console.error('Error listando controles por regulacion_id:', e);
    return res.status(500).json({ error: 'Error de servidor' });
  }
});

module.exports = router;
