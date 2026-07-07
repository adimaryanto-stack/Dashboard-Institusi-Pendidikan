'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/lib/store';
import { PaketProject, STATUS_LABELS, ProjectStatus } from '@/types';
import { fmtRupiah } from '@/lib/utils/formatters';
import Link from 'next/link';
import { Plus, Search, FolderKanban, ArrowRight, Eye, Settings, Briefcase, Calendar, ChevronRight } from 'lucide-react';
import TambahPaketModal from '@/components/paket-project/TambahPaketModal';

export default function PaketProjectPage() {
  const { paketProjectList, projectExpenses, projectVendors } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'semua' | ProjectStatus>('semua');
  const [tambahModalOpen, setTambahModalOpen] = useState(false);

  // Filtered project list
  const filteredProjects = useMemo(() => {
    return paketProjectList.filter((p) => {
      const matchSearch =
        p.nama_paket.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.deskripsi.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = selectedStatus === 'semua' || p.status === selectedStatus;
      
      return matchSearch && matchStatus;
    });
  }, [paketProjectList, searchTerm, selectedStatus]);

  // Project summaries helper
  const projectSummaries = useMemo(() => {
    return paketProjectList.reduce((acc, p) => {
      const projExpenses = projectExpenses.filter(e => e.project_id === p.id);
      const totalRAB = projExpenses.reduce((sum, e) => sum + e.total_setelah_pajak, 0);

      const projVendors = projectVendors.filter(v => v.project_id === p.id);
      const vendorsNames = projVendors.map(v => v.nama_vendor).join(', ') || '—';

      acc[p.id] = {
        totalRAB,
        vendorsNames
      };
      return acc;
    }, {} as Record<string, { totalRAB: number; vendorsNames: string }>);
  }, [paketProjectList, projectExpenses, projectVendors]);

  // Statistics
  const stats = useMemo(() => {
    const totalProjects = paketProjectList.length;
    
    // Sum of all projects' total RAB
    const totalBudget = Object.values(projectSummaries).reduce((sum, val) => sum + val.totalRAB, 0);
    
    const activeProjects = paketProjectList.filter(p => p.status === 'berjalan').length;

    return {
      totalProjects,
      totalBudget,
      activeProjects
    };
  }, [paketProjectList, projectSummaries]);

  const getStatusBadgeClass = (status: ProjectStatus) => {
    switch (status) {
      case 'draft': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'berjalan': return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'selesai': return 'bg-purple-50 text-purple-700 border-purple-200 font-bold';
      case 'batal': return 'bg-rose-50 text-rose-700 border-rose-200 font-bold';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <Header
        title="Daftar Paket Project"
        subtitle="Kelola histori dokumentasi visual, realisasi pengeluaran, vendor, dan PIC per paket project"
      />

      <div className="p-6 space-y-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-text-muted font-medium mb-2">
          <Link href="/dashboard/rencana-anggaran" className="hover:text-blue-600 transition">
            Rencana (RAB)
          </Link>
          <ChevronRight size={12} />
          <span className="text-text-primary font-bold">Paket Project</span>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="metric-card accent-blue">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">TOTAL PAKET PROJECT</span>
            <p className="text-xl font-extrabold text-blue-600">{stats.totalProjects} Paket</p>
            <span className="text-[10px] text-text-muted mt-2 block">Seluruh paket terdaftar</span>
          </div>

          <div className="metric-card accent-indigo">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">ANGGARAN RAB KESELURUHAN</span>
            <p className="text-xl font-extrabold text-indigo-600">Rp {fmtRupiah(stats.totalBudget)}</p>
            <span className="text-[10px] text-text-muted mt-2 block">Total pengeluaran setelah pajak</span>
          </div>

          <div className="metric-card accent-emerald">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">PAKET AKTIF BERJALAN</span>
            <p className="text-xl font-extrabold text-emerald-600">{stats.activeProjects} Paket</p>
            <span className="text-[10px] text-text-muted mt-2 block">Project status: Berjalan</span>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 w-full lg:max-w-xl">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari paket project berdasarkan nama atau deskripsi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors font-medium placeholder:text-text-muted"
              />
            </div>

            {/* Add Button */}
            <button
              onClick={() => setTambahModalOpen(true)}
              className="btn btn-primary bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/10 font-bold py-2.5 px-4 text-xs w-full lg:w-auto shrink-0 cursor-pointer flex items-center justify-center gap-1.5 rounded-xl transition-all"
            >
              <Plus size={14} />
              Tambah Paket Project
            </button>
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
            {[
              { val: 'semua', label: 'Semua Status' },
              { val: 'draft', label: 'Draft' },
              { val: 'berjalan', label: 'Berjalan' },
              { val: 'selesai', label: 'Selesai' },
              { val: 'batal', label: 'Dibatalkan' },
            ].map((item) => (
              <button
                key={item.val}
                onClick={() => setSelectedStatus(item.val as any)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                  selectedStatus === item.val
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project Ledger Table */}
        <div className="glass-card overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200/60 p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold">📋</span>
              Daftar Paket Project
            </span>
            <span className="text-xs text-text-muted font-medium">Ditemukan {filteredProjects.length} paket</span>
          </div>

          <div className="sheet-container" style={{ maxHeight: 'none' }}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                  <th className="sheet-header-cell text-left">Nama Paket Project & Rincian</th>
                  <th className="sheet-header-cell text-center" style={{ width: 120 }}>Status</th>
                  <th className="sheet-header-cell text-left" style={{ width: 180 }}>Jangka Waktu</th>
                  <th className="sheet-header-cell text-left" style={{ width: 220 }}>Vendor Utama</th>
                  <th className="sheet-header-cell text-right" style={{ width: 160 }}>Total RAB</th>
                  <th className="sheet-header-cell text-center" style={{ width: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((row, idx) => {
                    const info = projectSummaries[row.id] || { totalRAB: 0, vendorsNames: '—' };
                    return (
                      <tr key={row.id} className="hover:bg-indigo-50/40 transition">
                        <td className="sheet-cell text-center text-text-muted text-xs font-mono">{idx + 1}</td>
                        <td className="sheet-cell text-left">
                          <Link
                            href={`/dashboard/rencana-anggaran/paket-project/${row.id}`}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-xs block leading-snug"
                          >
                            {row.nama_paket}
                          </Link>
                          <span className="text-[10px] text-text-muted font-medium mt-0.5 line-clamp-1 block">
                            {row.deskripsi || 'Tidak ada deskripsi'}
                          </span>
                        </td>
                        <td className="sheet-cell text-center">
                          <span className={`badge text-[9px] font-bold uppercase py-0.5 px-2 ${getStatusBadgeClass(row.status)}`}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        </td>
                        <td className="sheet-cell text-left">
                          <div className="flex flex-col gap-0.5 text-text-secondary text-xs">
                            <span className="font-semibold">{new Date(row.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <span className="text-[9px] text-text-muted font-medium">s.d {new Date(row.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </td>
                        <td className="sheet-cell text-left">
                          <span className="text-xs text-text-primary font-semibold block truncate" title={info.vendorsNames}>
                            {info.vendorsNames}
                          </span>
                        </td>
                        <td className="sheet-cell text-right font-extrabold font-mono text-xs text-blue-600">
                          Rp {fmtRupiah(info.totalRAB)}
                        </td>
                        <td className="sheet-cell text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/dashboard/rencana-anggaran/paket-project/${row.id}`}
                              className="btn py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 text-[10px] font-semibold cursor-pointer rounded-lg"
                            >
                              <Eye size={12} />
                              Detail
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="sheet-cell text-center text-text-muted py-12">
                      <FolderKanban size={36} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">Tidak ada paket project ditemukan</p>
                      <p className="text-[10px] mt-0.5 text-text-muted">Coba ubah kata kunci pencarian atau filter status Anda</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TambahPaketModal isOpen={tambahModalOpen} onClose={() => setTambahModalOpen(false)} />
    </div>
  );
}
