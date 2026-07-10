// ============================================================================
// score.js — Algoritma penilaian talenta atlet (versi frontend)
//
// PENTING: Ini HANYA dipakai untuk pratinjau skor real-time di formulir input
// (live preview) agar pengguna langsung melihat estimasi grade saat mengetik.
// Skor yang benar-benar disimpan & dijadikan acuan resmi SELALU dihitung ulang
// oleh backend saat data disimpan (lihat backend/src/utils/score.js), sehingga
// klien tidak bisa memanipulasi skor dengan mengubah kode di browser.
// Kedua implementasi diuji dengan test-case yang sama untuk memastikan konsisten.
/**
 * Algoritma penilaian talenta atlet.
 * Dipindahkan 1:1 dari logika asli (calculateScore) di sitas-sumut.html,
 * namun dipisah sebagai modul murni (pure function) agar dapat diuji unit test
 * secara independen dan dipakai ulang oleh backend maupun frontend.
 */

const ACHIEVEMENT_WEIGHTS = {
  'Emas Nasional': 30,
  'Perak Nasional': 22,
  'Perunggu Nasional': 16,
  'Emas Daerah': 15,
  'Perak Daerah': 10,
  'Perunggu Daerah': 6,
  Partisipasi: 3
};

const GRADE_THRESHOLDS = [
  { min: 85, grade: 'A+' },
  { min: 75, grade: 'A' },
  { min: 65, grade: 'B' },
  { min: 55, grade: 'C' },
  { min: 0, grade: 'D' }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @param {object} athlete - harus memiliki: age, physical{run30m,verticalJump,vo2max},
 *                            training{sessions,duration}, evaluation{discipline,mental,leadership,focus,adaptability},
 *                            achievements[{type}]
 */
function calculateScore(athlete) {
  if (!athlete || typeof athlete !== 'object') {
    throw new TypeError('calculateScore membutuhkan objek athlete yang valid');
  }
  const { age, physical, training, evaluation, achievements } = athlete;

  const ageScore = clamp(((21 - age) / (21 - 15)) * 100, 0, 100);

  let achvScore = 0;
  (achievements || []).forEach((x) => {
    achvScore += ACHIEVEMENT_WEIGHTS[x.type] || 0;
  });
  achvScore = Math.min(achvScore, 100);

  const physScore = Math.min(
    100,
    (physical.vo2max / 70) * 40 +
      (physical.verticalJump / 80) * 30 +
      Math.max(0, ((5 - physical.run30m) / 2) * 30)
  );

  const trainScore = Math.min(100, (training.sessions / 10) * 60 + (training.duration / 180) * 40);

  const evalSum = Object.values(evaluation).reduce((s, v) => s + v, 0);
  const evalScore = Math.min(100, (evalSum / 50) * 100);

  const total =
    ageScore * 0.15 + achvScore * 0.3 + physScore * 0.25 + trainScore * 0.1 + evalScore * 0.2;

  return {
    total: Math.round(total),
    ageScore: Math.round(ageScore),
    achvScore: Math.round(achvScore),
    physScore: Math.round(physScore),
    trainScore: Math.round(trainScore),
    evalScore: Math.round(evalScore)
  };
}

function getGrade(score) {
  const found = GRADE_THRESHOLDS.find((t) => score >= t.min);
  return found ? found.grade : 'D';
}

export { calculateScore, getGrade, ACHIEVEMENT_WEIGHTS, GRADE_THRESHOLDS };
