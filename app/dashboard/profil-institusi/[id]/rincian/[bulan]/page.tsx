'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/lib/store';
import { getRincianPengeluaranBulanan } from '@/lib/data';
import { fmtRupiah } from '@/lib/utils/formatters';
import { RincianPengeluaranItem } from '@/types';
import { ArrowLeft, Download } from 'lucide-react';

export default function RincianPengeluaranPage() {
  const params = useParams();
  const router = useRouter();
  const institusiId = params.id as string;
  const nomorBulan = parseInt(params.bulan as string, 10);
  const { activeTahun, dbData, isSupabaseMode, transaksiList } = useAppStore();

  const rincianData = useMemo(
    () => getRincianPengeluaranBulanan(institusiId, nomorBulan, activeTahun),
    [institusiId, nomorBulan, activeTahun, transaksiList, dbData, isSupabaseMode]
  );

  // Editable state
  const [items, setItems] = useState<RincianPengeluaranItem[]>([]);

  useEffect(() => {
    if (rincianData) {
      setItems(rincianData.items);
    }
  }, [rincianData]);

  if (!rincianData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary mb-2">Data tidak ditemukan</h2>
          <p className="text-text-muted mb-4">Institusi ID: {institusiId}, Bulan: {nomorBulan}</p>
          <button onClick={() => router.back()} className="btn btn-primary">
            <ArrowLeft size={16} />
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // ===== Calculated totals =====
  const total = items.reduce((s, item) => s + item.jumlah, 0);

  const renderEditableCell = (row: RincianPengeluaranItem, field: 'harga_satuan' | 'qty') => {
    const value = row[field];
    return (
      <td className="sheet-cell text-right">
        {field === 'qty' ? value.toLocaleString('id-ID') : fmtRupiah(value)}
      </td>
    );
  };

  return (
    <div className="min-h-screen">
      <Header
        title={`Rincian Pengeluaran Bulan ${rincianData.bulan}`}
        subtitle={`${rincianData.institusi_nama} — Bulan ${rincianData.bulan} ${activeTahun}`}
      />

      <div className="p-6 space-y-6">
        {/* Breadcrumb / Back */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => router.back()} className="btn btn-ghost text-sm">
            <ArrowLeft size={14} />
            Kembali ke Profil
          </button>
          <span className="text-text-muted text-xs">|</span>
          <nav className="flex items-center gap-1 text-xs text-text-muted">
            <Link href="/dashboard/profil-institusi" className="hover:text-accent transition-colors">
              Profil Institusi
            </Link>
            <span>→</span>
            <Link href={`/dashboard/profil-institusi/${institusiId}`} className="hover:text-accent transition-colors">
              {rincianData.institusi_nama}
            </Link>
            <span>→</span>
            <span className="text-text-primary font-medium">Rincian {rincianData.bulan}</span>
          </nav>
        </div>

        {/* Title Banner */}
        <div className="glass-card p-5">
          <h2 className="text-base font-bold text-text-primary">
            📋 Rincian Penggunaan Anggaran Pendidikan {rincianData.institusi_nama} Bulan {rincianData.bulan} {activeTahun}
          </h2>
        </div>

        {/* Toolbar */}
        <div className="sheet-toolbar">
          <span className="text-sm font-bold text-text-primary">
            Nama Produk / Jasa
          </span>
          <span className="text-xs text-text-muted flex-1">{items.length} item</span>
          <button className="btn btn-primary">
            <Download size={14} />
            Ekspor Excel
          </button>
        </div>

        {/* Spreadsheet Table */}
        <div className="sheet-container" style={{ maxHeight: 'none' }}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="sheet-header-cell text-center" style={{ width: 60 }}>Nomor</th>
                <th className="sheet-header-cell text-left" style={{ minWidth: 300 }}>Nama Produk / Jasa</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 180 }}>Harga Satuan</th>
                <th className="sheet-header-cell text-center" style={{ width: 100 }}>Qty</th>
                <th className="sheet-header-cell text-right" style={{ minWidth: 180 }}>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                  <td className="sheet-cell text-center text-text-muted text-xs">{row.nomor}</td>
                  <td className="sheet-cell text-left font-medium text-text-primary">{row.nama_produk_jasa}</td>
                  {renderEditableCell(row, 'harga_satuan')}
                  {renderEditableCell(row, 'qty')}
                  <td className="sheet-cell text-right font-medium text-text-primary">
                    {fmtRupiah(row.jumlah)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Subtotal */}
              <tr className="border-t border-slate-200">
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell text-left font-medium text-text-muted" colSpan={3}>
                  Subtotal (Sebelum Pajak)
                </td>
                <td className="sheet-footer-cell text-right font-medium text-text-primary">
                  {fmtRupiah(total)}
                </td>
              </tr>
              {/* PPN */}
              {rincianData.pajak_nominal > 0 && (
                <tr className="border-t border-slate-100">
                  <td className="sheet-footer-cell" />
                  <td className="sheet-footer-cell text-left text-xs text-text-muted" colSpan={3}>
                    PPN ({rincianData.pajak_persen}%)
                  </td>
                  <td className="sheet-footer-cell text-right text-xs text-text-muted">
                    {fmtRupiah(rincianData.pajak_nominal)}
                  </td>
                </tr>
              )}
              {/* Total */}
              <tr className="border-t border-slate-200 bg-slate-50/50">
                <td className="sheet-footer-cell" />
                <td className="sheet-footer-cell text-left font-bold text-text-primary" colSpan={3}>
                  Total Realisasi Belanja (Setelah Pajak)
                </td>
                <td className="sheet-footer-cell text-right font-bold text-emerald-600 text-base">
                  {fmtRupiah(rincianData.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
