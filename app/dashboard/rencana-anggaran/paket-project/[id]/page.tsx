'use client';

import { useState, useMemo, use } from 'react';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/lib/store';
import { STATUS_LABELS, ProjectStatus } from '@/types';
import Link from 'next/link';
import { ChevronRight, Calendar, User, Eye, ArrowLeft, Camera, FileText, Briefcase, Settings, CloudUpload } from 'lucide-react';
import PhotoDocumentation from '@/components/paket-project/PhotoDocumentation';
import ExpenseTable from '@/components/paket-project/ExpenseTable';
import VendorForm from '@/components/paket-project/VendorForm';
import ProjectSummary from '@/components/paket-project/ProjectSummary';
import TambahPaketModal from '@/components/paket-project/TambahPaketModal';
import { supabase } from '@/lib/supabase';

async function uploadBase64ToStorage(base64Str: string, path: string): Promise<string> {
  if (base64Str.startsWith('http')) return base64Str;

  const match = base64Str.match(/^data:(.*);base64,(.*)$/);
  if (!match) return base64Str;

  const mimeType = match[1];
  const b64Data = match[2];
  
  const byteCharacters = atob(b64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('project-files')
    .upload(path, blob, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    console.error('Error uploading file to storage:', error);
    if (error.message.includes('bucket not found') || error.message.includes('does not exist')) {
      try {
        await supabase.storage.createBucket('project-files', { public: true });
        const { data: retryData, error: retryError } = await supabase.storage
          .from('project-files')
          .upload(path, blob, {
            contentType: mimeType,
            upsert: true
          });
        if (retryError) throw retryError;
        const { data: publicUrlData } = supabase.storage.from('project-files').getPublicUrl(path);
        return publicUrlData.publicUrl;
      } catch (err) {
        console.error('Failed to create bucket and retry upload:', err);
        return base64Str;
      }
    }
    return base64Str;
  }

  const { data: publicUrlData } = supabase.storage.from('project-files').getPublicUrl(path);
  return publicUrlData.publicUrl;
}

export default function PaketProjectDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const projectId = params.id;

  const { paketProjectList, removePaketProject, addNotification } = useAppStore();

  const project = useMemo(() => {
    return paketProjectList.find((p) => p.id === projectId);
  }, [paketProjectList, projectId]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'summary' | 'photos' | 'expenses' | 'vendors'>('summary');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSavingSupabase, setIsSavingSupabase] = useState(false);

  const handleSaveToSupabase = async () => {
    if (!project) return;
    setIsSavingSupabase(true);
    try {
      // 1. Save Project Info
      const { error: projError } = await supabase
        .from('projects')
        .upsert({
          id: project.id,
          nama_paket: project.nama_paket,
          deskripsi: project.deskripsi,
          tanggal_mulai: project.tanggal_mulai,
          tanggal_selesai: project.tanggal_selesai,
          status: project.status,
          created_by: project.created_by || 'admin.sd01menteng',
          updated_at: new Date().toISOString()
        });

      if (projError) throw projError;

      // Get expenses, photos, vendors from state
      const expenses = useAppStore.getState().projectExpenses.filter(e => e.project_id === projectId);
      const photos = useAppStore.getState().projectPhotos.filter(p => p.project_id === projectId);
      const vendors = useAppStore.getState().projectVendors.filter(v => v.project_id === projectId);

      // 2. Upload and save Photos
      const updatedPhotos = [];
      for (const photo of photos) {
        let finalUrl = photo.file_url;
        if (photo.file_url.startsWith('data:')) {
          const extension = photo.file_url.split(';')[0].split('/')[1] || 'jpg';
          const storagePath = `photos/${projectId}/${photo.id}.${extension}`;
          finalUrl = await uploadBase64ToStorage(photo.file_url, storagePath);
        }
        updatedPhotos.push({
          ...photo,
          file_url: finalUrl
        });
      }

      // Sync photos in local store
      useAppStore.getState().setProjectPhotos(prev => 
        prev.map(p => {
          const matched = updatedPhotos.find(up => up.id === p.id);
          return matched ? matched : p;
        })
      );

      // Clear existing project photos, expenses, and vendors in Supabase and insert new ones
      await supabase.from('project_photos').delete().eq('project_id', projectId);
      if (updatedPhotos.length > 0) {
        const { error: photoErr } = await supabase.from('project_photos').insert(
          updatedPhotos.map(p => ({
            id: p.id,
            project_id: projectId,
            tahap: p.tahap,
            file_url: p.file_url,
            caption: p.caption,
            tanggal_ambil: p.tanggal_ambil,
            uploaded_by: p.uploaded_by,
            created_at: p.created_at
          }))
        );
        if (photoErr) throw photoErr;
      }

      // 3. Save Expenses
      await supabase.from('project_expenses').delete().eq('project_id', projectId);
      if (expenses.length > 0) {
        const { error: expErr } = await supabase.from('project_expenses').insert(
          expenses.map(e => ({
            id: e.id,
            project_id: projectId,
            tahap: e.tahap,
            nama_item: e.nama_item,
            jumlah: e.jumlah,
            satuan: e.satuan,
            harga_satuan: e.harga_satuan,
            subtotal: e.subtotal,
            jenis_pajak: e.jenis_pajak,
            persentase_pajak: e.persentase_pajak,
            nilai_pajak: e.nilai_pajak,
            total_setelah_pajak: e.total_setelah_pajak,
            bukti_file_url: e.bukti_file_url,
            catatan: e.catatan,
            created_at: e.created_at
          }))
        );
        if (expErr) throw expErr;
      }

      // 4. Save Vendors
      await supabase.from('project_vendors').delete().eq('project_id', projectId);
      if (vendors.length > 0) {
        const { error: vndErr } = await supabase.from('project_vendors').insert(
          vendors.map(v => ({
            id: v.id,
            project_id: projectId,
            nama_vendor: v.nama_vendor,
            kontak_vendor: v.kontak_vendor,
            nama_pic_internal: v.nama_pic_internal,
            kontak_pic_internal: v.kontak_pic_internal,
            nilai_anggaran_kontrak: v.nilai_anggaran_kontrak,
            jenis_pajak_kontrak: v.jenis_pajak_kontrak,
            persentase_pajak_kontrak: v.persentase_pajak_kontrak,
            nilai_pajak_kontrak: v.nilai_pajak_kontrak,
            nilai_kontrak_setelah_pajak: v.nilai_kontrak_setelah_pajak,
            created_at: v.created_at
          }))
        );
        if (vndErr) throw vndErr;
      }

      addNotification({
        message: `Sukses menyimpan Paket Project "${project.nama_paket}" ke database cloud Supabase!`,
        type: 'success',
        link: `/dashboard/rencana-anggaran/paket-project/${projectId}`
      });
    } catch (err: any) {
      console.error('Error saving to Supabase:', err);
      addNotification({
        message: `Gagal menyimpan ke Supabase: ${err.message || err}`,
        type: 'warning',
        link: `/dashboard/rencana-anggaran/paket-project/${projectId}`
      });
    } finally {
      setIsSavingSupabase(false);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen pb-12 flex flex-col items-center justify-center text-center">
        <h3 className="text-sm font-bold text-text-primary mb-2">Paket Project Tidak Ditemukan</h3>
        <p className="text-xs text-text-muted mb-4">Project dengan ID {projectId} tidak terdaftar di sistem.</p>
        <Link
          href="/dashboard/rencana-anggaran/paket-project"
          className="btn btn-primary text-xs font-bold px-4 py-2 rounded-xl"
        >
          Kembali ke Daftar Paket
        </Link>
      </div>
    );
  }

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
        title={project.nama_paket}
        subtitle="Kelola rincian detail dokumentasi progres visual, rincian biaya pengeluaran, vendor, dan PIC"
      />

      <div className="p-6 space-y-6">
        {/* Breadcrumbs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-muted font-medium">
          <div className="flex items-center gap-1.5">
            <Link href="/dashboard/rencana-anggaran" className="hover:text-blue-600 transition">
              Rencana (RAB)
            </Link>
            <ChevronRight size={12} />
            <Link href="/dashboard/rencana-anggaran/paket-project" className="hover:text-blue-600 transition">
              Paket Project
            </Link>
            <ChevronRight size={12} />
            <span className="text-text-primary font-bold truncate max-w-[200px]">
              {project.nama_paket}
            </span>
          </div>

          <Link
            href="/dashboard/rencana-anggaran/paket-project"
            className="hover:text-blue-600 transition flex items-center gap-1 font-bold text-blue-600"
          >
            <ArrowLeft size={12} />
            Kembali ke Daftar
          </Link>
        </div>

        {/* Basic Info Card */}
        <div className="glass-card p-5 border border-slate-200/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className={`badge text-[9px] font-bold uppercase py-0.5 px-2 ${getStatusBadgeClass(project.status)}`}>
                {STATUS_LABELS[project.status]}
              </span>
              <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                <Calendar size={12} />
                {new Date(project.tanggal_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(project.tanggal_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <p className="text-sm font-bold text-text-secondary leading-relaxed max-w-3xl">
              {project.deskripsi || 'Tidak ada deskripsi rincian paket.'}
            </p>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleSaveToSupabase}
              disabled={isSavingSupabase}
              className={`btn py-2 px-4 flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl transition w-full md:w-auto cursor-pointer ${
                isSavingSupabase
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/15'
              }`}
            >
              <CloudUpload size={14} />
              {isSavingSupabase ? 'Menyimpan...' : 'Simpan ke Cloud'}
            </button>
            <button
              onClick={() => setEditModalOpen(true)}
              className="btn py-2 px-4 bg-slate-100 hover:bg-slate-200 text-text-primary flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer rounded-xl transition w-full md:w-auto"
            >
              <Settings size={14} />
              Edit Info Paket
            </button>
          </div>
        </div>

        {/* Tabs Controller */}
        <div className="flex border-b border-slate-200/60 pb-px gap-6 overflow-x-auto select-none">
          {[
            { id: 'summary', label: 'Ringkasan & Progres', icon: <Eye size={14} /> },
            { id: 'expenses', label: 'RAB & Pengeluaran', icon: <FileText size={14} /> },
            { id: 'photos', label: 'Dokumentasi Progres', icon: <Camera size={14} /> },
            { id: 'vendors', label: 'Vendor & PIC Pelaksana', icon: <Briefcase size={14} /> },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active Tab Panel */}
        <div className="pt-2">
          {activeTab === 'summary' && <ProjectSummary projectId={projectId} />}
          {activeTab === 'expenses' && <ExpenseTable projectId={projectId} />}
          {activeTab === 'photos' && <PhotoDocumentation projectId={projectId} />}
          {activeTab === 'vendors' && <VendorForm projectId={projectId} />}
        </div>
      </div>

      <TambahPaketModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        editProjectId={projectId}
      />
    </div>
  );
}
