const jwt = require('jsonwebtoken');
const config = require('./config');

function signAdmin() {
  return jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '12h' });
}

function signUser(user) {
  return jwt.sign(
    { role: 'user', id: user.id, name: user.name, email: user.email, mobile: user.mobile },
    config.jwtSecret,
    { expiresIn: '30d' },
  );
}

function requireAuth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Sign in required' });
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      if (role && payload.role !== role) return res.status(403).json({ error: 'Not allowed' });
      req.auth = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Session expired. Sign in again.' });
    }
  };
}

module.exports = { signAdmin, signUser, requireAuth };
