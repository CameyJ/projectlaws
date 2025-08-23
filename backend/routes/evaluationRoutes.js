// backend/routes/evaluationRoutes.js
const express = require('express');
const { pool, query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

/* ------------------------- utilidades de esquema ------------------------- */

let cachedCols = null;

async function getAnswerColumns() {
  if (cachedCols) return cachedCols;

  const r = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'evaluation_answers'
  `);

  const names = new Set(r.rows.map(x => x.column_name));

  // valor / respuesta / value
  let valueCol = null;
  if (names.has('respuesta')) valueCol = 'respuesta';
  else if (names.has('valor')) valueCol = 'valor';
  else if (names.has('value')) valueCol = 'value';

  // clave del control
  let controlKeyCol = null;
  if (names.has('control_clave')) controlKeyCol = 'control_clave';
  else if (names.has('control_key')) controlKeyCol = 'control_key';

  // comentario
  let commentCol = null;
  if (names.has('comentario')) commentCol = 'comentario';
  else if (names.has('comment')) commentCol = 'comment';

  // artículo (opcional)
  let articleCol = null;
  if (names.has('articulo')) articleCol = 'articulo';
  else if (names.has('article')) articleCol = 'article';

  // timestamps opcionales
  const hasUpdatedAt = names.has('updated_at');

  if (!controlKeyCol || !valueCol) {
    throw new Error('evaluation_answers requiere (control_clave/control_key) y (respuesta/valor/value)');
  }

  cachedCols = { controlKeyCol, valueCol, commentCol, articleCol, hasUpdatedAt };
  return cachedCols;
}

async function tableExists(name) {
  const r = await query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1 LIMIT 1`,
    [name]
  );
  return r.rowCount > 0;
}

async function resolveTableNames() {
  const controls = (await tableExists('controles'))    ? 'controles'    : 'controls';
  const articles = (await tableExists('articulos'))    ? 'articulos'    : 'articles';
  const regs     = (await tableExists('regulaciones')) ? 'regulaciones' : 'regulations';
  return { controls, articles, regs };
}

function calcPctAndLevel(respuestas) {
  const ks = Object.keys(respuestas || {});
  if (!ks.length) return { pct: 0, level: 'Crítico' };

  let score = 0;
  ks.forEach(k => {
    const raw = respuestas[k]?.valor ?? respuestas[k]?.respuesta ?? respuestas[k]?.value ?? '';
    const v = String(raw).trim();
    if (v === 'true') score += 1;
    else if (v === 'partial') score += 0.5;
  });
  const pct = Math.round((score / ks.length) * 100);

  let level = 'Crítico';
  if (pct >= 80) level = 'Alto';
  else if (pct >= 60) level = 'Medio';
  else if (pct >= 40) level = 'Bajo';
  return { pct, level };
}

/* --------------------- metadatos de controles/artículos ------------------- */

