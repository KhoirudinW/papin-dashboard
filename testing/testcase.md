# Test Case PAPin Dashboard

Dokumen ini berisi test case manual untuk fitur auth, register 2 tahap, profile setup, pairing, notifikasi, dan manajemen email.

## Environment
- App berjalan di mode development/production yang terhubung ke Supabase project aktif.
- Migration pairing sudah dijalankan (`20260228_add_pairing_requests_and_relax_auth_links.sql`).
- Redirect URL verifikasi email sudah mengizinkan `/register/profile`.

## Daftar Test Case

| ID | Fitur | Skenario | Langkah Uji | Hasil yang Diharapkan |
|---|---|---|---|---|
| TC-001 | Register Tahap 1 | Buat akun baru valid | Buka `/register`, isi email valid + password >= 6, klik `Buat Akun` | Akun auth dibuat, muncul info cek email verifikasi |
| TC-002 | Register Tahap 1 | Email format invalid | Isi email invalid (tanpa `@`) lalu `Buat Akun` | Muncul error format email |
| TC-003 | Register Tahap 1 | Password kurang dari 6 | Isi password 3 karakter lalu `Buat Akun` | Muncul error password minimal 6 |
| TC-004 | Register Tahap 1 | Email placeholder | Isi email `abc@example.com`, klik `Buat Akun` | Muncul error email placeholder ditolak |
| TC-005 | Register Tahap 1 | Email sudah terdaftar | Pakai email existing, klik `Buat Akun` | Muncul error email sudah terdaftar |
| TC-006 | Verifikasi Email | Link verifikasi redirect | Klik link verifikasi dari email | User diarahkan ke `/register/profile` |
| TC-007 | Verifikasi Email | Cek status setelah verifikasi | Di `/register/profile`, klik `Saya Sudah Verifikasi` dengan email/password benar | Status akun jadi verified, tahap setup profile terbuka |
| TC-008 | Verifikasi Email | Belum verifikasi tapi klik lanjut | Klik `Saya Sudah Verifikasi` sebelum klik link email | Muncul error email belum diverifikasi |
| TC-009 | Setup Profile Solo | Buat 1 profile setelah verified | Pilih mode solo, isi data wajib, centang persetujuan, submit | 1 row profile dibuat, user diarahkan ke dashboard |
| TC-010 | Setup Profile Berdua | Buat 2 profile setelah verified | Pilih mode berdua, isi data user+pasangan, submit | 2 row profile dibuat + pair terbentuk + pair code muncul |
| TC-011 | Setup Profile Berdua | Validasi gender berlawanan | User 1 pilih `A`, coba set pasangan juga `A` | Ditolak, muncul validasi role/gender pasangan harus kebalikan |
| TC-012 | Setup Profile | Cegah duplikasi setup profile | Akun verified yang sudah punya profile melakukan submit setup lagi | Ditolak dengan pesan akun sudah punya profile |
| TC-013 | Login Password | Login pakai email | Masuk `/login`, metode password, isi email+password benar | Login sukses, redirect ke `/dashboard` |
| TC-014 | Login Password | Login pakai username | Metode password, isi username profile + password benar | Login sukses, redirect ke `/dashboard` |
| TC-015 | Login Password | Username tidak unik | Buat kondisi username duplikat, login via username | Ditolak, diminta pakai email |
| TC-016 | Login Pair Code | Login pair code valid | Pilih metode pair code, isi identifier + pair code benar | Login sukses ke dashboard |
| TC-017 | Login Pair Code | Pair code salah | Isi pair code salah | Ditolak dengan pesan pair code tidak valid |
| TC-018 | Profile Email | Tambah email saat login pair code | Login pair code, buka profile, isi email, simpan | `user_profiles.email` terupdate, pesan sukses profile-only |
| TC-019 | Profile Email | Buat akun login dari profile | Login pair code, isi email + password + konfirmasi, klik `Buat Akun Login` | Auth user dibuat, `auth_user_id` profile terisi |
| TC-020 | Profile Email | Ganti email saat login password | Login password, ubah email di profile, klik simpan | Email auth ter-update, status verifikasi jadi pending (jika email baru) |
| TC-021 | Profile Email | Status verifikasi tampil | Buka panel email profile saat login password | Badge status sesuai `email_confirmed_at` |
| TC-022 | Pairing Request | Kirim request saat belum punya pasangan | Dari security page, kirim pairing request ke target valid | Request pending terbentuk |
| TC-023 | Pairing Request | Blokir kirim saat sudah punya pasangan | User yang sudah `pair_id` mencoba kirim pairing request | Ditolak dengan pesan sudah terhubung pasangan |
| TC-024 | Pairing Notification | Incoming request muncul | User target buka navbar notifikasi | Notif pairing pending tampil (jika belum punya pasangan) |
| TC-025 | Pairing Notification | Approve pairing | Target klik approve | Pair terbentuk, kedua profile terhubung ke pair baru |
| TC-026 | Pairing Notification | Reject pairing | Target klik reject | Status request jadi rejected |
| TC-027 | Pairing Notification | Hide pairing notif saat sudah punya pasangan | User sudah punya pasangan buka notifikasi | Section pairing tidak dimuat/ditampilkan |
| TC-028 | Notifikasi Baru | Badge unread/update | Buat request baru atau update status request lalu buka navbar | Badge naik sesuai notifikasi baru |
| TC-029 | Notifikasi Baru | Mark as seen | Tutup panel notifikasi | Badge unread berkurang/reset sesuai item yang sudah dilihat |
| TC-030 | Pair Code Change | Request dan respond pair code | Buat request ganti pair code lalu approve pasangan | Status approved, pair code user ter-update |
| TC-031 | Error Handling | Koneksi internet putus saat login | Matikan internet, klik login | Muncul pesan koneksi/server, bukan crash page |
| TC-032 | Error Handling | Schema pairing belum ada | Jalankan app tanpa migration pairing lalu buka notif pairing | Muncul pesan schema pairing belum tersedia (bukan generic) |

