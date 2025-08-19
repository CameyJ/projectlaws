// backend/routes/adminRegRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');
const db = require('../config/db');

const qExec = (text, params) => db.query(text, params);

/* ===========================================
 * Normalizadores (ES -> EN)
 * =========================================== */
function normRegBody(body) {
  return {
    code: body.code ?? body.codigo,
    name: body.name ?? body.nombre,
    version: body.version ?? null,
    source_url: body.source_url ?? null,
  };
}

function normArticleBody(body) {
  return {
    regulation_id: body.regulation_id ?? body.regulacion_id,
    code: body.code ?? body.codigo ?? null,
    title: body.title ?? body.titulo ?? null,
    body: body.body ?? body.cuerpo,
    sort_index: body.sort_index ?? body.orden ?? null,
    is_enabled: typeof body.is_enabled === 'boolean' ? body.is_enabled : undefined,
  };
}

function normControlBody(body) {
  return {
    regulation_id: body.regulation_id ?? body.regulacion_id,
    article_id: body.article_id ?? body.articulo_id,
    clave: body.clave ?? null,
    pregunta: body.pregunta,
    recomendacion: body.recomendacion ?? null,
    peso: body.peso != null ? Number(body.peso) : 1,
  };
}

/* ===========================================
 * HANDLERS
 * =========================================== */
async function listRegulations(_req, res) {
  try {
    const q = `
      SELECT
        id, code AS codigo, name AS nombre,
        version, source_url, is_active AS activo, created_at
      FROM public.regulations
      ORDER BY code ASC
    `;
    const { rows } = await qExec(q);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/admin/regulaciones', e);
    res.status(500).json({ error: 'Error listando regulaciones' });
  }
}

async function createRegulation(req, res) {
  try {
    const { code, name, version, source_url } = normRegBody(req.body);
    if (!code || !name) {
      return res.status(400).json({ error: 'code/codigo y name/nombre son requeridos' });
    }

    const q = `
      INSERT INTO public.regulations
        (id, code, name, version, source_url, is_active, created_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, true, now())
      RETURNING *
    `;
    const { rows } = await qExec(q, [code, name, version, source_url]);
    res.json(rows[0]);
  } catch (e) {
    console.error('POST /api/admin/regulations', e);
    res.status(500).json({ error: 'Error creando regulación' });
  }
}

async function listArticlesByReg(req, res) {
  try {
    const { id } = req.params; // regulation_id
    const q = `
      SELECT id, regulation_id, code, title, body, sort_index, is_enabled, created_at
      FROM public.articles
      WHERE regulation_id = $1
      ORDER BY
        COALESCE( (regexp_match(code, '([0-9]+)'))[1]::int, 2147483647 ) ASC,
        created_at ASC
    `;
    const { rows } = await qExec(q, [id]);
    res.json(rows);
  } catch (e) {
    console.error('GET /api/admin/regulations/:id/articles', e);
    res.status(500).json({ error: 'Error listando artículos' });
  }
}

async function createArticle(req, res) {
  try {
    const { regulation_id, code, title, body, sort_index } = normArticleBody(req.body);
    if (!regulation_id || !body) {
      return res.status(400).json({ error: 'regulation_id/regulacion_id y body/cuerpo son requeridos' });
    }

    const q = `
      INSERT INTO public.articles
        (id, regulation_id, code, title, body, sort_index, is_enabled, created_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, true, now())
      RETURNING *
    `;
    const { rows } = await qExec(q, [
      regulation_id, code, title, body,
      Number.isInteger(sort_index) ? sort_index : null,
    ]);
    res.json(rows[0]);
  } catch (e) {
    console.error('POST /api/admin/articles', e);
    res.status(500).json({ error: 'Error creando artículo' });
  }
}

// ✅ Nuevo: actualizar artículo (activar/desactivar y/o título)
async function patchArticle(req, res) {
  try {
    const { id } = req.params;
    const { is_enabled, title } = req.body;

    const q = `
      UPDATE public.articles
         SET is_enabled = COALESCE($2, is_enabled),
             title      = COALESCE($3, title)
       WHERE id = $1
       RETURNING id, regulation_id, code, title, body, sort_index, is_enabled, created_at
    `;
    const { rows } = await qExec(q, [id,
      typeof is_enabled === 'boolean' ? is_enabled : null,
      typeof title === 'string' ? title : null
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    console.error('PATCH /api/admin/articulos/:id', e);
    res.status(500).json({ error: 'Error actualizando artículo' });
  }
}

async function createControl(req, res) {
  try {
    const { regulation_id, article_id, clave, pregunta, recomendacion, peso } =
      normControlBody(req.body);

    if (!regulation_id || !article_id || !pregunta) {
      return res
        .status(400)
        .json({ error: 'regulation_id/regulacion_id, article_id/articulo_id y pregunta son requeridos' });
    }

    const q = `
      INSERT INTO public.controls
        (id, regulation_id, article_id, clave, pregunta, recomendacion, peso, is_active)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, COALESCE($6, 1), true)
      RETURNING *
    `;
    const { rows } = await qExec(q, [
      regulation_id, article_id, clave, pregunta, recomendacion,
      Number.isFinite(peso) ? peso : 1,
    ]);
    res.json(rows[0]);
  } catch (e) {
    console.error('POST /api/admin/controls', e);
    res.status(500).json({ error: 'Error creando control' });
  }
}

/* ===========================================
 * RUTAS (ES / EN)
 * =========================================== */
router.get('/regulaciones', auth, requireAdmin, listRegulations);
router.get('/regulations', auth, requireAdmin, listRegulations);

router.post('/regulaciones', auth, requireAdmin, createRegulation);
router.post('/regulations', auth, requireAdmin, createRegulation);

router.get('/regulaciones/:id/articulos', auth, requireAdmin, listArticlesByReg);
router.get('/regulations/:id/articles', auth, requireAdmin, listArticlesByReg);

router.post('/articulos', auth, requireAdmin, createArticle);
router.post('/articles', auth, requireAdmin, createArticle);

// ✅ activar/desactivar (y opcionalmente cambiar título)
router.patch('/articulos/:id', auth, requireAdmin, patchArticle);
router.patch('/articles/:id', auth, requireAdmin, patchArticle);

// Controls (preguntas)
router.post('/controles', auth, requireAdmin, createControl);
router.post('/controls', auth, requireAdmin, createControl);

module.exports = router;
