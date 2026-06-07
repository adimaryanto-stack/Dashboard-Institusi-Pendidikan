// ============================================
// Mock Data — Sistem Transparansi Anggaran Pendidikan
// All data is deterministic (no Math.random) to avoid hydration mismatches
// ============================================
import {
  TahunAnggaran,
  AlokasiProvinsi,
  AlokasiKabupatenKota,
  InstitusiPendidikan,
  User,
  DashboardSummary,
  Jenjang,
  SumberDanaInstitusi,
  PengeluaranBulananInstitusi,
  ProfilInstitusi,
  RincianPengeluaranItem,
  RincianPengeluaranBulanan,
  JenjangBreakdownProvinsi,
  AuditAnomaly,
  TransaksiGlobal,
} from '@/types';
import { useAppStore } from '@/lib/store';
import { INITIAL_TRANSACTIONS } from './transactions';

function getDb() {
  if (typeof window === 'undefined') return null;
  try {
    const state = useAppStore.getState();
    if (state && state.isSupabaseMode && state.dbData) {
      return state.dbData;
    }
  } catch (e) {
    // safe fallback
  }
  return null;
}

// Deterministic pseudo-random based on seed
function seededValues(count: number, min: number, max: number, seed: number): number[] {
  const result: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807 + 7) % 2147483647;
    result.push(min + (s / 2147483647) * (max - min));
  }
  return result;
}

// === TAHUN ANGGARAN ===
export let tahunAnggaranData: TahunAnggaran[] = [
  { id: '1', tahun: 2020, total_anggaran: 473_700_000_000_000, status: 'CLOSED', created_at: '2020-01-01' },
  { id: '2', tahun: 2021, total_anggaran: 472_600_000_000_000, status: 'CLOSED', created_at: '2021-01-01' },
  { id: '3', tahun: 2022, total_anggaran: 472_600_000_000_000, status: 'CLOSED', created_at: '2022-01-01' },
  { id: '4', tahun: 2023, total_anggaran: 612_200_000_000_000, status: 'CLOSED', created_at: '2023-01-01' },
  { id: '5', tahun: 2024, total_anggaran: 665_000_000_000_000, status: 'CLOSED', created_at: '2024-01-01' },
  { id: '6', tahun: 2025, total_anggaran: 722_600_000_000_000, status: 'CLOSED', created_at: '2025-01-01' },
  { id: '7', tahun: 2026, total_anggaran: 769_100_000_000_000, status: 'ACTIVE', created_at: '2026-01-01' },
  { id: '8', tahun: 2027, total_anggaran: 0, status: 'DRAFT', created_at: '2026-06-01' },
];

export function updateTahunAnggaranData(newData: TahunAnggaran[]) {
  tahunAnggaranData = newData;
}

// === 38 PROVINSI ===
const provinsiNames = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi',
  'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Kep. Bangka Belitung',
  'Kep. Riau', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta',
  'Jawa Timur', 'Banten', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan', 'Kalimantan Timur',
  'Kalimantan Utara', 'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan',
  'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat', 'Maluku', 'Maluku Utara',
  'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan',
  'Papua Barat Daya',
];

const nominalDistribution = [
  15.2, 28.5, 14.8, 16.3, 9.2, 19.5, 6.8, 18.2, 5.1, 7.4,
  35.0, 55.8, 48.2, 12.5, 52.0, 22.5, 9.8, 12.3, 14.5, 11.2,
  8.5, 10.1, 14.8, 5.2, 9.8, 10.5, 25.5, 9.8, 4.2, 5.8,
  7.2, 5.5, 18.5, 8.2, 6.8, 7.5, 5.8, 4.8,
];

const realisasiPct = [
  64.5, 72.3, 68.1, 71.2, 65.8, 69.4, 62.3, 73.5, 78.2, 75.6,
  88.5, 74.1, 69.2, 82.4, 81.5, 70.8, 79.5, 66.3, 58.2, 62.8,
  64.5, 68.9, 73.2, 59.8, 71.5, 63.8, 72.4, 61.2, 68.5, 58.9,
  55.3, 52.8, 48.2, 51.2, 45.8, 42.5, 38.9, 43.8,
];

const targetTotal2026 = 769_100_000_000_000;
const originalTotal2026 = 583_500_000_000_000;

const originalTotalReal = nominalDistribution.reduce((sum, val, idx) => {
  return sum + val * 1_000_000_000_000 * (realisasiPct[idx] / 100);
}, 0);
const targetTotalReal = Math.round(originalTotalReal * (targetTotal2026 / originalTotal2026));

let distributedProvNominal = 0;
let distributedProvRealisasi = 0;

export function updateAlokasiProvinsiData(newData: AlokasiProvinsi[]) {
  alokasiProvinsiData = newData;
}

export let alokasiProvinsiData: AlokasiProvinsi[] = provinsiNames.map((nama, i) => {
  const isLast = i === provinsiNames.length - 1;
  const baseNom = nominalDistribution[i] * 1_000_000_000_000;
  
  let nominal = 0;
  if (isLast) {
    nominal = targetTotal2026 - distributedProvNominal;
  } else {
    nominal = Math.round(baseNom * (targetTotal2026 / originalTotal2026));
    distributedProvNominal += nominal;
  }

  const baseReal = Math.round(baseNom * (realisasiPct[i] / 100));

  let realisasi = 0;
  if (isLast) {
    realisasi = targetTotalReal - distributedProvRealisasi;
  } else {
    realisasi = Math.round(baseReal * (targetTotal2026 / originalTotal2026));
    distributedProvRealisasi += realisasi;
  }

  return {
    id: `prov-${i + 1}`,
    tahun_anggaran_id: '7',
    provinsi_id: `p-${i + 1}`,
    provinsi: { id: `p-${i + 1}`, kode_provinsi: `${11 + i}`, nama_provinsi: nama },
    nominal_alokasi: nominal,
    realisasi_total: realisasi,
    selisih: nominal - realisasi,
    persentase_penyerapan: nominal > 0 ? (realisasi / nominal) * 100 : 0,
    updated_at: '2026-04-15',
  };
});

// === KABUPATEN/KOTA ===
const kabkotaJabar = [
  { nama: 'Kabupaten Bogor', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Sukabumi', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Cianjur', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Bandung', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Garut', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Tasikmalaya', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Ciamis', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Kuningan', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Cirebon', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Majalengka', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Sumedang', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Indramayu', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Subang', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Purwakarta', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Karawang', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Bekasi', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Bandung Barat', tipe: 'KABUPATEN' as const },
  { nama: 'Kabupaten Pangandaran', tipe: 'KABUPATEN' as const },
  { nama: 'Kota Bogor', tipe: 'KOTA' as const },
  { nama: 'Kota Sukabumi', tipe: 'KOTA' as const },
  { nama: 'Kota Bandung', tipe: 'KOTA' as const },
  { nama: 'Kota Cirebon', tipe: 'KOTA' as const },
  { nama: 'Kota Bekasi', tipe: 'KOTA' as const },
  { nama: 'Kota Depok', tipe: 'KOTA' as const },
  { nama: 'Kota Cimahi', tipe: 'KOTA' as const },
  { nama: 'Kota Tasikmalaya', tipe: 'KOTA' as const },
  { nama: 'Kota Banjar', tipe: 'KOTA' as const },
];

// Real kabupaten/kota names per province
type KT = { nama: string; tipe: 'KABUPATEN' | 'KOTA' };
const K = (n: string): KT => ({ nama: `Kab. ${n}`, tipe: 'KABUPATEN' });
const C = (n: string): KT => ({ nama: `Kota ${n}`, tipe: 'KOTA' });

const kabkotaPerProvinsi: KT[][] = [
  /* Aceh */        [K('Aceh Besar'),K('Aceh Utara'),K('Aceh Timur'),K('Aceh Barat'),K('Pidie'),C('Banda Aceh'),C('Lhokseumawe')],
  /* Sumut */       [K('Deli Serdang'),K('Langkat'),K('Simalungun'),K('Karo'),K('Asahan'),K('Labuhanbatu'),C('Medan'),C('Pematangsiantar'),C('Binjai')],
  /* Sumbar */      [K('Agam'),K('Tanah Datar'),K('Pesisir Selatan'),K('Solok'),K('Limapuluh Kota'),C('Padang'),C('Bukittinggi'),C('Payakumbuh')],
  /* Riau */        [K('Kampar'),K('Bengkalis'),K('Indragiri Hilir'),K('Rokan Hulu'),K('Siak'),C('Pekanbaru'),C('Dumai')],
  /* Jambi */       [K('Muaro Jambi'),K('Batanghari'),K('Tebo'),K('Bungo'),K('Merangin'),C('Jambi'),C('Sungai Penuh')],
  /* Sumsel */      [K('Ogan Komering Ulu'),K('Musi Banyuasin'),K('Banyuasin'),K('Muara Enim'),K('Lahat'),C('Palembang'),C('Prabumulih'),C('Lubuklinggau')],
  /* Bengkulu */    [K('Rejang Lebong'),K('Bengkulu Utara'),K('Seluma'),K('Kaur'),C('Bengkulu')],
  /* Lampung */     [K('Lampung Tengah'),K('Lampung Selatan'),K('Lampung Timur'),K('Tanggamus'),K('Way Kanan'),C('Bandar Lampung'),C('Metro')],
  /* Babel */       [K('Bangka'),K('Belitung'),K('Bangka Barat'),K('Bangka Selatan'),C('Pangkalpinang')],
  /* Kepri */       [K('Bintan'),K('Karimun'),K('Natuna'),K('Lingga'),C('Batam'),C('Tanjungpinang')],
  /* DKI */         [C('Jakarta Pusat'),C('Jakarta Utara'),C('Jakarta Barat'),C('Jakarta Selatan'),C('Jakarta Timur'),K('Kep. Seribu')],
  /* Jabar - already defined separately */ kabkotaJabar,
  /* Jateng */      [K('Cilacap'),K('Banyumas'),K('Kebumen'),K('Purworejo'),K('Magelang'),K('Semarang'),K('Demak'),K('Kudus'),C('Semarang'),C('Surakarta'),C('Magelang'),C('Salatiga')],
  /* DIY */         [K('Sleman'),K('Bantul'),K('Gunungkidul'),K('Kulon Progo'),C('Yogyakarta')],
  /* Jatim */       [K('Sidoarjo'),K('Gresik'),K('Malang'),K('Jember'),K('Banyuwangi'),K('Kediri'),K('Mojokerto'),K('Lamongan'),K('Pasuruan'),C('Surabaya'),C('Malang'),C('Kediri'),C('Batu')],
  /* Banten */      [K('Tangerang'),K('Serang'),K('Pandeglang'),K('Lebak'),C('Tangerang'),C('Cilegon'),C('Serang'),C('Tangerang Selatan')],
  /* Bali */        [K('Badung'),K('Gianyar'),K('Tabanan'),K('Klungkung'),K('Buleleng'),K('Karangasem'),C('Denpasar')],
  /* NTB */         [K('Lombok Barat'),K('Lombok Tengah'),K('Lombok Timur'),K('Sumbawa'),K('Dompu'),C('Mataram'),C('Bima')],
  /* NTT */         [K('Kupang'),K('Timor Tengah Selatan'),K('Sikka'),K('Ende'),K('Manggarai'),K('Flores Timur'),C('Kupang')],
  /* Kalbar */      [K('Pontianak'),K('Sambas'),K('Ketapang'),K('Sintang'),K('Sanggau'),C('Pontianak'),C('Singkawang')],
  /* Kalteng */     [K('Kotawaringin Barat'),K('Kotawaringin Timur'),K('Kapuas'),K('Barito Selatan'),K('Murung Raya'),C('Palangka Raya')],
  /* Kalsel */      [K('Banjar'),K('Tanah Laut'),K('Hulu Sungai Selatan'),K('Tabalong'),K('Barito Kuala'),C('Banjarmasin'),C('Banjarbaru')],
  /* Kaltim */      [K('Kutai Kartanegara'),K('Berau'),K('Paser'),K('Kutai Barat'),K('Penajam Paser Utara'),C('Samarinda'),C('Balikpapan'),C('Bontang')],
  /* Kaltara */     [K('Bulungan'),K('Malinau'),K('Nunukan'),K('Tana Tidung'),C('Tarakan')],
  /* Sulut */       [K('Minahasa'),K('Bolaang Mongondow'),K('Minahasa Selatan'),K('Sangihe'),C('Manado'),C('Bitung'),C('Tomohon')],
  /* Sulteng */     [K('Donggala'),K('Poso'),K('Toli-Toli'),K('Banggai'),K('Morowali'),C('Palu')],
  /* Sulsel */      [K('Gowa'),K('Bone'),K('Wajo'),K('Maros'),K('Bulukumba'),K('Luwu'),K('Pangkep'),C('Makassar'),C('Parepare'),C('Palopo')],
  /* Sultra */      [K('Konawe'),K('Muna'),K('Buton'),K('Kolaka'),K('Konawe Selatan'),C('Kendari'),C('Baubau')],
  /* Gorontalo */   [K('Gorontalo'),K('Boalemo'),K('Pohuwato'),K('Bone Bolango'),C('Gorontalo')],
  /* Sulbar */      [K('Mamuju'),K('Majene'),K('Polewali Mandar'),K('Mamasa'),C('Mamuju')],
  /* Maluku */      [K('Maluku Tengah'),K('Maluku Tenggara'),K('Buru'),K('Seram Bagian Barat'),K('Kepulauan Aru'),C('Ambon'),C('Tual')],
  /* Malut */       [K('Halmahera Utara'),K('Halmahera Selatan'),K('Halmahera Tengah'),K('Kepulauan Sula'),C('Ternate'),C('Tidore Kepulauan')],
  /* Papua */       [K('Jayapura'),K('Merauke'),K('Nabire'),K('Mimika'),K('Keerom'),C('Jayapura')],
  /* Papua Barat */ [K('Manokwari'),K('Fak-Fak'),K('Sorong'),K('Raja Ampat'),C('Sorong')],
  /* Papua Sel */   [K('Merauke'),K('Boven Digoel'),K('Mappi'),K('Asmat'),C('Merauke')],
  /* Papua Teng */  [K('Nabire'),K('Paniai'),K('Mimika'),K('Puncak Jaya'),C('Nabire')],
  /* Papua Peg */   [K('Jayawijaya'),K('Yahukimo'),K('Pegunungan Bintang'),K('Lanny Jaya'),C('Wamena')],
  /* Papua BD */    [K('Teluk Bintuni'),K('Sorong Selatan'),K('Maybrat'),K('Tambrauw'),C('Sorong')],
];

