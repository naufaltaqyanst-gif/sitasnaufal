// ============================================================================
// errors.js — Manajemen error yang konsisten di seluruh aplikasi
// ============================================================================

/** Error khusus untuk kegagalan panggilan API, membawa status HTTP & detail validasi. */
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details || [];
  }
}

/**
 * Mengubah error apa pun (ApiError, TypeError jaringan, dll.) menjadi pesan
 * yang aman & ramah pengguna dalam Bahasa Indonesia.
 */
export function toUserMessage(err) {
  if (err instanceof ApiError) {
    if (err.details && err.details.length) {
      return err.details.map((d) => d.message).join(' ');
    }
    return err.message || 'Terjadi kesalahan saat menghubungi server.';
  }
  if (err && err.name === 'AbortError') {
    return 'Permintaan dibatalkan karena memakan waktu terlalu lama.';
  }
  if (err instanceof TypeError) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda atau coba lagi nanti.';
  }
  return 'Terjadi kesalahan tak terduga. Silakan coba lagi.';
}

/** Logger konsisten — titik tunggal jika suatu saat ingin dikirim ke layanan monitoring. */
export function logError(context, err) {
  // eslint-disable-next-line no-console
  console.error(`[SITAS Sumut] ${context}:`, err);
}
