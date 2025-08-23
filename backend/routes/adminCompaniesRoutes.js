// backend/routes/adminCompaniesRoutes.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

const router = express.Router();

/**
 * Este router se monta en app.js así:
 *   app.use('/api/admin', auth, requireAdmin, adminCompaniesRoutes)
 * Por eso las rutas aquí son RELATIVAS: '/empresas', '/empresas/:id', etc.
 */

// LISTAR
router.get('/empresas', async (_req, res) => {
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
      FROM companies
      ORDER BY name;
    `;
    const r = await query(sql, []);
    return res.json(r.rows || []);
  } catch (e) {
    console.error('GET /api/admin/empresas ->', e);
    return res.status(500).json({ error: 'Error listando empresas' });
  }
});

// CREAR
router.post('/empresas', async (req, res) => {
  try {
    const { name, tax_id, address, phone } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'name es requerido' });
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO companies (id, name, tax_id, address, phone, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW())
      RETURNING id, name, tax_id, address, phone, is_active, created_at;
    `;
    const r = await query(sql, [
      id,
      String(name).trim(),
      tax_id || null,
      address || null,
      phone || null,
    ]);

    return res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error('POST /api/admin/empresas ->', e);
    if (String(e.code) === '23505') {
      // por si tienes UNIQUE(tax_id) o UNIQUE(name)
      return res.status(409).json({ error: 'Empresa duplicada' });
    }
    return res.status(500).json({ error: 'Error creando empresa' });
  }
});

// ACTIVAR/DESACTIVAR
router.patch('/empresas/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      UPDATE companies
         SET is_active = NOT COALESCE(is_active, true)
       WHERE id = $1
       RETURNING id, is_active;
    `;
    const r = await query(sql, [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'No encontrada' });
    return res.json(r.rows[0]);
  } catch (e) {
    console.error('PATCH /api/admin/empresas/:id/toggle ->', e);
    return res.status(500).json({ error: 'Error actualizando empresa' });
  }
});

// ELIMINAR
router.delete('/empresas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(`DELETE FROM companies WHERE id = $1`, [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'No encontrada' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/empresas/:id ->', e);
    return res.status(500).json({ error: 'Error eliminando empresa' });
  }
});

module.exports = router;
