const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const { idParamRule, handleValidation } = require('../utils/validators');
const { body } = require('express-validator');

const router = express.Router();
router.use(requireAuth);

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status };
}

/** GET /api/users — daftar user (Admin Sistem & Koordinator Regional saja) */
router.get('/', requireRole('Admin Sistem', 'Koordinator Regional'), (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all();
    res.json({ users: rows.map(publicUser) });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/users/:id/status — ubah status (Aktif/Ditangguhkan/Offline), Admin Sistem saja */
router.patch(
  '/:id/status',
  requireRole('Admin Sistem'),
  idParamRule,
  body('status').isIn(['Aktif', 'Ditangguhkan', 'Offline']).withMessage('Status tidak valid'),
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
      if (!existing) throw new HttpError(404, 'User tidak ditemukan.');

      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
      const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
      res.json({ user: publicUser(row) });
    } catch (err) {
      next(err);
    }
  }
);

/** DELETE /api/users/:id — Admin Sistem saja; tidak boleh menghapus akun sendiri */
router.delete('/:id', requireRole('Admin Sistem'), idParamRule, handleValidation, (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.sub) {
      throw new HttpError(400, 'Anda tidak dapat menghapus akun Anda sendiri.');
    }
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'User tidak ditemukan.');

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
