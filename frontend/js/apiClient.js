// ============================================================================
// apiClient.js — Klien REST API terpusat
// Menangani: pemasangan header Authorization otomatis, refresh token otomatis
// saat access token kedaluwarsa (retry sekali), timeout, dan pelemparan
// ApiError yang konsisten untuk seluruh aplikasi.
// ============================================================================

import { API_BASE_URL } from './constants.js';
import { ApiError, logError } from './errors.js';
import { getAccessToken, setAccessToken, getRefreshToken, clearTokens } from './tokenStore.js';

const DEFAULT_TIMEOUT_MS = 15000;

let refreshInFlight = null;

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError('Sesi tidak ditemukan. Silakan masuk kembali.', 401);

  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new ApiError(data.error || 'Gagal memperbarui sesi.', res.status);
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/**
 * @param {string} path - path relatif, contoh: '/athletes' atau '/auth/login'
 * @param {object} options - { method, body, auth (default true), signal }
 */
async function request(path, options = {}) {
  const { method = 'GET', body, auth = true, signal } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const combinedSignal = signal || controller.signal;

  const doFetch = async () => {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: combinedSignal
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  try {
    let { res, data } = await doFetch();

    // Access token kedaluwarsa: coba refresh sekali, lalu ulangi permintaan asli.
    if (res.status === 401 && data.code === 'TOKEN_EXPIRED' && auth) {
      try {
        await refreshAccessToken();
        ({ res, data } = await doFetch());
      } catch (refreshErr) {
        clearTokens();
        throw new ApiError('Sesi Anda telah berakhir. Silakan masuk kembali.', 401);
      }
    }

    if (!res.ok) {
      throw new ApiError(data.error || `Permintaan gagal (${res.status})`, res.status, data.details);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logError(`API ${method} ${path}`, err);
    throw err; // TypeError jaringan / AbortError diteruskan, ditangani oleh errors.toUserMessage
  } finally {
    clearTimeout(timeout);
  }
}

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' })
};