// Deterministic percentage values for kabkota
const kabkotaPctSeeds = seededValues(600, 42, 92, 42);

export function getKabkotaByProvinsi(provinsiId: string): AlokasiKabupatenKota[] {
  const db = getDb();
  if (db) {
    const provAlokasi = db.alokasi_provinsi.find((p: any) => p.provinsi_id === provinsiId);
    if (!provAlokasi) return [];
    return db.alokasi_kabupaten_kota
      .filter((akk: any) => akk.alokasi_provinsi_id === provAlokasi.id)
      .map((akk: any) => {
        const kab = db.kabupaten_kota.find((k: any) => k.id === akk.kabupaten_kota_id);
        return {
          id: akk.id,
          alokasi_provinsi_id: akk.alokasi_provinsi_id,
          kabupaten_kota_id: akk.kabupaten_kota_id,
          kabupaten_kota: kab || {
            id: akk.kabupaten_kota_id,
            provinsi_id: provinsiId,
            kode_kabupaten_kota: '',
            nama_kabupaten_kota: akk.provinsi_nama,
            tipe: 'KABUPATEN'
          },
          provinsi_nama: akk.provinsi_nama,
          nominal_alokasi: Number(akk.nominal_alokasi),
          realisasi_total: Number(akk.realisasi_total),
          selisih: Number(akk.selisih),
          persentase_penyerapan: Number(akk.persentase_penyerapan),
          updated_at: akk.updated_at
        };
      });
  }

  const provIdx = parseInt(provinsiId.replace('p-', ''), 10) - 1;
  const templates = kabkotaPerProvinsi[provIdx] || [];
  const provData = alokasiProvinsiData.find(p => p.provinsi_id === provinsiId);
  if (!provData) return [];
  const totalNominal = provData.nominal_alokasi;
  const totalRealisasi = provData.realisasi_total;

  // Deterministic share values
  const shareVals = seededValues(templates.length, 0.7, 1.3, provIdx * 100 + 7);
  const totalShareVal = shareVals.reduce((a, b) => a + b, 0);

  let distributedNominal = 0;
  let distributedRealisasi = 0;

  return templates.map((kab, i) => {
    const isLast = i === templates.length - 1;
    const share = shareVals[i] / totalShareVal;
    
    let nominal = 0;
    if (isLast) {
      nominal = totalNominal - distributedNominal;
    } else {
      nominal = Math.round(totalNominal * share);
      distributedNominal += nominal;
    }
    
    const pct = kabkotaPctSeeds[(provIdx * 15 + i) % kabkotaPctSeeds.length];
    
    let realisasi = 0;
    if (isLast) {
      realisasi = totalRealisasi - distributedRealisasi;
    } else {
      realisasi = Math.round(nominal * pct / 100);
      distributedRealisasi += realisasi;
    }

    return {
      id: `kab-${provinsiId}-${i}`,
      alokasi_provinsi_id: provData.id,
      kabupaten_kota_id: `k-${provinsiId}-${i}`,
      kabupaten_kota: {
        id: `k-${provinsiId}-${i}`,
        provinsi_id: provinsiId,
        kode_kabupaten_kota: `${provinsiId.replace('p-', '')}.${String(i + 1).padStart(2, '0')}`,
        nama_kabupaten_kota: kab.nama,
        tipe: kab.tipe,
      },
      provinsi_nama: provData.provinsi.nama_provinsi,
      nominal_alokasi: nominal,
      realisasi_total: realisasi,
      selisih: nominal - realisasi,
      persentase_penyerapan: nominal > 0 ? Math.round((realisasi / nominal) * 1000) / 10 : 0,
      updated_at: '2026-04-15',
    };
  });
}

export function getAllKabkota(): AlokasiKabupatenKota[] {
  const db = getDb();
  if (db) {
    return db.alokasi_kabupaten_kota.map((akk: any) => {
      const kab = db.kabupaten_kota.find((k: any) => k.id === akk.kabupaten_kota_id);
      return {
        id: akk.id,
        alokasi_provinsi_id: akk.alokasi_provinsi_id,
        kabupaten_kota_id: akk.kabupaten_kota_id,
        kabupaten_kota: kab || {
          id: akk.kabupaten_kota_id,
          provinsi_id: '',
          kode_kabupaten_kota: '',
          nama_kabupaten_kota: akk.provinsi_nama,
          tipe: 'KABUPATEN'
        },
        provinsi_nama: akk.provinsi_nama,
        nominal_alokasi: Number(akk.nominal_alokasi),
        realisasi_total: Number(akk.realisasi_total),
        selisih: Number(akk.selisih),
        persentase_penyerapan: Number(akk.persentase_penyerapan),
        updated_at: akk.updated_at
      };
    });
  }

  return alokasiProvinsiData.flatMap(p => getKabkotaByProvinsi(p.provinsi_id));
}

// === INSTITUSI PENDIDIKAN ===
const universitas = [
  'Universitas Indonesia', 'Institut Teknologi Bandung', 'Universitas Gadjah Mada',
  'Institut Pertanian Bogor', 'Universitas Airlangga', 'Universitas Diponegoro',
  'Universitas Padjadjaran', 'Universitas Brawijaya', 'Universitas Hasanuddin',
  'Universitas Sumatera Utara', 'Universitas Andalas', 'Universitas Riau',
  'Universitas Lampung', 'Universitas Sriwijaya', 'Universitas Jember',
  'Universitas Sebelas Maret', 'Universitas Negeri Yogyakarta', 'Universitas Negeri Malang',
  'Universitas Negeri Semarang', 'Universitas Negeri Surabaya',
];

const smaNames = [
  'SMAN 1 Jakarta', 'SMAN 3 Bandung', 'SMAN 1 Yogyakarta', 'SMAN 5 Surabaya',
  'SMAN 1 Denpasar', 'SMAN 1 Semarang', 'SMAN 2 Jakarta', 'SMAN 1 Malang',
  'SMAN 1 Medan', 'SMAN 1 Makassar', 'SMAN 8 Jakarta', 'SMAN 1 Bogor',
  'SMAN 1 Padang', 'SMAN 1 Palembang', 'SMAN 1 Bekasi',
];

const smpNames = [
  'SMPN 1 Jakarta', 'SMPN 1 Bandung', 'SMPN 1 Surabaya', 'SMPN 1 Yogyakarta',
  'SMPN 1 Semarang', 'SMPN 1 Malang', 'SMPN 1 Denpasar', 'SMPN 1 Medan',
  'SMPN 2 Jakarta', 'SMPN 1 Makassar', 'SMPN 1 Bogor', 'SMPN 1 Bekasi',
  'SMPN 1 Depok', 'SMPN 1 Tangerang', 'SMPN 1 Palembang',
];

const sdNames = [
  'SDN 01 Menteng', 'SDN 02 Bendungan Hilir', 'SDN 01 Cikini', 'SDN 01 Bandung',
  'SDN 01 Surabaya', 'SDN 01 Yogyakarta', 'SDN 01 Semarang', 'SDN 01 Malang',
  'SDN 01 Denpasar', 'SDN 01 Medan', 'SDN 01 Makassar', 'SDN 01 Padang',
  'SDN 01 Palembang', 'SDN 01 Bogor', 'SDN 01 Bekasi',
];

const paudNames = [
  'PAUD Al-Ikhlas Jakarta', 'PAUD Tunas Bangsa Bandung', 'PAUD Ceria Surabaya',
  'PAUD Harapan Yogyakarta', 'PAUD Bintang Semarang', 'PAUD Melati Malang',
  'PAUD Pelangi Denpasar', 'PAUD Kasih Medan', 'PAUD Mandiri Makassar',
  'PAUD Anggrek Padang', 'PAUD Mawar Palembang', 'PAUD Dahlia Bogor',
];

