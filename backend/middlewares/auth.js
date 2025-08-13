const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' '); // 'Bearer <token>'
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // ← aquí queda req.user
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
