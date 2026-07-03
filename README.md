# Dashboard Institusi Pendidikan 🇮🇩

Sistem informasi modern bergaya *spreadsheet* untuk pemantauan, alokasi, transparansi, dan audit Anggaran Pendapatan dan Belanja Negara (APBN) di sektor Pendidikan Indonesia.

Aplikasi ini menyajikan *dashboard* dengan performa tinggi yang memungkinkan instansi terkait (mulai dari tingkat nasional hingga daerah) memantau alokasi vs realisasi anggaran secara berjenjang dan *real-time*, serta terhubung sepenuhnya ke cloud database **Supabase**.

---

## 📸 Tangkapan Layar Aplikasi

### 1. Dasbor Utama (Ringkasan APBN)
![Dasbor Utama](public/screenshot-dashboard.png)

### 2. Papan Rencana Anggaran Belanja (RAB) & Diskusi Realtime
![Rencana Anggaran & Diskusi Realtime](public/screenshot-rencana-anggaran.png)

### 3. Alokasi Per Provinsi (Spreadsheet Interface)
![Alokasi Provinsi](public/screenshot-provinsi.png)

---

## ✨ Fitur Utama

- **Navigasi Berjenjang (Hierarki)**: Pemantauan dana mulai dari **APBN Nasional ➔ Provinsi ➔ Kabupaten/Kota ➔ Jenjang Pendidikan** (Universitas, SMA, SMP, SD, PAUD).
- **Antarmuka Bergaya Spreadsheet**:
  - Input data nominal dan realisasi secara langsung *(inline editing)*.
  - Perhitungan **Selisih** dan **Persentase Penyerapan** otomatis (kaskade) dari bawah ke atas.
- **Visualisasi Data**: *Dashboard* analitik dengan metrik utama dan grafik tren tahunan menggunakan *Recharts*.
- **Mutasi Rekening**: Halaman pemantauan mutasi rekening Bank BRI dengan rekapitulasi saldo, NPSN, dan nomor rekening.
- **Daftar Pengeluaran Riil**: Pencatatan dan pemantauan seluruh transaksi pengeluaran belanja operasional sekolah, terfilter per institusi.
- **Audit Anomaly Detector (AI)**: Algoritma deteksi transaksi janggal (markup harga, duplikasi, anomali pajak) terintegrasi Gemini AI.
- **OCR Scanner Kuitansi**: Membaca kuitansi/invoice belanja menggunakan `tesseract.js` untuk pencocokan otomatis.
- **Desain Modern (Glassmorphism)**: UI/UX premium dengan *Light Mode*, efek *frosted glass* (transparan-blur), serta aksen warna yang halus.
- **Manajemen Pengguna (RBAC)**: *Role-Based Access Control* dengan kontrol status aktif/non-aktif, tersinkronisasi ke Supabase.
- **Integrasi Cloud Supabase**: Seluruh data (institusi, transaksi, pengguna, anomali audit) terhubung dan tersinkronisasi secara dua arah ke cloud database Supabase (PostgreSQL).

---

## 🛠️ Stack Teknologi

