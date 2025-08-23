const express = require('express');
const { pool, query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/* ----------------------------- helpers de esquema ----------------------------- */

// cache para columnas dinámicas de evaluation_answers
let cachedCols = null;

async function getAnswerColumns() {
  if (cachedCols) return cachedCols;

  const r = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'evaluation_answers'
  `);

  const names = new Set(r.rows.map(x => x.column_name));

  let valueCol = null;
  if (names.has('respuesta')) valueCol = 'respuesta';
  else if (names.has('valor'))   valueCol = 'valor';
  else if (names.has('value'))   valueCol = 'value';

  let controlKeyCol = null;
  if (names.has('control_clave')) controlKeyCol = 'control_clave';
  else if (names.has('control_key')) controlKeyCol = 'control_key';

  let commentCol = null;
  if (names.has('comentario')) commentCol = 'comentario';
  else if (names.has('comment')) commentCol = 'comment';

  let articleCol = null;
  if (names.has('articulo')) articleCol = 'articulo';
  else if (names.has('article')) articleCol = 'article';

  if (!controlKeyCol || !valueCol) {
    throw new Error('evaluation_answers requiere (control_clave/control_key) y (respuesta/valor/value)');
  }

  cachedCols = { controlKeyCol, valueCol, commentCol, articleCol };
  return cachedCols;
}

async function tableExists(name) {
  const r = await query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema='public' AND table_name=$1
      LIMIT 1`,
    [name]
  );
  return r.rowCount > 0;
}

