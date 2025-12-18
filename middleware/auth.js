const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// ✅ Use Set instead of Array (better performance)
const blacklistedTokens = new Set();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  if (blacklistedTokens.has(token)) {
    return res.status(401).json({ error: 'Token is blacklisted' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // ✅ Normalize fields
    req.user = {
      id: decoded.id ?? decoded.userId ?? decoded.user_id ?? decoded.sub ?? null,
      email: decoded.email ?? decoded.mail ?? null,
      role: decoded.role ?? null,
      company_id: decoded.company_id ?? decoded.companyId ?? null
    };

    // 🔴 HARD FAIL if company_id missing (company based apps)
    if (!req.user.company_id) {
      return res.status(403).json({
        error: 'Company ID missing in token. Please login again.'
      });
    }

    next();
  } catch (err) {
    console.error('JWT error:', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ✅ Blacklist token on logout
const blacklistToken = (token) => {
  blacklistedTokens.add(token);
};

module.exports = {
  verifyToken,
  blacklistToken,
  JWT_SECRET
};
