// ============================================================================
// main.js — Titik masuk aplikasi (bootstrap, routing, pengikatan event)
//
// Catatan arsitektur: markup HTML SITAS Sumut menggunakan atribut onclick="..."
// inline (peninggalan dari versi monolitik: doLogin(), showPage('x'), dst).
// Alih-alih menulis ulang ratusan baris markup yang sudah matang secara
// visual, kita PERTAHANKAN markup tersebut dan mengekspos fungsi-fungsi yang
// relevan langsung ke `window` dengan NAMA YANG SAMA seperti sebelumnya,
// sehingga seluruh atribut onclick di HTML tetap berfungsi tanpa perubahan.
// Namun kini setiap fungsi hanyalah pemanggil tipis (thin wrapper) ke modul
// ES terstruktur (auth.js, athletes.js, state.js, dst.) — SELURUH LOGIKA
// sesungguhnya hidup di modul-modul tersebut dan dapat diuji unit test
// secara independen dari DOM/HTML.
// ============================================================================

import { initHistory, navigateTo, getInitialRoute } from './history.js';
import { showToast, setButtonLoading, announce, confirmDialog } from './ui.js';
import { toUserMessage } from './errors.js';
import * as Auth from './auth.js';
import * as AthletesModule from './athletes.js';
import * as Dashboard from './dashboard.js';
import * as Reports from './reports.js';
import * as Users from './users.js';
import * as Notifications from './notifications.js';
import * as Recommendation from './recommendation.js';
import * as Backup from './backup.js';

let navHistory = ['dashboard'];

/** ---------- ROUTER ---------- */
function showPage(pageId, pushHistory = true) {
  document.querySelectorAll('#pages-container > section').forEach((p) => p.classList.add('hidden-page'));
  const el = document.getElementById('page-' + pageId);
  if (!el) return;
  el.classList.remove('hidden-page');
  el.classList.remove('anim-page');
  void el.offsetWidth;
  el.classList.add('anim-page');

  document.querySelectorAll('.nav-item').forEach((btn) => {
    const isActive = btn.dataset.page === pageId;
    btn.classList.toggle('bg-secondary', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('text-white/70', !isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  if (pushHistory) {
    if (navHistory[navHistory.length - 1] !== pageId) navHistory.push(pageId);
    navigateTo(pageId);
  }

  if (pageId === 'dashboard') Dashboard.initDashboardCharts();
  if (pageId === 'reports') Reports.initReportCharts();
  if (pageId === 'athletes') AthletesModule.renderAthleteTable();
  if (pageId === 'recommendation') Recommendation.renderRecommendationPage();
  if (pageId === 'users') Users.renderUserTable();

  announce(`Halaman ${pageId} dimuat.`);
  window.scrollTo(0, 0);
}

function goBack() {
  if (navHistory.length > 1) {
    navHistory.pop();
    showPage(navHistory[navHistory.length - 1], false);
  } else {
    showPage('dashboard', false);
  }
}

/** ---------- AUTH VIEW SWITCHING ---------- */
function goToAuthView(viewId) {
  ['login-view', 'register-view', 'forgot-view'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === viewId) {
      el.classList.remove('hidden-page');
      const main = el.querySelector('main');
      if (main) {
        main.classList.remove('anim-page');
        void main.offsetWidth;
        main.classList.add('anim-page');
      }
    } else {
      el.classList.add('hidden-page');
    }
  });
  window.scrollTo(0, 0);
}

function enterApp() {
  document.getElementById('login-view')?.classList.add('hidden-page');
  document.getElementById('register-view')?.classList.add('hidden-page');
  document.getElementById('forgot-view')?.classList.add('hidden-page');
  document.getElementById('app-view').classList.remove('hidden-page');
  document.getElementById('app-view').classList.add('anim-page');
  const { page } = getInitialRoute();
  showPage(page || 'dashboard', false);
}

/** ---------- AUTH HANDLERS (dipanggil langsung dari onclick di HTML) ---------- */
async function doLogin() {
  const btn = document.getElementById('login-btn');
  const email = document.getElementById('li-user').value.trim();
  const password = document.getElementById('li-pass').value;

  setButtonLoading(btn, true, 'Memverifikasi...');
  const result = await Auth.login(email, password);
  setButtonLoading(btn, false);

  if (result.ok) {
    showToast('Selamat Datang', `Berhasil masuk sebagai ${result.user.name}.`);
    enterApp();
  } else if (result.errors) {
    showToast('Validasi Gagal', Object.values(result.errors)[0], 'error');
  } else {
    showToast('Gagal Masuk', result.message, 'error');
  }
}

async function submitRegister() {
  const btn = document.getElementById('register-btn');
  const payload = {
    name: document.getElementById('rg-name').value.trim(),
    email: document.getElementById('rg-email').value.trim(),
    role: document.getElementById('rg-role').value,
    password: document.getElementById('rg-pass').value,
    passwordConfirm: document.getElementById('rg-pass2').value,
    termsAccepted: document.getElementById('rg-terms').checked
  };

  setButtonLoading(btn, true, 'Mendaftarkan...');
  const result = await Auth.register(payload);
  setButtonLoading(btn, false);

  if (result.ok) {
    document.getElementById('register-form').reset();
    showToast('Registrasi Berhasil', `Akun ${result.user.name} telah dibuat. Silakan masuk.`);
    goToAuthView('login-view');
  } else if (result.errors) {
    showToast('Validasi Gagal', Object.values(result.errors)[0], 'error');
  } else {
    showToast('Registrasi Gagal', result.message, 'error');
  }
}

async function submitForgotPassword() {
  const btn = document.getElementById('forgot-btn');
  const email = document.getElementById('fg-email').value.trim();

  setButtonLoading(btn, true, 'Mengirim...');
  const result = await Auth.forgotPassword(email);
  setButtonLoading(btn, false);

  if (result.ok) {
    document.getElementById('fg-email').value = '';
    showToast('Tautan Terkirim', result.message);
    goToAuthView('login-view');
  } else if (result.errors) {
    showToast('Validasi Gagal', Object.values(result.errors)[0], 'error');
  } else {
    showToast('Gagal Mengirim', result.message, 'error');
  }
}

async function doLogout() {
  const confirmed = await confirmDialog({
    title: 'Keluar dari SITAS Sumut?',
    message: 'Anda perlu masuk kembali untuk mengakses sistem.',
    confirmText: 'Ya, Keluar'
  });
  if (!confirmed) return;
  await Auth.logout();
  document.getElementById('app-view').classList.add('hidden-page');
  goToAuthView('login-view');
}

function togglePass() {
  const p = document.getElementById('li-pass');
  const icon = document.getElementById('li-eye');
  const t = p.getAttribute('type') === 'password' ? 'text' : 'password';
  p.setAttribute('type', t);
  icon.innerText = t === 'password' ? 'visibility' : 'visibility_off';
}

/** ---------- BACKUP UI ---------- */
async function handleImportBackupFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = await Backup.readBackupFile(file);
    const confirmed = await confirmDialog({
      title: 'Pulihkan Data dari Backup?',
      message: `File berisi ${data.athletes.length} data atlet. Data akan ditambahkan sebagai entri baru ke server (bukan menimpa data yang ada).`,
      confirmText: 'Ya, Pulihkan'
    });
    if (!confirmed) return;

    const results = await Backup.restoreBackup(data);
    showToast(
      'Pemulihan Selesai',
      `${results.success} data berhasil dipulihkan, ${results.failed} gagal.`,
      results.failed ? 'error' : 'success'
    );
    AthletesModule.renderAthleteTable();
  } catch (err) {
    showToast('Gagal Memulihkan Backup', toUserMessage(err), 'error');
  } finally {
    event.target.value = '';
  }
}

