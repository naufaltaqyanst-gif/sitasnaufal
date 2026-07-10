// ============================================================================
// validation.js — Validasi form yang ketat, dengan umpan balik real-time
// ============================================================================

import { EMAIL_REGEX, PASSWORD_REGEX } from './constants.js';

export const rules = {
  required: (label) => (v) => (v && String(v).trim() !== '' ? null : `${label} wajib diisi.`),
  email: () => (v) => (EMAIL_REGEX.test(String(v).trim()) ? null : 'Format email tidak valid.'),
  password: () => (v) =>
    PASSWORD_REGEX.test(v)
      ? null
      : 'Password minimal 8 karakter dan mengandung huruf besar, huruf kecil, serta angka.',
  matches: (otherLabel, otherValueGetter) => (v) =>
    v === otherValueGetter() ? null : `Konfirmasi tidak cocok dengan ${otherLabel}.`,
  range: (label, min, max) => (v) => {
    const n = Number(v);
    if (Number.isNaN(n)) return `${label} harus berupa angka.`;
    if (n < min || n > max) return `${label} harus di antara ${min} dan ${max}.`;
    return null;
  },
  maxLength: (label, max) => (v) =>
    String(v || '').length <= max ? null : `${label} maksimal ${max} karakter.`,
  checked: (label) => (v) => (v ? null : `${label} harus dicentang.`)
};

/**
 * Menjalankan sekumpulan rule terhadap satu nilai, mengembalikan pesan error
 * pertama yang gagal, atau null jika valid.
 */
export function validateField(value, fieldRules) {
  for (const rule of fieldRules) {
    const message = rule(value);
    if (message) return message;
  }
  return null;
}

/**
 * Memvalidasi seluruh objek form berdasarkan skema { fieldName: [rule, rule...] }.
 * Mengembalikan { valid: boolean, errors: { fieldName: message } }.
 */
export function validateForm(values, schema) {
  const errors = {};
  for (const field of Object.keys(schema)) {
    const message = validateField(values[field], schema[field]);
    if (message) errors[field] = message;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Memasang validasi real-time (event 'input'/'blur') pada elemen <input>/<select>/<textarea>.
 * Menampilkan pesan error di elemen dengan id `${input.id}-error` bila ada,
 * serta menandai aria-invalid untuk aksesibilitas.
 */
export function bindRealtimeValidation(inputEl, fieldRules, { on = 'blur' } = {}) {
  const errorEl = document.getElementById(`${inputEl.id}-error`);

  function run() {
    const message = validateField(inputEl.value, fieldRules);
    inputEl.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorEl) {
      errorEl.textContent = message || '';
      errorEl.classList.toggle('hidden', !message);
    }
    inputEl.classList.toggle('border-error', Boolean(message));
    inputEl.classList.toggle('border-outline-variant', !message);
    return message;
  }

  inputEl.addEventListener(on, run);
  inputEl.addEventListener('input', () => {
    // Setelah pernah disentuh (blur pertama), beri umpan balik langsung saat mengetik.
    if (inputEl.dataset.touched === '1') run();
  });
  inputEl.addEventListener('blur', () => {
    inputEl.dataset.touched = '1';
  });

  return run;
}
