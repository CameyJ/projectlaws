// backend/routes/companyRoutes.js
const express = require('express');
const router = express.Router();

const db = require('../config/db');
const auth = require('../middlewares/auth');

// Lista de empresas ACTIVAS para el selector de Evaluación
// GET /api/empresas
router.get('/empresas', auth, async (_req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT id, name
      FROM public.companies
      WHERE is_active = true
      ORDER BY name ASC
    `);
    return res.json(rows);
  } catch (err) {
    console.error('GET /api/empresas error:', err);
    return res.status(500).json({ error: 'Error listando empresas' });
  }
});

module.exports = router;