## Data Uji Disarankan
- `email_user_a`: email valid baru
- `email_user_b`: email valid baru
- `password_valid`: minimal 6 karakter
- `username_unique`: username unik
- `username_duplicate`: username yang sengaja diduplikasi
- `pair_code_valid`: pair code dari proses register/pairing

## Catatan Eksekusi
- Untuk test verifikasi email, gunakan inbox yang bisa diakses tester.
- Untuk test duplicate username, siapkan data profile dengan username sama.
- Untuk test network error, gunakan mode offline browser/devtools.

## UI/UX Automation Test Cases (Login + Register)

Bagian ini dibuat khusus agar bisa di-automate oleh AI/browser agent. Versi machine-readable ada di `testing/testcase-uiux.json`.

### Selector Strategy (disarankan)
- Prioritas selector: `getByRole` -> `getByLabel` -> `getByPlaceholder` -> fallback CSS.
- Hindari selector berbasis class Tailwind karena mudah berubah.
- Untuk alert/error, tangkap browser dialog (`page.on("dialog")`) karena komponen memakai `alert(...)`.

### Matrix UI/UX

| ID | Fokus | Route | Precondition | Langkah Uji Otomasi | Hasil yang Diharapkan |
|---|---|---|---|---|---|
| UIUX-001 | Render login desktop | `/login` | Viewport `1440x900`, user belum login | Buka `/login` | Header `Login`, field `Email / Username`, tombol `Masuk Ke Dashboard`, tab `LOGIN/REGISTER` terlihat |
| UIUX-002 | Render login mobile | `/login` | Viewport `375x812`, user belum login | Buka `/login`, cek `document.body.scrollWidth <= window.innerWidth` | Tidak ada horizontal overflow; form tetap terbaca |
| UIUX-003 | Switch metode login ke password | `/login` | Halaman login terbuka | Klik `With passwords` | Label field kedua berubah ke `Password`, placeholder sesuai password |
| UIUX-004 | Switch metode kembali ke pair code | `/login` | Metode saat ini `password` | Klik `With pair code` | Label field kedua berubah ke `Pair Code` |
| UIUX-005 | Pair code otomatis uppercase | `/login` | Metode `pair_code` aktif | Isi `ab12cd` pada field pair code | Nilai input menjadi `AB12CD` |
| UIUX-006 | Toggle show/hide password | `/login` | Metode `password` aktif | Klik ikon mata 2x | `type` input berubah `password -> text -> password` |
| UIUX-007 | Error feedback login gagal | `/login` | Stub auth mengembalikan `{ success: false, error: "invalid credential" }` | Klik login dengan input valid dummy | Muncul dialog alert berisi pesan error |
| UIUX-008 | Loading state tombol login | `/login` | Stub auth delay 1-2 detik | Klik login | Tombol berubah ke `Authenticating...` lalu kembali normal |
| UIUX-009 | Navigasi ke register | `/login` | Halaman login terbuka | Klik tab `REGISTER` | URL menjadi `/register`; header berubah `Register` |
| UIUX-010 | Tahap 1 register default | `/register` | Auth stage awal belum verifikasi | Buka `/register` | Badge `Belum Buat Akun` muncul; tombol `Buat Akun` dan `Saya Sudah Verifikasi` aktif |
| UIUX-011 | Feedback sukses buat akun | `/register` | Stub `createAuthAccount` sukses + `requiresEmailConfirmation=true` | Isi email/password, klik `Buat Akun` | Alert instruksi cek email verifikasi muncul |
| UIUX-012 | Guard verifikasi sebelum setup | `/register` | Stub loginForSetup gagal (belum verifikasi) | Klik `Saya Sudah Verifikasi` | Alert error tampil; tahap 2 belum muncul |
| UIUX-013 | Tahap 2 muncul setelah verified | `/register` | Stub auth stage `verified` | Render ulang halaman | Bagian `Tahap 2 - Setup Profile` tampil |
| UIUX-014 | Switch mode pair vs solo | `/register` | Tahap 2 aktif (`verified`) | Klik mode berdua lalu solo | CTA berubah dari `Daftar Berdua` ke `Daftar Sekarang` |
| UIUX-015 | Lock gender pasangan otomatis | `/register` | Mode `pair_now`, role `you` memilih gender `A` | Klik lanjut ke data pasangan | Field gender pasangan terkunci ke `Perempuan` (`B`) |
| UIUX-016 | Checkbox agreement gating submit | `/register` | Posisi di step submit (`solo` atau `partner`) | Observe tombol submit sebelum/sesudah centang checkbox | Tombol disabled saat belum centang, enabled saat sudah centang |
| UIUX-017 | Tooltip privacy muncul | `/register` | Posisi step submit | Hover area persetujuan kebijakan privasi | Popover `Privacy Summary` terlihat |
| UIUX-018 | Redirect user bersesi ke dashboard | `/login` | Mock `supabase.auth.getSession()` mengembalikan session valid | Buka `/login` | Router melakukan redirect ke `/dashboard` |

### Catatan Implementasi Automation
- Case `UIUX-007`, `UIUX-008`, `UIUX-011`, `UIUX-012`, `UIUX-013`, `UIUX-018` lebih stabil jika memakai mock/stub hook agar deterministik.
- Untuk visual regression, ambil screenshot baseline minimal pada state: `login pair_code`, `login password`, `register tahap 1`, `register tahap 2`.
