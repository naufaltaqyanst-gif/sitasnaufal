// ============================================================================
// constants.js — Konstanta terpusat aplikasi SITAS Sumut
// Semua nilai konfigurasi & "magic string/number" dikumpulkan di sini agar
// tidak tersebar di banyak modul (memudahkan pemeliharaan).
// ============================================================================

export const API_BASE_URL = (typeof window !== 'undefined' && window.SITAS_API_BASE_URL) || const API_URL = "https://sitasnaufal-production.up.railway.app";

export const STORAGE_KEYS = {
  // Hanya dipakai sebagai CACHE OFFLINE sementara, BUKAN sumber kebenaran data.
  // Sumber kebenaran selalu server (database) — lihat js/state.js.
  ACCESS_TOKEN: 'sitas_access_token', // disimpan di memori (lihat auth.js), bukan localStorage
  REFRESH_TOKEN: 'sitas_refresh_token', // boleh persist agar "tetap masuk" antar sesi browser
  OFFLINE_CACHE: 'sitas_offline_cache_v2',
  LAST_SYNC: 'sitas_last_sync'
};

export const ACHIEVEMENT_WEIGHTS = {
  'Emas Nasional': 30,
  'Perak Nasional': 22,
  'Perunggu Nasional': 16,
  'Emas Daerah': 15,
  'Perak Daerah': 10,
  'Perunggu Daerah': 6,
  Partisipasi: 3
};

export const GRADE_CLASS_MAP = {
  'A+': 'grade-Aplus',
  A: 'grade-A',
  B: 'grade-B',
  C: 'grade-C',
  D: 'grade-D'
};

export const GRADE_NOTES = {
  'A+': 'Talenta Luar Biasa (High Potential)',
  A: 'Potensial Nasional',
  B: 'Potensial Daerah',
  C: 'Pembinaan Berkelanjutan',
  D: 'Perlu Evaluasi Lanjutan'
};

export const STATUS_COLOR_MAP = {
  Elite: 'bg-secondary text-white',
  Aktif: 'bg-secondary/10 text-secondary',
  Cadangan: 'bg-amber-100 text-amber-700',
  Ditangguhkan: 'bg-error-container text-error'
};

export const PAGES = [
  'dashboard',
  'athletes',
  'detail',
  'input',
  'recommendation',
  'reports',
  'users'
];

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
