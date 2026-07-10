// ============================================================================
// users.js — Manajemen pengguna (Admin Sistem & Koordinator Regional)
// ============================================================================

import { getState, loadUsers } from './state.js';
import { apiClient } from './apiClient.js';
import { showToast, confirmDialog, setPageLoading } from './ui.js';
import { toUserMessage } from './errors.js';
import { validateForm, rules } from './validation.js';
import { initials } from './athletes.js';

const STATUS_STYLE = { Aktif: 'bg-secondary/10 text-secondary', Offline: 'bg-background text-outline', Ditangguhkan: 'bg-error-container text-error' };
const ROLE_STYLE = { 'Admin Sistem': 'bg-primary text-white', 'Koordinator Regional': 'bg-accent/30 text-primary', 'Scout Lapangan': 'bg-secondary/10 text-secondary' };

export async function renderUserTable() {
  setPageLoading(true, 'Memuat data pengguna...');
  try {
    const users = await loadUsers();

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };
    set('u-kpi-total', users.length);
    set('u-kpi-active', users.filter((x) => x.status === 'Aktif').length);
    set('u-kpi-offline', users.filter((x) => x.status === 'Offline').length);
    set('u-kpi-suspended', users.filter((x) => x.status === 'Ditangguhkan').length);

    const tbody = document.getElementById('user-table-body');
    if (tbody) {
      tbody.innerHTML = users
        .map(
          (usr, i) => `
      <tr class="row-stagger hover:bg-background transition-colors" style="animation-delay:${i * 0.04}s">
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs" aria-hidden="true">${initials(usr.name)}</div>
            <div><p class="font-bold text-primary text-sm">${usr.name}</p><p class="text-[11px] text-outline">${usr.email}</p></div>
          </div>
        </td>
        <td class="px-5 py-3"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${ROLE_STYLE[usr.role] || 'bg-background'}">${usr.role}</span></td>
        <td class="px-5 py-3 text-center"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_STYLE[usr.status]}">${usr.status}</span></td>
        <td class="px-5 py-3 text-right">
          <button class="p-1.5 hover:bg-background rounded-lg transition-all" aria-label="Ubah status ${usr.name}" onclick="SITAS.cycleUserStatus(${usr.id})" title="Ubah Status"><span class="material-symbols-outlined text-lg" aria-hidden="true">sync</span></button>
          <button class="p-1.5 hover:bg-error-container hover:text-error rounded-lg transition-all" aria-label="Hapus pengguna ${usr.name}" onclick="SITAS.deleteUser(${usr.id})" title="Hapus"><span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span></button>
        </td>
      </tr>`
        )
        .join('');
    }
  } catch (err) {
    showToast('Gagal Memuat Pengguna', toUserMessage(err), 'error');
  } finally {
    setPageLoading(false);
  }
}

export async function cycleUserStatus(id) {
  const cycle = ['Aktif', 'Offline', 'Ditangguhkan'];
  const user = getState().users.find((u) => u.id === id);
  if (!user) return;
  const nextStatus = cycle[(cycle.indexOf(user.status) + 1) % cycle.length];

  try {
    await apiClient.patch(`/users/${id}/status`, { status: nextStatus });
    showToast('Status Diperbarui', `${user.name} sekarang ${nextStatus}.`);
    renderUserTable();
  } catch (err) {
    showToast('Gagal Memperbarui Status', toUserMessage(err), 'error');
  }
}

export async function deleteUser(id) {
  const user = getState().users.find((u) => u.id === id);
  const confirmed = await confirmDialog({
    title: 'Hapus Pengguna?',
    message: `Akun "${user ? user.name : 'ini'}" akan dihapus permanen dari sistem.`,
    confirmText: 'Ya, Hapus',
    danger: true
  });
  if (!confirmed) return;

  try {
    await apiClient.delete(`/users/${id}`);
    showToast('Pengguna Dihapus', 'Data pengguna telah dihapus.', 'error');
    renderUserTable();
  } catch (err) {
    showToast('Gagal Menghapus', toUserMessage(err), 'error');
  }
}

export function toggleUserModal(show) {
  const modal = document.getElementById('user-modal');
  if (!modal) return;
  if (show) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
    document.getElementById('um-name').value = '';
    document.getElementById('um-email').value = '';
    document.getElementById('um-name').focus();
  } else {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.setAttribute('aria-hidden', 'true');
  }
}

export async function submitNewUser() {
  const name = document.getElementById('um-name').value.trim();
  const email = document.getElementById('um-email').value.trim();
  const role = document.getElementById('um-role').value;

  const { valid, errors } = validateForm(
    { name, email },
    { name: [rules.required('Nama')], email: [rules.required('Email'), rules.email()] }
  );
  if (!valid) {
    showToast('Validasi Gagal', Object.values(errors)[0], 'error');
    return;
  }

  try {
    // Registrasi user baru memakai endpoint auth/register (password sementara acak,
    // Admin dapat memicu alur "lupa password" agar user mengatur password sendiri).
    const tempPassword = crypto.randomUUID().slice(0, 12) + 'Aa1!';
    await apiClient.post('/auth/register', { name, email, password: tempPassword, role }, { auth: false });
    showToast('Pengguna Ditambahkan', `${name} telah didaftarkan. Minta pengguna melakukan reset password saat login pertama.`);
    toggleUserModal(false);
    renderUserTable();
  } catch (err) {
    showToast('Gagal Menambahkan Pengguna', toUserMessage(err), 'error');
  }
}