// Deterministic share values for institution nominal
const instNominalFactors = seededValues(30, 0.6, 1.4, 999);
const instPctValues = seededValues(30, 42, 95, 777);

function generateInstitusi(names: string[], jenjang: Jenjang, baseNominal: number): InstitusiPendidikan[] {
  const kabkotaList = getKabkotaByProvinsi('p-12'); // Jawa Barat as default
  return names.map((nama, i) => {
    let nominal = baseNominal * instNominalFactors[i % instNominalFactors.length];
    const pct = instPctValues[i % instPctValues.length];
    let realisasi = Math.round(nominal * pct / 100);

    // Override SDN 01 Menteng specifically (index 0 of SD names)
    if (jenjang === 'SD' && i === 0) {
      nominal = 2_707_071_598;
      realisasi = 1_129_655_153;
    }

    const kab = kabkotaList[i % kabkotaList.length];
    const kabName = kab?.kabupaten_kota?.nama_kabupaten_kota || 'Kabupaten Bogor';
    return {
      id: `inst-${jenjang.toLowerCase()}-${i}`,
      npsn: `${jenjang === 'UNIVERSITAS' ? '3' : jenjang === 'SMA' ? '2' : jenjang === 'SMP' ? '1' : jenjang === 'SD' ? '0' : '9'}${String(1000 + i)}`,
      nama_institusi: nama,
      jenjang,
      kabupaten_kota_id: kab?.kabupaten_kota?.id || 'k-p-12-0',
      kabupaten_kota_nama: kabName,
      provinsi_nama: 'Jawa Barat',
      status_sekolah: (i % 3 === 0 || nama.includes('Al-Ikhlas') || nama.includes('Bina') || nama.includes('Pelita')) ? 'SWASTA' : 'NEGERI',
      nomor_rekening: `${123 + i}.${456 + i * 3}.${789 + i * 7}.000`,
      alamat: `Jl. Pendidikan Raya No. ${i + 15}, ${kabName}, Jawa Barat`,
      nisn: `889${String(100000 + i)}`,
      nominal_alokasi: Math.round(nominal),
      realisasi_total: realisasi,
      selisih: Math.round(nominal) - realisasi,
      persentase_penyerapan: nominal > 0 ? Math.round((realisasi / nominal) * 1000) / 10 : 0,
      updated_at: '2026-04-15',
    };
  });
}


export function getInstitusiByJenjang(jenjang: Jenjang): InstitusiPendidikan[] {
  const db = getDb();
  if (db) {
    return db.institusi_pendidikan.filter((i: any) => i.jenjang === jenjang);
  }

  switch (jenjang) {
    case 'UNIVERSITAS': return generateInstitusi(universitas, 'UNIVERSITAS', 2_000_000_000_000);
    case 'SMA': return generateInstitusi(smaNames, 'SMA', 800_000_000_000);
    case 'SMP': return generateInstitusi(smpNames, 'SMP', 750_000_000_000);
    case 'SD': return generateInstitusi(sdNames, 'SD', 700_000_000_000);
    case 'PAUD': return generateInstitusi(paudNames, 'PAUD', 300_000_000_000);
    default: return [];
  }
}

// === USERS ===
export function updateUsersData(newData: User[]) {
  usersData = newData;
}

export let usersData: User[] = [
  { id: 'u1', username: 'superadmin', email: 'admin@institusi.go.id', role: 'SUPER_ADMIN', is_active: true, created_at: '2024-01-01' },
  { id: 'u2', username: 'ahmad.fauzi', email: 'a.fauzi@institusi.go.id', role: 'ADMIN', is_active: true, created_at: '2024-02-15' },
  { id: 'u3', username: 'sari.dewi', email: 's.dewi@jabar.go.id', role: 'ADMIN_PROVINSI', provinsi_id: 'p-12', is_active: true, created_at: '2024-03-10' },
  { id: 'u4', username: 'budi.santoso', email: 'b.santoso@bandung.go.id', role: 'ADMIN_KABKOTA', kabupaten_kota_id: 'k-p-12-3', is_active: true, created_at: '2024-04-20' },
  { id: 'u5', username: 'viewer.nasional', email: 'viewer@institusi.go.id', role: 'VIEWER', is_active: true, created_at: '2024-05-01' },
  { id: 'u6', username: 'auditor.bpk', email: 'audit@bpk.go.id', role: 'AUDITOR', is_active: true, created_at: '2024-06-01' },
  { id: 'u7', username: 'rina.wulan', email: 'r.wulan@jatim.go.id', role: 'ADMIN_PROVINSI', provinsi_id: 'p-15', is_active: true, created_at: '2024-07-01' },
  { id: 'u8', username: 'doni.pratama', email: 'd.pratama@institusi.go.id', role: 'ADMIN', is_active: false, created_at: '2024-01-15' },
];

// === DASHBOARD SUMMARY ===
// Pre-computed realisasi values for trend (deterministic)
const trendRealisasiPct = [68.2, 70.5, 72.1, 65.8, 71.3, 73.8, 67.5];

export function getDashboardSummary(tahun: number = 2026): DashboardSummary {
  const db = getDb();
  if (db) {
    const targetTahun = db.tahun_anggaran.find((t: any) => t.tahun === tahun) || db.tahun_anggaran[0];
    if (!targetTahun) {
      return { total_nominal: 0, total_realisasi: 0, persentase_penyerapan: 0, per_jenjang: [], tren_tahunan: [] };
    }
    const totalNominal = Number(targetTahun.total_anggaran);
    const provAlokasis = db.alokasi_provinsi.filter((ap: any) => ap.tahun_anggaran_id === targetTahun.id);
    const totalRealisasi = provAlokasis.reduce((sum: number, ap: any) => sum + Number(ap.realisasi_total), 0);

    const jenjangs: Jenjang[] = ['UNIVERSITAS', 'SMA', 'SMP', 'SD', 'PAUD'];
    const perJenjang = jenjangs.map(j => {
      const schools = db.institusi_pendidikan.filter((i: any) => i.jenjang === j);
      const nominal = schools.reduce((sum: number, i: any) => sum + Number(i.nominal_alokasi), 0);
      const realisasi = schools.reduce((sum: number, i: any) => sum + Number(i.realisasi_total), 0);
      return {
        jenjang: j,
        nominal,
        realisasi,
        persentase: nominal > 0 ? (realisasi / nominal) * 100 : 0
      };
    });

    const activeYears = db.tahun_anggaran.filter((t: any) => t.status !== 'DRAFT');
    const trenTahunan = activeYears.map((t: any) => {
      const yearAlokasis = db.alokasi_provinsi.filter((ap: any) => ap.tahun_anggaran_id === t.id);
      const real = yearAlokasis.reduce((sum: number, ap: any) => sum + Number(ap.realisasi_total), 0);
      return {
        tahun: Number(t.tahun),
        nominal: Number(t.total_anggaran),
        realisasi: real || Math.round(t.total_anggaran * 0.7)
      };
    });

    return {
      total_nominal: totalNominal,
      total_realisasi: totalRealisasi,
      persentase_penyerapan: totalNominal > 0 ? (totalRealisasi / totalNominal) * 100 : 0,
      per_jenjang: perJenjang,
      tren_tahunan: trenTahunan.sort((a, b) => a.tahun - b.tahun)
    };
  }

  const targetTahun = tahunAnggaranData.find(t => t.tahun === tahun) || tahunAnggaranData[6]; // default to 2026
  const baseTahun = tahunAnggaranData[6]; // 2026 (769.1 T)
  const scale = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;

  // Let's vary the realisasi percentage slightly based on the year for realism
  const seed = (tahun % 7) || 1;
  const realisasiShift = 0.95 + (seed * 0.012); // slight variations

  const baseNominal = alokasiProvinsiData.reduce((s, p) => s + p.nominal_alokasi, 0);
  const baseRealisasi = alokasiProvinsiData.reduce((s, p) => s + p.realisasi_total, 0);

  const totalNominal = targetTahun.total_anggaran;
  const totalRealisasi = Math.min(totalNominal, Math.round(baseRealisasi * scale * realisasiShift));

  // Precise Jenjang math rollup (remainder to PAUD)
  const uniNom = Math.round(150_000_000_000_000 * scale);
  const smaNom = Math.round(200_000_000_000_000 * scale);
  const smpNom = Math.round(180_000_000_000_000 * scale);
  const sdNom = Math.round(200_000_000_000_000 * scale);
  const paudNom = totalNominal - uniNom - smaNom - smpNom - sdNom;

  const uniReal = Math.min(uniNom, Math.round(98_000_000_000_000 * scale * realisasiShift));
  const smaReal = Math.min(smaNom, Math.round(130_000_000_000_000 * scale * realisasiShift));
  const smpReal = Math.min(smpNom, Math.round(118_000_000_000_000 * scale * realisasiShift));
  const sdReal = Math.min(sdNom, Math.round(126_000_000_000_000 * scale * realisasiShift));
  const paudReal = totalRealisasi - uniReal - smaReal - smpReal - sdReal;

  const jenjangData: Record<Jenjang, { nominal: number; realisasi: number }> = {
    UNIVERSITAS: { nominal: uniNom, realisasi: uniReal },
    SMA: { nominal: smaNom, realisasi: smaReal },
    SMP: { nominal: smpNom, realisasi: smpReal },
    SD: { nominal: sdNom, realisasi: sdReal },
    PAUD: { nominal: paudNom, realisasi: paudReal },
  };

  const activeYears = tahunAnggaranData.filter(t => t.status !== 'DRAFT');

  return {
    total_nominal: totalNominal,
    total_realisasi: totalRealisasi,
    persentase_penyerapan: totalNominal > 0 ? (totalRealisasi / totalNominal) * 100 : 0,
    per_jenjang: (Object.keys(jenjangData) as Jenjang[]).map(j => ({
      jenjang: j,
      nominal: jenjangData[j].nominal,
      realisasi: jenjangData[j].realisasi,
      persentase: jenjangData[j].nominal > 0 ? (jenjangData[j].realisasi / jenjangData[j].nominal) * 100 : 0,
    })),
    tren_tahunan: activeYears.map((t, i) => ({
      tahun: t.tahun,
      nominal: t.total_anggaran,
      realisasi: Math.round(t.total_anggaran * (trendRealisasiPct[i] || 70) / 100),
    })),
  };
}

// === PROFIL INSTITUSI ===
const bulanNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Monthly spending distribution (higher in early months, tapering off)
const monthlyPctDistribution = [
  0.12, 0.10, 0.10, 0.10, 0.10, 0.10,
  0.10, 0.10, 0.04, 0.008, 0.004, 0.004,
];

