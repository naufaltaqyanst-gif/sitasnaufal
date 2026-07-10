const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const config = require('./config');

// Gunakan database in-memory saat menjalankan test agar setiap test suite terisolasi.
const dbFile = process.env.NODE_ENV === 'test' ? ':memory:' : config.dbFile;

if (dbFile !== ':memory:') {
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Scout Lapangan',
  status TEXT NOT NULL DEFAULT 'Aktif',
  reset_token TEXT,
  reset_token_expires INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS athletes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  age INTEGER NOT NULL,
  sport TEXT NOT NULL,
  region TEXT NOT NULL,
  height INTEGER,
  weight INTEGER,
  status TEXT NOT NULL DEFAULT 'Aktif',
  photo TEXT,
  medical_notes TEXT,
  run30m REAL,
  vertical_jump INTEGER,
  vo2max INTEGER,
  sessions INTEGER,
  duration INTEGER,
  discipline INTEGER,
  mental INTEGER,
  leadership INTEGER,
  focus INTEGER,
  adaptability INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  sport TEXT NOT NULL,
  level TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount > 0) return;

  const hash = bcrypt.hashSync('Admin123!', config.bcryptSaltRounds);
  const insertUser = db.prepare(
    `INSERT INTO users (name, email, password_hash, role, status) VALUES (?,?,?,?,?)`
  );
  insertUser.run('Dr. Rahmad Hidayat', 'rahmad.h@sumut.go.id', hash, 'Admin Sistem', 'Aktif');
  insertUser.run('Siti Aminah, M.Pd', 'siti.aminah@sitas.id', hash, 'Koordinator Regional', 'Aktif');
  insertUser.run('Budi Santoso', 'budi.scout@sitas.id', hash, 'Scout Lapangan', 'Ditangguhkan');

  const insertAthlete = db.prepare(`
    INSERT INTO athletes (name, gender, age, sport, region, height, weight, status, photo, medical_notes,
      run30m, vertical_jump, vo2max, sessions, duration, discipline, mental, leadership, focus, adaptability, created_by)
    VALUES (@name,@gender,@age,@sport,@region,@height,@weight,@status,@photo,@medical_notes,
      @run30m,@vertical_jump,@vo2max,@sessions,@duration,@discipline,@mental,@leadership,@focus,@adaptability,@created_by)
  `);
  const insertAchievement = db.prepare(
    `INSERT INTO achievements (athlete_id, title, type, year) VALUES (?,?,?,?)`
  );

  const seedAthletes = [
    {
      name: 'Rizky Ramadhan', gender: 'Laki-laki', age: 17, sport: 'Atletik', region: 'Kota Medan',
      height: 175, weight: 65, status: 'Elite', photo: '', medical_notes: 'Cedera hamstring ringan 2024, pulih total.',
      run30m: 4.1, vertical_jump: 65, vo2max: 58, sessions: 6, duration: 120,
      discipline: 9, mental: 8, leadership: 7, focus: 8, adaptability: 8, created_by: 1,
      achievements: [{ title: 'Emas Nasional PON XX', type: 'Emas Nasional', year: 2025 }]
    },
    {
      name: 'Aisyah Putri', gender: 'Perempuan', age: 16, sport: 'Renang', region: 'Kota Binjai',
      height: 168, weight: 58, status: 'Elite', photo: '', medical_notes: '',
      run30m: 4.8, vertical_jump: 45, vo2max: 58, sessions: 8, duration: 90,
      discipline: 10, mental: 9, leadership: 8, focus: 9, adaptability: 9, created_by: 1,
      achievements: [{ title: 'Perak Nasional KRAPNAS', type: 'Perak Nasional', year: 2024 }]
    },
    {
      name: 'Fajar Pratama', gender: 'Laki-laki', age: 18, sport: 'Bulu Tangkis', region: 'Deli Serdang',
      height: 172, weight: 63, status: 'Aktif', photo: '', medical_notes: '',
      run30m: 4.3, vertical_jump: 55, vo2max: 50, sessions: 5, duration: 150,
      discipline: 8, mental: 7, leadership: 9, focus: 7, adaptability: 8, created_by: 2,
      achievements: [{ title: 'Emas Daerah Kejurda Sumut', type: 'Emas Daerah', year: 2025 }]
    }
  ];

  const insertMany = db.transaction((athletes) => {
    for (const a of athletes) {
      const info = insertAthlete.run(a);
      for (const ach of a.achievements) {
        insertAchievement.run(info.lastInsertRowid, ach.title, ach.type, ach.year);
      }
    }
  });
  insertMany(seedAthletes);

  const insertTournament = db.prepare(
    `INSERT INTO tournaments (name, date, location, sport, level) VALUES (?,?,?,?,?)`
  );
  const tournaments = [
    ['Kejurnas Atletik U-20', '2026-08-15', 'Jakarta', 'Atletik', 'Nasional'],
    ['Sumut Open Renang', '2026-09-02', 'Medan', 'Renang', 'Regional'],
    ['Piala Gubernur Bulu Tangkis', '2026-10-10', 'Deli Serdang', 'Bulu Tangkis', 'Regional']
  ];
  tournaments.forEach((t) => insertTournament.run(...t));
}

seedIfEmpty();

module.exports = db;
