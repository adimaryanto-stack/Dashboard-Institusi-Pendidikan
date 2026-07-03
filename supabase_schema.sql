-- ============================================================
-- SCHEMA DDL - Dasbor Institusi Pendidikan Transparansi Anggaran
-- ============================================================

-- 1. Tabel Tahun Anggaran
CREATE TABLE IF NOT EXISTS public.tahun_anggaran (
    id TEXT PRIMARY KEY,
    tahun INT UNIQUE NOT NULL,
    total_anggaran BIGINT NOT NULL,
    status TEXT CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Provinsi
CREATE TABLE IF NOT EXISTS public.provinsi (
    id TEXT PRIMARY KEY,
    kode_provinsi TEXT NOT NULL,
    nama_provinsi TEXT NOT NULL
);

-- 3. Tabel Alokasi Provinsi
CREATE TABLE IF NOT EXISTS public.alokasi_provinsi (
    id TEXT PRIMARY KEY,
    tahun_anggaran_id TEXT REFERENCES public.tahun_anggaran(id) ON DELETE CASCADE,
    provinsi_id TEXT REFERENCES public.provinsi(id) ON DELETE CASCADE,
    nominal_alokasi BIGINT NOT NULL,
    realisasi_total BIGINT NOT NULL,
    selisih BIGINT NOT NULL,
    persentase_penyerapan NUMERIC NOT NULL,
    updated_at TEXT NOT NULL
);

-- 4. Tabel Kabupaten/Kota
CREATE TABLE IF NOT EXISTS public.kabupaten_kota (
    id TEXT PRIMARY KEY,
    provinsi_id TEXT REFERENCES public.provinsi(id) ON DELETE CASCADE,
    kode_kabupaten_kota TEXT NOT NULL,
    nama_kabupaten_kota TEXT NOT NULL,
    tipe TEXT CHECK (tipe IN ('KABUPATEN', 'KOTA')) NOT NULL
);

-- 5. Tabel Alokasi Kabupaten/Kota
CREATE TABLE IF NOT EXISTS public.alokasi_kabupaten_kota (
    id TEXT PRIMARY KEY,
    alokasi_provinsi_id TEXT REFERENCES public.alokasi_provinsi(id) ON DELETE CASCADE,
    kabupaten_kota_id TEXT REFERENCES public.kabupaten_kota(id) ON DELETE CASCADE,
    provinsi_nama TEXT NOT NULL,
    nominal_alokasi BIGINT NOT NULL,
    realisasi_total BIGINT NOT NULL,
    selisih BIGINT NOT NULL,
    persentase_penyerapan NUMERIC NOT NULL,
    updated_at TEXT NOT NULL
);

-- 6. Tabel Institusi Pendidikan
CREATE TABLE IF NOT EXISTS public.institusi_pendidikan (
    id TEXT PRIMARY KEY,
    npsn TEXT UNIQUE NOT NULL,
    nama_institusi TEXT NOT NULL,
    jenjang TEXT CHECK (jenjang IN ('UNIVERSITAS', 'SMA', 'SMP', 'SD', 'PAUD')) NOT NULL,
    kabupaten_kota_id TEXT REFERENCES public.kabupaten_kota(id) ON DELETE SET NULL,
    kabupaten_kota_nama TEXT NOT NULL,
    provinsi_nama TEXT NOT NULL,
    status_sekolah TEXT CHECK (status_sekolah IN ('NEGERI', 'SWASTA')) NOT NULL,
    nomor_rekening TEXT,
    alamat TEXT,
    nominal_alokasi BIGINT NOT NULL,
    realisasi_total BIGINT NOT NULL,
    selisih BIGINT NOT NULL,
    persentase_penyerapan NUMERIC NOT NULL,
    updated_at TEXT NOT NULL
);

-- 7. Tabel Sumber Dana Institusi
CREATE TABLE IF NOT EXISTS public.sumber_dana_institusi (
    id TEXT PRIMARY KEY,
    institusi_id TEXT REFERENCES public.institusi_pendidikan(id) ON DELETE CASCADE,
    nama_sumber TEXT NOT NULL,
    tahun_anggaran TEXT NOT NULL,
    nominal BIGINT NOT NULL,
    realisasi BIGINT NOT NULL,
    saldo_di_bank BIGINT NOT NULL
);

-- 8. Tabel Pengeluaran Bulanan Institusi
CREATE TABLE IF NOT EXISTS public.pengeluaran_bulanan_institusi (
    id TEXT PRIMARY KEY,
    institusi_id TEXT REFERENCES public.institusi_pendidikan(id) ON DELETE CASCADE,
    nomor INT NOT NULL,
    bulan TEXT NOT NULL,
    nominal_pengeluaran BIGINT NOT NULL,
    qty INT NOT NULL,
    sub_total BIGINT NOT NULL
);

-- 9. Tabel Rincian Pengeluaran Item
CREATE TABLE IF NOT EXISTS public.rincian_pengeluaran_item (
    id TEXT PRIMARY KEY,
    institusi_id TEXT REFERENCES public.institusi_pendidikan(id) ON DELETE CASCADE,
    nomor_bulan INT NOT NULL,
    nomor INT NOT NULL,
    nama_produk_jasa TEXT NOT NULL,
    harga_satuan BIGINT NOT NULL,
    qty INT NOT NULL,
    jumlah BIGINT NOT NULL
);

-- 10. Tabel Users
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    provinsi_id TEXT,
    kabupaten_kota_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL
);

