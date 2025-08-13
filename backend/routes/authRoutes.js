const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/* Utilidad: firma un JWT con los campos que necesitamos en el front */
function firmarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Respuesta OK: { token, user: { id, nombre, email, rol, role_id } }
 */
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Debe enviar email y contraseña' });
    }

    // Normaliza email
    email = String(email).trim().toLowerCase();

    const q = `
      SELECT 
        u.id, u.nombre, u.email, u.password, u.role_id,
        r.codigo AS rol_codigo, r.nombre AS rol_nombre
      FROM public.usuarios u
      LEFT JOIN public.roles r ON r.id = u.role_id
      WHERE LOWER(u.email) = $1
      LIMIT 1;
    `;
    const { rows } = await pool.query(q, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const roleCode = user.rol_codigo || 'AUDI'; // por si viniera null

    const payload = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: roleCode,
      role_id: user.role_id,
    };

    const token = firmarToken(payload);

    return res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: roleCode,
        role_id: user.role_id,
      },
    });
  } catch (e) {
    console.error('Error en /login:', e);
    return res.status(500).json({ error: 'Error de servidor' });
  }
});

/**
 * POST /api/auth/register
 * Body: { nombre, email, password, rol_codigo? }  // 'ADMIN' | 'AUDI'
 * Respuesta OK: { token, user: { id, nombre, email, rol, role_id } }
 */
router.post('/register', async (req, res) => {
  try {
    let { nombre, email, password, rol_codigo } = req.body || {};

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Normaliza
    nombre = String(nombre).trim();
    email = String(email).trim().toLowerCase();
    rol_codigo = (rol_codigo || 'AUDI').toUpperCase();

    // Verifica duplicado
    const dup = await pool.query('SELECT id FROM public.usuarios WHERE LOWER(email) = $1 LIMIT 1', [email]);
    if (dup.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }

    // Obtiene rol
    const rolRes = await pool.query(
      'SELECT id, codigo FROM public.roles WHERE UPPER(codigo) = UPPER($1) LIMIT 1',
      [rol_codigo]
    );
    const rol = rolRes.rows[0];
    if (!rol) {
      return res.status(400).json({ error: 'Rol no válido (use ADMIN o AUDI)' });
    }

    // Hashea password
    const hash = await bcrypt.hash(password, 10);

    // Inserta usuario
    const ins = await pool.query(
      `INSERT INTO public.usuarios (nombre, email, password, role_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, role_id`,
      [nombre, email, hash, rol.id]
    );

    const u = ins.rows[0];

    const payload = {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      rol: rol.codigo,
      role_id: u.role_id,
    };
    const token = firmarToken(payload);

    return res.status(201).json({
      token,
      user: { id: u.id, nombre: u.nombre, email: u.email, rol: rol.codigo, role_id: u.role_id },
    });
  } catch (e) {
    console.error('Error en /register:', e);
    return res.status(500).json({ error: 'Error de servidor al registrar usuario' });
  }
});

module.exports = router;
