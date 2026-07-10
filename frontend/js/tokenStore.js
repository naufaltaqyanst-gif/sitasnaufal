// ============================================================================
// tokenStore.js — Penyimpanan token JWT
//
// Keputusan keamanan:
// - accessToken (umur pendek, 15 menit) HANYA disimpan di variabel memori
//   modul ini. Ia hilang saat tab ditutup/direfresh — ini disengaja, agar
//   token berumur pendek tidak "tersangkut" di penyimpanan browser yang
//   rentan terhadap serangan XSS (localStorage dapat dibaca skrip apa pun).
// - refreshToken (umur panjang, 7 hari) disimpan di localStorage supaya
//   pengguna tidak perlu login ulang setiap membuka tab baru. Ini adalah
//   kompromi standar untuk SPA tanpa cookie httpOnly; idealnya di produksi
//   refreshToken dikirim lewat cookie httpOnly+Secure dari server.
// ============================================================================

import { STORAGE_KEYS } from './constants.js';

let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function getRefreshToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    return null;
  }
}

export function setRefreshToken(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
    else localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  } catch {
    // localStorage bisa gagal (mode private/kuota penuh) — aplikasi tetap
    // berjalan, hanya saja pengguna perlu login ulang setiap sesi baru.
  }
}

export function clearTokens() {
  accessToken = null;
  setRefreshToken(null);
}