function generateSumberDana(institusi: InstitusiPendidikan, tahun: number = 2026): SumberDanaInstitusi[] {
  const apbnNominal = Math.round(institusi.nominal_alokasi * 0.65);
  const apbdNominal = Math.round(institusi.nominal_alokasi * 0.20);
  const csrNominal = institusi.nominal_alokasi - apbnNominal - apbdNominal;

  const apbnRealisasi = Math.round(institusi.realisasi_total * 0.65);
  const apbdRealisasi = Math.round(institusi.realisasi_total * 0.20);
  const csrRealisasi = institusi.realisasi_total - apbnRealisasi - apbdRealisasi;

  const items: SumberDanaInstitusi[] = [
    {
      id: `sd-${institusi.id}-1`,
      institusi_id: institusi.id,
      nama_sumber: `APBN Pendidikan (Pemerintah Pusat) ${tahun}`,
      tahun_anggaran: String(tahun),
      nominal: apbnNominal,
      realisasi: apbnRealisasi,
      saldo_di_bank: apbnNominal - apbnRealisasi,
    },
    {
      id: `sd-${institusi.id}-2`,
      institusi_id: institusi.id,
      nama_sumber: `APBD ${institusi.kabupaten_kota_nama} ${tahun}`,
      tahun_anggaran: String(tahun),
      nominal: apbdNominal,
      realisasi: apbdRealisasi,
      saldo_di_bank: apbdNominal - apbdRealisasi,
    },
    {
      id: `sd-${institusi.id}-3`,
      institusi_id: institusi.id,
      nama_sumber: `Corporate Social Responsibility (CSR Swasta) ${tahun}`,
      tahun_anggaran: String(tahun),
      nominal: csrNominal,
      realisasi: csrRealisasi,
      saldo_di_bank: csrNominal - csrRealisasi,
    },
  ];

  return items;
}

function generatePengeluaranBulanan(institusi: InstitusiPendidikan): PengeluaranBulananInstitusi[] {
  const totalRealisasi = institusi.realisasi_total;
  const pcts = [0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.08, 0.08, 0.08, 0.06, 0.05, 0.05];
  
  let distributedSum = 0;
  return bulanNames.map((bulan, i) => {
    let nominal = 0;
    if (i === 11) {
      nominal = totalRealisasi - distributedSum;
    } else {
      nominal = Math.round(totalRealisasi * pcts[i]);
      distributedSum += nominal;
    }
    return {
      id: `pb-${institusi.id}-${i}`,
      institusi_id: institusi.id,
      nomor: i + 1,
      bulan,
      nominal_pengeluaran: nominal,
      qty: 1,
      sub_total: nominal,
    };
  });
}

export function getProfilInstitusi(id: string, tahun: number = 2026): ProfilInstitusi | null {
  const db = getDb();
  if (db) {
    const inst = db.institusi_pendidikan.find((i: any) => i.id === id);
    if (!inst) return null;

    let nominal = Number(inst.nominal_alokasi);
    let realisasi = Number(inst.realisasi_total);
    let scaleNominal = 1.0;
    let scaleRealisasi = 1.0;

    if (id === 'inst-sd-0') {
      const mentengData = MENTENG_YEAR_DATA[tahun];
      if (mentengData) {
        nominal = mentengData.alokasi;
        realisasi = mentengData.realisasi;
        scaleNominal = nominal / 2707071598;
        scaleRealisasi = realisasi / 1129655153;
      }
    } else {
      const targetTahun = tahunAnggaranData.find(t => t.tahun === tahun) || tahunAnggaranData[6];
      const baseTahun = tahunAnggaranData[6];
      const scale = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;
      nominal = Math.round(nominal * scale);
      realisasi = Math.round(realisasi * scale);
      scaleNominal = scale;
      scaleRealisasi = scale;
    }

    const sumberDana = db.sumber_dana_institusi.filter((sd: any) => sd.institusi_id === id);
    const pb = db.pengeluaran_bulanan_institusi
      .filter((p: any) => p.institusi_id === id)
      .sort((a: any, b: any) => a.nomor - b.nomor);

    const mappedSumberDana = sumberDana.map((sd: any) => {
      const nom = Math.round(Number(sd.nominal) * scaleNominal);
      const real = Math.round(Number(sd.realisasi) * scaleRealisasi);
      return {
        ...sd,
        nominal: nom,
        realisasi: real,
        saldo_di_bank: nom - real
      };
    });

    const scaledSchoolTx = getSchoolTransactionsFromStore(id, tahun);
    let mappedPb = [];
    if (scaledSchoolTx.length > 0) {
      mappedPb = bulanNames.map((bulan, i) => {
        const monthTx = scaledSchoolTx.filter(t => getMonthFromDate(t.tanggal) === i + 1);
        const nominal = monthTx.reduce((sum, t) => sum + t.nominal, 0);
        const qty = monthTx.reduce((sum, t) => sum + (t.qty || 1), 0);
        return {
          id: `pb-${id}-${i}`,
          institusi_id: id,
          nomor: i + 1,
          bulan,
          nominal_pengeluaran: nominal,
          qty: qty,
          sub_total: nominal
        };
      });
    } else {
      mappedPb = pb.map((p: any) => {
        const nom = Math.round(Number(p.nominal_pengeluaran) * scaleRealisasi);
        return {
          ...p,
          nominal_pengeluaran: nom,
          sub_total: nom
        };
      });
    }

    const totalNominalSumber = mappedSumberDana.reduce((s: number, d: any) => s + d.nominal, 0);
    const totalRealisasiSumber = mappedSumberDana.reduce((s: number, d: any) => s + d.realisasi, 0);
    const saldoSurplusDefisit = totalNominalSumber - totalRealisasiSumber;

    return {
      institusi: {
        ...inst,
        nominal_alokasi: nominal,
        realisasi_total: realisasi,
        selisih: nominal - realisasi,
        persentase_penyerapan: nominal > 0 ? (realisasi / nominal) * 100 : 0
      },
      sumber_dana: mappedSumberDana,
      pengeluaran_bulanan: mappedPb,
      saldo_surplus_defisit: saldoSurplusDefisit,
    };
  }

  let found: InstitusiPendidikan | null = null;

  const targetTahun = tahunAnggaranData.find(t => t.tahun === tahun) || tahunAnggaranData[6];
  const baseTahun = tahunAnggaranData[6];
  const scale = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;
  const seed = (tahun % 7) || 1;
  const shift = 0.95 + (seed * 0.012);

  if (id.startsWith('inst-k-p-') || id.startsWith('inst-kab-')) {
    const match = id.match(/(k(?:ab)?-p-\d+-\d+)/);
    if (match) {
      const kabkotaId = match[1];
      const provMatch = kabkotaId.match(/k(?:ab)?-p-(\d+)-/);
      const provId = provMatch ? `p-${provMatch[1]}` : 'p-1';
      const provData = alokasiProvinsiData.find(p => p.provinsi_id === provId);
      const kabkotaData = getKabkotaByProvinsi(provId).find(k => k.kabupaten_kota_id === kabkotaId);
      
      if (provData && kabkotaData) {
        const scaledKabkotaNominal = Math.round(kabkotaData.nominal_alokasi * scale);
        const schools = getInstitusiByKabkota(
          kabkotaId,
          kabkotaData.kabupaten_kota.nama_kabupaten_kota,
          provData.provinsi.nama_provinsi,
          scaledKabkotaNominal
        );
        found = schools.find(inst => inst.id === id) || null;
      }
    }
  } else {
    // Search across all jenjang
    const allJenjang: Jenjang[] = ['UNIVERSITAS', 'SMA', 'SMP', 'SD', 'PAUD'];
    for (const j of allJenjang) {
      const list = getInstitusiByJenjang(j);
      const match = list.find(inst => inst.id === id);
      if (match) {
        let nominal = Math.round(match.nominal_alokasi * scale);
        let realisasi = Math.min(nominal, Math.round(match.realisasi_total * scale * shift));

        if (id === 'inst-sd-0') {
          const mentengData = MENTENG_YEAR_DATA[tahun];
          if (mentengData) {
            nominal = mentengData.alokasi;
            realisasi = mentengData.realisasi;
          }
        }

        found = {
          ...match,
          nominal_alokasi: nominal,
          realisasi_total: realisasi,
          selisih: nominal - realisasi,
          persentase_penyerapan: nominal > 0 ? Math.round((realisasi / nominal) * 1000) / 10 : 0,
        };
        break;
      }
    }
  }

  if (!found) return null;

  const sumberDana = generateSumberDana(found, tahun);
  const scaledSchoolTx = getSchoolTransactionsFromStore(id, tahun);
  let pengeluaranBulanan = [];
  if (scaledSchoolTx.length > 0) {
    pengeluaranBulanan = bulanNames.map((bulan, i) => {
      const monthTx = scaledSchoolTx.filter(t => getMonthFromDate(t.tanggal) === i + 1);
      const nominal = monthTx.reduce((sum, t) => sum + t.nominal, 0);
      const qty = monthTx.reduce((sum, t) => sum + (t.qty || 1), 0);
      return {
        id: `pb-${id}-${i}`,
        institusi_id: id,
        nomor: i + 1,
        bulan,
        nominal_pengeluaran: nominal,
        qty: qty,
        sub_total: nominal
      };
    });
  } else {
    pengeluaranBulanan = generatePengeluaranBulanan(found);
  }

  const totalNominalSumber = sumberDana.reduce((s, d) => s + d.nominal, 0);
  const totalRealisasiSumber = sumberDana.reduce((s, d) => s + d.realisasi, 0);
  const saldoSurplusDefisit = totalNominalSumber - totalRealisasiSumber;

  return {
    institusi: found,
    sumber_dana: sumberDana,
    pengeluaran_bulanan: pengeluaranBulanan,
    saldo_surplus_defisit: saldoSurplusDefisit,
  };
}

export function getAllInstitusi(): InstitusiPendidikan[] {
  const db = getDb();
  if (db) {
    return db.institusi_pendidikan.map((i: any) => ({
      ...i,
      nominal_alokasi: Number(i.nominal_alokasi),
      realisasi_total: Number(i.realisasi_total),
      selisih: Number(i.selisih),
      persentase_penyerapan: Number(i.persentase_penyerapan)
    }));
  }

  const allJenjang: Jenjang[] = ['UNIVERSITAS', 'SMA', 'SMP', 'SD', 'PAUD'];
  return allJenjang.flatMap(j => getInstitusiByJenjang(j));
}

// === RINCIAN PENGELUARAN BULANAN (DETAIL PER ITEM) ===
const produkJasaUniv = [
  { nama: 'Pembangunan Gedung Mahasiswa', hargaBase: 150_000_000, qtyBase: 1 },
  { nama: 'Pengadaan Buku Ajar A', hargaBase: 2_000_000, qtyBase: 600 },
  { nama: 'Pengadaan Buku Ajar B', hargaBase: 2_000_000, qtyBase: 600 },
  { nama: 'Pengadaan Buku Ajar C', hargaBase: 2_000_000, qtyBase: 600 },
  { nama: 'Pengadaan ATK untuk Tata Usaha', hargaBase: 2_000_000, qtyBase: 1 },
  { nama: 'Pembayaran Listrik', hargaBase: 7_000_000, qtyBase: 1 },
  { nama: 'Transportasi Bisnis', hargaBase: 3_000_000, qtyBase: 1 },
  { nama: 'Gaji Honorer Dosen S1', hargaBase: 3_000_000, qtyBase: 30 },
  { nama: 'Gaji Security', hargaBase: 1_900_000, qtyBase: 10 },
  { nama: 'Gaji Penjaga Universitas', hargaBase: 1_900_000, qtyBase: 3 },
  { nama: 'PDAM', hargaBase: 8_000_000, qtyBase: 1 },
];

