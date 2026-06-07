import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.error('Error: .env file not found at', envPath);
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Import mock data directly using relative imports
import {
  tahunAnggaranData,
  alokasiProvinsiData,
  getKabkotaByProvinsi,
  getAllInstitusi,
  getProfilInstitusi,
  getRincianPengeluaranBulanan,
  usersData,
  mockAnomalies
} from '../lib/data';

async function main() {
  console.log('=== STARTING SUPABASE IMPORT SCRIPT ===');
  console.log('Target URL:', supabaseUrl);
  
  const results: Record<string, number> = {};

  try {
    // 1. Import tahun_anggaran
    console.log('1. Importing tahun_anggaran...');
    const formattedTahun = tahunAnggaranData.map(t => ({
      id: t.id,
      tahun: t.tahun,
      total_anggaran: t.total_anggaran,
      status: t.status,
      created_at: t.created_at
    }));
    const { error: errTahun } = await supabase.from('tahun_anggaran').upsert(formattedTahun);
    if (errTahun) throw new Error(`tahun_anggaran: ${errTahun.message}`);
    results['tahun_anggaran'] = formattedTahun.length;
    console.log(`   Success: Imported ${formattedTahun.length} rows.`);

    // 2. Import provinsi and alokasi_provinsi
    console.log('2. Importing provinsi & alokasi_provinsi...');
    const uniqueProvinces = new Map<string, { id: string; kode_provinsi: string; nama_provinsi: string }>();
    const formattedAlokasiProv: any[] = [];

    alokasiProvinsiData.forEach(ap => {
      uniqueProvinces.set(ap.provinsi_id, {
        id: ap.provinsi_id,
        kode_provinsi: ap.provinsi.kode_provinsi,
        nama_provinsi: ap.provinsi.nama_provinsi
      });
      formattedAlokasiProv.push({
        id: ap.id,
        tahun_anggaran_id: ap.tahun_anggaran_id,
        provinsi_id: ap.provinsi_id,
        nominal_alokasi: ap.nominal_alokasi,
        realisasi_total: ap.realisasi_total,
        selisih: ap.selisih,
        persentase_penyerapan: ap.persentase_penyerapan,
        updated_at: ap.updated_at
      });
    });

    const provList = Array.from(uniqueProvinces.values());
    const { error: errProv } = await supabase.from('provinsi').upsert(provList);
    if (errProv) throw new Error(`provinsi: ${errProv.message}`);
    results['provinsi'] = provList.length;

    const { error: errAlokasiProv } = await supabase.from('alokasi_provinsi').upsert(formattedAlokasiProv);
    if (errAlokasiProv) throw new Error(`alokasi_provinsi: ${errAlokasiProv.message}`);
    results['alokasi_provinsi'] = formattedAlokasiProv.length;
    console.log(`   Success: Imported ${provList.length} provinces and ${formattedAlokasiProv.length} provincial allocations.`);

    // 3. Import kabupaten_kota and alokasi_kabupaten_kota
    console.log('3. Importing kabupaten_kota & alokasi_kabupaten_kota...');
    const allKabkota: any[] = [];
    const allAlokasiKabkota: any[] = [];
    const kabkotaIds = new Set<string>();

    for (const prov of provList) {
      const kabList = getKabkotaByProvinsi(prov.id);
      kabList.forEach(k => {
        if (!kabkotaIds.has(k.kabupaten_kota_id)) {
          allKabkota.push({
            id: k.kabupaten_kota_id,
            provinsi_id: k.kabupaten_kota.provinsi_id,
            kode_kabupaten_kota: k.kabupaten_kota.kode_kabupaten_kota,
            nama_kabupaten_kota: k.kabupaten_kota.nama_kabupaten_kota,
            tipe: k.kabupaten_kota.tipe
          });
          kabkotaIds.add(k.kabupaten_kota_id);
        }
        allAlokasiKabkota.push({
          id: k.id,
          alokasi_provinsi_id: k.alokasi_provinsi_id,
          kabupaten_kota_id: k.kabupaten_kota_id,
          provinsi_nama: k.provinsi_nama,
          nominal_alokasi: k.nominal_alokasi,
          realisasi_total: k.realisasi_total,
          selisih: k.selisih,
          persentase_penyerapan: k.persentase_penyerapan,
          updated_at: k.updated_at
        });
      });
    }

    const batchSize = 100;
    for (let i = 0; i < allKabkota.length; i += batchSize) {
      const batch = allKabkota.slice(i, i + batchSize);
      const { error } = await supabase.from('kabupaten_kota').upsert(batch);
      if (error) throw new Error(`kabupaten_kota batch: ${error.message}`);
    }
    results['kabupaten_kota'] = allKabkota.length;

    for (let i = 0; i < allAlokasiKabkota.length; i += batchSize) {
      const batch = allAlokasiKabkota.slice(i, i + batchSize);
      const { error } = await supabase.from('alokasi_kabupaten_kota').upsert(batch);
      if (error) throw new Error(`alokasi_kabupaten_kota batch: ${error.message}`);
    }
    results['alokasi_kabupaten_kota'] = allAlokasiKabkota.length;
    console.log(`   Success: Imported ${allKabkota.length} districts and ${allAlokasiKabkota.length} district allocations.`);

    // 4. Import schools and related sub-tables
    console.log('4. Importing institusi_pendidikan and related data...');
    const defaultSchools = getAllInstitusi();
    
    const allSchools: any[] = [];
    const allSumberDana: any[] = [];
    const allPengeluaranBulanan: any[] = [];
    const allRincianItems: any[] = [];
    const schoolIds = new Set<string>();

    defaultSchools.forEach(school => {
      if (!schoolIds.has(school.id)) {
        allSchools.push({
          id: school.id,
          npsn: school.npsn,
          nama_institusi: school.nama_institusi,
          jenjang: school.jenjang,
          kabupaten_kota_id: school.kabupaten_kota_id === 'auto-match' ? null : school.kabupaten_kota_id,
          kabupaten_kota_nama: school.kabupaten_kota_nama,
          provinsi_nama: school.provinsi_nama,
          status_sekolah: school.status_sekolah,
          nomor_rekening: school.nomor_rekening || null,
          alamat: school.alamat || null,
          nisn: school.nisn || null,
          nominal_alokasi: school.nominal_alokasi,
          realisasi_total: school.realisasi_total,
          selisih: school.selisih,
          persentase_penyerapan: school.persentase_penyerapan,
          updated_at: school.updated_at
        });
        schoolIds.add(school.id);

        const profil = getProfilInstitusi(school.id, 2026);
        if (profil) {
          profil.sumber_dana.forEach(sd => {
            allSumberDana.push({
              id: sd.id,
              institusi_id: sd.institusi_id,
              nama_sumber: sd.nama_sumber,
              tahun_anggaran: sd.tahun_anggaran,
              nominal: sd.nominal,
              realisasi: sd.realisasi,
              saldo_di_bank: sd.saldo_di_bank
            });
          });

          profil.pengeluaran_bulanan.forEach(pb => {
            allPengeluaranBulanan.push({
              id: pb.id,
              institusi_id: pb.institusi_id,
              nomor: pb.nomor,
              bulan: pb.bulan,
              nominal_pengeluaran: pb.nominal_pengeluaran,
              qty: pb.qty,
              sub_total: pb.sub_total
            });

            const rincian = getRincianPengeluaranBulanan(school.id, pb.nomor, 2026);
            if (rincian) {
              rincian.items.forEach(item => {
                allRincianItems.push({
                  id: item.id,
                  institusi_id: school.id,
                  nomor_bulan: pb.nomor,
                  nomor: item.nomor,
                  nama_produk_jasa: item.nama_produk_jasa,
                  harga_satuan: item.harga_satuan,
                  qty: item.qty,
                  jumlah: item.jumlah
                });
              });
            }
          });
        }
      }
    });

    const { error: errSchool } = await supabase.from('institusi_pendidikan').upsert(allSchools);
    if (errSchool) throw new Error(`institusi_pendidikan: ${errSchool.message}`);
    results['institusi_pendidikan'] = allSchools.length;

    const { error: errSD } = await supabase.from('sumber_dana_institusi').upsert(allSumberDana);
    if (errSD) throw new Error(`sumber_dana_institusi: ${errSD.message}`);
    results['sumber_dana_institusi'] = allSumberDana.length;

    const { error: errPB } = await supabase.from('pengeluaran_bulanan_institusi').upsert(allPengeluaranBulanan);
    if (errPB) throw new Error(`pengeluaran_bulanan_institusi: ${errPB.message}`);
    results['pengeluaran_bulanan_institusi'] = allPengeluaranBulanan.length;

    for (let i = 0; i < allRincianItems.length; i += batchSize) {
      const batch = allRincianItems.slice(i, i + batchSize);
      const { error } = await supabase.from('rincian_pengeluaran_item').upsert(batch);
      if (error) throw new Error(`rincian_pengeluaran_item batch: ${error.message}`);
    }
    results['rincian_pengeluaran_item'] = allRincianItems.length;
    console.log(`   Success: Imported ${allSchools.length} schools, ${allSumberDana.length} sources, ${allPengeluaranBulanan.length} monthly spend records, and ${allRincianItems.length} line items.`);

    // 5. Import users
    console.log('5. Importing users...');
    const formattedUsers = usersData.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      provinsi_id: u.provinsi_id || null,
      kabupaten_kota_id: u.kabupaten_kota_id || null,
      is_active: u.is_active,
      created_at: u.created_at
    }));
    const { error: errUsers } = await supabase.from('users').upsert(formattedUsers);
    if (errUsers) throw new Error(`users: ${errUsers.message}`);
    results['users'] = formattedUsers.length;
    console.log(`   Success: Imported ${formattedUsers.length} users.`);

    // 6. Import audit anomalies
    console.log('6. Importing audit anomalies...');
    const formattedAnomalies = mockAnomalies.map(a => ({
      id: a.id,
      institusi_id: a.institusi_id,
      nama_institusi: a.nama_institusi,
      jenjang: a.jenjang,
      bulan: a.bulan,
      nomor_bulan: a.nomor_bulan,
      tipe_anomali: a.tipe_anomali,
      keterangan: a.keterangan,
      nominal_selisih: a.nominal_selisih,
      tingkat_keparahan: a.tingkat_keparahan,
      status: a.status,
      tanggal_ditemukan: a.tanggal_ditemukan,
      audit_what: a.audit_what || null,
      audit_why: a.audit_why || null,
      audit_where: a.audit_where || null,
      audit_when: a.audit_when || null,
      audit_who: a.audit_who || null,
      audit_how: a.audit_how || null
    }));
    const { error: errAnomalies } = await supabase.from('audit_anomaly').upsert(formattedAnomalies);
    if (errAnomalies) throw new Error(`audit_anomaly: ${errAnomalies.message}`);
    results['audit_anomaly'] = formattedAnomalies.length;
    console.log(`   Success: Imported ${formattedAnomalies.length} audit anomalies.`);

    console.log('\n=== IMPORT COMPLETED SUCCESSFULLY ===');
    console.log('Summary of inserted rows:', results);

  } catch (error: any) {
    console.error('\n=== IMPORT FAILED ===');
    console.error(error.message);
    process.exit(1);
  }
}

main();