async function fetchControlsMeta(normativa) {
  const { controls, articles, regs } = await resolveTableNames();
  const nameCol = (regs === 'regulaciones') ? 'nombre' : 'name';

  const rReg = await query(
    `SELECT id FROM ${regs} WHERE code = $1 OR ${nameCol} = $1 LIMIT 1`,
    [String(normativa).toUpperCase()]
  );
  if (!rReg.rowCount) return new Map();
  const regId = rReg.rows[0].id;

  const sql = `
    SELECT
      c.clave,
      c.pregunta,
      COALESCE(a.code, NULL)  AS art_code,
      COALESCE(a.title, NULL) AS art_title
    FROM ${controls} c
    LEFT JOIN ${articles} a ON a.id = c.article_id
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

/** Construye {incumplimientos, comentarios} igual que en el POST */
function buildOutcome(meta, answers) {
  const incumplimientos = [];
  const comentariosOut = [];

  for (const e of answers) {
    const m = meta.get(e.clave);
    if ((e.comentario || '').trim().length) {
      comentariosOut.push({
        articulo: m?.articulo || null,
        articulo_titulo: m?.articulo_titulo || null,
        comentario: e.comentario.trim(),
      });
    }
    if (String(e.valor).trim() !== 'true') {
      const recomendacion =
        String(e.valor).trim() === 'partial'
          ? 'Revisar y completar este control.'
          : 'Implementar este control.';
      incumplimientos.push({
        control: m?.pregunta || e.clave,
        articulo: m?.articulo || null,
        articulo_titulo: m?.articulo_titulo || null,
        recomendacion,
      });
    }
  }

  return { incumplimientos, comentarios: comentariosOut };
}

/* --------------------------------- POST ---------------------------------- */

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

    const entries = Object.entries(respuestas || {})
      .map(([k, obj]) => {
        const clave = String(k || obj?.clave || obj?.key || '').trim();
        const valor = String(obj?.valor ?? obj?.respuesta ?? obj?.value ?? '').trim();
        const comentario = String(obj?.comentario ?? obj?.comment ?? '').trim();
        return { clave, valor, comentario };
      })
      .filter(x => x.clave);

    const { pct, level } = calcPctAndLevel(respuestas);
    const id = uuidv4();

    await client.query('BEGIN');

    const insEval = await client.query(
      `INSERT INTO evaluations (id, company_id, company_name, normativa, started_at, due_at, status)
       VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '7 day', 'open')
       RETURNING id, normativa, started_at, due_at`,
      [id, company_id, empresa || null, norm]
    );

    if (entries.length) {
      const fields = ['evaluation_id', cols.controlKeyCol, cols.valueCol];
      if (cols.commentCol) fields.push(cols.commentCol);
      if (cols.articleCol) fields.push(cols.articleCol);

      const values = [];
      const chunks = [];
      let i = 1;

      for (const e of entries) {
        const row = [id, e.clave, e.valor];
        if (cols.commentCol) row.push(e.comentario || null);
        if (cols.articleCol) row.push(meta.get(e.clave)?.articulo || null);

        values.push(...row);
        chunks.push(`(${row.map(() => `$${i++}`).join(',')})`);
      }

      await client.query(
        `INSERT INTO evaluation_answers (${fields.join(', ')}) VALUES ${chunks.join(', ')}`,
        values
      );
    }

    const { incumplimientos, comentarios } = buildOutcome(meta, entries);

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
      comentarios,
    });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('POST /evaluaciones ->', e);
    return res.status(500).json({ error: 'Error creando evaluación' });
  } finally {
    client.release();
  }
});

/* -------------------------------- LIST ----------------------------------- */

router.get('/evaluaciones', async (_req, res) => {
  try {
    const cols = await getAnswerColumns();
    const valueCol = cols.valueCol;

    const sql = `
      WITH ans AS (
        SELECT evaluation_id,
               SUM(CASE WHEN ${valueCol}='true' THEN 1 WHEN ${valueCol}='partial' THEN 0.5 ELSE 0 END) AS score,
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

/* ------------------------------- DETALLE --------------------------------- */

router.get('/evaluaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cols = await getAnswerColumns();
    const valueCol = cols.valueCol;

    const head = await query(
      `
      WITH ans AS (
        SELECT evaluation_id,
               SUM(CASE WHEN ${valueCol}='true' THEN 1 WHEN ${valueCol}='partial' THEN 0.5 ELSE 0 END) AS score,
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

/* ------------------------- PATCH: actualizar control ---------------------- */

router.patch('/evaluaciones/:id/respuestas/:controlClave', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id, controlClave } = req.params;
    const clave = decodeURIComponent(controlClave);
    const body = req.body || {};
    const valor = String(body.valor ?? body.value ?? '').trim();
    const comentario = (body.comentario ?? body.comment ?? '').toString().trim();

    const cols = await getAnswerColumns();

    await client.query('BEGIN');

    // Obtengo normativa y meta para resolver articulo si hace falta
    const rEval = await client.query(`SELECT normativa FROM evaluations WHERE id=$1 LIMIT 1`, [id]);
    const normativa = rEval.rowCount ? String(rEval.rows[0].normativa || '').toUpperCase() : '';
    const meta = await fetchControlsMeta(normativa);

    // ¿existe?
    const exists = await client.query(
      `SELECT 1 FROM evaluation_answers WHERE evaluation_id=$1 AND ${cols.controlKeyCol}=$2 LIMIT 1`,
      [id, clave]
    );

    if (exists.rowCount) {
      const sets = [`${cols.valueCol}=$3`];
      const params = [id, clave, valor];
      if (cols.commentCol) {
        sets.push(`${cols.commentCol}=$${params.length + 1}`);
        params.push(comentario || null);
      }
      if (cols.hasUpdatedAt) {
        sets.push(`updated_at = NOW()`);
      }
      await client.query(
        `UPDATE evaluation_answers
           SET ${sets.join(', ')}
         WHERE evaluation_id=$1 AND ${cols.controlKeyCol}=$2`,
        params
      );
    } else {
      const fields = ['evaluation_id', cols.controlKeyCol, cols.valueCol];
      const params = [id, clave, valor];
      if (cols.commentCol) {
        fields.push(cols.commentCol);
        params.push(comentario || null);
      }
      if (cols.articleCol) {
        fields.push(cols.articleCol);
        params.push(meta.get(clave)?.articulo || null);
      }
      const ph = params.map((_, i) => `$${i + 1}`).join(',');
      await client.query(
        `INSERT INTO evaluation_answers (${fields.join(',')}) VALUES (${ph})`,
        params
      );
    }

    // Recalcular pct/level
    const rPct = await client.query(
      `
      WITH t AS (
        SELECT
          SUM(CASE WHEN ${cols.valueCol}='true' THEN 1
                   WHEN ${cols.valueCol}='partial' THEN 0.5 ELSE 0 END) AS score,
          COUNT(*) AS total
        FROM evaluation_answers
        WHERE evaluation_id=$1
      )
      SELECT COALESCE(ROUND((score/NULLIF(total,0))*100),0) AS pct
      FROM t
      `,
      [id]
    );
    const pct = Number(rPct.rows[0]?.pct ?? 0);
    let level = 'Crítico';
    if (pct >= 80) level = 'Alto';
    else if (pct >= 60) level = 'Medio';
    else if (pct >= 40) level = 'Bajo';

    // Todas las respuestas actuales
    const rAnswers = await client.query(
      `SELECT ${cols.controlKeyCol} AS clave,
              ${cols.valueCol}   AS valor,
              ${cols.commentCol ? `${cols.commentCol} AS comentario` : `'' AS comentario`}
         FROM evaluation_answers
        WHERE evaluation_id=$1
        ORDER BY ${cols.controlKeyCol}`,
      [id]
    );

    // Meta -> outcome enriquecido
    const { incumplimientos, comentarios } = buildOutcome(meta, rAnswers.rows);

    await client.query('COMMIT');
    return res.json({
      ok: true,
      cumplimiento: pct,
      nivel: level,
      incumplimientos,
      comentarios,
    });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('PATCH /evaluaciones/:id/respuestas/:controlClave ->', e);
    return res.status(500).json({ error: 'No se pudo guardar' });
  } finally {
    client.release();
  }
});

module.exports = router;
