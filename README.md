# SITAS Sumut — Refactor Kualitas Perangkat Lunak

Refactor menyeluruh dari `sitas-sumut.html` (aplikasi satu-file berbasis
`localStorage`) menjadi sistem dua-lapis: **backend REST API** (Node.js +
Express + SQLite) dan **frontend modular** (ES Modules) yang mengonsumsi API
tersebut. Proyek ini mengikuti daftar perbaikan yang diminta secara langsung —
lihat pemetaan di bagian "Apa yang berubah" di bawah.

```
sitas-refactor/
├── backend/     REST API — auth JWT+bcrypt, CRUD, validasi, tes
└── frontend/    UI asli (HTML/Tailwind/Chart.js) + logika modular ES
```

## Menjalankan proyek

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# WAJIB: edit .env dan isi JWT_ACCESS_SECRET / JWT_REFRESH_SECRET dengan
# string acak yang panjang, contoh:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm run dev
```

Server berjalan di `http://localhost:4000`. Saat pertama kali dijalankan,
database SQLite (`backend/data/sitas.db`) dibuat otomatis dan diisi data
contoh, termasuk akun awal:

| Email                     | Password    | Role          |
|---------------------------|-------------|---------------|
| rahmad.h@sumut.go.id      | Admin123!   | Admin Sistem  |

**Ganti password ini segera** melalui alur "Lupa Password" atau endpoint
`reset-password` — password contoh ini hanya untuk demo lokal.

### 2. Frontend

Frontend adalah HTML statis + modul ES (tidak perlu build step). Sajikan
lewat server statis apa pun, misalnya:

```bash
cd frontend
npx serve .          # atau: python3 -m http.server 5173
```

Buka `http://localhost:5173`. Jika backend berjalan di host/port lain, ubah
`window.SITAS_API_BASE_URL` di `frontend/index.html` sebelum tag
`<script type="module" src="js/main.js">`.

Pastikan `CORS_ORIGIN` di `backend/.env` cocok dengan origin tempat frontend
disajikan (mis. `http://localhost:5173`), atau server API akan menolak
permintaan lintas-origin.

### 3. Menjalankan tes

```bash
cd backend  && npm test     # Jest + Supertest: skor, auth, CRUD atlet
cd frontend && npm install && npm test   # Jest: skor (frontend), validasi
```

---

## Apa yang berubah, dan di mana

| Permintaan | Implementasi | Lokasi |
|---|---|---|
| Ganti `localStorage` dengan database via REST API | SQLite + `better-sqlite3`, seluruh CRUD atlet/user/turnamen lewat endpoint HTTP | `backend/src/routes/*`, `frontend/js/state.js` |
| Hashing password dengan bcrypt | `bcryptjs`, salt rounds dikonfigurasi di `.env` | `backend/src/routes/auth.routes.js` |
| Sesi berbasis JWT | Access token (15 menit) + refresh token (7 hari, disimpan di tabel `refresh_tokens`, bisa dicabut) | `backend/src/routes/auth.routes.js`, `frontend/js/tokenStore.js`, `frontend/js/apiClient.js` |
| Proteksi endpoint | Middleware `requireAuth`/`requireRole` di semua route non-publik | `backend/src/middleware/auth.js` |
| Logout & reset password terintegrasi | `POST /auth/logout` mencabut refresh token; alur `forgot-password` → `reset-password` dengan token sekali-pakai 30 menit | `backend/src/routes/auth.routes.js` |
| Sanitasi input & enkripsi data sensitif | `express-validator` men-trim/normalize semua input string; password di-hash (bukan disimpan plaintext); prepared statements SQLite mencegah SQL injection | `backend/src/utils/validators.js` |
| Validasi form ketat + umpan balik real-time + pesan spesifik | Modul `validation.js` dengan skema rule per-field, dipasang pada event `blur`/`input`; pesan error backend juga per-field (`{field, message}`) | `frontend/js/validation.js`, `backend/src/utils/validators.js` |
| Refactor JS menjadi modul terstruktur | ES Modules terpisah per tanggung jawab: `constants`, `errors`, `apiClient`, `state`, `auth`, `athletes`, `dashboard`, `reports`, `users`, `notifications`, `recommendation`, `charts`, `ui`, `history`, `backup`, `score` | `frontend/js/*.js` |
| Konstanta terpusat | Satu sumber untuk bobot penilaian, kelas grade, status warna, dsb. | `frontend/js/constants.js`, `backend/src/utils/score.js` |
| Manajemen error konsisten | `ApiError` + `toUserMessage()` di frontend; `errorHandler` terpusat + `HttpError` di backend — semua respons error berformat sama | `frontend/js/errors.js`, `backend/src/middleware/errorHandler.js` |
| Penanganan chart yang aman | `safeCreateChart()` selalu men-destroy instance lama & memeriksa elemen `<canvas>` ada sebelum membuat chart baru (mencegah memory leak & crash) | `frontend/js/charts.js` |
| Integrasi History API | `pushState`/`popstate` sungguhan — tombol Back/Forward browser & deep-link (`#athletes`) berfungsi, bukan hanya array riwayat internal | `frontend/js/history.js` |
| Indikator loading | Spinner pada tombol (`setButtonLoading`) dan overlay skala-halaman (`setPageLoading`) di semua operasi async (login, simpan atlet, dsb.) | `frontend/js/ui.js` |
| Dialog konfirmasi (simpan/hapus/ekspor) | `confirmDialog()` aksesibel (role `alertdialog`, fokus terjebak, `Esc` untuk batal) menggantikan `window.confirm` bawaan; dipakai sebelum hapus atlet/user dan sebelum ekspor CSV/backup | `frontend/js/ui.js`, dipanggil dari `athletes.js`/`users.js`/`reports.js`/`backup.js` |
| Unit test & integration test | Skor (backend+frontend, konsisten silang), auth (register/login/refresh/logout/reset), CRUD atlet, validasi form | `backend/tests/*.test.js`, `frontend/tests/*.test.js` |
| Aksesibilitas (ARIA, label) | `aria-live` untuk toast & pengumuman navigasi, `role="alertdialog"` pada konfirmasi, `aria-label` pada tombol ikon, `aria-current` pada nav aktif, `<caption>`/`scope` pada tabel detail atlet | `frontend/js/ui.js`, `frontend/js/athletes.js`, `frontend/index.html` |
| Backup/restore | Ekspor seluruh data ke file JSON; impor & kirim ulang ke server dengan laporan sukses/gagal per-item | `frontend/js/backup.js` |
| Peringatan localStorage | Banner kuning eksplisit ("data dari cache lokal, mungkin tidak terkini") saat frontend gagal menghubungi server dan jatuh ke cache offline; localStorage TIDAK LAGI menjadi sumber data utama | `frontend/js/state.js`, `frontend/js/ui.js` (`showOfflineCacheWarning`) |

