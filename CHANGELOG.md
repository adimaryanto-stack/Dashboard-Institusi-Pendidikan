# Changelog 📋 Dashboard Institusi Pendidikan

Semua perubahan penting pada proyek **Dashboard Institusi Pendidikan** akan dicatat di dokumen ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.0.0/).

---

## [2.0.0] - 2026-07-03

### Added
- **Halaman Mutasi Rekening**: Menambahkan side menu dan halaman "Mutasi Rekening" dengan info Saldo Rekapitulasi di Bank BRI, NPSN, dan No. Rekening Bank.
- **Kolom `institusi_id` di Tabel Users**: Menambahkan relasi antara user dan institusi pendidikan di database Supabase.
- **Reaktivitas Penuh Zustand ↔ Supabase**: Seluruh halaman dashboard (Pengeluaran, RAB, Audit, Profil, Provinsi, Kabupaten, Jenjang, Mutasi Rekening, User Manager) kini reaktif terhadap data Supabase via Zustand store.
- **Notifikasi Dinamis**: Notifikasi kini dihasilkan secara dinamis berdasarkan data `audit_anomaly` dari Supabase.
- **CRUD User Manager → Supabase**: Operasi tambah, edit, toggle aktif, dan hapus user di halaman User Manager kini tersinkronisasi langsung ke tabel `users` di Supabase.
- **Sidebar Profil Dinamis**: Footer sidebar menampilkan username dan email pengguna aktif secara dinamis dari data Supabase.

### Removed
- **Penghapusan InsForge**: Seluruh referensi, konfigurasi, dan kode terkait InsForge telah dihapus sepenuhnya dari codebase (`AGENTS.md`, `.env.local`, `lib/supabase.ts`). Koneksi database sekarang langsung ke Supabase standar.
- **Penghapusan NISN**: Kolom `nisn` dihapus dari skema database, tipe TypeScript, mock data generator, dan tampilan UI profil institusi.
- **Pembersihan Dummy Data Users**: 8 user dummy bawaan dihapus dari kode dan database, diganti dengan 1 user resmi SDN 01 Menteng.
- **Pembersihan Notifikasi Statis**: Notifikasi dummy bawaan dihilangkan dari Zustand store.

### Fixed
- **Filter Pengeluaran per Institusi**: Halaman Daftar Pengeluaran Riil kini hanya menampilkan transaksi milik sekolah yang bersangkutan (SDN 01 Menteng), bukan seluruh 1000 transaksi kumulatif dari semua institusi.
- **Filter Transaksi Profil Detail**: Profil detail sekolah kini memfilter transaksi berdasarkan `institusiId`, menghindari penampilan data sekolah lain.
- **Perhitungan Saldo Surplus/Defisit**: Ditambahkan dependency `transaksiList` ke perhitungan profil detail agar saldo dan total realisasi ter-update setelah data Supabase selesai dimuat.
- **Supabase Client**: Menyederhanakan inisialisasi Supabase client dengan menghapus interceptor fetch yang sebelumnya me-route ke proxy InsForge.

### Changed
- **Bank Himbara → Bank BRI**: Seluruh referensi "Bank Himbara" dan "BANK MANDIRI" pada halaman Mutasi Rekening diubah menjadi "Bank BRI" / "BANK BRI".
- **Audit AI Gateway**: Pesan pemindaian audit kini merujuk ke Gemini AI Gateway (bukan InsForge AI Gateway).
- **README.md**: Pembaruan menyeluruh dokumentasi proyek — menambahkan fitur baru, stack teknologi lengkap, struktur proyek terkini, panduan deployment Vercel, dan konfigurasi environment variables.
- **Versi package.json**: Dinaikkan ke `2.0.0`.

---

## [1.0.0] - 2026-06-24

### Added
- **Diskusi RAB Realtime**: Menambahkan fitur papan komentar realtime pada halaman Rencana Anggaran Belanja (RAB) menggunakan subscription tabel `diskusi_rab` di Supabase.
- **Skema Diskusi RAB**: Menambahkan skema tabel `diskusi_rab` ke `supabase_schema.sql` beserta kebijakan RLS (Row Level Security) dan pengaktifan publikasi realtime.
- **Screenshots Riil**: Menambahkan tangkapan layar asli aplikasi dari localhost ke `README.md`.

### Fixed
- **Perbaikan Supabase Loader**: Memperbaiki bug di `DashboardDbLoader.tsx` di mana relation object `provinsi` tidak ter-enrich saat memuat data dari cloud database Supabase, menyebabkan crash `TypeError` pada halaman Provinsi.
- **Sinkronisasi Tipe Data**: Memastikan nominal alokasi, realisasi, dan selisih ter-casting menjadi tipe data `number` yang valid di Supabase mode.

### Changed
- **Penyelarasan Nama Proyek**: Mengubah nama proyek secara global sesuai dengan spesifikasi terbaru.
- **Pembaruan Dokumen PRD & MVP**: Memperbarui status pengerjaan seluruh modul fitur menjadi 100% selesai dan menaikkan versi dokumen ke versi final stable.

---

## [0.5.0] - 2026-05-15

### Added
- **Integrasi Cloud Supabase**: Menambahkan opsi sinkronisasi data dua arah dengan cloud database Supabase.
- **OCR Scanner Kuitansi**: Mengintegrasikan `tesseract.js` untuk membaca kuitansi/invoice belanja dan parser regex pintar untuk mencocokkan total belanja secara otomatis.
- **Audit Anomaly Detector**: Menambahkan algoritma deteksi transaksi janggal (e.g. markup harga, duplikasi transaksi, anomali pajak) beserta dashboard visualisasinya.

---

## [0.1.0] - 2026-04-10

### Added
- **Kerangka Utama Next.js**: Menginisialisasi proyek Next.js 16 (App Router) dengan Tailwind CSS v4.
- **Spreadsheet-like Table**: Membuat komponen tabel interaktif bergaya spreadsheet dengan kemampuan inline editing, validasi tipe data, dan cascade calculation (kalkulasi berjenjang otomatis dari institusi → kota → provinsi).
- **Glassmorphism UI**: Mendesain tema UI premium dengan efek frosted glass yang responsif.
- **Zustand Store**: Manajemen state terpusat untuk transaksional, rencana anggaran, simulasi tahun anggaran, dan notifikasi.