async function columnExists(table, column) {
  const r = await query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1 AND column_name=$2
      LIMIT 1`,
    [table, column]
  );
  return r.rowCount > 0;
}

// resuelve nombres de tablas (es/en)
async function resolveTableNames() {
  const controls  = (await tableExists('controles'))     ? 'controles'     : 'controls';
  const articles  = (await tableExists('articulos'))     ? 'articulos'     : 'articles';
  const regs      = (await tableExists('regulaciones'))  ? 'regulaciones'  : 'regulations';
  return { controls, articles, regs };
}

// % y nivel
function calcPctAndLevel(respuestas) {
  const ks = Object.keys(respuestas || {});
  if (!ks.length) return { pct: 0, level: 'Básico' };

  let score = 0;
  ks.forEach(k => {
    const raw = respuestas[k]?.valor ?? respuestas[k]?.respuesta ?? respuestas[k]?.value ?? '';
    const v = String(raw).trim();
    if (v === 'true') score += 1;
    else if (v === 'partial') score += 0.5;
  });
  const pct = Math.round((score / ks.length) * 100);

  let level = 'Básico';
  if (pct >= 80) level = 'Alto';
  else if (pct >= 60) level = 'Medio';
  else if (pct >= 40) level = 'Bajo';
  else level = 'Crítico';
  return { pct, level };
}

/* -------------------- meta de controles + artículo (con título) -------------------- */
/**
 * Devuelve un Map por clave de control:
 *   { clave, pregunta, articulo: 'Art. 2', articulo_titulo: 'Material scope' }
 */
async function fetchControlsMeta(normativa) {
  const { controls, articles, regs } = await resolveTableNames();

  // columnas disponibles en regulations
  const hasNombre = await columnExists(regs, 'nombre');
  const hasName   = await columnExists(regs, 'name');

  // WHERE dinámico (solo columnas existentes)
  const whereParts = ['code = $1'];
  if (hasNombre) whereParts.push('nombre = $1');
  if (hasName)   whereParts.push('name = $1');

  const regSql = `
    SELECT id
      FROM ${regs}
     WHERE ${whereParts.join(' OR ')}
     LIMIT 1
  `;
  const rReg = await query(regSql, [String(normativa).toUpperCase()]);
  if (!rReg.rowCount) return new Map();

  const regId = rReg.rows[0].id;

  // Unir por article_id o por texto "Art. n" almacenado en c.articulo
  const sql = `
    SELECT
      c.clave,
      c.pregunta,
      COALESCE(a.code, c.articulo) AS art_code,
      a.title                       AS art_title
    FROM ${controls} c
    LEFT JOIN ${articles} a
      ON (a.id = c.article_id) OR (a.code = c.articulo)
    WHERE c.regulation_id = $1
    ORDER BY c.clave
  `;
  const r = await query(sql, [regId]);

  const map = new Map();
  for (const row of r.rows) {
    map.set(row.clave, {
      clave: row.clave,
      pregunta: row.pregunta,
      articulo: row.art_code ? String(row.art_code) : null,
      articulo_titulo: row.art_title || null,
    });
  }
  return map;
}

/* ---------------------------------- POST ---------------------------------- */

router.post('/evaluaciones', async (req, res) => {
  const client = await pool.connect();
  try {
    const { empresa, company_id, normativa, respuestas = {} } = req.body || {};
    if (!company_id || !normativa) {
      return res.status(400).json({ error: 'company_id y normativa son requeridos' });
    }

    const norm = String(normativa).toUpperCase();
    const cols = await getAnswerColumns();
    const meta = await fetchControlsMeta(norm);

    // normalizar respuestas del payload
    const entries = Object.entries(respuestas || {})
      .map(([k, obj]) => {
        const clave      = String(k || obj?.clave || obj?.key || '').trim();
        const valor      = String(obj?.valor ?? obj?.respuesta ?? obj?.value ?? '').trim();
        const comentario = String(obj?.comentario ?? obj?.comment ?? '').trim();
        return { clave, valor, comentario };
      })
      .filter(x => x.clave);

    const { pct, level } = calcPctAndLevel(respuestas);
    const id = uuidv4();

    await client.query('BEGIN');

    // evaluations
    const insEval = await client.query(
      `INSERT INTO evaluations (id, company_id, company_name, normativa, started_at, due_at, status)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '7 day', 'open')
       RETURNING id, normativa, started_at, due_at`,
      [id, company_id, empresa || null, norm]
    );

    // evaluation_answers
    if (entries.length) {
      const fields = ['evaluation_id', cols.controlKeyCol, cols.valueCol];
      if (cols.commentCol) fields.push(cols.commentCol);
      if (cols.articleCol) fields.push(cols.articleCol);

      const values = [];
      const chunks = [];
      let i = 1;

      for (const e of entries) {
        const m = meta.get(e.clave);
        const row = [id, e.clave, e.valor];
        if (cols.commentCol) row.push(e.comentario || null);
        if (cols.articleCol) row.push(m?.articulo || null); // guarda "Art. n" si la columna existe
        values.push(...row);
        chunks.push(`(${row.map(() => `$${i++}`).join(',')})`);
      }

      await client.query(
        `INSERT INTO evaluation_answers (${fields.join(', ')}) VALUES ${chunks.join(', ')}`,
        values
      );
    }

    // construir salida enriquecida
    const incumplimientos = [];
    const comentariosOut = [];

    for (const e of entries) {
      const m = meta.get(e.clave);
      if (e.comentario) {
        comentariosOut.push({
          articulo: m?.articulo || null,
          articulo_titulo: m?.articulo_titulo || null,
          comentario: e.comentario,
        });
      }
      if (e.valor !== 'true') {
        const recomendacion =
          e.valor === 'partial' ? 'Revisar y completar este control.' : 'Implementar este control.';
        incumplimientos.push({
          control: m?.pregunta || e.clave,
          articulo: m?.articulo || null,
          articulo_titulo: m?.articulo_titulo || null,
          recomendacion,
        });
      }
    }

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

/* --------------------------------- LIST ---------------------------------- */

router.get('/evaluaciones', async (_req, res) => {
  try {
    const cols = await getAnswerColumns();
    const valueCol = cols.valueCol;

    const sql = `
      WITH ans AS (
        SELECT evaluation_id,
               SUM(CASE WHEN ${valueCol}='true' THEN 1
                        WHEN ${valueCol}='partial' THEN 0.5
                        ELSE 0 END) AS score,
               COUNT(*) AS total
          FROM evaluation_answers
         GROUP BY evaluation_id
      )
      SELECT e.id, e.company_name, e.normativa, e.started_at, e.due_at,
             COALESCE(ROUND((ans.score / NULLIF(ans.total,0)) * 100),0) AS pct,
             CASE
               WHEN COALESCE((ans.score / NULLIF(ans.total,0)) * 100,0) >= 80 THEN 'Alto'
               WHEN COALESCE((ans.score / NULLIF(ans.total,0)) * 100,0) >= 60 THEN 'Medio'
               WHEN COALESCE((ans.score / NULLIF(ans.total,0)) * 100,0) >= 40 THEN 'Bajo'
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
        level: x.level,
      })),
    });
  } catch (e) {
    console.error('GET /evaluaciones ->', e);
    return res.status(500).json({ error: 'Error listando evaluaciones' });
  }
});

/* -------------------------------- DETALLE -------------------------------- */

router.get('/evaluaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cols = await getAnswerColumns();
    const valueCol = cols.valueCol;

    const head = await query(
      `
      WITH ans AS (
        SELECT evaluation_id,
               SUM(CASE WHEN ${valueCol}='true' THEN 1
                        WHEN ${valueCol}='partial' THEN 0.5
                        ELSE 0 END) AS score,
               COUNT(*) AS total
          FROM evaluation_answers
         WHERE evaluation_id = $1
         GROUP BY evaluation_id
      )
      SELECT e.id, e.company_name, e.normativa, e.started_at, e.due_at,
             COALESCE(ROUND((ans.score / NULLIF(ans.total,0)) * 100),0) AS pct,
             CASE
               WHEN COALESCE((ans.score / NULLIF(ans.total,0)) * 100,0) >= 80 THEN 'Alto'
               WHEN COALESCE((ans.score / NULLIF(ans.total,0)) * 100,0) >= 60 THEN 'Medio'
               WHEN COALESCE((ans.score / NULLIF(ans.total,0)) * 100,0) >= 40 THEN 'Bajo'
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
      respuestas: ans.rows,
    });
  } catch (e) {
    console.error('GET /evaluaciones/:id ->', e);
    return res.status(500).json({ error: 'Error leyendo evaluación' });
  }
});

module.exports = router;