const produkJasaSMA = [
  { nama: 'Pengadaan Buku Pelajaran', hargaBase: 150_000, qtyBase: 500 },
  { nama: 'Pengadaan Seragam Olahraga', hargaBase: 120_000, qtyBase: 200 },
  { nama: 'Pengadaan ATK', hargaBase: 1_500_000, qtyBase: 1 },
  { nama: 'Pembayaran Listrik', hargaBase: 3_500_000, qtyBase: 1 },
  { nama: 'Pemeliharaan Gedung', hargaBase: 5_000_000, qtyBase: 1 },
  { nama: 'Gaji Honorer Guru', hargaBase: 2_500_000, qtyBase: 15 },
  { nama: 'Gaji Security', hargaBase: 1_800_000, qtyBase: 3 },
  { nama: 'Gaji Tukang Kebun', hargaBase: 1_500_000, qtyBase: 2 },
  { nama: 'PDAM', hargaBase: 2_500_000, qtyBase: 1 },
  { nama: 'Internet & WiFi', hargaBase: 1_200_000, qtyBase: 1 },
];

const produkJasaSD = [
  { nama: 'Pengadaan Buku Pelajaran', hargaBase: 80_000, qtyBase: 300 },
  { nama: 'Pengadaan Alat Tulis Siswa', hargaBase: 500_000, qtyBase: 1 },
  { nama: 'Pengadaan ATK Kantor', hargaBase: 800_000, qtyBase: 1 },
  { nama: 'Pembayaran Listrik', hargaBase: 1_500_000, qtyBase: 1 },
  { nama: 'Pemeliharaan Gedung', hargaBase: 3_000_000, qtyBase: 1 },
  { nama: 'Gaji Honorer Guru', hargaBase: 2_000_000, qtyBase: 8 },
  { nama: 'Gaji Penjaga Sekolah', hargaBase: 1_500_000, qtyBase: 1 },
  { nama: 'PDAM', hargaBase: 800_000, qtyBase: 1 },
];

function getProdukJasaTemplate(jenjang: Jenjang) {
  switch (jenjang) {
    case 'UNIVERSITAS': return produkJasaUniv;
    case 'SMA': case 'SMP': return produkJasaSMA;
    case 'SD': case 'PAUD': return produkJasaSD;
    default: return produkJasaSMA;
  }
}

const PAJAK_PERSEN = 11;

export function getRincianPengeluaranBulanan(
  institusiId: string,
  nomorBulan: number,
  tahun: number = 2026
): RincianPengeluaranBulanan | null {
  const scaledSchoolTx = getSchoolTransactionsFromStore(institusiId, tahun);
  
  if (scaledSchoolTx.length > 0) {
    const instName = scaledSchoolTx[0].namaInstitusi;
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const bulanName = monthNames[nomorBulan - 1] || 'Januari';
    const monthlyTx = scaledSchoolTx.filter(t => getMonthFromDate(t.tanggal) === nomorBulan);

    const items: RincianPengeluaranItem[] = monthlyTx.map((t, idx) => {
      const qty = t.qty > 0 ? t.qty : 1;
      const itemTotalAfterTax = t.nominal;
      const itemSubtotalBeforeTax = Math.round(itemTotalAfterTax / 1.11);
      const hargaSatuan = Math.round(itemSubtotalBeforeTax / qty);
      const jumlah = hargaSatuan * qty;

      return {
        id: t.id,
        nomor: idx + 1,
        nama_produk_jasa: t.item,
        harga_satuan: hargaSatuan,
        qty: qty,
        jumlah: jumlah
      };
    });

    const total = monthlyTx.reduce((sum, t) => sum + t.nominal, 0);
    const sub_total = items.reduce((sum, item) => sum + item.jumlah, 0);
    const pajak_nominal = total - sub_total;

    return {
      institusi_id: institusiId,
      institusi_nama: instName,
      bulan: bulanName,
      nomor_bulan: nomorBulan,
      items: items,
      sub_total: sub_total,
      pajak_persen: 11,
      pajak_nominal: pajak_nominal,
      total: total
    };
  }

  const db = getDb();
  if (db) {
    const inst = db.institusi_pendidikan.find((i: any) => i.id === institusiId);
    if (!inst) return null;
    const pb = db.pengeluaran_bulanan_institusi.find(
      (p: any) => p.institusi_id === institusiId && p.nomor === nomorBulan
    );
    if (!pb) return null;
    const items = db.rincian_pengeluaran_item.filter(
      (item: any) => item.institusi_id === institusiId && item.nomor_bulan === nomorBulan
    );

    let scaleRealisasi = 1.0;
    if (institusiId === 'inst-sd-0') {
      const mentengData = MENTENG_YEAR_DATA[tahun];
      if (mentengData) {
        scaleRealisasi = mentengData.realisasi / 1129655153;
      }
    } else {
      const targetTahun = tahunAnggaranData.find(t => t.tahun === tahun) || tahunAnggaranData[6];
      const baseTahun = tahunAnggaranData[6];
      scaleRealisasi = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;
    }

    const total = Math.round(Number(pb.nominal_pengeluaran) * scaleRealisasi);
    const subTotal = Math.round(total / 1.11);
    const pajakNominal = total - subTotal;

    let distributedSum = 0;
    const mappedItems = items.map((item: any) => ({
      ...item,
      harga_satuan: Number(item.harga_satuan),
      qty: Number(item.qty),
      jumlah: Number(item.jumlah)
    })).sort((a: any, b: any) => a.nomor - b.nomor);

    const scaledItems = mappedItems.map((item: any, idx: number) => {
      const isLast = idx === mappedItems.length - 1;
      let itemJumlah = 0;
      let hargaSatuan = 0;
      if (isLast) {
        itemJumlah = subTotal - distributedSum;
        hargaSatuan = itemJumlah;
      } else {
        itemJumlah = Math.round(item.jumlah * scaleRealisasi);
        hargaSatuan = Math.round(itemJumlah / item.qty);
        itemJumlah = hargaSatuan * item.qty;
        distributedSum += itemJumlah;
      }
      return {
        ...item,
        harga_satuan: hargaSatuan,
        jumlah: itemJumlah
      };
    });

    return {
      institusi_id: inst.id,
      institusi_nama: inst.nama_institusi,
      bulan: pb.bulan,
      nomor_bulan: pb.nomor,
      items: scaledItems,
      sub_total: subTotal,
      pajak_persen: PAJAK_PERSEN,
      pajak_nominal: pajakNominal,
      total: total,
    };
  }

  let found: InstitusiPendidikan | null = null;

  const targetTahun = tahunAnggaranData.find(t => t.tahun === tahun) || tahunAnggaranData[6];
  const baseTahun = tahunAnggaranData[6];
  const scale = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;
  const seedForInst = (tahun % 7) || 1;
  const shift = 0.95 + (seedForInst * 0.012);

  if (institusiId.startsWith('inst-k-p-') || institusiId.startsWith('inst-kab-')) {
    const match = institusiId.match(/(k(?:ab)?-p-\d+-\d+)/);
    if (match) {
      const kabkotaId = match[1];
      const provMatch = kabkotaId.match(/k(?:ab)?-p-(\d+)-/);
      const provId = provMatch ? `p-${provMatch[1]}` : 'p-1';
      const provData = alokasiProvinsiData.find(p => p.provinsi_id === provId);
      const kabkotaData = getKabkotaByProvinsi(provId).find(k => k.kabupaten_kota_id === kabkotaId);
      
      if (provData && kabkotaData) {
        const scaledKabkotaNominal = Math.round(kabkotaData.nominal_alokasi * scale);
        const schools = getInstitusiByKabkota(
          kabkotaId,
          kabkotaData.kabupaten_kota.nama_kabupaten_kota,
          provData.provinsi.nama_provinsi,
          scaledKabkotaNominal
        );
        found = schools.find(inst => inst.id === institusiId) || null;
      }
    }
  } else {
    // Find the institusi
    const allJenjang: Jenjang[] = ['UNIVERSITAS', 'SMA', 'SMP', 'SD', 'PAUD'];
    for (const j of allJenjang) {
      const list = getInstitusiByJenjang(j);
      const match = list.find(inst => inst.id === institusiId);
      if (match) {
        const nominal = Math.round(match.nominal_alokasi * scale);
        const realisasi = Math.min(nominal, Math.round(match.realisasi_total * scale * shift));
        found = {
          ...match,
          nominal_alokasi: nominal,
          realisasi_total: realisasi,
          selisih: nominal - realisasi,
          persentase_penyerapan: nominal > 0 ? Math.round((realisasi / nominal) * 1000) / 10 : 0,
        };
        break;
      }
    }
  }

  if (!found) return null;

  const template = getProdukJasaTemplate(found.jenjang);

  // Generate deterministic variation per month using seed
  const seed = (nomorBulan * 17 + parseInt(found.id.replace(/\D/g, '') || '1', 10)) || 1;

  // Get target monthly nominal
  const targetTotal = generatePengeluaranBulanan(found)[nomorBulan - 1].nominal_pengeluaran;

  // The subtotal satisfies: subtotal + Math.round(subtotal * 0.11) = targetTotal
  const subTotal = Math.round(targetTotal / 1.11);
  const pajakNominal = targetTotal - subTotal;

  const itemSeeds = seededValues(template.length, 0.8, 1.2, seed);
  const rawItems = template.map((t, i) => {
    const rawVal = t.hargaBase * t.qtyBase * itemSeeds[i];
    return { ...t, rawVal };
  });
  const totalRawVal = rawItems.reduce((sum, item) => sum + item.rawVal, 0);

  let distributedSum = 0;
  const items: RincianPengeluaranItem[] = rawItems.map((t, i) => {
    const isLast = i === template.length - 1;
    let qty = isLast ? 1 : Math.max(1, t.qtyBase);
    let itemJumlah = 0;
    let hargaSatuan = 0;

    if (isLast) {
      itemJumlah = subTotal - distributedSum;
      hargaSatuan = itemJumlah;
    } else {
      itemJumlah = Math.round(subTotal * (t.rawVal / totalRawVal));
      hargaSatuan = Math.round(itemJumlah / qty);
      itemJumlah = hargaSatuan * qty;
      distributedSum += itemJumlah;
    }

    return {
      id: `ri-${institusiId}-${nomorBulan}-${i}`,
      nomor: i + 1,
      nama_produk_jasa: `${t.nama} ${bulanNames[nomorBulan - 1]} ${tahun}`,
      harga_satuan: hargaSatuan,
      qty,
      jumlah: itemJumlah,
    };
  });

  return {
    institusi_id: found.id,
    institusi_nama: found.nama_institusi,
    bulan: bulanNames[nomorBulan - 1],
    nomor_bulan: nomorBulan,
    items,
    sub_total: subTotal,
    pajak_persen: PAJAK_PERSEN,
    pajak_nominal: pajakNominal,
    total: subTotal + pajakNominal,
  };
}

