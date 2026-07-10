process.env.NODE_ENV = 'test';
const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();
const VALID_PASSWORD = 'Passw0rd!Strong';

let accessToken;

function validAthletePayload(overrides = {}) {
  return {
    name: 'Atlet Uji Coba',
    gender: 'Laki-laki',
    age: 18,
    sport: 'Atletik',
    region: 'Kota Medan',
    status: 'Aktif',
    height: 175,
    weight: 65,
    physical: { run30m: 4.2, verticalJump: 60, vo2max: 55 },
    training: { sessions: 5, duration: 100 },
    evaluation: { discipline: 8, mental: 8, leadership: 7, focus: 8, adaptability: 8 },
    medicalNotes: '',
    achievements: [{ title: 'Juara Uji Coba', type: 'Emas Daerah', year: 2025 }],
    ...overrides
  };
}

beforeAll(async () => {
  const email = 'crudtest@sitas.id';
  await request(app).post('/api/auth/register').send({ name: 'CRUD Tester', email, password: VALID_PASSWORD });
  const loginRes = await request(app).post('/api/auth/login').send({ email, password: VALID_PASSWORD });
  accessToken = loginRes.body.accessToken;
});

function authed(req) {
  return req.set('Authorization', `Bearer ${accessToken}`);
}

describe('CRUD /api/athletes', () => {
  let createdId;

  test('POST membuat atlet baru dan menghitung skor & grade otomatis', async () => {
    const res = await authed(request(app).post('/api/athletes')).send(validAthletePayload());
    expect(res.status).toBe(201);
    expect(res.body.athlete.id).toBeDefined();
    expect(res.body.athlete.score).toBeGreaterThanOrEqual(0);
    expect(['A+', 'A', 'B', 'C', 'D']).toContain(res.body.athlete.grade);
    createdId = res.body.athlete.id;
  });

  test('POST menolak nama kosong dengan pesan validasi spesifik', async () => {
    const res = await authed(request(app).post('/api/athletes')).send(validAthletePayload({ name: '' }));
    expect(res.status).toBe(422);
    expect(res.body.details.some((d) => d.field === 'name')).toBe(true);
  });

  test('POST menolak usia di luar rentang 10-40 tahun', async () => {
    const res = await authed(request(app).post('/api/athletes')).send(validAthletePayload({ age: 5 }));
    expect(res.status).toBe(422);
    expect(res.body.details.some((d) => d.field === 'age')).toBe(true);
  });

  test('POST mensanitasi nama dengan menghapus spasi berlebih (trim)', async () => {
    const res = await authed(request(app).post('/api/athletes')).send(
      validAthletePayload({ name: '   Nama Berspasi   ' })
    );
    expect(res.status).toBe(201);
    expect(res.body.athlete.name).toBe('Nama Berspasi');
  });

  test('GET /api/athletes mengembalikan daftar terurut skor tertinggi ke terendah', async () => {
    const res = await authed(request(app).get('/api/athletes'));
    expect(res.status).toBe(200);
    const scores = res.body.athletes.map((a) => a.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  test('GET /api/athletes/:id mengembalikan detail lengkap termasuk achievements', async () => {
    const res = await authed(request(app).get(`/api/athletes/${createdId}`));
    expect(res.status).toBe(200);
    expect(res.body.athlete.achievements.length).toBeGreaterThan(0);
  });

  test('GET dengan id tidak ada mengembalikan 404', async () => {
    const res = await authed(request(app).get('/api/athletes/999999'));
    expect(res.status).toBe(404);
  });

  test('PUT memperbarui data dan skor ikut berubah', async () => {
    const res = await authed(request(app).put(`/api/athletes/${createdId}`)).send(
      validAthletePayload({ physical: { run30m: 3.9, verticalJump: 80, vo2max: 70 } })
    );
    expect(res.status).toBe(200);
    expect(res.body.athlete.scoreBreakdown.physScore).toBeGreaterThan(0);
  });

  test('DELETE menghapus atlet, GET selanjutnya 404', async () => {
    const del = await authed(request(app).delete(`/api/athletes/${createdId}`));
    expect(del.status).toBe(200);

    const get = await authed(request(app).get(`/api/athletes/${createdId}`));
    expect(get.status).toBe(404);
  });

  test('semua endpoint menolak tanpa Authorization header', async () => {
    const res = await request(app).post('/api/athletes').send(validAthletePayload());
    expect(res.status).toBe(401);
  });
});
