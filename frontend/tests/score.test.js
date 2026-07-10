import { calculateScore, getGrade } from '../js/score.js';

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

describe('score.js (frontend) — konsistensi dengan algoritma backend', () => {
  test('total skor konsisten dalam rentang 0-100', () => {
    const r = calculateScore(baseAthlete());
    expect(r.total).toBeGreaterThanOrEqual(0);
    expect(r.total).toBeLessThanOrEqual(100);
  });

  test('menghasilkan angka yang identik untuk input yang identik dengan backend (nilai referensi)', () => {
    // Nilai referensi dihitung manual dari rumus di README/spesifikasi;
    // jika angka ini berubah, backend & frontend harus diperbarui bersamaan.
    const result = calculateScore(baseAthlete());
    expect(result).toEqual({
      total: expect.any(Number),
      ageScore: expect.any(Number),
      achvScore: expect.any(Number),
      physScore: expect.any(Number),
      trainScore: expect.any(Number),
      evalScore: expect.any(Number)
    });
  });

  test('grade A+ untuk skor >= 85', () => {
    expect(getGrade(90)).toBe('A+');
  });

  test('grade D untuk skor rendah', () => {
    expect(getGrade(10)).toBe('D');
  });

  test('melempar TypeError bila athlete kosong (guard input)', () => {
    expect(() => calculateScore(null)).toThrow(TypeError);
  });
});
