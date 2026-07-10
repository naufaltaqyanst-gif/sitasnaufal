import { validateField, validateForm, rules } from '../js/validation.js';

describe('validation.js', () => {
  test('rules.required menolak string kosong/whitespace', () => {
    const rule = rules.required('Nama');
    expect(rule('')).toMatch(/wajib diisi/);
    expect(rule('   ')).toMatch(/wajib diisi/);
    expect(rule('Budi')).toBeNull();
  });

  test('rules.email memvalidasi format email dasar', () => {
    const rule = rules.email();
    expect(rule('bukan-email')).not.toBeNull();
    expect(rule('user@example.com')).toBeNull();
  });

  test('rules.password menuntut kombinasi huruf besar/kecil/angka, minimal 8 karakter', () => {
    const rule = rules.password();
    expect(rule('short1A')).not.toBeNull(); // < 8 char
    expect(rule('alllowercase1')).not.toBeNull(); // tanpa huruf besar
    expect(rule('ALLUPPERCASE1')).not.toBeNull(); // tanpa huruf kecil
    expect(rule('NoNumberHere')).not.toBeNull(); // tanpa angka
    expect(rule('ValidPass1')).toBeNull();
  });

  test('rules.matches memvalidasi konfirmasi password', () => {
    const rule = rules.matches('password', () => 'ValidPass1');
    expect(rule('ValidPass1')).toBeNull();
    expect(rule('Berbeda1')).toMatch(/tidak cocok/);
  });

  test('rules.range memvalidasi rentang angka (mis. usia atlet 10-40)', () => {
    const rule = rules.range('Usia', 10, 40);
    expect(rule(5)).toMatch(/harus di antara/);
    expect(rule(45)).toMatch(/harus di antara/);
    expect(rule(18)).toBeNull();
    expect(rule('bukan-angka')).toMatch(/harus berupa angka/);
  });

  test('validateField mengembalikan pesan error pertama yang gagal', () => {
    const result = validateField('', [rules.required('Email'), rules.email()]);
    expect(result).toMatch(/wajib diisi/);
  });

  test('validateForm memvalidasi seluruh skema dan mengumpulkan error per-field', () => {
    const { valid, errors } = validateForm(
      { name: '', email: 'invalid', age: 5 },
      {
        name: [rules.required('Nama')],
        email: [rules.required('Email'), rules.email()],
        age: [rules.range('Usia', 10, 40)]
      }
    );
    expect(valid).toBe(false);
    expect(Object.keys(errors)).toEqual(['name', 'email', 'age']);
  });

  test('validateForm mengembalikan valid:true bila semua field lolos', () => {
    const { valid, errors } = validateForm(
      { name: 'Budi', email: 'budi@sitas.id' },
      { name: [rules.required('Nama')], email: [rules.required('Email'), rules.email()] }
    );
    expect(valid).toBe(true);
    expect(errors).toEqual({});
  });
});
