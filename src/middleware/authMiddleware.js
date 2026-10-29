const userService = require('../services/userService');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  const token = header.slice(7).trim();
  try {
    const payload = userService.verifyToken(token);
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
  }
};

module.exports = {
  authenticate,
};
