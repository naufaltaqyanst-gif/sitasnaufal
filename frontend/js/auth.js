// ============================================================================
// auth.js — Alur autentikasi terintegrasi dengan backend (bcrypt + JWT)
// ============================================================================

import { apiClient } from './apiClient.js';
import { setAccessToken, setRefreshToken, clearTokens, getRefreshToken } from './tokenStore.js';
import { setCurrentUser } from './state.js';
import { validateForm, rules } from './validation.js';
import { showToast } from './ui.js';
import { toUserMessage } from './errors.js';

export async function login(email, password) {
  const { valid, errors } = validateForm(
    { email, password },
    { email: [rules.required('Email'), rules.email()], password: [rules.required('Password')] }
  );
  if (!valid) return { ok: false, errors };

  try {
    const data = await apiClient.post('/auth/login', { email, password }, { auth: false });
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    setCurrentUser(data.user);
    return { ok: true, user: data.user };
  } catch (err) {
    return { ok: false, message: toUserMessage(err) };
  }
}

export async function register({ name, email, password, passwordConfirm, role, termsAccepted }) {
  const { valid, errors } = validateForm(
    { name, email, password, passwordConfirm, termsAccepted },
    {
      name: [rules.required('Nama lengkap')],
      email: [rules.required('Email'), rules.email()],
      password: [rules.required('Password'), rules.password()],
      passwordConfirm: [rules.matches('password', () => password)],
      termsAccepted: [rules.checked('Ketentuan penggunaan')]
    }
  );
  if (!valid) return { ok: false, errors };

  try {
    const data = await apiClient.post('/auth/register', { name, email, password, role }, { auth: false });
    return { ok: true, user: data.user };
  } catch (err) {
    return { ok: false, message: toUserMessage(err) };
  }
}

export async function forgotPassword(email) {
  const { valid, errors } = validateForm(
    { email },
    { email: [rules.required('Email'), rules.email()] }
  );
  if (!valid) return { ok: false, errors };

  try {
    const data = await apiClient.post('/auth/forgot-password', { email }, { auth: false });
    return { ok: true, message: data.message, devToken: data.devToken };
  } catch (err) {
    return { ok: false, message: toUserMessage(err) };
  }
}

export async function resetPassword(token, password, passwordConfirm) {
  const { valid, errors } = validateForm(
    { password, passwordConfirm },
    {
      password: [rules.required('Password baru'), rules.password()],
      passwordConfirm: [rules.matches('password baru', () => password)]
    }
  );
  if (!valid) return { ok: false, errors };

  try {
    const data = await apiClient.post('/auth/reset-password', { token, password }, { auth: false });
    return { ok: true, message: data.message };
  } catch (err) {
    return { ok: false, message: toUserMessage(err) };
  }
}

export async function logout() {
  try {
    const refreshToken = getRefreshToken();
    await apiClient.post('/auth/logout', { refreshToken });
  } catch (err) {
    // Tetap lanjutkan logout di sisi klien meski permintaan ke server gagal
    // (mis. token sudah kedaluwarsa) — pengalaman pengguna harus tetap mulus.
  } finally {
    clearTokens();
    setCurrentUser(null);
    showToast('Sesi Berakhir', 'Anda telah keluar dari sistem.', 'info');
  }
}

/** Dipanggil saat aplikasi dimuat: coba pulihkan sesi dari refresh token tersimpan. */
export async function restoreSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const refreshData = await apiClient.post('/auth/refresh', { refreshToken }, { auth: false });
    setAccessToken(refreshData.accessToken);
    const meData = await apiClient.get('/auth/me');
    setCurrentUser(meData.user);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}
