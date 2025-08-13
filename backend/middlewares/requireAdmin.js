module.exports = function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  // Aceptamos ADMIN por código o role_id === 1 (ajústalo si tu mapeo es otro)
  if (req.user.rol !== 'ADMIN' && req.user.role_id !== 1) {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
};
