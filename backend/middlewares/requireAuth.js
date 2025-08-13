const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload debe llevar: id, email, rol (ADMIN/AUDI), role_id
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
