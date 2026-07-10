const { body, param, query, validationResult } = require('express-validator');

/** Middleware: kumpulkan hasil express-validator dan kembalikan 422 dengan pesan spesifik per-field */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validasi gagal',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const registerRules = [
  body('name').trim().notEmpty().withMessage('Nama lengkap wajib diisi').isLength({ max: 120 }),
  body('email').trim().isEmail().withMessage('Format email tidak valid').normalizeEmail(),
  body('password')
    .matches(PASSWORD_REGEX)
    .withMessage('Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka'),
  body('role')
    .optional()
    .isIn(['Admin Sistem', 'Koordinator Regional', 'Scout Lapangan'])
    .withMessage('Role tidak valid')
];

const loginRules = [
  body('email').trim().isEmail().withMessage('Format email tidak valid').normalizeEmail(),
  body('password').notEmpty().withMessage('Password wajib diisi')
];

const forgotPasswordRules = [
  body('email').trim().isEmail().withMessage('Format email tidak valid').normalizeEmail()
];

const resetPasswordRules = [
  body('token').trim().notEmpty().withMessage('Token reset tidak valid'),
  body('password')
    .matches(PASSWORD_REGEX)
    .withMessage('Password minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka')
];

const athleteRules = [
  body('name').trim().notEmpty().withMessage('Nama atlet wajib diisi').isLength({ max: 120 }),
  body('gender').isIn(['Laki-laki', 'Perempuan']).withMessage('Jenis kelamin tidak valid'),
  body('age').isInt({ min: 10, max: 40 }).withMessage('Usia atlet harus antara 10-40 tahun'),
  body('sport').trim().notEmpty().withMessage('Cabang olahraga wajib diisi'),
  body('region').trim().notEmpty().withMessage('Wilayah wajib diisi'),
  body('status')
    .isIn(['Elite', 'Aktif', 'Cadangan', 'Ditangguhkan'])
    .withMessage('Status tidak valid'),
  body('height').optional({ nullable: true }).isInt({ min: 100, max: 250 }),
  body('weight').optional({ nullable: true }).isInt({ min: 20, max: 200 }),
  body('physical.run30m').isFloat({ min: 2, max: 10 }).withMessage('Waktu lari 30m tidak valid'),
  body('physical.verticalJump').isInt({ min: 0, max: 150 }).withMessage('Vertical jump tidak valid'),
  body('physical.vo2max').isInt({ min: 0, max: 100 }).withMessage('VO2 max tidak valid'),
  body('training.sessions').isInt({ min: 0, max: 21 }).withMessage('Frekuensi latihan tidak valid'),
  body('training.duration').isInt({ min: 0, max: 600 }).withMessage('Durasi latihan tidak valid'),
  body('evaluation.discipline').isInt({ min: 0, max: 10 }),
  body('evaluation.mental').isInt({ min: 0, max: 10 }),
  body('evaluation.leadership').isInt({ min: 0, max: 10 }),
  body('evaluation.focus').isInt({ min: 0, max: 10 }),
  body('evaluation.adaptability').isInt({ min: 0, max: 10 }),
  body('medicalNotes').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('photo').optional({ nullable: true }).isString().isLength({ max: 5_000_000 })
];

const idParamRule = [param('id').isInt({ min: 1 }).withMessage('ID tidak valid')];

module.exports = {
  handleValidation,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  athleteRules,
  idParamRule,
  query
};
