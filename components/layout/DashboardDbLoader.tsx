'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import {
  updateTahunAnggaranData,
  updateAlokasiProvinsiData,
  updateUsersData,
  updateMockAnomalies
} from '@/lib/data';
import { Database, Loader2, CloudAlert, Sparkles } from 'lucide-react';

export default function DashboardDbLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    isSupabaseMode,
    setIsSupabaseMode,
    dbData,
    setDbData,
    isLoadingDb,
    setIsLoadingDb,
    setTransaksiList,
    setNotifications
  } = useAppStore();

  const [loaderText, setLoaderText] = useState('Menginisialisasi dasbor...');
  const [initFailed, setInitFailed] = useState(false);
  const [failReason, setFailReason] = useState('');

  useEffect(() => {
    async function loadDatabase() {
      // Check if environment variables are set
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !key) {
        console.log('[Supabase Loader] Credentials missing. Falling back to local Mock Data.');
        setIsSupabaseMode(false);
        setIsLoadingDb(false);
        return;
      }

      setIsLoadingDb(true);
      setLoaderText('Memeriksa skema database Supabase...');

      try {
        // Test query on one table to see if connection works and schema exists
        const { data: testData, error: testError } = await supabase
          .from('tahun_anggaran')
          .select('*')
          .limit(1);

        if (testError) {
          // If connection fails or table doesn't exist, fall back to mock data
          if (testError.message.includes('relation') || testError.message.includes('does not exist')) {
            console.warn('[Supabase Loader] Table "tahun_anggaran" does not exist in Supabase. Run schema DDL first. Falling back to Mock Data.');
            setIsSupabaseMode(false);
            setIsLoadingDb(false);
            return;
          }
          throw testError;
        }

        // Connection successful and tables exist! Start downloading everything
        setLoaderText('Mengunduh data anggaran dan wilayah...');
        
        // Fetch all tables in parallel
        const [
          resTahun,
          resProv,
          resAlokasiProv,
          resKab,
          resAlokasiKab,
          resInst,
          resSD,
          resPB,
          resItems,
          resUsers,
          resAnoms
        ] = await Promise.all([
          supabase.from('tahun_anggaran').select('*'),
          supabase.from('provinsi').select('*'),
          supabase.from('alokasi_provinsi').select('*'),
          supabase.from('kabupaten_kota').select('*'),
          supabase.from('alokasi_kabupaten_kota').select('*'),
          supabase.from('institusi_pendidikan').select('*'),
          supabase.from('sumber_dana_institusi').select('*'),
          supabase.from('pengeluaran_bulanan_institusi').select('*'),
          supabase.from('rincian_pengeluaran_item').select('*'),
          supabase.from('users').select('*'),
          supabase.from('audit_anomaly').select('*')
        ]);

        // Check for any fetch errors
        if (resTahun.error) throw resTahun.error;
        if (resProv.error) throw resProv.error;
        if (resAlokasiProv.error) throw resAlokasiProv.error;
        if (resKab.error) throw resKab.error;
        if (resAlokasiKab.error) throw resAlokasiKab.error;
        if (resInst.error) throw resInst.error;
        if (resSD.error) throw resSD.error;
        if (resPB.error) throw resPB.error;
        if (resItems.error) throw resItems.error;
        if (resUsers.error) throw resUsers.error;
        if (resAnoms.error) throw resAnoms.error;

        setLoaderText('Sinkronisasi data sistem...');

        const loadedDb = {
          tahun_anggaran: resTahun.data || [],
          provinsi: resProv.data || [],
          alokasi_provinsi: resAlokasiProv.data || [],
          kabupaten_kota: resKab.data || [],
          alokasi_kabupaten_kota: resAlokasiKab.data || [],
          institusi_pendidikan: resInst.data || [],
          sumber_dana_institusi: resSD.data || [],
          pengeluaran_bulanan_institusi: resPB.data || [],
          rincian_pengeluaran_item: resItems.data || [],
          users: resUsers.data || [],
          audit_anomaly: resAnoms.data || []
        };

        // Cache in Zustand store
        setDbData(loadedDb);
        setIsSupabaseMode(true);

        // Sync rincian_pengeluaran_item to global transaksiList
        const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const mappedTx = loadedDb.rincian_pengeluaran_item.map((item: any) => {
          const inst = loadedDb.institusi_pendidikan.find((i: any) => i.id === item.institusi_id);
          const monthShort = monthNamesShort[(item.nomor_bulan || 1) - 1];
          let kategori: "Sarana Prasarana" | "Gaji Honorer" | "Operasional" | "Buku & Perpus" | "Kegiatan Siswa" | "Lainnya" = 'Operasional';
          const lowerName = item.nama_produk_jasa?.toLowerCase() || '';
          if (lowerName.includes('buku') || lowerName.includes('perpus')) kategori = 'Buku & Perpus';
          else if (lowerName.includes('gaji') || lowerName.includes('honor')) kategori = 'Gaji Honorer';
          else if (lowerName.includes('gedung') || lowerName.includes('sarana')) kategori = 'Sarana Prasarana';

          return {
            id: `tr-db-${item.id}`,
            tanggal: `15 ${monthShort} 2026`, // default dummy date in the middle of the month
            institusiId: item.institusi_id,
            namaInstitusi: inst?.nama_institusi || 'Unknown',
            jenjang: inst?.jenjang || 'SD',
            kategori: kategori,
            item: item.nama_produk_jasa,
            qty: item.qty || 1,
            hargaSatuan: item.harga_satuan,
            nominal: item.jumlah,
            strukStatus: 'VALID' as "VALID" | "DUPLIKAT" | "ANOMALI_PAJAK" | "STRUK_BURAM",
            strukMessage: 'Data terverifikasi (Sinkronisasi Cloud Supabase)',
            invoiceNo: `INV-${item.id.substring(0, 6).toUpperCase()}`,
            vendorName: 'Vendor Eksternal'
          };
        });
        setTransaksiList(mappedTx);

        // Enrich alokasi_provinsi with province details for components that need it
        const enrichedAlokasiProvinsi = (loadedDb.alokasi_provinsi || []).map((ap: any) => {
          const prov = (loadedDb.provinsi || []).find((p: any) => p.id === ap.provinsi_id);
          return {
            ...ap,
            nominal_alokasi: Number(ap.nominal_alokasi),
            realisasi_total: Number(ap.realisasi_total),
            selisih: Number(ap.selisih),
            persentase_penyerapan: Number(ap.persentase_penyerapan),
            provinsi: prov || {
              id: ap.provinsi_id,
              kode_provinsi: '',
              nama_provinsi: 'Provinsi Tidak Dikenal'
            }
          };
        });

        // Sync local memory let variables in lib/data
        updateTahunAnggaranData(loadedDb.tahun_anggaran);
        updateAlokasiProvinsiData(enrichedAlokasiProvinsi);
        updateUsersData(loadedDb.users);
        updateMockAnomalies(loadedDb.audit_anomaly);

        // Generate notifications from anomalies dynamically
        const activeAnoms = loadedDb.audit_anomaly || [];
        const mappedNotifications = activeAnoms.map((anom: any, idx: number) => {
          let nType: 'info' | 'success' | 'warning' | 'error' = 'info';
          if (anom.severity === 'HIGH') nType = 'warning';
          else if (anom.severity === 'MEDIUM') nType = 'info';
          else if (anom.severity === 'LOW') nType = 'success';
          return {
            id: `n-anom-${anom.id}`,
            message: `Peringatan Audit: Terdeteksi ${anom.tipe_anomali} di ${anom.nama_institusi || 'Institusi'} (${anom.bulan || '2026'})`,
            time: `${idx + 1} jam yang lalu`,
            unread: anom.status !== 'SELESAI',
            type: nType,
            link: `/dashboard/profil-institusi/${anom.institusi_id}`
          };
        });
        
        if (mappedNotifications.length === 0) {
          mappedNotifications.push({
            id: 'n-system-ready',
            message: 'Semua sistem terhubung dengan Supabase dan berjalan normal.',
            time: 'Baru saja',
            unread: false,
            type: 'success',
            link: '/dashboard'
          });
        }
        setNotifications(mappedNotifications);

        console.log('[Supabase Loader] Synced all tables from Supabase successfully.');
      } catch (err: any) {
        console.error('[Supabase Loader] Connection failed:', err.message);
        setInitFailed(true);
        setFailReason(err.message || 'Gagal menghubungi server Supabase.');
        // Auto fallback to mock data after 3 seconds warning
        setTimeout(() => {
          setIsSupabaseMode(false);
          setIsLoadingDb(false);
        }, 3000);
      } finally {
        // Wait a tiny bit for user experience
        setTimeout(() => {
          setIsLoadingDb(false);
        }, 600);
      }
    }

    loadDatabase();
  }, []);

  if (isLoadingDb) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl transition-all duration-500">
        <div className="relative flex flex-col items-center max-w-md p-8 text-center space-y-6">
          
          {/* Glowing Orbs Backdrop */}
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />

          {initFailed ? (
            <>
              {/* Failure UI */}
              <div className="relative p-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full animate-bounce">
                <CloudAlert size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Koneksi Supabase Gagal</h3>
                <p className="text-xs text-slate-400 break-all px-4">{failReason}</p>
                <p className="text-xs text-indigo-400 font-semibold mt-4">Mengalihkan secara otomatis ke Mode Mock Data...</p>
              </div>
            </>
          ) : (
            <>
              {/* Loading UI */}
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl scale-125 animate-pulse" />
                <div className="relative p-6 bg-slate-900 border border-slate-800 text-indigo-500 rounded-3xl shadow-2xl flex items-center justify-center">
                  <Database size={44} className="animate-pulse" />
                  <Loader2 size={24} className="absolute text-emerald-400 animate-spin -top-1 -right-1" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                  <Sparkles size={12} />
                  <span>Supabase Mode Active</span>
                </div>
                <h3 className="text-md font-bold text-white tracking-wide">{loaderText}</h3>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Menyinkronkan data transaksional anggaran pendidikan nasional langsung dari cloud database
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