| Kategori | Teknologi |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) & React 19 |
| **Bahasa** | TypeScript (Strict Typing) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) dengan arsitektur variabel berbasis `@theme` |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL + Realtime + RLS) |
| **Ikon & Grafik** | Lucide React & Recharts |
| **OCR** | Tesseract.js |
| **Font** | Inter (Google Fonts) |
| **Hosting** | [Vercel](https://vercel.com/) |

---

## 📂 Struktur Proyek

```text
dashboard-institusi-pendidikan/
├── app/                       # Next.js App Router (Halaman & Layout)
│   ├── api/                   # API Routes (chat-gemini, import-supabase)
│   ├── dashboard/             # Halaman utama aplikasi
│   │   ├── apbn/              # Ringkasan APBN Nasional
│   │   ├── audit/             # Audit Anomaly Detector (AI)
│   │   ├── jenjang/           # Breakdown per Jenjang Pendidikan
│   │   ├── kabupaten-kota/    # Alokasi per Kabupaten/Kota
│   │   ├── mutasi-rekening/   # Mutasi Rekening Bank BRI
│   │   ├── pengeluaran/       # Daftar Pengeluaran Riil
│   │   ├── profil-institusi/  # Profil Detail Sekolah
│   │   ├── provinsi/          # Alokasi per Provinsi
│   │   ├── rencana-anggaran/  # Rencana Anggaran Belanja (RAB)
│   │   └── users/             # Manajemen Pengguna (RBAC)
│   ├── globals.css            # Root stylesheet (Tailwind v4 tokens)
│   └── layout.tsx             # Root layout (Provider & Font)
├── components/                # Komponen UI Reusable
│   ├── layout/                # Sidebar, Header, DashboardDbLoader
│   └── ui/                    # PctBadge, StatusBadge, MetricCard, dll.
├── lib/                       # Utilitas dan Data
│   ├── data/                  # Data generator & mock data
│   ├── store.ts               # Global state (Zustand)
│   ├── supabase.ts            # Supabase client initialization
│   └── utils.ts               # Format mata uang, persentase, class merger
├── scripts/                   # Script utilitas (import-to-supabase)
├── PRD/                       # Kumpulan Product Requirements Document
├── types/                     # Definisi tipe data TypeScript (Interface)
├── supabase_schema.sql        # DDL Skema Database Supabase
└── package.json               # Dependencies & scripts
```

---

## 🚀 Memulai Pengembangan (Development)

Pastikan Anda memiliki [Node.js](https://nodejs.org/) (versi 18+ disarankan) terinstal di sistem Anda.

### 1. Clone repository ini
```bash
git clone https://github.com/adimaryanto-stack/Dashboard-Institusi-Pendidikan.git
cd Dashboard-Institusi-Pendidikan
```

### 2. Install dependencies
```bash
npm install
```

### 3. Konfigurasi Environment Variables
Buat file `.env` di root proyek dengan variabel berikut:
```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
GEMINI_API_KEY=<your-gemini-api-key>
```

### 4. Setup Database Supabase
Jalankan skema SQL di `supabase_schema.sql` melalui Supabase SQL Editor, lalu lakukan sinkronisasi data awal melalui dashboard aplikasi (tombol "Sinkronkan Data ke Supabase").

### 5. Jalankan Development Server
```bash
npm run dev
```

### 6. Akses Aplikasi
Buka [http://localhost:3002](http://localhost:3002) di browser Anda. Halaman utama adalah rute `/dashboard`.

---

## 🌐 Deployment

Aplikasi ini di-deploy ke **Vercel** dan tersedia di:

🔗 **Production**: [https://dashboard-institusi-pendidikan.vercel.app](https://dashboard-institusi-pendidikan.vercel.app)

Untuk deploy manual:
```bash
npx vercel --prod
```

Pastikan environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`) sudah dikonfigurasi di Vercel Dashboard → Settings → Environment Variables.

---

## 📖 Dokumentasi Lengkap & Riwayat Rilis

- **[`PRD/MASTER_PRD.md`](./PRD/MASTER_PRD.md)** — Dokumen Persyaratan Produk (PRD) Konsolidasi.
- **[`PRD/MVP_Roadmap_v2_Spreadsheet.md`](./PRD/MVP_Roadmap_v2_Spreadsheet.md)** — Roadmap Pengembangan MVP Fitur Spreadsheet.
- **[`CHANGELOG.md`](./CHANGELOG.md)** — Catatan lengkap rilis versi dan daftar perubahan fitur.
- **[`supabase_schema.sql`](./supabase_schema.sql)** — DDL Skema Database Supabase.

---

## 🛡️ Lisensi & Kepemilikan

Proyek ini merupakan purwarupa (*prototype*) untuk inisiatif transparansi anggaran pendidikan. Dikembangkan untuk keperluan internal instansi terkait.
