// backend/routes/evaluationRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db'); // { pool, query }

// Helpers: leer columnas existentes y construir expresiones seguras
async function getCols(table) {
  const q = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `;
  const r = await db.query(q, [table]);
  return new Set((r.rows || []).map(x => x.column_name));
}

function buildExpr(colsSet, alias, candidates, outAlias, cast = null) {
  const present = candidates
    .filter(c => colsSet.has(c))
    .map(c => `${alias}."${c}"`); // quote por seguridad

  let base;
  if (present.length === 0) {
    base = 'NULL';
  } else if (present.length === 1) {
    base = present[0];
  } else {
    base = `COALESCE(${present.join(', ')})`;
  }
  if (cast) base = `(${base})::${cast}`;
  return {
    base,                          // para ORDER BY
    select: `${base} AS ${outAlias}`
  };
}

// --------- LISTAR EVALUACIONES (robusto al esquema) ---------
router.get('/evaluaciones', async (_req, res) => {
  try {
    const evalCols = await getCols('evaluations');
    const compCols = await getCols('companies');

    // Elegimos la primera columna disponible de la lista de candidatos
    const normativa   = buildExpr(evalCols, 'e', ['normativa','regulation','law','law_code','codigo_ley'], 'normativa');
    const pct         = buildExpr(evalCols, 'e', ['cumplimiento','pct','percentage','porcentaje'], 'pct', 'float');
    const level       = buildExpr(evalCols, 'e', ['nivel','level','rango'], 'level');
    const started     = buildExpr(evalCols, 'e', ['started_at','created_at','fecha_inicio'], 'started_at');
    const due         = buildExpr(evalCols, 'e', ['due_at','deadline_at','vence','fecha_limite'], 'due_at');
    const companyName = buildExpr(compCols, 'c', ['name','nombre','razon_social'], 'company_name');

    const sql = `
      SELECT
        e.id,
        e.company_id,
        ${normativa.select},
        ${pct.select},
        ${level.select},
        ${started.select},
        ${due.select},
        ${companyName.select}
      FROM evaluations e
      LEFT JOIN companies c ON c.id = e.company_id
      ORDER BY ${started.base} DESC NULLS LAST, e.id DESC;
    `;

    const r = await db.query(sql);
    return res.json({ items: r.rows || [] });
  } catch (err) {
    console.error('GET /api/evaluaciones ->', err);
    return res.status(500).json({ error: 'Error listando evaluaciones' });
  }
});

// (Opcional) Detalle por ID, también tolerante al esquema
router.get('/evaluaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const evalCols = await getCols('evaluations');
    const compCols = await getCols('companies');

    const normativa   = buildExpr(evalCols, 'e', ['normativa','regulation','law','law_code','codigo_ley'], 'normativa');
    const pct         = buildExpr(evalCols, 'e', ['cumplimiento','pct','percentage','porcentaje'], 'pct', 'float');
    const level       = buildExpr(evalCols, 'e', ['nivel','level','rango'], 'level');
    const started     = buildExpr(evalCols, 'e', ['started_at','created_at','fecha_inicio'], 'started_at');
    const due         = buildExpr(evalCols, 'e', ['due_at','deadline_at','vence','fecha_limite'], 'due_at');
    const companyName = buildExpr(compCols, 'c', ['name','nombre','razon_social'], 'company_name');

    const sql = `
      SELECT
        e.id,
        e.company_id,
        ${normativa.select},
        ${pct.select},
        ${level.select},
        ${started.select},
        ${due.select},
        ${companyName.select}
      FROM evaluations e
      LEFT JOIN companies c ON c.id = e.company_id
      WHERE e.id = $1
      LIMIT 1;
    `;

    const r = await db.query(sql, [id]);
    if (!r.rows?.length) return res.status(404).json({ error: 'No existe' });
    return res.json(r.rows[0]);
  } catch (err) {
    console.error('GET /api/evaluaciones/:id ->', err);
    return res.status(500).json({ error: 'Error obteniendo evaluación' });
  }
});

module.exports = router;
