const { verifyAccess } = require('../utils/jwt');

const requireAuth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  try {
    const payload = verifyAccess(token);
    if (payload.token_use !== 'access') throw new Error('tipo inválido');
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

const requireSuperAdmin = (req, res, next) =>
  !req.user?.isSuperAdmin ? res.status(403).json({ message: 'Requiere rol SuperAdmin' }) : next();

module.exports = { requireAuth, requireSuperAdmin };
