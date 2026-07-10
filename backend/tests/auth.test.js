process.env.NODE_ENV = 'test';
const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

const VALID_PASSWORD = 'Passw0rd!Strong';

describe('POST /api/auth/register', () => {
  test('berhasil mendaftarkan user baru dan tidak mengembalikan password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'testuser1@sitas.id',
      password: VALID_PASSWORD
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('testuser1@sitas.id');
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });

  test('menolak password lemah dengan pesan spesifik', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak Pass',
      email: 'weak@sitas.id',
      password: '12345'
    });
    expect(res.status).toBe(422);
    expect(res.body.details.some((d) => d.field === 'password')).toBe(true);
  });

  test('menolak email tidak valid', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email',
      password: VALID_PASSWORD
    });
    expect(res.status).toBe(422);
  });

  test('menolak registrasi duplikat email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Dup One',
      email: 'dup@sitas.id',
      password: VALID_PASSWORD
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dup Two',
      email: 'dup@sitas.id',
      password: VALID_PASSWORD
    });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  const email = 'logintest@sitas.id';

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ name: 'Login Test', email, password: VALID_PASSWORD });
  });

  test('berhasil login dengan kredensial benar, mengembalikan accessToken & refreshToken', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: VALID_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('menolak password salah dengan pesan generik (anti user-enumeration)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'SalahBanget123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/email atau password salah/i);
  });

  test('menolak login email yang tidak terdaftar dengan pesan yang sama persis', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tidakada@sitas.id', password: VALID_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/email atau password salah/i);
  });
});

describe('Proteksi endpoint & refresh token', () => {
  const email = 'protected@sitas.id';
  let accessToken;
  let refreshToken;

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ name: 'Protected', email, password: VALID_PASSWORD });
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: VALID_PASSWORD });
    accessToken = loginRes.body.accessToken;
    refreshToken = loginRes.body.refreshToken;
  });

  test('menolak akses ke /api/athletes tanpa token', async () => {
    const res = await request(app).get('/api/athletes');
    expect(res.status).toBe(401);
  });

  test('mengizinkan akses ke /api/athletes dengan token valid', async () => {
    const res = await request(app).get('/api/athletes').set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.athletes)).toBe(true);
  });

  test('menolak token acak/rusak', async () => {
    const res = await request(app).get('/api/athletes').set('Authorization', 'Bearer token.rusak.sekali');
    expect(res.status).toBe(401);
  });

  test('refresh token valid menghasilkan access token baru', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test('logout mencabut refresh token sehingga tidak bisa dipakai lagi', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    const reuseRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reuseRes.status).toBe(401);
  });
});

describe('Forgot / reset password', () => {
  const email = 'resetme@sitas.id';

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ name: 'Reset Me', email, password: VALID_PASSWORD });
  });

  test('forgot-password selalu 200 meski email tidak terdaftar (anti enumeration)', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@sitas.id' });
    expect(res.status).toBe(200);
  });

  test('reset-password dengan token valid mengganti password dan login lama gagal, baru berhasil', async () => {
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email });
    const token = forgotRes.body.devToken;
    expect(token).toBeDefined();

    const newPassword = 'BaruSekali123!';
    const resetRes = await request(app).post('/api/auth/reset-password').send({ token, password: newPassword });
    expect(resetRes.status).toBe(200);

    const oldLogin = await request(app).post('/api/auth/login').send({ email, password: VALID_PASSWORD });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app).post('/api/auth/login').send({ email, password: newPassword });
    expect(newLogin.status).toBe(200);
  });

  test('reset-password dengan token invalid ditolak', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'token-ngasal', password: 'BaruLagi123!' });
    expect(res.status).toBe(400);
  });
});
