// ============================================
// Types — Sistem Transparansi Anggaran Pendidikan
// ============================================

export type BudgetStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type Jenjang = 'UNIVERSITAS' | 'SMA' | 'SMP' | 'SD' | 'PAUD';
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ADMIN_PROVINSI' | 'ADMIN_KABKOTA' | 'VIEWER' | 'AUDITOR';

export interface TahunAnggaran {
  id: string;
  tahun: number;
  total_anggaran: number;
  status: BudgetStatus;
  created_at: string;
}

export interface Provinsi {
  id: string;
  kode_provinsi: string;
  nama_provinsi: string;
}

export interface AlokasiProvinsi {
  id: string;
  tahun_anggaran_id: string;
  provinsi_id: string;
  provinsi: Provinsi;
  nominal_alokasi: number;
  realisasi_total: number;
  selisih: number;
  persentase_penyerapan: number;
  updated_at: string;
}

export interface KabupatenKota {
  id: string;
  provinsi_id: string;
  kode_kabupaten_kota: string;
  nama_kabupaten_kota: string;
  tipe: 'KABUPATEN' | 'KOTA';
}

export interface AlokasiKabupatenKota {
  id: string;
  alokasi_provinsi_id: string;
  kabupaten_kota_id: string;
  kabupaten_kota: KabupatenKota;
  provinsi_nama: string;
  nominal_alokasi: number;
  realisasi_total: number;
  selisih: number;
  persentase_penyerapan: number;
  updated_at: string;
}

export interface JenjangBreakdownProvinsi {
  nomor: number;
  jenjang: string;
  jumlah_sekolah: number;
  nominal_keseluruhan: number;
  porsi_anggaran: number; // percentage
}

export interface InstitusiPendidikan {
  id: string;
  npsn: string;
  nama_institusi: string;
  jenjang: Jenjang;
  kabupaten_kota_id: string;
  kabupaten_kota_nama: string;
  provinsi_nama: string;
  status_sekolah: 'NEGERI' | 'SWASTA';
  nomor_rekening?: string;
  alamat?: string;
  nisn?: string;
  nominal_alokasi: number;
  realisasi_total: number;
  selisih: number;
  persentase_penyerapan: number;
  updated_at: string;
}

export interface SumberDanaInstitusi {
  id: string;
  institusi_id: string;
  nama_sumber: string;
  tahun_anggaran: string;
  nominal: number;
  realisasi: number;
  saldo_di_bank: number; // nominal - realisasi
}

export interface PengeluaranBulananInstitusi {
  id: string;
  institusi_id: string;
  nomor: number;
  bulan: string;
  nominal_pengeluaran: number;
  qty: number;
  sub_total: number; // nominal_pengeluaran * qty
}

export interface ProfilInstitusi {
  institusi: InstitusiPendidikan;
  sumber_dana: SumberDanaInstitusi[];
  pengeluaran_bulanan: PengeluaranBulananInstitusi[];
  saldo_surplus_defisit: number;
}

export interface RincianPengeluaranItem {
  id: string;
  nomor: number;
  nama_produk_jasa: string;
  harga_satuan: number;
  qty: number;
  jumlah: number; // harga_satuan * qty
}

export interface RincianPengeluaranBulanan {
  institusi_id: string;
  institusi_nama: string;
  bulan: string;
  nomor_bulan: number;
  items: RincianPengeluaranItem[];
  sub_total: number;
  pajak_persen: number;
  pajak_nominal: number;
  total: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  provinsi_id?: string;
  kabupaten_kota_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface DashboardSummary {
  total_nominal: number;
  total_realisasi: number;
  persentase_penyerapan: number;
  per_jenjang: JenjangSummary[];
  tren_tahunan: TrenTahunan[];
}

export interface JenjangSummary {
  jenjang: Jenjang;
  nominal: number;
  realisasi: number;
  persentase: number;
}

export interface TrenTahunan {
  tahun: number;
  nominal: number;
  realisasi: number;
}

export interface AuditAnomaly {
  id: string;
  institusi_id: string;
  nama_institusi: string;
  jenjang: Jenjang;
  bulan: string;
  nomor_bulan: number;
  tipe_anomali: string;
  keterangan: string;
  nominal_selisih: number;
  tingkat_keparahan: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TEMUAN' | 'INVESTIGASI' | 'SELESAI';
  tanggal_ditemukan: string;
  audit_what?: string;
  audit_why?: string;
  audit_where?: string;
  audit_when?: string;
  audit_who?: string;
  audit_how?: string;
}

export interface TransaksiGlobal {
  id: string;
  tanggal: string;
  institusiId: string;
  namaInstitusi: string;
  jenjang: string;
  kategori: 'Sarana Prasarana' | 'Gaji Honorer' | 'Operasional' | 'Buku & Perpus' | 'Kegiatan Siswa' | 'Lainnya';
  item: string;
  qty: number;
  hargaSatuan: number;
  nominal: number;
  strukStatus: 'VALID' | 'DUPLIKAT' | 'ANOMALI_PAJAK' | 'STRUK_BURAM';
  strukMessage: string;
  invoiceNo: string;
  vendorName: string;
}
