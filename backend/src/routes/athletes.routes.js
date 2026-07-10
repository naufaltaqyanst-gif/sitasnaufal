const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/errorHandler');
const { calculateScore, getGrade } = require('../utils/score');
const { athleteRules, idParamRule, handleValidation } = require('../utils/validators');

const router = express.Router();

// Semua endpoint atlet mewajibkan autentikasi (proteksi endpoint).
router.use(requireAuth);

function rowToAthlete(row, achievements) {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    age: row.age,
    sport: row.sport,
    region: row.region,
    height: row.height,
    weight: row.weight,
    status: row.status,
    photo: row.photo || '',
    medicalNotes: row.medical_notes || '',
    physical: { run30m: row.run30m, verticalJump: row.vertical_jump, vo2max: row.vo2max },
    training: { sessions: row.sessions, duration: row.duration },
    evaluation: {
      discipline: row.discipline,
      mental: row.mental,
      leadership: row.leadership,
      focus: row.focus,
      adaptability: row.adaptability
    },
    achievements: achievements || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function withScore(athlete) {
  const score = calculateScore(athlete);
  return { ...athlete, score: score.total, scoreBreakdown: score, grade: getGrade(score.total) };
}

function fetchAchievements(athleteId) {
  return db
    .prepare('SELECT id, title, type, year FROM achievements WHERE athlete_id = ? ORDER BY year DESC')
    .all(athleteId);
}

function logAudit(userId, action, entityId, detail) {
  db.prepare('INSERT INTO audit_log (user_id, action, entity, entity_id, detail) VALUES (?,?,?,?,?)').run(
    userId,
    action,
    'athlete',
    entityId,
    detail || null
  );
}

/** GET /api/athletes?search=&region=&sport=&minScore= */
router.get('/', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM athletes ORDER BY id DESC').all();
    let athletes = rows.map((r) => withScore(rowToAthlete(r, fetchAchievements(r.id))));

    const { search, region, sport, minScore } = req.query;
    if (search) {
      const q = String(search).toLowerCase();
      athletes = athletes.filter((a) => a.name.toLowerCase().includes(q));
    }
    if (region) athletes = athletes.filter((a) => a.region === region);
    if (sport) athletes = athletes.filter((a) => a.sport === sport);
    if (minScore) athletes = athletes.filter((a) => a.score >= parseInt(minScore, 10));

    athletes.sort((a, b) => b.score - a.score);
    res.json({ athletes, count: athletes.length });
  } catch (err) {
    next(err);
  }
});

/** GET /api/athletes/:id */
router.get('/:id', idParamRule, handleValidation, (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    if (!row) throw new HttpError(404, 'Atlet tidak ditemukan.');
    res.json({ athlete: withScore(rowToAthlete(row, fetchAchievements(row.id))) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/athletes — buat atlet baru (input tervalidasi & tersanitasi) */
router.post('/', athleteRules, handleValidation, (req, res, next) => {
  try {
    const b = req.body;
    const info = db
      .prepare(
        `INSERT INTO athletes (name, gender, age, sport, region, height, weight, status, photo, medical_notes,
          run30m, vertical_jump, vo2max, sessions, duration, discipline, mental, leadership, focus, adaptability, created_by)
        VALUES (@name,@gender,@age,@sport,@region,@height,@weight,@status,@photo,@medicalNotes,
          @run30m,@verticalJump,@vo2max,@sessions,@duration,@discipline,@mental,@leadership,@focus,@adaptability,@createdBy)`
      )
      .run({
        name: b.name.trim(),
        gender: b.gender,
        age: b.age,
        sport: b.sport.trim(),
        region: b.region.trim(),
        height: b.height ?? null,
        weight: b.weight ?? null,
        status: b.status,
        photo: b.photo || '',
        medicalNotes: (b.medicalNotes || '').trim(),
        run30m: b.physical.run30m,
        verticalJump: b.physical.verticalJump,
        vo2max: b.physical.vo2max,
        sessions: b.training.sessions,
        duration: b.training.duration,
        discipline: b.evaluation.discipline,
        mental: b.evaluation.mental,
        leadership: b.evaluation.leadership,
        focus: b.evaluation.focus,
        adaptability: b.evaluation.adaptability,
        createdBy: req.user.sub
      });

    const athleteId = info.lastInsertRowid;
    const achievements =
      Array.isArray(b.achievements) && b.achievements.length
        ? b.achievements
        : [{ title: 'Baru Terdaftar', type: 'Partisipasi', year: new Date().getFullYear() }];

    const insertAch = db.prepare('INSERT INTO achievements (athlete_id, title, type, year) VALUES (?,?,?,?)');
    for (const ach of achievements) {
      insertAch.run(athleteId, String(ach.title).trim(), ach.type, parseInt(ach.year, 10));
    }

    logAudit(req.user.sub, 'CREATE', athleteId, b.name);
    const row = db.prepare('SELECT * FROM athletes WHERE id = ?').get(athleteId);
    res.status(201).json({ athlete: withScore(rowToAthlete(row, fetchAchievements(athleteId))) });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/athletes/:id — perbarui data atlet */
router.put('/:id', idParamRule, athleteRules, handleValidation, (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Atlet tidak ditemukan.');

    const b = req.body;
    db.prepare(
      `UPDATE athletes SET name=@name, gender=@gender, age=@age, sport=@sport, region=@region,
        height=@height, weight=@weight, status=@status, photo=@photo, medical_notes=@medicalNotes,
        run30m=@run30m, vertical_jump=@verticalJump, vo2max=@vo2max, sessions=@sessions, duration=@duration,
        discipline=@discipline, mental=@mental, leadership=@leadership, focus=@focus, adaptability=@adaptability,
        updated_at = datetime('now')
       WHERE id=@id`
    ).run({
      id: req.params.id,
      name: b.name.trim(),
      gender: b.gender,
      age: b.age,
      sport: b.sport.trim(),
      region: b.region.trim(),
      height: b.height ?? null,
      weight: b.weight ?? null,
      status: b.status,
      photo: b.photo || '',
      medicalNotes: (b.medicalNotes || '').trim(),
      run30m: b.physical.run30m,
      verticalJump: b.physical.verticalJump,
      vo2max: b.physical.vo2max,
      sessions: b.training.sessions,
      duration: b.training.duration,
      discipline: b.evaluation.discipline,
      mental: b.evaluation.mental,
      leadership: b.evaluation.leadership,
      focus: b.evaluation.focus,
      adaptability: b.evaluation.adaptability
    });

    if (Array.isArray(b.achievements)) {
      db.prepare('DELETE FROM achievements WHERE athlete_id = ?').run(req.params.id);
      const insertAch = db.prepare('INSERT INTO achievements (athlete_id, title, type, year) VALUES (?,?,?,?)');
      for (const ach of b.achievements) {
        insertAch.run(req.params.id, String(ach.title).trim(), ach.type, parseInt(ach.year, 10));
      }
    }

    logAudit(req.user.sub, 'UPDATE', req.params.id, b.name);
    const row = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    res.json({ athlete: withScore(rowToAthlete(row, fetchAchievements(row.id))) });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/athletes/:id */
router.delete('/:id', idParamRule, handleValidation, (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Atlet tidak ditemukan.');

    db.prepare('DELETE FROM athletes WHERE id = ?').run(req.params.id);
    logAudit(req.user.sub, 'DELETE', req.params.id, existing.name);
    res.json({ message: 'Data atlet berhasil dihapus.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
