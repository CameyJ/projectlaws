// backend/middlewares/auth.js
const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  try {
    const hdr = req.headers.authorization || '';
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Falta token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Normalizamos campos de rol que pueden venir con nombres distintos
    const roleCode =
      (payload.rol || payload.role || payload.rol_codigo || '').toString().toUpperCase();

    req.user = {
      id: payload.id || payload.sub,
      nombre: payload.nombre || payload.name || '',
      email: payload.email || '',
      rol: roleCode,            // 'ADMIN', 'AUDI', etc.
      role: roleCode,           // alias
      role_id: payload.role_id || payload.rol_id || null,
    };

    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
