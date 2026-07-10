// ============================================================================
// backup.js — Backup & restore data secara manual
//
// Meski sumber data utama kini adalah server (database), fitur ini tetap
// disediakan sebagai jaring pengaman: pengguna (mis. Admin Sistem) dapat
// mengekspor seluruh data atlet+turnamen ke file JSON kapan saja, dan
// mengembalikannya (impor) ke server bila diperlukan (mis. migrasi server,
// pemulihan bencana, atau audit offline).
// ============================================================================

import { apiClient } from './apiClient.js';
import { showToast } from './ui.js';
import { toUserMessage } from './errors.js';

/** Mengambil seluruh data dari server dan mengunduhnya sebagai file JSON. */
export async function exportBackup() {
  try {
    const [athletesRes, tournamentsRes] = await Promise.all([
      apiClient.get('/athletes'),
      apiClient.get('/tournaments')
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: 2,
      athletes: athletesRes.athletes,
      tournaments: tournamentsRes.tournaments
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitas-sumut-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('Backup Berhasil', `${backup.athletes.length} data atlet diekspor ke file JSON.`);
    return backup;
  } catch (err) {
    showToast('Backup Gagal', toUserMessage(err), 'error');
    throw err;
  }
}

/**
 * Membaca file JSON hasil backup dan memvalidasi strukturnya secara dasar
 * sebelum dikembalikan ke pemanggil untuk proses impor lebih lanjut.
 */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || file.type !== 'application/json') {
      reject(new Error('File harus berformat .json hasil ekspor SITAS Sumut.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!Array.isArray(data.athletes)) {
          throw new Error('Struktur file backup tidak valid (field "athletes" tidak ditemukan).');
        }
        resolve(data);
      } catch (err) {
        reject(new Error('Gagal membaca file backup: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsText(file);
  });
}

/**
 * Mengirim ulang data atlet dari file backup ke server sebagai data baru
 * (tidak menimpa ID lama — server akan membuat ID baru untuk setiap atlet).
 */
export async function restoreBackup(backupData, { onProgress } = {}) {
  const results = { success: 0, failed: 0, errors: [] };
  const total = backupData.athletes.length;

  for (let i = 0; i < total; i++) {
    const a = backupData.athletes[i];
    try {
      // Buang field turunan (score, grade) yang tidak boleh dikirim ulang ke server.
      const { score, grade, scoreBreakdown, id, createdAt, updatedAt, ...payload } = a;
      await apiClient.post('/athletes', payload);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ name: a.name, message: toUserMessage(err) });
    }
    if (onProgress) onProgress(i + 1, total);
  }

  return results;
}