## Keputusan arsitektur penting

- **Markup HTML asli dipertahankan.** File `frontend/index.html` adalah hasil
  edit minimal dari file asli: satu-satunya perubahan struktural adalah
  penghapusan `<script>` monolitik lama dan penambahan
  `<script type="module" src="js/main.js">`. Ini menjaga tampilan yang sudah
  matang secara visual sekaligus memindahkan *seluruh* logika ke modul yang
  terstruktur dan dapat diuji unit test.
- **Kompatibilitas `onclick` inline.** Markup asli memakai atribut
  `onclick="showPage('athletes')"`, dll. `main.js` mengekspos fungsi-fungsi
  yang relevan ke `window` dengan nama yang identik sehingga atribut tersebut
  tetap berfungsi, sementara implementasi sesungguhnya hidup di modul ES yang
  diimpor. Migrasi bertahap ke `addEventListener` dapat dilakukan di iterasi
  berikutnya tanpa mengubah kontrak ini.
- **Access token di memori, refresh token di localStorage.** Ini adalah
  kompromi standar untuk SPA tanpa backend cookie httpOnly (lihat komentar di
  `frontend/js/tokenStore.js`). Untuk produksi, pertimbangkan memindahkan
  refresh token ke cookie httpOnly+Secure yang diterbitkan oleh backend.
- **SQLite dipakai untuk kesederhanaan setup** (`better-sqlite3`, satu file,
  tanpa server database terpisah). Skema (`backend/src/db.js`) dirancang agar
  migrasi ke PostgreSQL/MySQL relatif mudah karena semua akses lewat query
  terparameterisasi di lapisan `routes/`.

## Keterbatasan & langkah lanjutan yang disarankan

- Notifikasi (`notifications.js`) masih data statis di frontend; idealnya
  dipindah ke endpoint `/api/notifications` khusus.
- Backend belum mengirim email sungguhan untuk alur lupa password —
  `forgot-password` mengembalikan `devToken` langsung di response JSON untuk
  mempermudah pengujian tanpa layanan SMTP. Di produksi, kirim token ini lewat
  email dan jangan pernah mengembalikannya di response.
- Rate limiting bersifat dasar (`express-rate-limit`, in-memory) — cukup
  untuk single-instance, perlu Redis-backed store untuk deployment multi-node.
- Foto profil atlet masih dikirim sebagai base64 di JSON (mengikuti desain
  asli). Untuk skala produksi, pindahkan ke penyimpanan objek (S3, dsb.) dan
  simpan URL saja.
