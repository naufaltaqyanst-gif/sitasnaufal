// ============================================================================
// history.js — Integrasi Browser History API
// Setiap perpindahan halaman didorong ke riwayat browser (pushState) sehingga
// tombol Back/Forward browser & gesture "swipe back" di mobile bekerja secara
// alami, alih-alih hanya mengandalkan array riwayat internal seperti sebelumnya.
// ============================================================================

let onNavigateCallback = null;

/**
 * @param {(pageId: string, params: object) => void} callback dipanggil setiap
 *        kali pengguna menekan Back/Forward atau navigasi diminta secara internal.
 */
export function initHistory(callback) {
  onNavigateCallback = callback;
  window.addEventListener('popstate', (e) => {
    const state = e.state || { page: 'dashboard', params: {} };
    onNavigateCallback(state.page, state.params || {}, { fromPopState: true });
  });
}

/**
 * Mendorong entri riwayat baru & memperbarui URL (mis. #athletes atau #detail?id=5)
 * tanpa memuat ulang halaman.
 */
export function navigateTo(pageId, params = {}, { replace = false } = {}) {
  const query = new URLSearchParams(params).toString();
  const url = `#${pageId}${query ? `?${query}` : ''}`;
  const state = { page: pageId, params };

  if (replace) {
    window.history.replaceState(state, '', url);
  } else {
    window.history.pushState(state, '', url);
  }
}

/** Membaca pageId & params dari URL saat aplikasi pertama kali dimuat (deep-link/refresh). */
export function getInitialRoute() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return { page: 'dashboard', params: {} };
  const [page, queryString] = hash.split('?');
  const params = Object.fromEntries(new URLSearchParams(queryString || ''));
  return { page: page || 'dashboard', params };
}

export function goBackInHistory() {
  window.history.back();
}
