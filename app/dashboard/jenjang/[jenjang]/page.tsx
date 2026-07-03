'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import PctBadge from '@/components/ui/PctBadge';
import { useAppStore } from '@/lib/store';
import { getInstitusiByJenjang, alokasiProvinsiData, getKabkotaByProvinsi, tahunAnggaranData } from '@/lib/data';
import { fmtRupiah, fmtTriliun } from '@/lib/utils/formatters';
import { Jenjang, InstitusiPendidikan } from '@/types';
import { Search, Download } from 'lucide-react';

const jenjangLabels: Record<string, { label: string; jenjang: Jenjang }> = {
  universitas: { label: 'Universitas', jenjang: 'UNIVERSITAS' },
  sma: { label: 'SMA', jenjang: 'SMA' },
  smp: { label: 'SMP', jenjang: 'SMP' },
  sd: { label: 'SD', jenjang: 'SD' },
  paud: { label: 'PAUD', jenjang: 'PAUD' },
};

export default function JenjangPage() {
  const params = useParams();
  const slug = params.jenjang as string;
  const config = jenjangLabels[slug] || jenjangLabels.universitas;
  const { activeTahun, dbData, isSupabaseMode } = useAppStore();

  const rawData = useMemo(() => {
    const list = getInstitusiByJenjang(config.jenjang);
    const targetTahun = tahunAnggaranData.find(t => t.tahun === activeTahun) || tahunAnggaranData[6];
    const baseTahun = tahunAnggaranData[6];
    const scale = targetTahun.total_anggaran > 0 ? targetTahun.total_anggaran / baseTahun.total_anggaran : 1.0;
    const seed = (activeTahun % 7) || 1;
    const shift = 0.95 + (seed * 0.012);

    return list.map(item => {
      const nominal = Math.round(item.nominal_alokasi * scale);
      const realisasi = Math.min(nominal, Math.round(item.realisasi_total * scale * shift));
      return {
        ...item,
        nominal_alokasi: nominal,
        realisasi_total: realisasi,
        selisih: nominal - realisasi,
        persentase_penyerapan: nominal > 0 ? Math.round((realisasi / nominal) * 1000) / 10 : 0
      };
    });
  }, [config.jenjang, activeTahun, dbData, isSupabaseMode]);

  const [data, setData] = useState<InstitusiPendidikan[]>(rawData);

  useEffect(() => {
    setData(rawData);
  }, [rawData]);

  const [search, setSearch] = useState('');
  const [selectedProvinsiId, setSelectedProvinsiId] = useState('');
  const [selectedKabKotaName, setSelectedKabKotaName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Reset when jenjang changes
  useMemo(() => { setData(rawData); }, [rawData]);

  const kabkotaOptions = useMemo(() => {
    if (!selectedProvinsiId) return [];
    return getKabkotaByProvinsi(selectedProvinsiId);
  }, [selectedProvinsiId]);

  const filtered = useMemo(() => {
    let result = data;
    
    if (selectedProvinsiId) {
      const prov = alokasiProvinsiData.find(p => p.provinsi_id === selectedProvinsiId);
      if (prov) {
        result = result.filter(inst => inst.provinsi_nama === prov.provinsi.nama_provinsi);
      }
    }
    
    if (selectedKabKotaName) {
      result = result.filter(inst => inst.kabupaten_kota_nama === selectedKabKotaName);
    }
    
    if (selectedStatus) {
      result = result.filter(inst => inst.status_sekolah === selectedStatus);
    }
    
    if (search) {
      result = result.filter(inst => inst.nama_institusi.toLowerCase().includes(search.toLowerCase()));
    }
    return result;
  }, [data, search, selectedProvinsiId, selectedKabKotaName]);

  const totals = useMemo(() => {
    const nom = filtered.reduce((s, i) => s + i.nominal_alokasi, 0);
    const real = filtered.reduce((s, i) => s + i.realisasi_total, 0);
    return { nominal: nom, realisasi: real, selisih: nom - real, pct: nom > 0 ? (real / nom) * 100 : 0 };
  }, [filtered]);

  const renderEditableCell = (row: InstitusiPendidikan, field: 'nominal' | 'realisasi') => {
    const value = field === 'nominal' ? row.nominal_alokasi : row.realisasi_total;
    return (
      <td className="sheet-cell text-right">
        {fmtRupiah(value)}
      </td>
    );
  };

  return (
    <div className="min-h-screen">
      <Header title={`Jenjang: ${config.label}`} subtitle={`Data alokasi dan realisasi institusi ${config.label} Tahun ${activeTahun}`} />

      <div className="p-6">
        {/* Toolbar */}
        <div className="sheet-toolbar flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Provinsi:</span>
            <select
              value={selectedProvinsiId}
              onChange={(e) => {
                setSelectedProvinsiId(e.target.value);
                setSelectedKabKotaName('');
              }}
              className="select-dropdown"
            >
              <option value="">Semua Provinsi</option>
              {alokasiProvinsiData.map(p => (
                <option key={p.provinsi_id} value={p.provinsi_id}>{p.provinsi.nama_provinsi}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Kab/Kota:</span>
            <select
              value={selectedKabKotaName}
              onChange={(e) => setSelectedKabKotaName(e.target.value)}
              className="select-dropdown"
              disabled={!selectedProvinsiId}
            >
              <option value="">Semua Kab/Kota</option>
              {kabkotaOptions.map(k => (
                <option key={k.id} value={k.kabupaten_kota.nama_kabupaten_kota}>{k.kabupaten_kota.nama_kabupaten_kota}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="select-dropdown"
            >
              <option value="">Semua Status</option>
              <option value="NEGERI">Negeri</option>
              <option value="SWASTA">Swasta</option>
            </select>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder={`Cari nama ${config.label.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <span className="text-xs text-text-muted flex-1">{filtered.length} institusi</span>
          <button className="btn btn-primary">
            <Download size={14} />
            Ekspor Excel
          </button>
        </div>

        {/* Spreadsheet */}
        <div className="sheet-container">
          <table className="w-full">
            <thead>
              <tr>
                <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 220 }}>Nama {config.label}</th>
                <th className="sheet-header-cell text-center" style={{ width: 90 }}>Status</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 160 }}>Kabupaten/Kota</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 130 }}>Provinsi</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 160 }}>Nominal (Rp)</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 160 }}>Realisasi (Rp)</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 120 }}>Selisih</th>
                <th className="sheet-header-cell text-center" style={{ width: 110 }}>%</th>
                <th className="sheet-header-cell text-center" style={{ width: 80 }}>NPSN</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                  <td className="sheet-cell text-center text-text-muted text-xs">{idx + 1}</td>
                  <td className="sheet-cell text-left font-medium text-text-primary">
                    <Link href={`/dashboard/profil-institusi/${row.id}`} className="hover:text-accent hover:underline transition-colors">
                      {row.nama_institusi}
                    </Link>
                  </td>
                  <td className="sheet-cell text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                       row.status_sekolah === 'NEGERI' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
                    }`}>
                      {row.status_sekolah}
                    </span>
                  </td>
                  <td className="sheet-cell text-left text-text-secondary text-xs">{row.kabupaten_kota_nama}</td>
                  <td className="sheet-cell text-left text-text-secondary text-xs">{row.provinsi_nama}</td>
                  {renderEditableCell(row, 'nominal')}
                  {renderEditableCell(row, 'realisasi')}
                  <td className="sheet-cell text-right text-rose-600">{fmtTriliun(row.selisih)}</td>
                  <td className="sheet-cell text-center">
                    <PctBadge value={row.persentase_penyerapan} />
                  </td>
                  <td className="sheet-cell text-center text-text-muted text-xs font-mono">{row.npsn}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell text-left font-bold">TOTAL ({filtered.length})</td>
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell text-right">{fmtRupiah(totals.nominal)}</td>
                <td className="sheet-footer-cell text-right">{fmtRupiah(totals.realisasi)}</td>
                <td className="sheet-footer-cell text-right text-rose-600">{fmtTriliun(totals.selisih)}</td>
                <td className="sheet-footer-cell text-center">
                  <PctBadge value={totals.pct} size="md" />
                </td>
                <td className="sheet-footer-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
