'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PctBadge from '@/components/ui/PctBadge';
import { useAppStore } from '@/lib/store';
import { alokasiProvinsiData, tahunAnggaranData } from '@/lib/data';
import { fmtRupiah, fmtTriliun } from '@/lib/utils/formatters';
import { AlokasiProvinsi } from '@/types';
import { Search, Download, RefreshCw } from 'lucide-react';

export default function ProvinsiPage() {
  const { activeTahun, dbData, isSupabaseMode } = useAppStore();

  const scaledProvinsiData = useMemo(() => {
    const targetTahun = tahunAnggaranData.find(t => t.tahun === activeTahun) || tahunAnggaranData[6];
    const baseTahun = tahunAnggaranData[6];
    const scale = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;
    const seed = (activeTahun % 7) || 1;
    const shift = 0.95 + (seed * 0.012);

    return alokasiProvinsiData.map(p => {
      const nominal = Math.round(p.nominal_alokasi * scale);
      const realisasi = Math.min(nominal, Math.round(p.realisasi_total * scale * shift));
      return {
        ...p,
        nominal_alokasi: nominal,
        realisasi_total: realisasi,
        selisih: nominal - realisasi,
        persentase_penyerapan: nominal > 0 ? (realisasi / nominal) * 100 : 0,
      };
    });
  }, [activeTahun, dbData, isSupabaseMode]);

  const [data, setData] = useState<AlokasiProvinsi[]>(scaledProvinsiData);

  useEffect(() => {
    setData(scaledProvinsiData);
  }, [scaledProvinsiData]);

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return data;
    return data.filter(p => p.provinsi.nama_provinsi.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const totals = useMemo(() => {
    const nom = filtered.reduce((s, p) => s + p.nominal_alokasi, 0);
    const real = filtered.reduce((s, p) => s + p.realisasi_total, 0);
    return { nominal: nom, realisasi: real, selisih: nom - real, pct: nom > 0 ? (real / nom) * 100 : 0 };
  }, [filtered]);

  const renderCell = (row: AlokasiProvinsi, field: 'nominal' | 'realisasi') => {
    const value = field === 'nominal' ? row.nominal_alokasi : row.realisasi_total;
    return (
      <td className="sheet-cell text-right">
        {fmtRupiah(value)}
      </td>
    );
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Provinsi"
        subtitle={`Alokasi APBN Pendidikan per Wilayah Provinsi Tahun ${activeTahun}`}
      />

      <div className="p-6">
        {/* Toolbar */}
        <div className="sheet-toolbar">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Cari provinsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <span className="text-xs text-text-muted flex-1">{filtered.length} provinsi</span>
          <button className="btn btn-ghost">
            <RefreshCw size={14} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Download size={14} />
            Ekspor Excel
          </button>
        </div>

        {/* Spreadsheet Table */}
        <div className="sheet-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 200 }}>Nama Provinsi</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 180 }}>Nominal (Rp)</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 180 }}>Realisasi (Rp)</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 150 }}>Selisih</th>
                <th className="sheet-header-cell text-center" style={{ width: 120 }}>% Penyerapan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                  <td className="sheet-cell text-center text-text-muted text-xs">{idx + 1}</td>
                  <td className="sheet-cell text-left font-medium text-text-primary">
                    <Link href={`/dashboard/provinsi/${row.provinsi_id}`} className="hover:text-accent hover:underline transition-colors">
                      {row.provinsi.nama_provinsi}
                    </Link>
                  </td>
                  {renderCell(row, 'nominal')}
                  {renderCell(row, 'realisasi')}
                  <td className="sheet-cell text-right text-rose-600">{fmtTriliun(row.selisih)}</td>
                  <td className="sheet-cell text-center">
                    <PctBadge value={row.persentase_penyerapan} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sheet-footer-cell text-center" />
                <td className="sheet-footer-cell text-left font-bold">TOTAL ({filtered.length} Provinsi)</td>
                <td className="sheet-footer-cell text-right">{fmtRupiah(totals.nominal)}</td>
                <td className="sheet-footer-cell text-right">{fmtRupiah(totals.realisasi)}</td>
                <td className="sheet-footer-cell text-right text-rose-600">{fmtTriliun(totals.selisih)}</td>
                <td className="sheet-footer-cell text-center">
                  <PctBadge value={totals.pct} size="md" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