export function getJenjangBreakdownByKabkota(
  kabkotaId: string,
  nominalAlokasi: number
): JenjangBreakdownProvinsi[] {
  const db = getDb();
  if (db) {
    const schools = db.institusi_pendidikan.filter((i: any) => i.kabupaten_kota_id === kabkotaId);
    const jenjangs: Jenjang[] = ['UNIVERSITAS', 'SMA', 'SMP', 'SD', 'PAUD'];
    const resultBreakdown = jenjangs.map((j, i) => {
      const jSchools = schools.filter(s => s.jenjang === j);
      const nominal = jSchools.reduce((sum, s) => sum + Number(s.nominal_alokasi), 0);
      const realisasi = jSchools.reduce((sum, s) => sum + Number(s.realisasi_total), 0);
      let label = j === 'UNIVERSITAS' ? 'Universitas (Strata 1)' :
                  j === 'SMA' ? 'Sekolah Menengah Atas (SMA)' :
                  j === 'SMP' ? 'Sekolah Menengah Pertama (SMP)' :
                  j === 'SD' ? 'Sekolah Dasar (SD)' :
                  'Pendidikan Anak Usia Dini (PAUD)';
      return {
        nomor: i + 1,
        jenjang: label,
        jumlah_sekolah: jSchools.length,
        nominal_keseluruhan: nominal,
        porsi_anggaran: nominalAlokasi > 0 ? (nominal / nominalAlokasi) * 100 : 0
      };
    });
    return resultBreakdown;
  }

  const match = kabkotaId.match(/kab-p-(\d+)-(\d+)/);
  const provIdx = match ? parseInt(match[1], 10) : 1;
  const kabIdx = match ? parseInt(match[2], 10) : 0;
  const seed = provIdx * 31 + kabIdx + 3;

  let pUniv = 10;
  let pSMA = 20;
  let pSMK = 15;
  let pSMP = 20;
  let pSD = 30;
  let pPAUD = 5;

  const cUniv = (seed * 3) % 4; // 0 to 3 universities
  if (cUniv === 0) {
    pSD += pUniv;
    pUniv = 0;
  }
  const cSMA = 3 + ((seed * 7) % 15);
  const cSMK = 2 + ((seed * 5) % 10);
  const cSMP = 6 + ((seed * 11) % 25);
  const cSD = 15 + ((seed * 17) % 80);
  const cPAUD = 10 + ((seed * 23) % 60);

  const jenjangs = [
    { label: 'Universitas (Strata 1)', porsi: pUniv, count: cUniv },
    { label: 'Sekolah Menengah Atas (SMA)', porsi: pSMA, count: cSMA },
    { label: 'Sekolah Menengah Kejuruan (SMK)', porsi: pSMK, count: cSMK },
    { label: 'Sekolah Menengah Pertama (SMP)', porsi: pSMP, count: cSMP },
    { label: 'Sekolah Dasar (SD)', porsi: pSD, count: cSD },
    { label: 'Pendidikan Anak Usia Dini (PAUD)', porsi: pPAUD, count: cPAUD },
  ];

  return jenjangs.map((j, i) => {
    const nominal = Math.round(nominalAlokasi * j.porsi / 100);
    return {
      nomor: i + 1,
      jenjang: j.label,
      jumlah_sekolah: j.count,
      nominal_keseluruhan: nominal,
      porsi_anggaran: j.porsi,
    };
  });
}

export function getInstitusiByKabkota(
  kabkotaId: string,
  namaKabkota: string,
  provinsiNama: string,
  totalNominal: number
): InstitusiPendidikan[] {
  const db = getDb();
  if (db) {
    return db.institusi_pendidikan.filter((i: any) => i.kabupaten_kota_id === kabkotaId).map((i: any) => ({
      ...i,
      nominal_alokasi: Number(i.nominal_alokasi),
      realisasi_total: Number(i.realisasi_total),
      selisih: Number(i.selisih),
      persentase_penyerapan: Number(i.persentase_penyerapan)
    }));
  }

  const match = kabkotaId.match(/kab-p-(\d+)-(\d+)/);
  const provIdx = match ? parseInt(match[1], 10) : 1;
  const kabIdx = match ? parseInt(match[2], 10) : 0;
  const seed = provIdx * 31 + kabIdx + 3;

  let pUniv = 10;
  let pSMA = 20;
  let pSMK = 15;
  let pSMP = 20;
  let pSD = 30;
  let pPAUD = 5;

  const cUniv = (seed * 3) % 4;
  if (cUniv === 0) {
    pSD += pUniv;
    pUniv = 0;
  }
  const cSMA = 3 + ((seed * 7) % 15);
  const cSMK = 2 + ((seed * 5) % 10);
  const cSMP = 6 + ((seed * 11) % 25);
  const cSD = 15 + ((seed * 17) % 80);
  const cPAUD = 10 + ((seed * 23) % 60);

  const cleanKabName = namaKabkota.replace('Kab. ', '').replace('Kota ', '');

  const jenjangConfigs = [
    { key: 'UNIVERSITAS' as const, porsi: pUniv, count: cUniv, prefix: 'Universitas', baseNominal: 50_000_000_000 },
    { key: 'SMA' as const, porsi: pSMA, count: cSMA, prefix: 'SMAN', baseNominal: 5_000_000_000 },
    { key: 'SMP' as const, porsi: pSMP, count: cSMP, prefix: 'SMPN', baseNominal: 3_000_000_000 },
    { key: 'SD' as const, porsi: pSD, count: cSD, prefix: 'SDN', baseNominal: 1_500_000_000 },
    { key: 'PAUD' as const, porsi: pPAUD, count: cPAUD, prefix: 'PAUD', baseNominal: 500_000_000 },
    { key: 'SMA' as const, porsi: pSMK, count: cSMK, prefix: 'SMKN', baseNominal: 4_500_000_000, label: 'SMK' }, // Custom labeling for SMK
  ];

  // We will distribute the totalNominal to each jenjang
  const list: InstitusiPendidikan[] = [];
  let schoolCounter = 1;

  jenjangConfigs.forEach((jc) => {
    if (jc.count === 0) return;
    const jenjangBudget = Math.round(totalNominal * jc.porsi / 100);
    let distributedSum = 0;

    for (let i = 0; i < jc.count; i++) {
      // Deterministic variation per school
      const schoolSeed = seed + schoolCounter * 7;
      const variation = 0.8 + ((schoolSeed * 97) % 5) * 0.1; // 0.8 to 1.2
      
      let schoolNominal = 0;
      if (i === jc.count - 1) {
        schoolNominal = jenjangBudget - distributedSum;
      } else {
        schoolNominal = Math.round((jenjangBudget / jc.count) * variation);
        distributedSum += schoolNominal;
      }

      const realisasiPct = 60 + ((schoolSeed * 53) % 36); // 60% to 95%
      const realisasi = Math.round(schoolNominal * realisasiPct / 100);
      const isSwasta = (schoolSeed % 5 === 0 && jc.key !== 'UNIVERSITAS');
      const status_sekolah = isSwasta ? ('SWASTA' as const) : ('NEGERI' as const);

      let schoolName = '';
      if (jc.key === 'UNIVERSITAS') {
        const univTypes = ['Universitas', 'IAIN', 'STIE', 'Politeknik'];
        const type = univTypes[i % univTypes.length];
        schoolName = `${type} ${cleanKabName} ${i > 0 ? String.fromCharCode(65 + i) : ''}`;
      } else {
        const levelLabel = jc.label || jc.key;
        schoolName = isSwasta 
          ? `${levelLabel} Swasta Bina Bangsa ${cleanKabName}` 
          : `${jc.prefix} ${i + 1} ${cleanKabName}`;
      }

      list.push({
        id: `inst-${kabkotaId}-${schoolCounter}`,
        npsn: `${jc.key === 'UNIVERSITAS' ? '3' : jc.key === 'SMA' ? '2' : jc.key === 'SMP' ? '1' : jc.key === 'SD' ? '0' : '9'}${String(2000 + schoolCounter)}`,
        nama_institusi: schoolName,
        jenjang: jc.label === 'SMK' ? 'SMA' : jc.key, // fallback mapping to main Jenjang type
        kabupaten_kota_id: kabkotaId,
        kabupaten_kota_nama: namaKabkota,
        provinsi_nama: provinsiNama,
        status_sekolah,
        nomor_rekening: `100.${200 + schoolCounter}.${300 + schoolCounter * 3}.000`,
        alamat: `Jl. Raya ${namaKabkota} No. ${schoolCounter + 12}, ${provinsiNama}`,
        nisn: `889${String(200000 + schoolCounter)}`,
        nominal_alokasi: schoolNominal,
        realisasi_total: realisasi,
        selisih: schoolNominal - realisasi,
        persentase_penyerapan: Math.round((realisasi / schoolNominal) * 1000) / 10,
        updated_at: '2026-04-15',
      });

      schoolCounter++;
    }
  });

  return list;
}

export function getJenjangBreakdownByProvinsi(
  provinsiId: string,
  nominalAlokasi: number
): JenjangBreakdownProvinsi[] {
  const db = getDb();
  if (db) {
    const kabkotaIds = db.kabupaten_kota.filter((k: any) => k.provinsi_id === provinsiId).map((k: any) => k.id);
    const schools = db.institusi_pendidikan.filter((i: any) => kabkotaIds.includes(i.kabupaten_kota_id));
    const jenjangs: Jenjang[] = ['UNIVERSITAS', 'SMA', 'SMP', 'SD', 'PAUD'];
    const resultBreakdown = jenjangs.map((j, i) => {
      const jSchools = schools.filter(s => s.jenjang === j);
      const nominal = jSchools.reduce((sum, s) => sum + Number(s.nominal_alokasi), 0);
      const realisasi = jSchools.reduce((sum, s) => sum + Number(s.realisasi_total), 0);
      let label = j === 'UNIVERSITAS' ? 'Universitas (Strata 1)' :
                  j === 'SMA' ? 'Sekolah Menengah Atas (SMA)' :
                  j === 'SMP' ? 'Sekolah Menengah Pertama (SMP)' :
                  j === 'SD' ? 'Sekolah Dasar (SD)' :
                  'Pendidikan Anak Usia Dini (PAUD)';
      return {
        nomor: i + 1,
        jenjang: label,
        jumlah_sekolah: jSchools.length,
        nominal_keseluruhan: nominal,
        porsi_anggaran: nominalAlokasi > 0 ? (nominal / nominalAlokasi) * 100 : 0
      };
    });
    return resultBreakdown;
  }

  const provIdx = parseInt(provinsiId.replace('p-', ''), 10) - 1;
  const seed = isNaN(provIdx) ? 1 : provIdx + 1;

  const jenjangs = [
    { label: 'Universitas (Strata 1)', porsi: 5, baseCount: 15, countMod: 50, countMul: 11 },
    { label: 'Sekolah Menengah Atas (SMA)', porsi: 15, baseCount: 150, countMod: 400, countMul: 43 },
    { label: 'Sekolah Menengah Kejuruan (SMK)', porsi: 10, baseCount: 100, countMod: 300, countMul: 29 },
    { label: 'Sekolah Menengah Pertama (SMP)', porsi: 25, baseCount: 400, countMod: 1000, countMul: 83 },
    { label: 'Sekolah Dasar (SD)', porsi: 40, baseCount: 1000, countMod: 2500, countMul: 113 },
    { label: 'Pendidikan Anak Usia Dini (PAUD)', porsi: 5, baseCount: 1200, countMod: 3500, countMul: 157 },
  ];

  return jenjangs.map((j, i) => {
    const count = j.baseCount + ((seed * j.countMul) % j.countMod);
    const nominal = Math.round(nominalAlokasi * j.porsi / 100);
    return {
      nomor: i + 1,
      jenjang: j.label,
      jumlah_sekolah: count,
      nominal_keseluruhan: nominal,
      porsi_anggaran: j.porsi,
    };
  });
}

