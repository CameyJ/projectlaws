// backend/routes/adminCompaniesRoutes.js
const express = require('express');
const router = express.Router();

const db = require('../config/db');
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');

const q = (text, params) => db.query(text, params);

// GET /api/admin/empresas  (lista completa para el panel)
router.get('/admin/empresas', auth, requireAdmin, async (_req, res) => {
  try {
    const sql = `
      SELECT
        id,
        name,
        tax_id,
        address,
        phone,
        is_active,
        created_at
      FROM public.companies
      ORDER BY created_at DESC
    `;
    const { rows } = await q(sql);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/admin/empresas error:', err);
    res.status(500).json({ error: 'Error listando empresas' });
  }
});

// POST /api/admin/empresas  (crear)
router.post('/admin/empresas', auth, requireAdmin, async (req, res) => {
  try {
    const { name, tax_id, address, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es requerido' });

    const sql = `
      INSERT INTO public.companies (id, name, tax_id, address, phone, is_active, created_at)
      VALUES (uuid_generate_v4(), $1, $2, $3, $4, true, now())
      RETURNING id, name, tax_id, address, phone, is_active, created_at
    `;
    const { rows } = await q(sql, [name, tax_id ?? null, address ?? null, phone ?? null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/admin/empresas error:', err);
    res.status(500).json({ error: 'Error creando empresa' });
  }
});

// PATCH /api/admin/empresas/:id/toggle  (activar/desactivar)
router.patch('/admin/empresas/:id/toggle', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      UPDATE public.companies
         SET is_active = NOT is_active
       WHERE id = $1
   RETURNING id, name, tax_id, address, phone, is_active, created_at
    `;
    const { rows } = await q(sql, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Empresa no encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /api/admin/empresas/:id/toggle error:', err);
    res.status(500).json({ error: 'Error actualizando empresa' });
  }
});

// (Opcional) DELETE /api/admin/empresas/:id
router.delete('/admin/empresas/:id', auth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await q(`DELETE FROM public.companies WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/empresas/:id error:', err);
    res.status(500).json({ error: 'Error eliminando empresa' });
  }
});

module.exports = router;
