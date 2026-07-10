require('dotenv').config();

function required(name, fallbackForTest) {
  const val = process.env[name];
  if (!val) {
    if (process.env.NODE_ENV === 'test' && fallbackForTest) return fallbackForTest;
    throw new Error(
      `[config] Variabel lingkungan "${name}" belum diset. Salin .env.example menjadi .env dan isi nilainya.`
    );
  }
  return val;
}

module.exports = {
  port: process.env.PORT || 4000,
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'test_access_secret_do_not_use_in_prod'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'test_refresh_secret_do_not_use_in_prod'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d'
  },
  dbFile: process.env.DB_FILE || './data/sitas.db',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10)
};
