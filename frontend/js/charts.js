// ============================================================================
// charts.js — Penanganan Chart.js yang aman
// Menghindari dua bug umum di kode asli: (1) memory leak karena chart lama
// tidak pernah di-destroy, (2) crash saat elemen <canvas> belum/tidak ada
// di DOM (mis. pengguna berpindah halaman sebelum data selesai dimuat).
// ============================================================================

const registry = new Map();

/**
 * Membuat (atau mengganti) instance Chart.js pada elemen dengan id tertentu.
 * Chart lama dengan key yang sama otomatis di-destroy lebih dulu.
 * @returns {import('chart.js').Chart|null} null bila elemen canvas tidak ditemukan.
 */
export function safeCreateChart(key, canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    // eslint-disable-next-line no-console
    console.warn(`[charts] Elemen canvas #${canvasId} tidak ditemukan; chart "${key}" dilewati.`);
    return null;
  }
  if (typeof Chart === 'undefined') {
    console.warn('[charts] Library Chart.js belum dimuat.');
    return null;
  }

  destroyChart(key);
  const instance = new Chart(canvas, config);
  registry.set(key, instance);
  return instance;
}

export function destroyChart(key) {
  const existing = registry.get(key);
  if (existing) {
    existing.destroy();
    registry.delete(key);
  }
}

export function destroyAllCharts() {
  for (const key of registry.keys()) destroyChart(key);
}

/** Memperbarui data chart yang sudah ada tanpa membuat ulang instance (animasi lebih halus). */
export function updateChartData(key, newDatasetsData) {
  const chart = registry.get(key);
  if (!chart) return false;
  newDatasetsData.forEach((data, i) => {
    if (chart.data.datasets[i]) chart.data.datasets[i].data = data;
  });
  chart.update();
  return true;
}
