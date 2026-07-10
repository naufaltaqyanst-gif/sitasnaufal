// ============================================================================
// state.js — Manajemen state aplikasi
//
// PERUBAHAN UTAMA dari versi lama:
// localStorage BUKAN LAGI sumber kebenaran data (dahulu: `appData` dibaca/tulis
// langsung ke localStorage). Sekarang server (REST API + database) adalah
// satu-satunya sumber kebenaran. State di modul ini hanyalah salinan di memori
// untuk keperluan render UI saat ini.
//
// localStorage hanya dipakai sebagai CACHE OFFLINE darurat: jika permintaan ke
// server gagal (mis. server mati/koneksi terputus), aplikasi akan menampilkan
// data cache terakhir DISERTAI PERINGATAN JELAS ke pengguna (lihat ui.js
// showOfflineCacheWarning) bahwa data tersebut mungkin tidak terkini.
// ============================================================================

import { apiClient } from './apiClient.js';
import { STORAGE_KEYS } from './constants.js';
import { showOfflineCacheWarning } from './ui.js';
import { ApiError } from './errors.js';

const state = {
  athletes: [],
  users: [],
  tournaments: [],
  currentUser: null,
  isOfflineCache: false
};

function readOfflineCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeOfflineCache() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.OFFLINE_CACHE,
      JSON.stringify({ athletes: state.athletes, tournaments: state.tournaments })
    );
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch {
    // Kuota localStorage penuh atau mode private — abaikan, cache offline
    // hanyalah kenyamanan tambahan, bukan fitur inti.
  }
}

/** Memuat data atlet dari server; jatuh ke cache offline bila server tidak terjangkau. */
export async function loadAthletes({ search, region, sport, minScore } = {}) {
  try {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (region) params.set('region', region);
    if (sport) params.set('sport', sport);
    if (minScore) params.set('minScore', minScore);
    const query = params.toString();

    const data = await apiClient.get(`/athletes${query ? `?${query}` : ''}`);
    state.athletes = data.athletes;
    state.isOfflineCache = false;
    showOfflineCacheWarning(false);
    writeOfflineCache();
    return state.athletes;
  } catch (err) {
    // Hanya jatuh ke cache untuk kegagalan JARINGAN (server tak terjangkau),
    // BUKAN untuk error autentikasi (401/403) yang harus tetap diperlihatkan.
    if (err instanceof ApiError && err.status && err.status < 500 && err.status !== 0) {
      throw err;
    }
    const cache = readOfflineCache();
    if (cache) {
      state.athletes = cache.athletes || [];
      state.isOfflineCache = true;
      showOfflineCacheWarning(true);
      return state.athletes;
    }
    throw err;
  }
}

export async function loadTournaments() {
  try {
    const data = await apiClient.get('/tournaments');
    state.tournaments = data.tournaments;
    writeOfflineCache();
    return state.tournaments;
  } catch (err) {
    const cache = readOfflineCache();
    if (cache) {
      state.tournaments = cache.tournaments || [];
      return state.tournaments;
    }
    throw err;
  }
}

export async function loadUsers() {
  const data = await apiClient.get('/users');
  state.users = data.users;
  return state.users;
}

export async function createAthlete(payload) {
  const data = await apiClient.post('/athletes', payload);
  state.athletes.unshift(data.athlete);
  writeOfflineCache();
  return data.athlete;
}

export async function updateAthlete(id, payload) {
  const data = await apiClient.put(`/athletes/${id}`, payload);
  const idx = state.athletes.findIndex((a) => a.id === id);
  if (idx !== -1) state.athletes[idx] = data.athlete;
  writeOfflineCache();
  return data.athlete;
}

export async function deleteAthleteById(id) {
  await apiClient.delete(`/athletes/${id}`);
  state.athletes = state.athletes.filter((a) => a.id !== id);
  writeOfflineCache();
}

export function getState() {
  return state;
}

export function setCurrentUser(user) {
  state.currentUser = user;
}

export function getAthleteById(id) {
  return state.athletes.find((a) => a.id === Number(id));
}
