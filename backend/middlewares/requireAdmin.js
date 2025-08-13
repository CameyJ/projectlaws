// backend/middlewares/requireAdmin.js
module.exports = function requireAdmin(req, res, next) {
  const u = req.user || {};
  const code = (u.rol || u.role || '').toString().toUpperCase();
  const roleId = u.role_id ?? u.rol_id;

  // Aceptamos por código de rol o por id de rol (1 = ADMIN en tu BD)
  if (code === 'ADMIN' || roleId === 1) return next();

  return res.status(403).json({ error: 'Solo administradores' });
};