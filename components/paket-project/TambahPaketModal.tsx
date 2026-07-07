'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { X, Plus, Settings } from 'lucide-react';
import { ProjectStatus } from '@/types';
import { supabase } from '@/lib/supabase';

interface TambahPaketModalProps {
  isOpen: boolean;
  onClose: () => void;
  editProjectId?: string | null;
}

export default function TambahPaketModal({ isOpen, onClose, editProjectId }: TambahPaketModalProps) {
  const { 
    paketProjectList, 
    projectExpenses, 
    projectPhotos, 
    projectVendors, 
    addPaketProject, 
    updatePaketProject, 
    addNotification,
    addTransaksi
  } = useAppStore();

  const isEdit = !!editProjectId;
  const existingProject = isEdit ? paketProjectList.find(p => p.id === editProjectId) : null;

  const [namaPaket, setNamaPaket] = useState(existingProject?.nama_paket || '');
  const [deskripsi, setDeskripsi] = useState(existingProject?.deskripsi || '');
  const [tanggalMulai, setTanggalMulai] = useState(existingProject?.tanggal_mulai || '2026-07-07');
  const [tanggalSelesai, setTanggalSelesai] = useState(existingProject?.tanggal_selesai || '2026-08-31');
  const [status, setStatus] = useState<ProjectStatus>(existingProject?.status || 'draft');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPaket.trim()) return;

    // Validation: cannot change status to 'selesai' if checklist is not 100%
    if (status === 'selesai') {
      const expenses = projectExpenses.filter(exp => exp.project_id === editProjectId);
      const photos = projectPhotos.filter(pho => pho.project_id === editProjectId);
      const vendors = projectVendors.filter(v => v.project_id === editProjectId);
      const isComplete = expenses.length > 0 && photos.length > 0 && vendors.length > 0;

      if (!isComplete) {
        setErrorMsg('Status tidak dapat diubah ke "Selesai" karena kelengkapan checklist belum 100% (Pastikan rincian RAB, foto progres, dan vendor terisi).');
        return;
      }
    }

    setErrorMsg(null);

    if (isEdit && editProjectId) {
      const isStatusChangedToSelesai = status === 'selesai' && existingProject?.status !== 'selesai';

      updatePaketProject(editProjectId, {
        nama_paket: namaPaket,
        deskripsi: deskripsi,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        status: status,
      });

      if (isStatusChangedToSelesai) {
        const expenses = projectExpenses.filter(exp => exp.project_id === editProjectId);
        const vendors = projectVendors.filter(v => v.project_id === editProjectId);
        const mainVendor = vendors[0]?.nama_vendor || 'Vendor Pelaksana';

        const today = new Date();
        const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const formattedDate = `${String(today.getDate()).padStart(2, '0')} ${monthNamesShort[today.getMonth()]} ${today.getFullYear()}`;

        // Add to ZustandTransaksi
        expenses.forEach(exp => {
          const transactionId = `tr-db-tr-proj-${exp.id}`;
          // Prevent duplicates
          const alreadyExists = useAppStore.getState().transaksiList.some(t => t.id === transactionId);
          if (!alreadyExists) {
            addTransaksi({
              id: transactionId,
              tanggal: formattedDate,
              institusiId: 'inst-sd-0',
              namaInstitusi: 'SDN 01 Menteng',
              jenjang: 'SD',
              kategori: 'Operasional',
              item: `${namaPaket} - ${exp.nama_item}`,
              qty: exp.jumlah,
              hargaSatuan: exp.harga_satuan,
              nominal: exp.total_setelah_pajak,
              strukStatus: 'VALID',
              strukMessage: `Realisasi Paket Project: ${namaPaket}`,
              invoiceNo: `RAB-${editProjectId.slice(-6).toUpperCase()}-${exp.id.slice(-4).toUpperCase()}`,
              vendorName: mainVendor
            });
          }
        });

        // Add to Supabase if mode is active
        if (useAppStore.getState().isSupabaseMode) {
          (async () => {
            try {
              const insertData = expenses.map((exp, idx) => ({
                id: `tr-proj-${exp.id}`,
                institusi_id: 'inst-sd-0',
                nomor_bulan: today.getMonth() + 1,
                nomor: Math.floor(1000 + Math.random() * 9000) + idx,
                nama_produk_jasa: `${namaPaket} - ${exp.nama_item}`,
                harga_satuan: exp.harga_satuan,
                qty: exp.jumlah,
                jumlah: exp.total_setelah_pajak
              }));

              await supabase.from('rincian_pengeluaran_item').insert(insertData);
              console.log('[Supabase] Successfully exported completed project expenses to rincian_pengeluaran_item!');
            } catch (err) {
              console.error('[Supabase] Failed to export completed project expenses:', err);
            }
          })();
        }
      }

      addNotification({
        message: `Paket Project "${namaPaket}" berhasil diperbarui.`,
        type: 'info',
        link: `/dashboard/rencana-anggaran/paket-project/${editProjectId}`,
      });
    } else {
      const newId = `proj-${Date.now()}`;
      addPaketProject({
        id: newId,
        nama_paket: namaPaket,
        deskripsi: deskripsi,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai,
        status: status,
        created_by: 'admin.sd01menteng',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      addNotification({
        message: `Paket Project baru "${namaPaket}" berhasil dibuat.`,
        type: 'success',
        link: `/dashboard/rencana-anggaran/paket-project/${newId}`,
      });
    }

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content-wide w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 relative animate-scale-up border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${isEdit ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
              {isEdit ? <Settings size={16} /> : <Plus size={16} />}
            </span>
            {isEdit ? 'Edit Paket Project' : 'Tambah Paket Project Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 text-text-muted transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
              Nama Paket Project
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Produksi Video Profil Sekolah Semester Ganjil"
              value={namaPaket}
              onChange={(e) => setNamaPaket(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-text-muted font-medium"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
              Deskripsi
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan ruang lingkup project, tujuan, dan output yang diharapkan..."
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-text-muted resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                required
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                required
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
              Status Project
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="select-dropdown w-full text-xs font-semibold py-2.5"
            >
              <option value="draft">Draft (Rencana)</option>
              <option value="berjalan">Berjalan (On Progress)</option>
              <option value="selesai">Selesai (Completed)</option>
              <option value="batal">Dibatalkan (Stopped/Cancelled)</option>
            </select>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium leading-relaxed">
              <Plus className="rotate-45 text-rose-500 shrink-0 mt-0.5" size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all uppercase cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer uppercase"
            >
              Simpan Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
