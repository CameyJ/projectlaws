// backend/routes/evaluationRoutes.js
const express = require('express');
const { pool, query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/* ------------------------------------------------------------------ */
/* utilidades: columnas en evaluation_answers                          */
/* ------------------------------------------------------------------ */
let cachedAnswerCols = null;

async function getAnswerColumns() {
  if (cachedAnswerCols) return cachedAnswerCols;

  const r = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='evaluation_answers'
  `);

  const names = new Set(r.rows.map(x => x.column_name));

  // valor/respuesta/value
  let valueCol = null;
  if (names.has('respuesta')) valueCol = 'respuesta';
  else if (names.has('valor')) valueCol = 'valor';
  else if (names.has('value')) valueCol = 'value';

  // clave/control_key
  let controlKeyCol = null;
  if (names.has('control_clave')) controlKeyCol = 'control_clave';
  else if (names.has('control_key')) controlKeyCol = 'control_key';

  // comentario/comment
  let commentCol = null;
  if (names.has('comentario')) commentCol = 'comentario';
  else if (names.has('comment')) commentCol = 'comment';

  // articulo/article
  let articleCol = null;
  if (names.has('articulo')) articleCol = 'articulo';
  else if (names.has('article')) articleCol = 'article';

  if (!controlKeyCol || !valueCol) {
    throw new Error(
      'La tabla evaluation_answers debe tener (control_clave/control_key) y (respuesta/valor/value).'
    );
  }

  cachedAnswerCols = { controlKeyCol, valueCol, commentCol, articleCol };
  return cachedAnswerCols;
}

/* ------------------------------------------------------------------ */
/* utilidades: detección de tabla y columnas de controles              */
/* ------------------------------------------------------------------ */
let cachedControlsMeta = null;

async function tableExists(name) {
  const r = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
    [name]
  );
  return r.rowCount > 0;
}

async function getControlsIntrospection() {
  if (cachedControlsMeta) return cachedControlsMeta;

  // ¿controles o controls?
  let table = null;
  if (await tableExists('controles')) table = 'controles';
  else if (await tableExists('controls')) table = 'controls';
  else {
    cachedControlsMeta = { table: null };
    return cachedControlsMeta;
  }

  const colsQ = await query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
    [table]
  );
  const cols = new Set(colsQ.rows.map(x => x.column_name));

  // equivalencias de nombres
  const claveCol =
    (cols.has('clave') && 'clave') ||
    (cols.has('key') && 'key') ||
    (cols.has('code') && 'code') ||
    null;

  const preguntaCol =
    (cols.has('pregunta') && 'pregunta') ||
    (cols.has('question') && 'question') ||
    (cols.has('title') && 'title') ||
    (cols.has('body') && 'body') ||
    null;

  const articuloCol =
    (cols.has('articulo') && 'articulo') ||
    (cols.has('article') && 'article') ||
    null;

  const recomendacionCol =
    (cols.has('recomendacion') && 'recomendacion') ||
    (cols.has('recommendation') && 'recommendation') ||
    null;

  const normativaCol =
    (cols.has('normativa') && 'normativa') ||
    (cols.has('framework_code') && 'framework_code') ||
    (cols.has('code') && 'code') ||
    null;

  cachedControlsMeta = {
    table,
    claveCol,
    preguntaCol,
    articuloCol,
    recomendacionCol,
    normativaCol,
  };
  return cachedControlsMeta;
}

/**
 * Trae metadatos de controles para una normativa dada.
 * Devuelve [{clave,pregunta,articulo,recomendacion}]
 * Si no puede, devuelve [] sin romper el flujo.
 */
async function fetchControlsMeta(normativa) {
  try {
    const meta = await getControlsIntrospection();
    if (!meta.table || !meta.claveCol) return [];

    const { table, claveCol, preguntaCol, articuloCol, recomendacionCol, normativaCol } = meta;

    const fields = [
      `${claveCol} AS clave`,
      preguntaCol ? `${preguntaCol} AS pregunta` : `NULL::text AS pregunta`,
      articuloCol ? `${articuloCol} AS articulo` : `NULL::text AS articulo`,
      recomendacionCol ? `${recomendacionCol} AS recomendacion` : `NULL::text AS recomendacion`,
    ].join(', ');

    let sql = `SELECT ${fields} FROM ${table}`;
    const params = [];

    if (normativaCol) {
      sql += ` WHERE UPPER(${normativaCol}) = $1`;
      params.push(String(normativa).toUpperCase());
    }

    sql += ` ORDER BY ${claveCol}`;

    const r = await query(sql, params);
    return r.rows.map(x => ({
      clave: x.clave,
      pregunta: x.pregunta || '',
      articulo: x.articulo || null,
      recomendacion: x.recomendacion || 'Implementar este control.',
    }));
  } catch (e) {
    console.warn('fetchControlsMeta fallback ->', e.message || e);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* cálculo % y nivel en memoria                                       */
/* ------------------------------------------------------------------ */
function calcPctAndLevel(respuestas) {
  const keys = Object.keys(respuestas || {});
  if (!keys.length) return { pct: 0, level: 'Básico' };

  let score = 0;
  for (const k of keys) {
    const raw =
      respuestas[k]?.valor ??
      respuestas[k]?.respuesta ??
      respuestas[k]?.value ??
      '';
    const v = String(raw).trim();
    if (v === 'true') score += 1;
    else if (v === 'partial') score += 0.5;
  }
  const pct = Math.round((score / keys.length) * 100);

  let level = 'Básico';
  if (pct >= 80) level = 'Alto';
  else if (pct >= 60) level = 'Medio';
  else if (pct >= 40) level = 'Bajo';
  else level = 'Crítico';

  return { pct, level };
}

/* ================================================================== */
/* POST /evaluaciones                                                 */
/* ================================================================== */
router.post('/evaluaciones', async (req, res) => {
  const client = await pool.connect();
  try {
    const { empresa, company_id, normativa, respuestas = {} } = req.body || {};
    if (!company_id || !normativa) {
      return res.status(400).json({ error: 'company_id y normativa son requeridos' });
    }

    const norm = String(normativa).toUpperCase();
    const ansCols = await getAnswerColumns();

    // normalizar respuestas
    const entries = Object.entries(respuestas || {})
      .map(([k, obj]) => {
        const clave = String(k || obj?.clave || obj?.key || '').trim();
        const valor = String(obj?.valor ?? obj?.respuesta ?? obj?.value ?? '').trim();
        const comentario = String(obj?.comentario ?? obj?.comment ?? '').trim();
        const articulo = obj?.articulo ?? obj?.article ?? null;
        return { clave, valor, comentario, articulo };
      })
      .filter(x => x.clave);

    // mapa rápido por clave
    const byClave = new Map(entries.map(e => [e.clave, e]));

    const { pct, level } = calcPctAndLevel(respuestas);
    const id = uuidv4();

    await client.query('BEGIN');

    // evaluations (español)
    const insEval = await client.query(
      `INSERT INTO evaluations (id, company_id, company_name, normativa, started_at, due_at, status)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '7 day', 'open')
       RETURNING id, normativa, started_at, due_at`,
      [id, company_id, empresa || null, norm]
    );

    // evaluation_answers
    if (entries.length) {
      const fields = ['evaluation_id', ansCols.controlKeyCol, ansCols.valueCol];
      if (ansCols.commentCol) fields.push(ansCols.commentCol);
      if (ansCols.articleCol) fields.push(ansCols.articleCol);

      const chunks = [];
      const values = [];
      let i = 1;

      for (const e of entries) {
        const row = [id, e.clave, e.valor];
        if (ansCols.commentCol) row.push(e.comentario || null);
        if (ansCols.articleCol) row.push(e.articulo || null);

        values.push(...row);
        const placeholders = row.map(() => `$${i++}`).join(',');
        chunks.push(`(${placeholders})`);
      }

      const sql = `INSERT INTO evaluation_answers (${fields.join(', ')}) VALUES ${chunks.join(', ')}`;
      await client.query(sql, values);
    }

    // construir incumplimientos y comentarios (no romper si no hay tabla)
    const controlsMeta = await fetchControlsMeta(norm); // []
    const incumplimientos = controlsMeta
      .filter(c => {
        const ans = byClave.get(c.clave);
        return !ans || ans.valor !== 'true'; // todo lo que NO sea "true"
      })
      .map(c => ({
        control: c.pregunta || c.clave,
        recomendacion: c.recomendacion || 'Implementar este control.',
        articulo: c.articulo || null,
      }));

    const comentariosOut = entries
      .filter(e => (e.comentario || '').trim().length > 0)
      .map(e => {
        const cMeta = controlsMeta.find(c => c.clave === e.clave);
        return {
          articulo: cMeta?.articulo || e.articulo || null,
          comentario: e.comentario.trim(),
        };
      });

    await client.query('COMMIT');

    const row = insEval.rows[0];
    return res.json({
      ok: true,
      id: row.id,
      normativa: row.normativa,
      started_at: row.started_at,
      due_at: row.due_at,
      cumplimiento: pct,
      nivel: level,
      incumplimientos,
      comentarios: comentariosOut,
    });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('POST /evaluaciones ->', e);
    return res.status(500).json({ error: 'Error creando evaluación' });
  } finally {
    client.release();
  }
});

/* ================================================================== */
/* GET /evaluaciones (listado)                                        */
/* ================================================================== */
router.get('/evaluaciones', async (_req, res) => {
  try {
    const cols = await getAnswerColumns();
    const valueCol = cols.valueCol;

    const sql = `
      WITH ans AS (
        SELECT
          evaluation_id,
          SUM(CASE WHEN ${valueCol} = 'true' THEN 1
                   WHEN ${valueCol} = 'partial' THEN 0.5
                   ELSE 0 END) AS score,
          COUNT(*) AS total
        FROM evaluation_answers
        GROUP BY evaluation_id
      )
      SELECT
        e.id,
        e.company_name,
        e.normativa,
        e.started_at,
        e.due_at,
        COALESCE(ROUND((ans.score / NULLIF(ans.total, 0)) * 100), 0) AS pct,
        CASE
          WHEN COALESCE((ans.score / NULLIF(ans.total, 0)) * 100, 0) >= 80 THEN 'Alto'
          WHEN COALESCE((ans.score / NULLIF(ans.total, 0)) * 100, 0) >= 60 THEN 'Medio'
          WHEN COALESCE((ans.score / NULLIF(ans.total, 0)) * 100, 0) >= 40 THEN 'Bajo'
          ELSE 'Crítico'
        END AS level
      FROM evaluations e
      LEFT JOIN ans ON ans.evaluation_id = e.id
      ORDER BY e.started_at DESC
      LIMIT 100;
    `;

    const r = await query(sql, []);
    return res.json({
      items: r.rows.map(x => ({
        id: x.id,
        company_name: x.company_name,
        normativa: x.normativa,
        started_at: x.started_at,
        due_at: x.due_at,
        pct: Number(x.pct ?? 0),
        level: x.level
      }))
    });
  } catch (e) {
    console.error('GET /evaluaciones ->', e);
    return res.status(500).json({ error: 'Error listando evaluaciones' });
  }
});

/* ================================================================== */
/* GET /evaluaciones/:id (detalle)                                    */
/* ================================================================== */
router.get('/evaluaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cols = await getAnswerColumns();
    const valueCol = cols.valueCol;

    const head = await query(
      `
      WITH ans AS (
        SELECT
          evaluation_id,
          SUM(CASE WHEN ${valueCol} = 'true' THEN 1
                   WHEN ${valueCol} = 'partial' THEN 0.5
                   ELSE 0 END) AS score,
          COUNT(*) AS total
        FROM evaluation_answers
        WHERE evaluation_id = $1
        GROUP BY evaluation_id
      )
      SELECT
        e.id,
        e.company_name,
        e.normativa,
        e.started_at,
        e.due_at,
        COALESCE(ROUND((ans.score / NULLIF(ans.total, 0)) * 100), 0) AS pct,
        CASE
          WHEN COALESCE((ans.score / NULLIF(ans.total, 0)) * 100, 0) >= 80 THEN 'Alto'
          WHEN COALESCE((ans.score / NULLIF(ans.total, 0)) * 100, 0) >= 60 THEN 'Medio'
          WHEN COALESCE((ans.score / NULLIF(ans.total, 0)) * 100, 0) >= 40 THEN 'Bajo'
          ELSE 'Crítico'
        END AS level,
        e.status
      FROM evaluations e
      LEFT JOIN ans ON ans.evaluation_id = e.id
      WHERE e.id = $1
      `,
      [id]
    );
    if (!head.rowCount) return res.status(404).json({ error: 'No encontrada' });

    const ans = await query(
      `SELECT ${cols.controlKeyCol} AS control_clave,
              ${cols.valueCol}   AS valor,
              ${cols.commentCol ? `${cols.commentCol} AS comentario` : `NULL::text AS comentario`},
              ${cols.articleCol ? `${cols.articleCol} AS articulo` : `NULL::text AS articulo`}
         FROM evaluation_answers
        WHERE evaluation_id = $1
        ORDER BY ${cols.controlKeyCol}`,
      [id]
    );

    const row = head.rows[0];
    return res.json({
      id: row.id,
      company_name: row.company_name,
      normativa: row.normativa,
      started_at: row.started_at,
      due_at: row.due_at,
      cumplimiento: Number(row.pct ?? 0),
      nivel: row.level,
      status: row.status,
      respuestas: ans.rows
    });
  } catch (e) {
    console.error('GET /evaluaciones/:id ->', e);
    return res.status(500).json({ error: 'Error leyendo evaluación' });
  }
});

module.exports = router;