export function updateMockAnomalies(newData: AuditAnomaly[]) {
  mockAnomalies = newData;
}

export let mockAnomalies: AuditAnomaly[] = [
  {
    id: 'anom-1',
    institusi_id: 'inst-universitas-0',
    nama_institusi: 'Universitas Indonesia',
    jenjang: 'UNIVERSITAS',
    bulan: 'Maret',
    nomor_bulan: 3,
    tipe_anomali: 'Indikasi Mark-Up Pengadaan Gedung',
    keterangan: 'Ditemukan ketidaksesuaian Rencana Anggaran Biaya (RAB) pengadaan gedung mahasiswa baru sebesar 35% dari nilai pasar wajar.',
    nominal_selisih: 45_000_000_000,
    tingkat_keparahan: 'HIGH',
    status: 'TEMUAN',
    tanggal_ditemukan: '2026-03-15',
    audit_what: 'Penggelembungan dana (Mark-up) Rencana Anggaran Biaya (RAB) sebesar 35% pada proyek pembangunan gedung mahasiswa baru.',
    audit_why: 'Selisih harga satuan besi struktur dilaporkan Rp 150.000/kg (harga wajar pasar Jawa Barat adalah Rp 95.000/kg) dan beton ready mix K-350 dilaporkan Rp 1.800.000/m³ (harga wajar Rp 1.100.000/m³).',
    audit_where: 'Universitas Indonesia, Gedung Hub Mahasiswa Lantai 1-3, Depok, Jawa Barat.',
    audit_when: 'Periode Tahun Anggaran 2026, dilaporkan/ditemukan pada 15 Maret 2026.',
    audit_who: 'Pejabat Pembuat Komitmen (PPK) UI atas nama Dr. Ir. Hermawan, M.T., dan kontraktor pelaksana PT Pembangunan Nusantara Jaya.',
    audit_how: 'Merevisi seluruh Rencana Anggaran Biaya (RAB) konstruksi agar diselaraskan dengan standar e-Katalog LKPP Jawa Barat, memotong nominal pembayaran berlebih ke kontraktor pelaksana, serta melakukan audit fisik lapangan untuk menilai realisasi volume beton terpasang.',
  },
  {
    id: 'anom-2',
    institusi_id: 'inst-sma-0',
    nama_institusi: 'SMAN 1 Jakarta',
    jenjang: 'SMA',
    bulan: 'Januari',
    nomor_bulan: 1,
    tipe_anomali: 'Duplikasi Transaksi Belanja Buku',
    keterangan: 'Terdapat dua kuitansi dengan nomor seri dan nominal Rp 120.000.000 yang sama untuk pengadaan buku pelajaran semester ganjil.',
    nominal_selisih: 120_000_000,
    tingkat_keparahan: 'MEDIUM',
    status: 'INVESTIGASI',
    tanggal_ditemukan: '2026-01-20',
    audit_what: 'Pencatatan pengeluaran ganda (Duplicate billing) untuk kuitansi belanja buku pelajaran Kurikulum Merdeka.',
    audit_why: 'Ditemukan dua entri kuitansi dengan nomor seri yang sama (INV-2026-089A) dan nominal yang sama (Rp 120.000.000) yang diajukan pada dua tanggal berbeda di bulan Januari 2026.',
    audit_where: 'SMAN 1 Jakarta, Rekening BOS Reguler Sekolah.',
    audit_when: 'Periode Transaksi 12 & 24 Januari 2026, ditemukan pada 20 Januari 2026.',
    audit_who: 'Bendahara BOS SMAN 1 Jakarta (Ibu Retno Lestari) dan penyalur CV Pustaka Raya.',
    audit_how: 'Menarik kembali dana pembayaran ganda dari CV Pustaka Raya, menghapus entri kuitansi duplikat di buku kas utama, serta memberikan teguran administratif kepada bendahara BOS.',
  },
  {
    id: 'anom-3',
    institusi_id: 'inst-smp-2',
    nama_institusi: 'SMPN 1 Surabaya',
    jenjang: 'SMP',
    bulan: 'Februari',
    nomor_bulan: 2,
    tipe_anomali: 'Kurang Bayar PPN 11%',
    keterangan: 'Perhitungan pajak PPN yang disetor sebesar Rp 2.500.000, sedangkan kewajiban real berdasarkan subtotal transaksi adalah Rp 7.000.000.',
    nominal_selisih: 4_500_000,
    tingkat_keparahan: 'LOW',
    status: 'TEMUAN',
    tanggal_ditemukan: '2026-02-18',
    audit_what: 'Kurang bayar setoran pajak PPN 11% untuk pengadaan komputer dan ATK sekolah.',
    audit_why: 'Subtotal transaksi belanja riil adalah Rp 63.636.363, di mana kewajiban PPN 11% adalah Rp 7.000.000. Namun, nominal pajak yang disetorkan ke kas negara hanya dilaporkan Rp 2.500.000.',
    audit_where: 'SMPN 1 Surabaya, Jawa Timur.',
    audit_when: 'Periode Transaksi Februari 2026, ditemukan pada 18 Februari 2026.',
    audit_who: 'Kepala Sekolah SMPN 1 Surabaya (Bapak Drs. Bambang Utomo) dan supplier CV Computerindo Surabaya.',
    audit_how: 'Melakukan penyetoran kekurangan pajak PPN sebesar Rp 4.500.000 menggunakan SSP (Surat Setoran Pajak) ke Bank Persepsi, serta melakukan input ulang kode billing perpajakan.',
  },
  {
    id: 'anom-4',
    institusi_id: 'inst-universitas-1',
    nama_institusi: 'Institut Teknologi Bandung',
    jenjang: 'UNIVERSITAS',
    bulan: 'April',
    nomor_bulan: 4,
    tipe_anomali: 'Sisa Saldo Tidak Sinkron',
    keterangan: 'Realisasi dana dilaporkan ditarik dari bank sebesar Rp 12 Milyar namun laporan pertanggungjawaban (SPJ) bulanan belum di-upload.',
    nominal_selisih: 12_000_000_000,
    tingkat_keparahan: 'HIGH',
    status: 'TEMUAN',
    tanggal_ditemukan: '2026-04-10',
    audit_what: 'Realisasi penarikan dana kas tunai tanpa bukti Surat Pertanggungjawaban (SPJ) pendukung sebesar Rp 12 Milyar.',
    audit_why: 'Ditemukan penarikan tunai besar-besaran dari rekening bank ITB di bulan April 2026. Data mutasi bank menunjukkan debet Rp 12 Milyar, namun tidak ada kuitansi pembelian yang diunggah.',
    audit_where: 'Institut Teknologi Bandung (ITB), Kampus Jatinangor.',
    audit_when: 'Penarikan tunai 05 April 2026, ditemukan pada 10 April 2026.',
    audit_who: 'Biro Keuangan ITB (Bapak Ahmad Faisal) dan Bank Mandiri KCP ITB.',
    audit_how: 'Meminta Biro Keuangan mengunggah seluruh kuitansi pembelian pendukung penarikan kas tunai tersebut paling lambat 14 hari kerja, atau mengembalikan sisa saldo tunai ke rekening bank.',
  },
  {
    id: 'anom-5',
    institusi_id: 'inst-sd-0',
    nama_institusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    bulan: 'Maret',
    nomor_bulan: 3,
    tipe_anomali: 'Indikasi Pengeluaran Fiktif ATK',
    keterangan: 'Pembelian alat tulis kantor dalam jumlah berlebihan yang melebihi kapasitas operasional normal sekolah dasar.',
    nominal_selisih: 35_000_000,
    tingkat_keparahan: 'MEDIUM',
    status: 'SELESAI',
    tanggal_ditemukan: '2026-03-22',
    audit_what: 'Indikasi pengadaan fiktif untuk pembelian alat tulis kantor (ATK) dalam jumlah tidak wajar.',
    audit_how: 'Melakukan verifikasi fisik sediaan barang (stock opname) di gudang sekolah, mencocokkan nota pembelian dengan surat jalan pengiriman barang, dan memberikan sanksi administratif.',
  }
];

export const MENTENG_YEAR_DATA: Record<number, { alokasi: number; realisasi: number }> = {
  2020: { alokasi: 1_667_325_189, realisasi: 704_238_970 },
  2021: { alokasi: 1_663_453_425, realisasi: 711_051_852 },
  2022: { alokasi: 1_663_453_425, realisasi: 719_499_997 },
  2023: { alokasi: 2_154_816_334, realisasi: 877_312_945 },
  2024: { alokasi: 2_340_661_332, realisasi: 952_977_984 },
  2025: { alokasi: 2_543_401_310, realisasi: 1_048_438_799 },
  2026: { alokasi: 2_707_071_598, realisasi: 1_129_655_153 },
};

function getMonthFromDate(dateStr: string): number {
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return parseInt(parts[1], 10);
    }
  }
  const months: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6,
    jul: 7, agu: 8, sep: 9, okt: 10, nov: 11, des: 12
  };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length === 3) {
    const monthStr = parts[1].toLowerCase();
    return months[monthStr] || 1;
  }
  return 1;
}

function getSchoolTransactionsFromStore(institusiId: string, tahun: number): TransaksiGlobal[] {
  let txList: TransaksiGlobal[] = [];
  try {
    const state = useAppStore.getState();
    if (state && state.transaksiList) {
      txList = state.transaksiList;
    }
  } catch (e) {}
  if (!txList || txList.length === 0) {
    txList = INITIAL_TRANSACTIONS;
  }

  const schoolTx = txList.filter(t => t.institusiId === institusiId);
  if (schoolTx.length === 0) {
    return [];
  }

  // Scale transactions
  let scaleRealisasi = 1.0;
  if (institusiId === 'inst-sd-0') {
    const mentengData = MENTENG_YEAR_DATA[tahun] || MENTENG_YEAR_DATA[2026];
    scaleRealisasi = mentengData.realisasi / 1129655153;
  } else {
    const targetTahun = tahunAnggaranData.find(t => t.tahun === tahun) || tahunAnggaranData[6];
    const baseTahun = tahunAnggaranData[6];
    scaleRealisasi = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;
  }

  let scaledSchoolTx = schoolTx.map(t => {
    let newTanggal = t.tanggal;
    const dateParts = t.tanggal.trim().split(/\s+/);
    if (dateParts.length === 3) {
      newTanggal = `${dateParts[0]} ${dateParts[1]} ${tahun}`;
    }
    const scaledNominal = Math.round(t.nominal * scaleRealisasi);
    const scaledHargaSatuan = t.qty > 0 ? Math.round(scaledNominal / t.qty) : Math.round(t.hargaSatuan * scaleRealisasi);
    return {
      ...t,
      tanggal: newTanggal,
      nominal: scaledNominal,
      hargaSatuan: scaledHargaSatuan,
    };
  });

  // Apply rounding error correction if SDN 01 Menteng
  if (institusiId === 'inst-sd-0' && scaledSchoolTx.length > 0) {
    const mentengData = MENTENG_YEAR_DATA[tahun] || MENTENG_YEAR_DATA[2026];
    const targetRealisasi = mentengData.realisasi;
    const sumOfScaled = scaledSchoolTx.reduce((sum, t) => sum + t.nominal, 0);
    const diff = targetRealisasi - sumOfScaled;
    if (diff !== 0) {
      const lastIdx = scaledSchoolTx.length - 1;
      scaledSchoolTx[lastIdx].nominal += diff;
      if (scaledSchoolTx[lastIdx].qty > 0) {
        scaledSchoolTx[lastIdx].hargaSatuan = Math.round(scaledSchoolTx[lastIdx].nominal / scaledSchoolTx[lastIdx].qty);
      } else {
        scaledSchoolTx[lastIdx].hargaSatuan = scaledSchoolTx[lastIdx].nominal;
      }
    }
  }

  return scaledSchoolTx;
}

