'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { ProjectVendor, JenisPajak, JENIS_PAJAK_LABELS, DEFAULT_TAX_RATES } from '@/types';
import { fmtRupiah } from '@/lib/utils/formatters';
import { User, Phone, Briefcase, Plus, Trash2, Tag, Landmark, ShieldCheck, Pencil } from 'lucide-react';

interface VendorFormProps {
  projectId: string;
}

export default function VendorForm({ projectId }: VendorFormProps) {
  const {
    projectVendors,
    addProjectVendor,
    updateProjectVendor,
    removeProjectVendor,
    addNotification
  } = useAppStore();

  const vendors = useMemo(() => {
    return projectVendors.filter(v => v.project_id === projectId);
  }, [projectVendors, projectId]);

  // UI state
  const [isAdding, setIsAdding] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  // Form inputs
  const [namaVendor, setNamaVendor] = useState('');
  const [kontakVendor, setKontakVendor] = useState('');
  const [namaPicInternal, setNamaPicInternal] = useState('');
  const [kontakPicInternal, setKontakPicInternal] = useState('');
  const [nilaiAnggaranKontrak, setNilaiAnggaranKontrak] = useState(0);
  const [jenisPajakKontrak, setJenisPajakKontrak] = useState<JenisPajak>('tanpa_pajak');
  const [persentasePajakKontrak, setPersentasePajakKontrak] = useState(0);

  const handleTaxTypeChange = (type: JenisPajak) => {
    setJenisPajakKontrak(type);
    setPersentasePajakKontrak(DEFAULT_TAX_RATES[type]);
  };

  const handleStartEdit = (vendor: ProjectVendor) => {
    setIsAdding(true);
    setEditingVendorId(vendor.id);
    setNamaVendor(vendor.nama_vendor);
    setKontakVendor(vendor.kontak_vendor || '');
    setNamaPicInternal(vendor.nama_pic_internal);
    setKontakPicInternal(vendor.kontak_pic_internal || '');
    setNilaiAnggaranKontrak(vendor.nilai_anggaran_kontrak);
    setJenisPajakKontrak(vendor.jenis_pajak_kontrak);
    setPersentasePajakKontrak(vendor.persentase_pajak_kontrak);
  };

  const handleCancelForm = () => {
    setNamaVendor('');
    setKontakVendor('');
    setNamaPicInternal('');
    setKontakPicInternal('');
    setNilaiAnggaranKontrak(0);
    setJenisPajakKontrak('tanpa_pajak');
    setPersentasePajakKontrak(0);
    setIsAdding(false);
    setEditingVendorId(null);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaVendor.trim()) return;

    const nilaiPajakKontrak = Math.round((nilaiAnggaranKontrak * persentasePajakKontrak) / 100);
    const nilaiKontrakSetelahPajak = nilaiAnggaranKontrak + nilaiPajakKontrak;

    if (editingVendorId) {
      updateProjectVendor(editingVendorId, {
        nama_vendor: namaVendor,
        kontak_vendor: kontakVendor,
        nama_pic_internal: namaPicInternal,
        kontak_pic_internal: kontakPicInternal,
        nilai_anggaran_kontrak: nilaiAnggaranKontrak,
        jenis_pajak_kontrak: jenisPajakKontrak,
        persentase_pajak_kontrak: persentasePajakKontrak,
        nilai_pajak_kontrak: nilaiPajakKontrak,
        nilai_kontrak_setelah_pajak: nilaiKontrakSetelahPajak,
      });

      addNotification({
        message: `Vendor Pelaksana "${namaVendor}" berhasil diperbarui.`,
        type: 'info',
        link: `/dashboard/rencana-anggaran/paket-project/${projectId}`,
      });
    } else {
      const newVendor: ProjectVendor = {
        id: `vnd-${Date.now()}`,
        project_id: projectId,
        nama_vendor: namaVendor,
        kontak_vendor: kontakVendor,
        nama_pic_internal: namaPicInternal,
        kontak_pic_internal: kontakPicInternal,
        nilai_anggaran_kontrak: nilaiAnggaranKontrak,
        jenis_pajak_kontrak: jenisPajakKontrak,
        persentase_pajak_kontrak: persentasePajakKontrak,
        nilai_pajak_kontrak: nilaiPajakKontrak,
        nilai_kontrak_setelah_pajak: nilaiKontrakSetelahPajak,
        created_at: new Date().toISOString(),
      };

      addProjectVendor(newVendor);
      addNotification({
        message: `Vendor Pelaksana "${namaVendor}" berhasil ditambahkan ke project.`,
        type: 'success',
        link: `/dashboard/rencana-anggaran/paket-project/${projectId}`,
      });
    }

    handleCancelForm();
  };

  return (
    <div className="space-y-6">
      {/* Existing Vendors List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {vendors.map((v) => (
          <div key={v.id} className="glass-card p-5 border border-slate-200/60 relative group flex flex-col justify-between hover:border-slate-300 transition shadow-sm">
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => handleStartEdit(v)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Edit Vendor"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => {
                  removeProjectVendor(v.id);
                  addNotification({
                    message: `Vendor "${v.nama_vendor}" telah dihapus.`,
                    type: 'warning',
                    link: `/dashboard/rencana-anggaran/paket-project/${projectId}`,
                  });
                }}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Hapus Vendor"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Vendor Title */}
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">🏢</span>
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{v.nama_vendor}</h4>
                  <p className="text-[10px] text-text-muted font-medium mt-0.5">Kontak: {v.kontak_vendor || '—'}</p>
                </div>
              </div>

              {/* PIC Info */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] space-y-1.5 font-medium text-text-secondary">
                <div className="flex items-center gap-1.5 text-text-primary font-semibold">
                  <User size={12} className="text-blue-500" />
                  <span>PIC Pelaksana Project</span>
                </div>
                <div className="pl-4.5 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-text-muted">PIC Internal:</span>
                    <span>{v.nama_pic_internal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Kontak PIC:</span>
                    <span>{v.kontak_pic_internal || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Financial & Tax Details */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">Nilai Anggaran Kontrak</span>
                <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-1.5 text-xs font-medium text-text-secondary">
                  <span>Nilai Pokok:</span>
                  <span className="font-mono">Rp {fmtRupiah(v.nilai_anggaran_kontrak)}</span>
                </div>
                {v.jenis_pajak_kontrak !== 'tanpa_pajak' && (
                  <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-1.5 text-xs font-medium text-text-secondary">
                    <span className="flex items-center gap-1">
                      Pajak Kontrak:
                      <span className="badge bg-amber-50 text-amber-700 border-amber-200 text-[8px] font-bold uppercase py-0.5 px-1.5">
                        {JENIS_PAJAK_LABELS[v.jenis_pajak_kontrak]} ({v.persentase_pajak_kontrak}%)
                      </span>
                    </span>
                    <span className="font-mono text-amber-600 font-bold">Rp {fmtRupiah(v.nilai_pajak_kontrak)}</span>
                  </div>
                )}
                <div className="flex justify-between items-end pt-1.5 text-xs font-bold text-text-primary">
                  <span>Total Setelah Pajak:</span>
                  <span className="font-mono text-blue-600">Rp {fmtRupiah(v.nilai_kontrak_setelah_pajak)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Vendor Card Trigger */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-6 text-center hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center min-h-[220px]"
          >
            <Plus size={24} className="text-slate-400 mb-2" />
            <span className="text-xs font-bold text-text-secondary">Tambah Vendor Pelaksana</span>
            <span className="text-[9px] text-text-muted mt-1 uppercase font-semibold">Tentukan vendor & PIC pelaksana project</span>
          </button>
        )}
      </div>

      {/* Add/Edit Vendor Form Inline */}
      {isAdding && (
        <div className="glass-card p-5 border border-slate-200/60 max-w-xl">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <span>🏢</span> {editingVendorId ? 'Edit Data Vendor & PIC' : 'Tambah Data Vendor & PIC Pelaksana'}
            </h4>
            <button
              onClick={handleCancelForm}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <form onSubmit={handleSaveVendor} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Nama Vendor</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: CV Digital Solusindo"
                  value={namaVendor}
                  onChange={(e) => setNamaVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-text-muted font-medium"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Kontak Vendor</label>
                <input
                  type="text"
                  placeholder="No Telp / Email Vendor"
                  value={kontakVendor}
                  onChange={(e) => setKontakVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-text-muted font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Nama PIC Internal</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pak Budi Santoso"
                  value={namaPicInternal}
                  onChange={(e) => setNamaPicInternal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-text-muted font-medium"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Kontak PIC Internal</label>
                <input
                  type="text"
                  placeholder="No HP PIC Internal"
                  value={kontakPicInternal}
                  onChange={(e) => setKontakPicInternal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-text-muted font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Anggaran Kontrak</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">Rp</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={nilaiAnggaranKontrak || ''}
                    onChange={(e) => setNilaiAnggaranKontrak(parseInt(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Jenis Pajak</label>
                <select
                  value={jenisPajakKontrak}
                  onChange={(e) => handleTaxTypeChange(e.target.value as JenisPajak)}
                  className="select-dropdown w-full text-xs py-2 font-medium"
                >
                  {Object.entries(JENIS_PAJAK_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Tarif Pajak (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={persentasePajakKontrak}
                    onChange={(e) => setPersentasePajakKontrak(parseInt(e.target.value) || 0)}
                    className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">%</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-xs space-y-1.5 font-medium text-text-secondary mt-1">
              <div className="flex justify-between">
                <span>Nilai Pokok Kontrak:</span>
                <span className="font-mono font-bold">Rp {fmtRupiah(nilaiAnggaranKontrak)}</span>
              </div>
              {jenisPajakKontrak !== 'tanpa_pajak' && (
                <div className="flex justify-between">
                  <span>Nilai Pajak Kontrak:</span>
                  <span className="font-mono text-amber-600 font-bold">Rp {fmtRupiah(Math.round((nilaiAnggaranKontrak * persentasePajakKontrak) / 100))}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-blue-200/50 pt-2 text-sm font-bold text-text-primary">
                <span>Total Setelah Pajak:</span>
                <span className="font-mono text-blue-600 text-base">
                  Rp {fmtRupiah(nilaiAnggaranKontrak + Math.round((nilaiAnggaranKontrak * persentasePajakKontrak) / 100))}
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition cursor-pointer"
              >
                {editingVendorId ? 'Perbarui Vendor' : 'Simpan Vendor'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
