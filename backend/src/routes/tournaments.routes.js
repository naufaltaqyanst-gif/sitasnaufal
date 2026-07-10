const express = require('express');
const { body } = require('express-validator');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const { idParamRule, handleValidation } = require('../utils/validators');

const router = express.Router();
router.use(requireAuth);

const tournamentRules = [
  body('name').trim().notEmpty().withMessage('Nama turnamen wajib diisi'),
  body('date').isISO8601().withMessage('Tanggal tidak valid (format YYYY-MM-DD)'),
  body('location').trim().notEmpty().withMessage('Lokasi wajib diisi'),
  body('sport').trim().notEmpty().withMessage('Cabang olahraga wajib diisi'),
  body('level').isIn(['Nasional', 'Regional', 'Seleksi']).withMessage('Level tidak valid')
];

router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM tournaments ORDER BY date ASC').all();
    res.json({ tournaments: rows });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole('Admin Sistem', 'Koordinator Regional'),
  tournamentRules,
  handleValidation,
  (req, res, next) => {
    try {
      const { name, date, location, sport, level } = req.body;
      const info = db
        .prepare('INSERT INTO tournaments (name, date, location, sport, level) VALUES (?,?,?,?,?)')
        .run(name.trim(), date, location.trim(), sport.trim(), level);
      const row = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json({ tournament: row });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id',
  requireRole('Admin Sistem', 'Koordinator Regional'),
  idParamRule,
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);
      if (!existing) throw new HttpError(404, 'Turnamen tidak ditemukan.');
      db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);
      res.json({ message: 'Turnamen berhasil dihapus.' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