export const MENTENG_TRANSACTIONS: TransaksiGlobal[] = [
  {
    id: 'tr-glob-1',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Lainnya',
    item: 'Konsumsi Rapat Pleno Wali Murid',
    qty: 1,
    hargaSatuan: 89000,
    nominal: 89000,
    strukStatus: 'VALID',
    strukMessage: 'Faktur kuitansi warung makan terverifikasi lunas.',
    invoiceNo: 'INV-MNT-881A',
    vendorName: 'ZT Toko Sembako Hasil'
  },
  {
    id: 'tr-glob-2',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Lainnya',
    item: 'Snack Guru Rapat Bulanan',
    qty: 1,
    hargaSatuan: 89000,
    nominal: 89000,
    strukStatus: 'VALID',
    strukMessage: 'Kuitansi makanan ringan terverifikasi.',
    invoiceNo: 'INV-MNT-881B',
    vendorName: 'ZT Toko Sembako Hasil'
  },
  {
    id: 'tr-glob-3',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Lainnya',
    item: 'Seragam Olahraga Siswa Baru',
    qty: 2,
    hargaSatuan: 25324395,
    nominal: 50648790,
    strukStatus: 'VALID',
    strukMessage: 'SPK & Bukti timbang fisik seragam terverifikasi di gudang.',
    invoiceNo: 'INV-AFT-12A',
    vendorName: 'ALFA TOWER LT. 12, A'
  },
  {
    id: 'tr-glob-4',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Lainnya',
    item: 'Pembelian Sepatu Olahraga Guru Penjas',
    qty: 1,
    hargaSatuan: 500000,
    nominal: 500000,
    strukStatus: 'VALID',
    strukMessage: 'Kuitansi toko ritel terverifikasi.',
    invoiceNo: 'INV-AFT-12B',
    vendorName: 'ALFA TOWER LT. 12, A'
  },
  {
    id: 'tr-glob-5',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Lainnya',
    item: 'Minyak & Sembako Dapur Guru',
    qty: 1,
    hargaSatuan: 89000,
    nominal: 89000,
    strukStatus: 'VALID',
    strukMessage: 'Kuitansi belanja dapur lunas.',
    invoiceNo: 'INV-MNT-881C',
    vendorName: 'ZT Toko Sembako Hasil'
  },
  {
    id: 'tr-glob-6',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Lainnya',
    item: 'Sabun Cuci Piring & Kain Pel Kelas',
    qty: 1,
    hargaSatuan: 89000,
    nominal: 89000,
    strukStatus: 'VALID',
    strukMessage: 'Bukti nota warung lunas.',
    invoiceNo: 'INV-MNT-881D',
    vendorName: 'ZT Toko Sembako Hasil'
  },
  {
    id: 'tr-glob-7',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Lainnya',
    item: 'Gula & Teh Rapat Guru',
    qty: 0,
    hargaSatuan: 89000,
    nominal: 89000,
    strukStatus: 'VALID',
    strukMessage: 'Pembelian logistik teh rapat lunas.',
    invoiceNo: 'INV-MNT-881E',
    vendorName: 'ZT Toko Sembako Hasil'
  },
  {
    id: 'tr-glob-8',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Operasional',
    item: 'Spidol & Papan Tulis Baru Kelas VI',
    qty: 1,
    hargaSatuan: 25275000,
    nominal: 25275000,
    strukStatus: 'VALID',
    strukMessage: 'Faktur e-katalog terverifikasi dengan fisik barang.',
    invoiceNo: 'INV-ARK-092A',
    vendorName: 'Arkan Pustaka Mandiri'
  },
  {
    id: 'tr-glob-9',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Operasional',
    item: 'Buku Agenda & Absensi Guru',
    qty: 1,
    hargaSatuan: 25275000,
    nominal: 25275000,
    strukStatus: 'VALID',
    strukMessage: 'Faktur pengadaan buku administrasi sekolah valid.',
    invoiceNo: 'INV-ARK-092B',
    vendorName: 'Arkan Pustaka Mandiri'
  },
  {
    id: 'tr-glob-10',
    tanggal: '02 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Operasional',
    item: 'Kertas HVS A4 & F4 Sinar Dunia',
    qty: 1,
    hargaSatuan: 25275000,
    nominal: 25275000,
    strukStatus: 'VALID',
    strukMessage: 'Kuitansi belanja kertas lunas.',
    invoiceNo: 'INV-ARK-092C',
    vendorName: 'Arkan Pustaka Mandiri'
  },
  {
    id: 'tr-glob-11',
    tanggal: '31 Mar 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Sarana Prasarana',
    item: 'Rehabilitasi Gedung Perpustakaan & UKS Baru',
    qty: 1,
    hargaSatuan: 450000000,
    nominal: 450000000,
    strukStatus: 'DUPLIKAT',
    strukMessage: 'Peringatan: Deteksi Markup! Rencana Anggaran Biaya (RAB) terindikasi 35% di atas standar harga sarana prasarana sekolah.',
    invoiceNo: 'CONSTR-MNT-029',
    vendorName: 'PT Pembangunan Nusantara Jaya'
  },
  {
    id: 'tr-glob-12',
    tanggal: '15 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Operasional',
    item: 'Pengadaan Lisensi Software Pembelajaran Interaktif (MS Office)',
    qty: 1,
    hargaSatuan: 25000000,
    nominal: 25000000,
    strukStatus: 'VALID',
    strukMessage: 'Faktur berlisensi resmi Microsoft Indonesia lunas.',
    invoiceNo: 'INV-MS-99882',
    vendorName: 'Microsoft Indonesia'
  },
  {
    id: 'tr-glob-13',
    tanggal: '12 Jan 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Buku & Perpus',
    item: 'Pengadaan Buku Pelajaran Kurikulum Merdeka (Fase A & B)',
    qty: 1,
    hargaSatuan: 120000000,
    nominal: 120000000,
    strukStatus: 'VALID',
    strukMessage: 'Nota & tanda terima buku valid.',
    invoiceNo: 'INV-2026-089A',
    vendorName: 'CV Pustaka Raya'
  },
  {
    id: 'tr-glob-14',
    tanggal: '24 Jan 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Buku & Perpus',
    item: 'Pengadaan Buku Paket Pelajaran Tambahan Kurikulum',
    qty: 1,
    hargaSatuan: 120000000,
    nominal: 120000000,
    strukStatus: 'DUPLIKAT',
    strukMessage: 'Peringatan: Duplikasi Invoice terdeteksi! Berkas scan kuitansi identik dengan transaksi tanggal 12 Jan.',
    invoiceNo: 'INV-2026-089A',
    vendorName: 'CV Pustaka Raya'
  },
  {
    id: 'tr-glob-15',
    tanggal: '15 Feb 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Operasional',
    item: 'Pengadaan Komputer & ATK Lab Komputer Sekolah',
    qty: 1,
    hargaSatuan: 63636363,
    nominal: 63636363,
    strukStatus: 'ANOMALI_PAJAK',
    strukMessage: 'Peringatan: Kurang bayar setoran PPN 11%. Hanya disetor Rp 2.500.000 dari kewajiban Rp 7.000.000.',
    invoiceNo: 'INV-2026-COMP',
    vendorName: 'CV Computerindo Jakarta'
  },
  {
    id: 'tr-glob-16',
    tanggal: '05 Apr 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Operasional',
    item: 'Penarikan Kas Tunai Operasional Bendahara BOS',
    qty: 1,
    hargaSatuan: 120000000,
    nominal: 120000000,
    strukStatus: 'STRUK_BURAM',
    strukMessage: 'Peringatan: Penarikan tunai besar tanpa disertai dokumen rincian kuitansi belanja (SPJ) pendukung.',
    invoiceNo: 'CASH-OUT-MNT',
    vendorName: 'Biro Keuangan SDN 01 Menteng'
  },
  {
    id: 'tr-glob-17',
    tanggal: '18 Jan 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Operasional',
    item: 'Tagihan Listrik PLN & Layanan Internet WiFi Sekolah',
    qty: 1,
    hargaSatuan: 4700000,
    nominal: 4700000,
    strukStatus: 'VALID',
    strukMessage: 'Pembayaran tagihan utilitas bulanan valid.',
    invoiceNo: 'INV-PLN-8827A',
    vendorName: 'PT PLN (Persero)'
  },
  {
    id: 'tr-glob-18',
    tanggal: '10 Feb 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Sarana Prasarana',
    item: 'Pemeliharaan AC dan Ruang Kelas Belajar',
    qty: 10,
    hargaSatuan: 1540000,
    nominal: 15400000,
    strukStatus: 'VALID',
    strukMessage: 'Pengerjaan AC & pemeliharaan selesai terverifikasi.',
    invoiceNo: 'INV-AC-889B',
    vendorName: 'CV CoolTech Mandiri'
  },
  {
    id: 'tr-glob-19',
    tanggal: '22 Mar 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Kegiatan Siswa',
    item: 'Penyelenggaraan Lomba Cerdas Cermat Tingkat Kecamatan',
    qty: 1,
    hargaSatuan: 8500000,
    nominal: 8500000,
    strukStatus: 'VALID',
    strukMessage: 'Laporan pertanggungjawaban kegiatan siswa lengkap.',
    invoiceNo: 'INV-OSN-MNT',
    vendorName: 'Panitia Lomba Kecamatan'
  },
  {
    id: 'tr-glob-20',
    tanggal: '02 Jan 2026',
    institusiId: 'inst-sd-0',
    namaInstitusi: 'SDN 01 Menteng',
    jenjang: 'SD',
    kategori: 'Buku & Perpus',
    item: 'Langganan Platform Perpustakaan Digital & E-Book Sekolah',
    qty: 1,
    hargaSatuan: 75000000,
    nominal: 75000000,
    strukStatus: 'VALID',
    strukMessage: 'Invoice langganan database riset internasional lunas.',
    invoiceNo: 'INV-SD-ELSEVIER',
    vendorName: 'Elsevier BV'
  }
];



