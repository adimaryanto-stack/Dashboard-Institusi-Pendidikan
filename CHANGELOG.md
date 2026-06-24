# Changelog — Dashboard Institusi 🇮🇩

Semua perubahan penting pada proyek **Dashboard Institusi** akan dicatat di dokumen ini.

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
- **Penyelarasan Nama Proyek**: Mengubah nama proyek secara global dari "Dashboard Institusi Pendidikan" menjadi **Dashboard Institusi** sesuai dengan spesifikasi terbaru.
- **Pembaruan Dokumen PRD & MVP**: Memperbarui status pengerjaan seluruh modul fitur menjadi 100% selesai (`[x]`) dan menaikkan versi dokumen ke versi final stable.

---

## [0.5.0] - 2026-05-15
### Added
- **Integrasi Cloud Supabase**: Menambahkan opsi sinkronisasi data dua arah dengan cloud database Supabase/InsForge.
- **OCR Scanner Kuitansi**: Mengintegrasikan `tesseract.js` untuk membaca kuitansi/invoice belanja dan parser regex pintar untuk mencocokkan total belanja secara otomatis.
- **Audit Anomaly Detector**: Menambahkan algoritma deteksi transaksi janggal (e.g. markup harga, duplikasi transaksi, anomali pajak) beserta dashboard visualisasinya.

---

## [0.1.0] - 2026-04-10
### Added
- **Kerangka Utama Next.js**: Menginisialisasi proyek Next.js 16 (App Router) dengan Tailwind CSS v4.
- **Spreadsheet-like Table**: Membuat komponen tabel interaktif bergaya spreadsheet dengan kemampuan inline editing, validasi tipe data, dan cascade calculation (kalkulasi berjenjang otomatis dari institusi -> kota -> provinsi).
- **Glassmorphism UI**: Mendesain tema UI gelap/terang premium dengan efek frosted glass yang responsif.
- **Zustand Store**: Manajemen state terpusat untuk transaksional, rencana anggaran, simulasi tahun anggaran, dan notifikasi.