/** ---------- EKSPOS FUNGSI GLOBAL (kompatibel dengan atribut onclick di HTML) ---------- */
Object.assign(window, {
  // Navigasi
  showPage: (id) => showPage(id, true),
  goBack,
  goToAuthView,

  // Auth
  doLogin,
  submitRegister,
  submitForgotPassword,
  togglePass,
  doLogout,

  // Atlet
  openInputForm: (isEdit) => AthletesModule.openInputForm(isEdit, showPage),
  openDetail: (id) => AthletesModule.openDetail(id, showPage),
  editAthlete: (id) => AthletesModule.editAthlete(id, showPage),
  deleteAthlete: (id) => AthletesModule.deleteAthlete(id),
  submitAthleteForm: () => AthletesModule.submitAthleteForm(showPage),
  onEvalInput: (key, val) => AthletesModule.onEvalInput(key, val),
  previewImage: (evt) => AthletesModule.previewImage(evt),
  globalSearch: (val) => AthletesModule.globalSearch(val, showPage),
  renderAthleteTable: () => AthletesModule.renderAthleteTable(),
  updateLivePreview: () => AthletesModule.updateLivePreview(),

  // Users
  cycleUserStatus: Users.cycleUserStatus,
  deleteUser: Users.deleteUser,
  toggleUserModal: Users.toggleUserModal,
  submitNewUser: Users.submitNewUser,

  // Notifikasi & kalender
  toggleNotifPanel: Notifications.toggleNotifPanel,
  markAllNotifRead: Notifications.markAllNotifRead,
  toggleCalendarPanel: Notifications.toggleCalendarPanel,
  shiftCalendarMonth: Notifications.shiftCalendarMonth,

  // Laporan / ekspor
  exportCSV: Reports.exportCSV,
  downloadReportPDF: Reports.downloadReportPDF,

  // Backup (dipakai oleh tombol backup manual di halaman pengaturan)
  exportBackup: Backup.exportBackup,

  // showToast dipanggil langsung di beberapa tempat pada markup asli
  showToast
});

/** ---------- INISIALISASI ---------- */
function bindStaticListeners() {
  document.getElementById('backup-import-input')?.addEventListener('change', handleImportBackupFile);
}

initHistory((pageId) => showPage(pageId, false));

document.addEventListener('DOMContentLoaded', async () => {
  bindStaticListeners();

  const restored = await Auth.restoreSession();
  if (restored) {
    enterApp();
  } else {
    goToAuthView('login-view');
  }
});
