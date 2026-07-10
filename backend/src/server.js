const createApp = require('./app');
const config = require('./config');

const app = createApp();

app.listen(config.port, () => {
  console.log(`[SITAS Sumut API] berjalan di http://localhost:${config.port}`);
  console.log(`[SITAS Sumut API] CORS origin diizinkan: ${config.corsOrigin}`);
});
