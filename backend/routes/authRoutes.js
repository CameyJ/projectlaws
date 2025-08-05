const express = require('express');
const router = express.Router();
const pool = require('../config/db');   // tu archivo de conexión
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Busca el usuario por email
    const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const user = result.rows[0];

    // Compara la contraseña (hash)
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Genera el token JWT
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token, nombre: user.nombre, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// REGISTRO
router.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    // Valida que todos los campos lleguen
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    // Verifica que el usuario no exista
    const existe = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    // Hashea la contraseña
    const hash = await bcrypt.hash(password, 10);
    // Inserta el usuario
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
      [nombre, email, hash]
    );
    // Genera el token JWT al registrar
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, nombre: user.nombre, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.status(201).json({ token, nombre: user.nombre, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error de servidor al registrar usuario' });
  }
});


module.exports = router;
