-- ============================================================
-- SCHEMA DDL - Modul RAB & Dokumentasi Paket Project
-- ============================================================

-- 1. Tabel Projects (Paket Project)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    nama_paket TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    tanggal_mulai TEXT NOT NULL,
    tanggal_selesai TEXT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'berjalan', 'selesai', 'arsip')) NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL DEFAULT 'admin.sd01menteng',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Project Photos (Dokumentasi Foto per Tahap)
CREATE TABLE IF NOT EXISTS public.project_photos (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    tahap TEXT CHECK (tahap IN ('pra_produksi', 'produksi', 'pasca_produksi')) NOT NULL,
    file_url TEXT NOT NULL,
    caption TEXT NOT NULL,
    tanggal_ambil TEXT NOT NULL,
    uploaded_by TEXT NOT NULL DEFAULT 'admin.sd01menteng',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabel Project Expenses (Rincian RAB / Pengeluaran + Pajak)
CREATE TABLE IF NOT EXISTS public.project_expenses (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    tahap TEXT CHECK (tahap IN ('pra_produksi', 'produksi', 'pasca_produksi')) NOT NULL,
    nama_item TEXT NOT NULL,
    jumlah INT NOT NULL DEFAULT 1,
    satuan TEXT NOT NULL DEFAULT 'pcs',
    harga_satuan BIGINT NOT NULL DEFAULT 0,
    subtotal BIGINT NOT NULL DEFAULT 0,
    jenis_pajak TEXT CHECK (jenis_pajak IN ('tanpa_pajak', 'ppn', 'pph21', 'pph23', 'lainnya')) NOT NULL DEFAULT 'tanpa_pajak',
    persentase_pajak INT NOT NULL DEFAULT 0,
    nilai_pajak BIGINT NOT NULL DEFAULT 0,
    total_setelah_pajak BIGINT NOT NULL DEFAULT 0,
    bukti_file_url TEXT,
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabel Project Vendors (Data Vendor & PIC)
CREATE TABLE IF NOT EXISTS public.project_vendors (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    nama_vendor TEXT NOT NULL,
    kontak_vendor TEXT NOT NULL,
    nama_pic_internal TEXT NOT NULL,
    kontak_pic_internal TEXT NOT NULL,
    nilai_anggaran_kontrak BIGINT NOT NULL DEFAULT 0,
    jenis_pajak_kontrak TEXT CHECK (jenis_pajak_kontrak IN ('tanpa_pajak', 'ppn', 'pph21', 'pph23', 'lainnya')) NOT NULL DEFAULT 'tanpa_pajak',
    persentase_pajak_kontrak INT NOT NULL DEFAULT 0,
    nilai_pajak_kontrak BIGINT NOT NULL DEFAULT 0,
    nilai_kontrak_setelah_pajak BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_vendors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.projects FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.projects FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.project_photos FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.project_photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.project_photos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.project_photos FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.project_expenses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.project_expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.project_expenses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.project_expenses FOR DELETE USING (true);

CREATE POLICY "Allow public read access" ON public.project_vendors FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.project_vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.project_vendors FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access" ON public.project_vendors FOR DELETE USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_vendors;
