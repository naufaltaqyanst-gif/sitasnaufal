// ============================================================================
// ui.js — Umpan balik antarmuka: toast, loading, dialog konfirmasi, ARIA live
// ============================================================================

/** Mengumumkan pesan ke pembaca layar lewat elemen aria-live tersembunyi. */
export function announce(message) {
  let liveRegion = document.getElementById('sr-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'sr-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    document.body.appendChild(liveRegion);
  }
  liveRegion.textContent = '';
  // Reset lalu isi ulang agar screen reader mendeteksi perubahan meski teksnya sama persis.
  requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

export function showToast(title, msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const iconMap = { success: 'check_circle', error: 'error', info: 'info' };
  const colorMap = { success: 'bg-secondary', error: 'bg-error', info: 'bg-primary' };
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.className =
    'toast-in bg-white border border-outline-variant shadow-2xl rounded-xl p-4 flex items-start gap-3 w-80';
  toast.innerHTML = `
    <div class="w-9 h-9 rounded-lg ${colorMap[type]} flex items-center justify-center shrink-0" aria-hidden="true">
      <span class="material-symbols-outlined text-white text-lg">${iconMap[type]}</span>
    </div>
    <div class="flex-1">
      <p class="font-bold text-sm text-primary"></p>
      <p class="text-xs text-outline mt-0.5"></p>
    </div>`;
  toast.querySelector('p.font-bold').textContent = title;
  toast.querySelector('p.text-xs').textContent = msg;
  container.appendChild(toast);
  announce(`${title}. ${msg}`);
  setTimeout(() => {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 420);
  }, 3200);
}

/** Menampilkan/menyembunyikan spinner loading pada sebuah tombol, menonaktifkannya selama proses. */
export function setButtonLoading(buttonEl, isLoading, loadingText = 'Memproses...') {
  if (!buttonEl) return;
  if (isLoading) {
    buttonEl.dataset.originalHtml = buttonEl.innerHTML;
    buttonEl.disabled = true;
    buttonEl.setAttribute('aria-busy', 'true');
    buttonEl.innerHTML = `
      <svg class="animate-spin h-5 w-5 inline" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"></path>
      </svg> ${loadingText}`;
  } else {
    buttonEl.disabled = false;
    buttonEl.removeAttribute('aria-busy');
    if (buttonEl.dataset.originalHtml) buttonEl.innerHTML = buttonEl.dataset.originalHtml;
  }
}

/** Menampilkan overlay loading skala-halaman untuk operasi yang mempengaruhi seluruh tampilan. */
export function setPageLoading(isLoading, message = 'Memuat data...') {
  let overlay = document.getElementById('page-loading-overlay');
  if (isLoading) {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'page-loading-overlay';
      overlay.setAttribute('role', 'status');
      overlay.setAttribute('aria-live', 'polite');
      overlay.className =
        'fixed inset-0 bg-primary/40 backdrop-blur-sm z-[999] flex items-center justify-center';
      overlay.innerHTML = `
        <div class="bg-white rounded-2xl px-8 py-6 flex items-center gap-3 shadow-2xl">
          <svg class="animate-spin h-6 w-6 text-secondary" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"></path>
          </svg>
          <span class="font-semibold text-primary" id="page-loading-text"></span>
        </div>`;
      document.body.appendChild(overlay);
    }
    document.getElementById('page-loading-text').textContent = message;
    overlay.classList.remove('hidden');
  } else if (overlay) {
    overlay.classList.add('hidden');
  }
}

/**
 * Dialog konfirmasi aksesibel (menggantikan window.confirm bawaan browser) untuk
 * aksi destruktif/penting seperti hapus, simpan perubahan besar, atau ekspor data.
 * Mengembalikan Promise<boolean>.
 */
export function confirmDialog({
  title = 'Konfirmasi',
  message = 'Apakah Anda yakin?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  danger = false
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-primary/50 z-[1000] flex items-center justify-center p-4';
    overlay.setAttribute('role', 'presentation');

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'confirm-dialog-title');
    dialog.setAttribute('aria-describedby', 'confirm-dialog-message');
    dialog.className = 'anim-card bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6';
    dialog.innerHTML = `
      <h2 id="confirm-dialog-title" class="text-lg font-bold text-primary mb-2"></h2>
      <p id="confirm-dialog-message" class="text-sm text-outline mb-6"></p>
      <div class="flex justify-end gap-3">
        <button type="button" data-action="cancel" class="px-4 py-2 rounded-lg font-semibold text-sm text-primary hover:bg-background transition-colors"></button>
        <button type="button" data-action="confirm" class="px-4 py-2 rounded-lg font-semibold text-sm text-white transition-colors ${danger ? 'bg-error hover:opacity-90' : 'bg-secondary hover:opacity-90'}"></button>
      </div>`;
    dialog.querySelector('#confirm-dialog-title').textContent = title;
    dialog.querySelector('#confirm-dialog-message').textContent = message;
    dialog.querySelector('[data-action="cancel"]').textContent = cancelText;
    dialog.querySelector('[data-action="confirm"]').textContent = confirmText;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const previouslyFocused = document.activeElement;
    const confirmBtn = dialog.querySelector('[data-action="confirm"]');
    const cancelBtn = dialog.querySelector('[data-action="cancel"]');
    cancelBtn.focus();

    function cleanup(result) {
      overlay.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(result);
    }

    confirmBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') cleanup(false);
      if (e.key === 'Tab') {
        const focusables = [cancelBtn, confirmBtn];
        const idx = focusables.indexOf(document.activeElement);
        e.preventDefault();
        const next = e.shiftKey ? (idx - 1 + focusables.length) % focusables.length : (idx + 1) % focusables.length;
        focusables[next].focus();
      }
    });
  });
}

/** Banner peringatan persisten yang muncul saat data hanya tersedia dari cache offline lokal. */
export function showOfflineCacheWarning(show) {
  let banner = document.getElementById('offline-cache-banner');
  if (show) {
    if (banner) return;
    banner = document.createElement('div');
    banner.id = 'offline-cache-banner';
    banner.setAttribute('role', 'alert');
    banner.className =
      'fixed top-0 inset-x-0 z-[998] bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4';
    banner.textContent =
      'Tidak dapat terhubung ke server. Data yang ditampilkan berasal dari cache lokal terakhir dan mungkin tidak terkini.';
    document.body.prepend(banner);
  } else if (banner) {
    banner.remove();
  }
}
