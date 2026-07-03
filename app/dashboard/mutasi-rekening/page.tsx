'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { getProfilInstitusi, MENTENG_YEAR_DATA } from '@/lib/data';
import { useAppStore } from '@/lib/store';
import { fmtRupiah } from '@/lib/utils/formatters';
import { 
  Landmark, 
  CreditCard, 
  ShieldCheck, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Download, 
  Filter 
} from 'lucide-react';

interface MutationItem {
  id: string;
  tanggal: string;
  keterangan: string;
  tipe: 'Debet' | 'Kredit';
  nominal: number;
  runningBalance?: number;
}

export default function MutasiRekeningPage() {
  const { activeTahun, dbData, isSupabaseMode, transaksiList } = useAppStore();
  const schoolId = 'inst-sd-0'; // SDN 01 Menteng

  // Fetch active school details for active year
  const activeSchoolData = useMemo(() => {
    return getProfilInstitusi(schoolId, activeTahun);
  }, [activeTahun, dbData, isSupabaseMode, transaksiList]);

  const schoolName = activeSchoolData?.institusi.nama_institusi || 'SDN 01 Menteng';
  const npsn = activeSchoolData?.institusi.npsn || '01002003';
  const nomorRekening = activeSchoolData?.institusi.nomor_rekening || '100.201.303.000';

  // Generate Year-over-Year data for SDN 01 Menteng (2020 - 2026)
  const yearlyData = useMemo(() => {
    const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    return years.map(yr => {
      const data = getProfilInstitusi(schoolId, yr);
      const nominal = data?.institusi.nominal_alokasi || 0;
      const realisasi = data?.institusi.realisasi_total || 0;
      const selisih = nominal - realisasi;
      return {
        tahun: yr,
        nominal,
        realisasi,
        selisih
      };
    });
  }, [dbData, isSupabaseMode, transaksiList]);

  // Cumulative bank balance at the start of the year (surplus from 2020 up to activeTahun - 1)
  const saldoAwal = useMemo(() => {
    return yearlyData
      .filter(d => d.tahun < activeTahun)
      .reduce((sum, d) => sum + d.selisih, 0);
  }, [yearlyData, activeTahun]);

  // Cumulative bank balance at the end of the year
  const currentSaldo = useMemo(() => {
    return yearlyData
      .filter(d => d.tahun <= activeTahun)
      .reduce((sum, d) => sum + d.selisih, 0);
  }, [yearlyData, activeTahun]);

  // Dynamically scale realized transaction values based on activeTahun (Debets)
  const debetTransactions = useMemo(() => {
    const mentengData = MENTENG_YEAR_DATA[activeTahun] || MENTENG_YEAR_DATA[2026];
    const targetRealisasi = mentengData.realisasi;
    const baseRealisasi = 1_129_655_153;
    const scaleFactor = targetRealisasi / baseRealisasi;

    const scaledList = transaksiList.map((t) => {
      if (t.institusiId !== schoolId) return t;

      // Update date year
      let newTanggal = t.tanggal;
      const dateParts = t.tanggal.split(' ');
      if (dateParts.length === 3) {
        newTanggal = `${dateParts[0]} ${dateParts[1]} ${activeTahun}`;
      }

      // Scale nominal and round
      const scaledNominal = Math.round(t.nominal * scaleFactor);
      return {
        ...t,
        tanggal: newTanggal,
        nominal: scaledNominal,
      };
    });

    // Distribute any rounding error to the last SDN 01 Menteng transaction
    const mentengTxIndices = scaledList
      .map((t, idx) => (t.institusiId === schoolId ? idx : -1))
      .filter(idx => idx !== -1);

    if (mentengTxIndices.length > 0) {
      const sumOfScaled = mentengTxIndices.reduce((sum, idx) => sum + scaledList[idx].nominal, 0);
      const diff = targetRealisasi - sumOfScaled;
      if (diff !== 0) {
        const lastIdx = mentengTxIndices[mentengTxIndices.length - 1];
        scaledList[lastIdx].nominal += diff;
      }
    }

    return scaledList
      .filter(t => t.institusiId === schoolId)
      .map((t): MutationItem => ({
        id: t.id,
        tanggal: t.tanggal,
        keterangan: `${t.item} (${t.vendorName})`,
        tipe: 'Debet',
        nominal: t.nominal,
      }));
  }, [transaksiList, activeTahun]);

  // Generate simulated inflows for activeTahun (Credits)
  const creditTransactions = useMemo(() => {
    const nominal = activeSchoolData?.institusi.nominal_alokasi || 0;

    const apbnTotal = Math.round(nominal * 0.65);
    const apbdTotal = Math.round(nominal * 0.20);
    const csrTotal = nominal - apbnTotal - apbdTotal;

    return [
      {
        id: `cr-apbn-${activeTahun}-q1`,
        tanggal: `15 Jan ${activeTahun}`,
        keterangan: 'Pencairan Dana BOS Reguler APBN - Triwulan I',
        tipe: 'Kredit' as const,
        nominal: Math.round(apbnTotal * 0.30),
      },
      {
        id: `cr-apbd-${activeTahun}-q1`,
        tanggal: `22 Jan ${activeTahun}`,
        keterangan: 'Penyaluran Hibah Operasional APBD DKI Jakarta - Tahap I',
        tipe: 'Kredit' as const,
        nominal: Math.round(apbdTotal * 0.40),
      },
      {
        id: `cr-csr-${activeTahun}-1`,
        tanggal: `25 Feb ${activeTahun}`,
        keterangan: 'Dana Bantuan CSR Pendidikan (Yayasan Bakti Nusantara)',
        tipe: 'Kredit' as const,
        nominal: Math.round(csrTotal * 0.50),
      },
      {
        id: `cr-apbn-${activeTahun}-q2`,
        tanggal: `15 Apr ${activeTahun}`,
        keterangan: 'Pencairan Dana BOS Reguler APBN - Triwulan II',
        tipe: 'Kredit' as const,
        nominal: Math.round(apbnTotal * 0.30),
      },
      {
        id: `cr-apbn-${activeTahun}-q3`,
        tanggal: `15 Jul ${activeTahun}`,
        keterangan: 'Pencairan Dana BOS Reguler APBN - Triwulan III',
        tipe: 'Kredit' as const,
        nominal: Math.round(apbnTotal * 0.20),
      },
      {
        id: `cr-apbd-${activeTahun}-q2`,
        tanggal: `22 Jul ${activeTahun}`,
        keterangan: 'Penyaluran Hibah Operasional APBD DKI Jakarta - Tahap II',
        tipe: 'Kredit' as const,
        nominal: apbdTotal - Math.round(apbdTotal * 0.40),
      },
      {
        id: `cr-csr-${activeTahun}-2`,
        tanggal: `25 Agu ${activeTahun}`,
        keterangan: 'Dana Bantuan CSR Pendidikan (Yayasan Bakti Nusantara) - Tahap II',
        tipe: 'Kredit' as const,
        nominal: csrTotal - Math.round(csrTotal * 0.50),
      },
      {
        id: `cr-apbn-${activeTahun}-q4`,
        tanggal: `15 Okt ${activeTahun}`,
        keterangan: 'Pencairan Dana BOS Reguler APBN - Triwulan IV',
        tipe: 'Kredit' as const,
        nominal: apbnTotal - Math.round(apbnTotal * 0.30) - Math.round(apbnTotal * 0.30) - Math.round(apbnTotal * 0.20),
      },
    ];
  }, [activeSchoolData, activeTahun]);

  // Helper: Parse date format "DD MMM YYYY" (e.g. "12 Jan 2026")
  const parseIndoDate = (dateStr: string): Date => {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
      jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11
    };
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const monthStr = parts[1].toLowerCase();
      const year = parseInt(parts[2], 10);
      const month = months[monthStr] !== undefined ? months[monthStr] : 0;
      return new Date(year, month, day);
    }
    return new Date();
  };

  // Combine, sort chronologically, and calculate running balance
  const allMutations = useMemo(() => {
    const combined = [...debetTransactions, ...creditTransactions];
    
    // Sort oldest first to calculate running balance correctly
    combined.sort((a, b) => parseIndoDate(a.tanggal).getTime() - parseIndoDate(b.tanggal).getTime());

    let balance = saldoAwal;
    const computed = combined.map(item => {
      if (item.tipe === 'Kredit') {
        balance += item.nominal;
      } else {
        balance -= item.nominal;
      }
      return {
        ...item,
        runningBalance: balance
      };
    });

    // Reverse to show latest transactions first
    return computed.reverse();
  }, [debetTransactions, creditTransactions, saldoAwal]);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Semua' | 'Kredit' | 'Debet'>('Semua');
  const [monthFilter, setMonthFilter] = useState('Semua');

  const monthsList = [
    { label: 'Januari', val: 'Jan' },
    { label: 'Februari', val: 'Feb' },
    { label: 'Maret', val: 'Mar' },
    { label: 'April', val: 'Apr' },
    { label: 'Mei', val: 'Mei' },
    { label: 'Juni', val: 'Jun' },
    { label: 'Juli', val: 'Jul' },
    { label: 'Agustus', val: 'Agu' },
    { label: 'September', val: 'Sep' },
    { label: 'Oktober', val: 'Okt' },
    { label: 'November', val: 'Nov' },
    { label: 'Desember', val: 'Des' },
  ];

  // Apply filters
  const filteredMutations = useMemo(() => {
    return allMutations.filter(item => {
      const matchesSearch = item.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.tanggal.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'Semua' ? true : item.tipe === typeFilter;
      
      const matchesMonth = monthFilter === 'Semua' ? true : item.tanggal.includes(monthFilter);

      return matchesSearch && matchesType && matchesMonth;
    });
  }, [allMutations, searchTerm, typeFilter, monthFilter]);

  // Download simulation
  const handleDownloadCSV = () => {
    alert('Simulasi download mutasi rekening sukses! (File CSV sedang disiapkan oleh sistem)');
  };

  return (
    <div className="min-h-screen">
      <Header
        title={`Mutasi Rekening: ${schoolName}`}
        subtitle={`Riwayat transaksi keuangan rekening koran sekolah untuk tahun anggaran ${activeTahun}`}
      />

      <div className="p-6 space-y-6">
        {/* TOP PANEL: Saldo, NPSN, and No. Rekening */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Saldo Rekapitulasi */}
          <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px] border-l-4 border-l-indigo-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Saldo Rekapitulasi di Bank</p>
                <h3 className="text-xl lg:text-2xl font-extrabold text-text-primary mt-2">
                  Rp {fmtRupiah(currentSaldo)}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Landmark size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-text-muted">
              <Calendar size={12} className="text-indigo-500" />
              <span>Akumulasi sisa anggaran 2020 - {activeTahun}</span>
            </div>
          </div>

          {/* Card 2: NPSN */}
          <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px] border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Nomor Pokok Sekolah Nasional (NPSN)</p>
                <h3 className="text-xl lg:text-2xl font-mono font-extrabold text-text-primary mt-2">
                  {npsn}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className="font-semibold text-emerald-600">Terdaftar Resmi</span>
              <span>• Kemendikbudristek RI</span>
            </div>
          </div>

          {/* Card 3: Nomor Rekening */}
          <div className="glass-card p-5 relative overflow-hidden flex flex-col justify-between min-h-[120px] border-l-4 border-l-blue-500">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">No. Rekening Bank BRI</p>
                <h3 className="text-xl lg:text-2xl font-mono font-extrabold text-text-primary mt-2">
                  {nomorRekening}
                </h3>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-text-muted">
              <span className="font-semibold text-blue-600">BANK BRI</span>
              <span>• Rekening Giro Penampung BOS</span>
            </div>
          </div>
        </div>

        {/* MUTATION LIST TABLE */}
        <div className="glass-card">
          {/* Filters & Actions Bar */}
          <div className="p-5 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-indigo-600" />
              <h3 className="text-sm font-semibold text-text-primary">Daftar Mutasi Transaksi Rekening</h3>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari transaksi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input w-full md:w-48 pl-9"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="select-dropdown py-1.5 text-xs"
              >
                <option value="Semua">Semua Tipe</option>
                <option value="Kredit">Kredit (Uang Masuk)</option>
                <option value="Debet">Debet (Uang Keluar)</option>
              </select>

              {/* Month Filter */}
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="select-dropdown py-1.5 text-xs"
              >
                <option value="Semua">Semua Bulan</option>
                {monthsList.map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>

              {/* Export Button */}
              <button
                onClick={handleDownloadCSV}
                className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs shadow-sm"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sheet-header-cell text-left" style={{ width: 140 }}>Tanggal</th>
                  <th className="sheet-header-cell text-left">Keterangan / Rujukan</th>
                  <th className="sheet-header-cell text-center" style={{ width: 120 }}>Tipe</th>
                  <th className="sheet-header-cell text-right" style={{ width: 200 }}>Jumlah</th>
                  <th className="sheet-header-cell text-right" style={{ width: 220 }}>Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody>
                {filteredMutations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-muted text-xs">
                      Tidak ada histori mutasi transaksi yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredMutations.map((item) => (
                    <tr key={item.id} className="hover:bg-bg-card/30 transition-colors border-b border-border/40">
                      <td className="sheet-cell text-text-primary text-xs font-medium">
                        {item.tanggal}
                      </td>
                      <td className="sheet-cell text-text-primary text-xs max-w-md truncate">
                        {item.keterangan}
                      </td>
                      <td className="sheet-cell text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.tipe === 'Kredit' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200/50'
                        }`}>
                          {item.tipe === 'Kredit' ? (
                            <>
                              <ArrowUpRight size={10} />
                              <span>Kredit (In)</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft size={10} />
                              <span>Debet (Out)</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className={`sheet-cell text-right font-semibold text-xs ${
                        item.tipe === 'Kredit' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {item.tipe === 'Kredit' ? '+' : '-'} Rp {fmtRupiah(item.nominal)}
                      </td>
                      <td className="sheet-cell text-right font-mono font-medium text-xs text-text-secondary">
                        Rp {fmtRupiah(item.runningBalance || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Metadata */}
          <div className="px-5 py-3.5 border-t border-border bg-slate-50/50 flex items-center justify-between text-[11px] text-text-muted font-medium">
            <span>
              Menampilkan {filteredMutations.length} dari {allMutations.length} total mutasi transaksi.
            </span>
            <span>
              Saldo Akhir Tahun {activeTahun}: <strong className="text-text-primary font-mono text-xs ml-1">Rp {fmtRupiah(currentSaldo)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
