const bcrypt = require('bcryptjs');
const { signAccessToken, signRefreshToken, verifyRefresh, verifyAccess } = require('../utils/jwt');
const { entrenador: Entrenador } = require('../models');

async function passwordMatches(stored, plain) {
  if (typeof stored === 'string' && stored.startsWith('$2')) {
    try { return await bcrypt.compare(plain, stored); } catch { return false; }
  }
  return stored === plain;
}

exports.login = async (req, res) => {
  try {
    const { correo, password } = req.body;
    const entrenador = await Entrenador.findOne({ where: { correo } });
    if (!entrenador) return res.status(400).json({ message: 'Correo o contraseña incorrectos' });

    const ok = await passwordMatches(entrenador.password, password);
    if (!ok) return res.status(400).json({ message: 'Correo o contraseña incorrectos' });

    const accessToken = signAccessToken(entrenador);
    const refreshToken = signRefreshToken(entrenador);

    const { id, nombre, sexo, pokedolares } = entrenador;
    return res.json({ entrenador: { id, nombre, sexo, pokedolares }, accessToken, refreshToken });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error al iniciar sesión' });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Falta refreshToken' });

    const payload = verifyRefresh(refreshToken);
    if (payload.token_use !== 'refresh') return res.status(401).json({ message: 'Token inválido' });

    const user = await Entrenador.findByPk(payload.sub); if (!user) return res.status(401).json({ message:'Usuario no encontrado' });


    const newAccess  = signAccessToken(user);
    const newRefresh = signRefreshToken(user);

    return res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch {
    return res.status(401).json({ message: 'Refresh inválido o expirado' });
  }
};
exports.me = async (req, res) => {
  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Token requerido (Authorization: Bearer <token>)' });
    }

    const payload = verifyAccess(token);

    const entrenador = await Entrenador.findByPk(payload.sub, {
      attributes: ['id', 'nombre', 'sexo', 'pokedolares', 'correo']
    });
    if (!entrenador) return res.status(404).json({ message: 'Entrenador no encontrado' });

    return res.json({
      entrenador,
      token: { iat: payload.iat, exp: payload.exp }
    });
  } catch (e) {
    console.error(e);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};