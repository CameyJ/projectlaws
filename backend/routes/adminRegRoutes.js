// backend/routes/adminRegRoutes.js
const express = require('express');
const router = express.Router();

const auth = require('../middlewares/auth');              // debe poner req.user
const requireAdmin = require('../middlewares/requireAdmin');
const db = require('../config/db');                       // pool PG

// Helper para queries
const qExec = (text, params) => db.query(text, params);

/**
 * GET /api/admin/health  (opcional, útil para probar protección admin)
 */
router.get('/health', auth, requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.user, at: new Date().toISOString() });
});

/**
 * GET /api/admin/regulaciones
 * Lista regulaciones (en español)
 */
router.get('/regulaciones', auth, requireAdmin, async (_req, res) => {
  try {
    const q = `
      SELECT id, codigo, nombre, version, source_url, activo, creado_en
        FROM public.regulaciones
       ORDER BY creado_en DESC;
    `;
    const { rows } = await qExec(q);
    return res.json(rows);
  } catch (e) {
    console.error('GET /regulaciones', e);
    return res.status(500).json({ error: 'Error listando regulaciones' });
  }
});

/**
 * POST /api/admin/regulaciones
 * Crea una regulación
 * Body: { codigo, nombre, version?, source_url? }
 */
router.post('/regulaciones', auth, requireAdmin, async (req, res) => {
  try {
    const { codigo, nombre, version, source_url } = req.body;
    if (!codigo || !nombre) {
      return res.status(400).json({ error: 'codigo y nombre son requeridos' });
    }

    const q = `
      INSERT INTO public.regulaciones
        (id, codigo, nombre, version, source_url, activo, creado_en)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, TRUE, NOW())
      RETURNING id, codigo, nombre, version, source_url, activo, creado_en;
    `;
    const { rows } = await qExec(q, [codigo, nombre, version || null, source_url || null]);
    return res.json(rows[0]);
  } catch (e) {
    console.error('POST /regulaciones', e);
    return res.status(500).json({ error: 'Error creando regulación' });
  }
});

/**
 * GET /api/admin/regulaciones/:id/articulos
 * Lista artículos por regulación
 */
router.get('/regulaciones/:id/articulos', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT id, regulacion_id, codigo, titulo, cuerpo, indice_orden, creado_en
        FROM public.articulos
       WHERE regulacion_id = $1
       ORDER BY indice_orden NULLS LAST, creado_en ASC;
    `;
    const { rows } = await qExec(q, [id]);
    return res.json(rows);
  } catch (e) {
    console.error('GET /regulaciones/:id/articulos', e);
    return res.status(500).json({ error: 'Error listando artículos' });
  }
});

/**
 * POST /api/admin/articulos
 * Crea artículo manual
 * Body: { regulacion_id, codigo?, titulo?, cuerpo, indice_orden? }
 */
router.post('/articulos', auth, requireAdmin, async (req, res) => {
  try {
    const { regulacion_id, codigo, titulo, cuerpo, indice_orden } = req.body;
    if (!regulacion_id || !cuerpo) {
      return res.status(400).json({ error: 'regulacion_id y cuerpo son requeridos' });
    }

    const q = `
      INSERT INTO public.articulos
        (id, regulacion_id, codigo, titulo, cuerpo, indice_orden, creado_en)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, NOW())
      RETURNING id, regulacion_id, codigo, titulo, cuerpo, indice_orden, creado_en;
    `;
    const { rows } = await qExec(q, [
      regulacion_id,
      codigo || null,
      titulo || null,
      cuerpo,
      Number.isInteger(indice_orden) ? indice_orden : null
    ]);
    return res.json(rows[0]);
  } catch (e) {
    console.error('POST /articulos', e);
    return res.status(500).json({ error: 'Error creando artículo' });
  }
});

/**
 * POST /api/admin/controles
 * Crea control vinculado a un artículo
 * Body: { regulacion_id, articulo_id, clave?, pregunta, recomendacion?, peso? }
 */
router.post('/controles', auth, requireAdmin, async (req, res) => {
  try {
    const { regulacion_id, articulo_id, clave, pregunta, recomendacion, peso } = req.body;
    if (!regulacion_id || !articulo_id || !pregunta) {
      return res.status(400).json({ error: 'regulacion_id, articulo_id y pregunta son requeridos' });
    }

    const q = `
      INSERT INTO public.controles
        (id, regulacion_id, articulo_id, clave, pregunta, recomendacion, peso, activo)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, COALESCE($6, 1), TRUE)
      RETURNING id, regulacion_id, articulo_id, clave, pregunta, recomendacion, peso, activo;
    `;
    const { rows } = await qExec(q, [
      regulacion_id,
      articulo_id,
      clave || null,
      pregunta,
      recomendacion || null,
      (typeof peso === 'number' ? peso : 1)
    ]);
    return res.json(rows[0]);
  } catch (e) {
    console.error('POST /controles', e);
    return res.status(500).json({ error: 'Error creando control' });
  }
});

module.exports = router;
