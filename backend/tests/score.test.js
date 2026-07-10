const { calculateScore, getGrade } = require('../src/utils/score');

function baseAthlete(overrides = {}) {
  return {
    age: 17,
    physical: { run30m: 4.1, verticalJump: 65, vo2max: 58 },
    training: { sessions: 6, duration: 120 },
    evaluation: { discipline: 9, mental: 8, leadership: 7, focus: 8, adaptability: 8 },
    achievements: [{ type: 'Emas Nasional' }],
    ...overrides
  };
}

describe('calculateScore', () => {
  test('menghasilkan skor total di rentang 0-100', () => {
    const result = calculateScore(baseAthlete());
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  test('atlet lebih muda mendapat ageScore lebih tinggi (bobot usia 15-21 tahun)', () => {
    const young = calculateScore(baseAthlete({ age: 15 }));
    const old = calculateScore(baseAthlete({ age: 20 }));
    expect(young.ageScore).toBeGreaterThan(old.ageScore);
  });

  test('usia di luar rentang wajar tetap di-clamp 0-100 (tidak negatif/overflow)', () => {
    const veryOld = calculateScore(baseAthlete({ age: 40 }));
    expect(veryOld.ageScore).toBeGreaterThanOrEqual(0);
    expect(veryOld.ageScore).toBeLessThanOrEqual(100);
  });

  test('prestasi emas nasional memberi achvScore lebih tinggi dari tanpa prestasi', () => {
    const withAchv = calculateScore(baseAthlete({ achievements: [{ type: 'Emas Nasional' }] }));
    const noAchv = calculateScore(baseAthlete({ achievements: [] }));
    expect(withAchv.achvScore).toBeGreaterThan(noAchv.achvScore);
  });

  test('achvScore di-cap maksimum 100 walau banyak prestasi emas', () => {
    const manyGolds = calculateScore(
      baseAthlete({
        achievements: Array.from({ length: 10 }, () => ({ type: 'Emas Nasional' }))
      })
    );
    expect(manyGolds.achvScore).toBe(100);
  });

  test('tipe prestasi tak dikenal diberi bobot 0, tidak melempar error', () => {
    const result = calculateScore(baseAthlete({ achievements: [{ type: 'Tidak Dikenal' }] }));
    expect(result.achvScore).toBe(0);
  });

  test('physScore meningkat dengan VO2 max dan vertical jump lebih tinggi', () => {
    const fit = calculateScore(baseAthlete({ physical: { run30m: 3.9, verticalJump: 75, vo2max: 65 } }));
    const lessFit = calculateScore(baseAthlete({ physical: { run30m: 4.9, verticalJump: 40, vo2max: 40 } }));
    expect(fit.physScore).toBeGreaterThan(lessFit.physScore);
  });

  test('trainScore di-cap maksimum 100 meski sesi & durasi latihan ekstrem', () => {
    const result = calculateScore(baseAthlete({ training: { sessions: 21, duration: 600 } }));
    expect(result.trainScore).toBeLessThanOrEqual(100);
  });

  test('evalScore dihitung dari rata-rata lima aspek evaluasi pelatih (skala 0-10 per aspek)', () => {
    const perfect = calculateScore(
      baseAthlete({ evaluation: { discipline: 10, mental: 10, leadership: 10, focus: 10, adaptability: 10 } })
    );
    expect(perfect.evalScore).toBe(100);
  });

  test('melempar TypeError bila athlete tidak valid', () => {
    expect(() => calculateScore(null)).toThrow(TypeError);
    expect(() => calculateScore(undefined)).toThrow(TypeError);
  });
});

describe('getGrade', () => {
  test.each([
    [90, 'A+'],
    [85, 'A+'],
    [80, 'A'],
    [75, 'A'],
    [70, 'B'],
    [65, 'B'],
    [60, 'C'],
    [55, 'C'],
    [40, 'D'],
    [0, 'D']
  ])('skor %i menghasilkan grade %s', (score, expected) => {
    expect(getGrade(score)).toBe(expected);
  });
});
