// backend/controllers/evaluacionController.js
const db = require('../config/db');

// Helper DB
const q = (text, params) => db.query(text, params);

/**
 * Calcula cumplimiento a partir de respuestas:
 * respuestas: { [clave]: 'true' | 'partial' | 'false' | '' }
 * - true    -> suma peso completo
 * - partial -> suma 0.5 * peso
 * - false/''-> 0
 */
async function evaluarCumplimiento(req, res) {
  try {
    const normativa = String(req.body?.normativa || '').trim().toUpperCase();
    const respuestas = req.body?.respuestas || {};

    if (!normativa) {
      return res.status(400).json({ error: 'normativa es requerida' });
    }

    // 1) Traer controles desde BD por código de regulación
    //    Solo controles activos y artículos habilitados (si aplican)
    const sql = `
      SELECT
        c.id,
        c.clave,
        COALESCE(NULLIF(c.pregunta, ''), '[sin pregunta]') AS pregunta,
        c.recomendacion,
        COALESCE(NULLIF(c.peso::text, ''), '1')::numeric AS peso,
        a.code  AS articulo_codigo,
        a.title AS articulo_titulo
      FROM public.controls      AS c
      JOIN public.regulations   AS r ON r.id = c.regulation_id
      LEFT JOIN public.articles AS a ON a.id = c.article_id
      WHERE r.code = $1
        AND COALESCE(c.is_active, true) = true
        AND (a.id IS NULL OR COALESCE(a.is_enabled, true) = true)
      ORDER BY
        /* primero por número de artículo, si existe (Art. N) */
        COALESCE((regexp_match(a.code, '([0-9]+)'))[1]::int, 2147483647),
        c.clave ASC, c.pregunta ASC;
    `;
    const { rows: controles } = await q(sql, [normativa]);

    // Si no hay nada en BD, respondemos con 0 preguntas (sin romper el front)
    if (!controles.length) {
      return res.json({ cumplimiento: 0, nivel: 'Inicial', incumplimientos: [] });
    }

    // 2) Recorrer controles y sumar puntaje ponderado
    let totalPeso = 0;
    let puntos = 0;
    const incumplimientos = [];

    for (const c of controles) {
      const peso = Number(c.peso) || 1;
      totalPeso += peso;

      const valor = String(respuestas[c.clave] ?? '').toLowerCase(); // 'true' | 'partial' | 'false' | ''

      if (valor === 'true') {
        puntos += peso;
      } else if (valor === 'partial') {
        puntos += 0.5 * peso;
        incumplimientos.push({
          control: c.pregunta,
          recomendacion: c.recomendacion || 'Revisar y completar este control.',
          articulo: formateaArticulo(c.articulo_codigo, c.articulo_titulo),
        });
      } else {
        // '' o 'false'
        incumplimientos.push({
          control: c.pregunta,
          recomendacion: c.recomendacion || 'Implementar este control.',
          articulo: formateaArticulo(c.articulo_codigo, c.articulo_titulo),
        });
      }
    }

    // 3) Porcentaje de cumplimiento y nivel
    const cumplimiento = totalPeso > 0 ? Math.round((puntos / totalPeso) * 100) : 0;

    let nivel = 'Inicial';
    if (cumplimiento >= 80) nivel = 'Avanzado';
    else if (cumplimiento >= 60) nivel = 'Intermedio';
    else if (cumplimiento >= 40) nivel = 'Básico';

    return res.json({ cumplimiento, nivel, incumplimientos });
  } catch (e) {
    console.error('evaluarCumplimiento error:', e);
    return res.status(500).json({ error: 'Error evaluando cumplimiento' });
  }
}

function formateaArticulo(code, title) {
  if (!code && !title) return '';
  if (code && title) return `${code}. ${title}`;
  return code || title || '';
}

module.exports = { evaluarCumplimiento };
