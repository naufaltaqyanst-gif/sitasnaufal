const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const config = require('../config');
const { HttpError } = require('../middleware/errorHandler');
const { requireAuth } = require('../middleware/auth');
const {
  handleValidation,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules
} = require('../utils/validators');

const router = express.Router();

// Batasi percobaan login untuk mengurangi risiko brute-force.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.' }
});

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status };
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires
  });
}

function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = Date.now() + parseDurationMs(config.jwt.refreshExpires);
  db.prepare('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?,?,?)').run(
    userId,
    token,
    expiresAt
  );
  return token;
}

function parseDurationMs(str) {
  const m = /^(\d+)([smhd])$/.exec(str);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]];
  return n * unit;
}

/** POST /api/auth/register — bcrypt-hash password sebelum disimpan */
router.post('/register', registerRules, handleValidation, (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) throw new HttpError(409, 'Email sudah terdaftar di sistem.');

    const passwordHash = bcrypt.hashSync(password, config.bcryptSaltRounds);
    const info = db
      .prepare('INSERT INTO users (name, email, password_hash, role, status) VALUES (?,?,?,?,?)')
      .run(name, email, passwordHash, role || 'Scout Lapangan', 'Aktif');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/login — verifikasi bcrypt, keluarkan access+refresh token */
router.post('/login', loginLimiter, loginRules, handleValidation, (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Pesan generik agar tidak membocorkan apakah email terdaftar (mencegah user enumeration)
    const invalidMsg = 'Email atau password salah.';
    if (!user) throw new HttpError(401, invalidMsg);
    if (user.status !== 'Aktif') throw new HttpError(403, 'Akun Anda tidak aktif. Hubungi administrator.');

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) throw new HttpError(401, invalidMsg);

    const accessToken = signAccessToken(user);
    const refreshToken = issueRefreshToken(user.id);

    res.json({ accessToken, refreshToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/refresh — tukar refresh token valid dengan access token baru */
router.post('/refresh', (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new HttpError(400, 'refreshToken wajib disertakan.');

    const row = db
      .prepare('SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0')
      .get(refreshToken);
    if (!row || row.expires_at < Date.now()) {
      throw new HttpError(401, 'Refresh token tidak valid atau kedaluwarsa. Silakan masuk kembali.');
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
    if (!user || user.status !== 'Aktif') throw new HttpError(401, 'Akun tidak ditemukan atau nonaktif.');

    const accessToken = signAccessToken(user);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout — mencabut refresh token agar tidak bisa dipakai lagi */
router.post('/logout', requireAuth, (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?').run(refreshToken);
    } else {
      // Jika client tidak mengirim refresh token spesifik, cabut semua milik user ini.
      db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(req.user.sub);
    }
    res.json({ message: 'Berhasil keluar.' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/forgot-password — membuat token reset sekali-pakai (berlaku 30 menit).
 * Di produksi token ini dikirim lewat email; di sini token dikembalikan di response
 * hanya untuk keperluan pengujian tanpa layanan email eksternal.
 */
router.post('/forgot-password', forgotPasswordRules, handleValidation, (req, res, next) => {
  try {
    const { email } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    // Selalu balas sukses meski email tidak ditemukan (anti user-enumeration).
    if (!user) return res.json({ message: 'Jika email terdaftar, tautan reset telah dikirim.' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 30 * 60 * 1000;
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?').run(
      token,
      expires,
      user.id
    );

    res.json({
      message: 'Jika email terdaftar, tautan reset telah dikirim.',
      // devToken hanya dikirim di mode non-produksi untuk mempermudah pengujian manual/otomatis.
      devToken: process.env.NODE_ENV === 'production' ? undefined : token
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/reset-password — set password baru (bcrypt) memakai token yang valid */
router.post('/reset-password', resetPasswordRules, handleValidation, (req, res, next) => {
  try {
    const { token, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
    if (!user || !user.reset_token_expires || user.reset_token_expires < Date.now()) {
      throw new HttpError(400, 'Token reset tidak valid atau sudah kedaluwarsa.');
    }

    const passwordHash = bcrypt.hashSync(password, config.bcryptSaltRounds);
    db.prepare(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?'
    ).run(passwordHash, user.id);

    // Cabut semua refresh token lama demi keamanan setelah reset password.
    db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(user.id);

    res.json({ message: 'Password berhasil diperbarui. Silakan masuk dengan password baru.' });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me — profil user yang sedang login (memverifikasi token valid) */
router.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.sub);
    if (!user) throw new HttpError(404, 'User tidak ditemukan.');
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
