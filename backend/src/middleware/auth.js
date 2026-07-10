const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Memverifikasi Authorization: Bearer <token>. Menolak (401) jika tidak ada atau tidak valid/kedaluwarsa.
 * Menempelkan payload token terverifikasi ke req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Token akses tidak ditemukan. Silakan masuk kembali.' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesi telah kedaluwarsa. Silakan perbarui token.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token akses tidak valid.' });
  }
}

/** Membatasi endpoint hanya untuk role tertentu. Panggil setelah requireAuth. */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Belum terautentikasi.' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengakses sumber daya ini.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
