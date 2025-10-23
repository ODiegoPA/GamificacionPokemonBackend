const jwt = require('jsonwebtoken');

const signAccessToken = (user) => jwt.sign(
  { sub: user.id, ci: user.ci, isSuperAdmin: !!user.isSuperAdmin, token_use: 'access' },
  process.env.JWT_ACCESS_SECRET,
  { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
);

const signRefreshToken = (user) => jwt.sign(
  { sub: user.id, token_use: 'refresh' },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: process.env.JWT_REFRESH_EXPIRES || '30d' }
);

const verifyAccess  = (t) => jwt.verify(t, process.env.JWT_ACCESS_SECRET);
const verifyRefresh = (t) => jwt.verify(t, process.env.JWT_REFRESH_SECRET);

module.exports = { signAccessToken, signRefreshToken, verifyAccess, verifyRefresh };
