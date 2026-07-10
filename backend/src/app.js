const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const authRoutes = require('./routes/auth.routes');
const athletesRoutes = require('./routes/athletes.routes');
const usersRoutes = require('./routes/users.routes');
const tournamentsRoutes = require('./routes/tournaments.routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );
  app.use(express.json({ limit: '6mb' })); // cukup besar untuk foto base64 profil atlet

  // Rate limit umum di seluruh API untuk mengurangi risiko abuse/DoS sederhana.
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/athletes', athletesRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/tournaments', tournamentsRoutes);

  // Serve Frontend
  const frontendPath = path.join(__dirname, '../../frontend');
  app.use(express.static(frontendPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