-- 11. Tabel Audit Anomaly
CREATE TABLE IF NOT EXISTS public.audit_anomaly (
    id TEXT PRIMARY KEY,
    institusi_id TEXT REFERENCES public.institusi_pendidikan(id) ON DELETE CASCADE,
    nama_institusi TEXT NOT NULL,
    jenjang TEXT NOT NULL,
    bulan TEXT NOT NULL,
    nomor_bulan INT NOT NULL,
    tipe_anomali TEXT NOT NULL,
    keterangan TEXT NOT NULL,
    nominal_selisih BIGINT NOT NULL,
    tingkat_keparahan TEXT CHECK (tingkat_keparahan IN ('LOW', 'MEDIUM', 'HIGH')) NOT NULL,
    status TEXT CHECK (status IN ('TEMUAN', 'INVESTIGASI', 'SELESAI')) NOT NULL,
    tanggal_ditemukan TEXT NOT NULL,
    audit_what TEXT,
    audit_why TEXT,
    audit_where TEXT,
    audit_when TEXT,
    audit_who TEXT,
    audit_how TEXT
);

-- Buka akses RLS (Row Level Security) untuk akses anon baca
ALTER TABLE public.tahun_anggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provinsi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alokasi_provinsi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kabupaten_kota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alokasi_kabupaten_kota ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institusi_pendidikan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sumber_dana_institusi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran_bulanan_institusi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rincian_pengeluaran_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_anomaly ENABLE ROW LEVEL SECURITY;

-- Buat policy baca anonim
CREATE POLICY "Allow public read access" ON public.tahun_anggaran FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.provinsi FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.alokasi_provinsi FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.kabupaten_kota FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.alokasi_kabupaten_kota FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.institusi_pendidikan FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.sumber_dana_institusi FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.pengeluaran_bulanan_institusi FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.rincian_pengeluaran_item FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.audit_anomaly FOR SELECT USING (true);

-- Buat policy insert anonim (untuk migrasi data awal)
CREATE POLICY "Allow public insert access" ON public.tahun_anggaran FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.provinsi FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.alokasi_provinsi FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.kabupaten_kota FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.alokasi_kabupaten_kota FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.institusi_pendidikan FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.sumber_dana_institusi FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.pengeluaran_bulanan_institusi FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.rincian_pengeluaran_item FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access" ON public.audit_anomaly FOR INSERT WITH CHECK (true);

-- 12. Tabel Diskusi RAB (Rencana Anggaran Belanja)
CREATE TABLE IF NOT EXISTS public.diskusi_rab (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_pengirim TEXT NOT NULL DEFAULT 'Warga Anonim',
    pesan TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.diskusi_rab ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON public.diskusi_rab FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.diskusi_rab FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON public.diskusi_rab FOR DELETE USING (true);

-- Enable Realtime for diskusi_rab
ALTER PUBLICATION supabase_realtime ADD TABLE public.diskusi_rab;
