/**
 * Middleware error terpusat. Semua route memanggil next(err) alih-alih melempar
 * response ad-hoc, sehingga format error selalu konsisten: { error, code? }.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err.message);

  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'Data sudah ada (duplikat).' });
  }

  const status = err.status || 500;
  const message = status === 500 ? 'Terjadi kesalahan pada server. Silakan coba lagi.' : err.message;
  res.status(status).json({ error: message });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.` });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { errorHandler, notFoundHandler, HttpError };
