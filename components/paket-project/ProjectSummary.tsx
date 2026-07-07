'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { TAHAP_LABELS } from '@/types';
import { fmtRupiah } from '@/lib/utils/formatters';
import {
  TrendingUp, Tag, ShieldAlert, Award, FileText,
  Camera, CheckSquare, AlertCircle, Sparkles
} from 'lucide-react';

interface ProjectSummaryProps {
  projectId: string;
}

export default function ProjectSummary({ projectId }: ProjectSummaryProps) {
  const { paketProjectList, projectPhotos, projectExpenses, projectVendors } = useAppStore();

  const project = useMemo(() => {
    return paketProjectList.find(p => p.id === projectId);
  }, [paketProjectList, projectId]);

  const expenses = useMemo(() => {
    return projectExpenses.filter(e => e.project_id === projectId);
  }, [projectExpenses, projectId]);

  const photos = useMemo(() => {
    return projectPhotos.filter(p => p.project_id === projectId);
  }, [projectPhotos, projectId]);

  const vendors = useMemo(() => {
    return projectVendors.filter(v => v.project_id === projectId);
  }, [projectVendors, projectId]);

  // Financial statistics
  const finance = useMemo(() => {
    const totalSubtotal = expenses.reduce((sum, e) => sum + e.subtotal, 0);
    const totalTax = expenses.reduce((sum, e) => sum + e.nilai_pajak, 0);
    const totalRAB = expenses.reduce((sum, e) => sum + e.total_setelah_pajak, 0);

    const totalContractValue = vendors.reduce((sum, v) => sum + v.nilai_kontrak_setelah_pajak, 0);
    const totalContractValueRaw = vendors.reduce((sum, v) => sum + v.nilai_anggaran_kontrak, 0);
    
    const variance = totalRAB - totalContractValue;

    return {
      subtotal: totalSubtotal,
      tax: totalTax,
      total: totalRAB,
      contract: totalContractValue,
      contractRaw: totalContractValueRaw,
      variance: variance
    };
  }, [expenses, vendors]);

  // Stage breakdown
  const stageBreakdown = useMemo(() => {
    const stages = ['pra_produksi', 'produksi', 'pasca_produksi'] as const;
    return stages.map(stage => {
      const stageExpenses = expenses.filter(e => e.tahap === stage);
      const total = stageExpenses.reduce((sum, e) => sum + e.total_setelah_pajak, 0);
      const photoCount = photos.filter(p => p.tahap === stage).length;
      return {
        stage,
        label: TAHAP_LABELS[stage],
        total,
        photoCount
      };
    });
  }, [expenses, photos]);

  // Completeness checklist
  const completeness = useMemo(() => {
    const hasBasic = !!project?.nama_paket && !!project?.deskripsi;
    
    // Checked if there is at least 1 photo for each stage (optional check but lets verify total count)
    const hasPhotos = photos.length > 0;
    const hasExpenses = expenses.length > 0;
    const hasVendor = vendors.length > 0;

    let itemsChecked = 0;
    if (hasBasic) itemsChecked++;
    if (hasPhotos) itemsChecked++;
    if (hasExpenses) itemsChecked++;
    if (hasVendor) itemsChecked++;

    const scorePercent = Math.round((itemsChecked / 4) * 100);

    return {
      hasBasic,
      hasPhotos,
      hasExpenses,
      hasVendor,
      scorePercent,
      isComplete: itemsChecked === 4
    };
  }, [project, photos, expenses, vendors]);

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card accent-blue">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">TOTAL RAB (DENGAN PAJAK)</span>
          <p className="text-xl font-extrabold text-blue-600">Rp {fmtRupiah(finance.total)}</p>
          <span className="text-[10px] text-text-muted mt-2 block">
            Pokok: Rp {fmtRupiah(finance.subtotal)} | Pajak: Rp {fmtRupiah(finance.tax)}
          </span>
        </div>

        <div className="metric-card accent-indigo">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">NILAI KONTRAK VENDOR</span>
          <p className="text-xl font-extrabold text-indigo-600">Rp {fmtRupiah(finance.contract)}</p>
          <span className="text-[10px] text-text-muted mt-2 block">
            Pokok: Rp {fmtRupiah(finance.contractRaw)}
          </span>
        </div>

        <div className={`metric-card ${finance.variance > 0 ? 'accent-rose' : 'accent-emerald'}`}>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">VARIANSI ANGGARAN</span>
          <p className={`text-xl font-extrabold ${finance.variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {finance.variance > 0 ? 'DEFISIT ' : 'SURPLUS '}Rp {fmtRupiah(Math.abs(finance.variance))}
          </p>
          <span className={`text-[10px] font-medium mt-2 block ${finance.variance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
            {finance.variance > 0 ? 'Realisasi melebihi kontrak vendor!' : 'Realisasi hemat di bawah nilai kontrak'}
          </span>
        </div>

        <div className={`metric-card ${completeness.isComplete ? 'accent-emerald' : 'accent-amber'}`}>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">KELENGKAPAN DATA</span>
          <p className={`text-xl font-extrabold ${completeness.isComplete ? 'text-emerald-600' : 'text-amber-600'}`}>
            {completeness.scorePercent}%
          </p>
          <span className={`text-[10px] font-medium mt-2 block ${completeness.isComplete ? 'text-emerald-500' : 'text-amber-500'}`}>
            {completeness.isComplete ? 'Seluruh berkas lengkap & valid' : 'Lengkapi foto & bukti pengeluaran'}
          </span>
        </div>
      </div>

      {/* Main Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stages Breakdown */}
        <div className="glass-card p-5 border border-slate-200/60 lg:col-span-2 space-y-4">
          <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-1">
            <TrendingUp size={14} className="text-blue-500" />
            Rincian per Tahap Produksi
          </h4>

          <div className="space-y-4">
            {stageBreakdown.map((item) => (
              <div key={item.stage} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                    {item.label}
                  </span>
                  <div className="flex gap-3 text-[10px] text-text-muted font-medium">
                    <span className="flex items-center gap-0.5">
                      <Camera size={10} />
                      {item.photoCount} Foto
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-text-muted block font-bold uppercase tracking-wider">Subtotal Tahap</span>
                  <span className="text-xs font-extrabold font-mono text-slate-800">
                    Rp {fmtRupiah(item.total)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Completeness Checklist */}
        <div className="glass-card p-5 border border-slate-200/60 space-y-4">
          <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-1">
            <CheckSquare size={14} className="text-indigo-500" />
            Checklist Kelengkapan
          </h4>

          <div className="space-y-3.5">
            {/* Checklist item 1 */}
            <div className="flex items-start gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                completeness.hasBasic ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {completeness.hasBasic ? '✓' : '•'}
              </span>
              <div>
                <span className={`text-xs font-bold block ${completeness.hasBasic ? 'text-text-primary' : 'text-text-muted'}`}>
                  Data Dasar Project
                </span>
                <span className="text-[9px] text-text-muted leading-relaxed font-medium block">Nama, deskripsi, status, dan tanggal project terisi</span>
              </div>
            </div>

            {/* Checklist item 2 */}
            <div className="flex items-start gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                completeness.hasExpenses ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {completeness.hasExpenses ? '✓' : '•'}
              </span>
              <div>
                <span className={`text-xs font-bold block ${completeness.hasExpenses ? 'text-text-primary' : 'text-text-muted'}`}>
                  Rincian Anggaran (RAB)
                </span>
                <span className="text-[9px] text-text-muted leading-relaxed font-medium block">Rincian pengeluaran per item + kalkulasi pajak</span>
              </div>
            </div>

            {/* Checklist item 3 */}
            <div className="flex items-start gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                completeness.hasPhotos ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {completeness.hasPhotos ? '✓' : '•'}
              </span>
              <div>
                <span className={`text-xs font-bold block ${completeness.hasPhotos ? 'text-text-primary' : 'text-text-muted'}`}>
                  Dokumentasi Progres
                </span>
                <span className="text-[9px] text-text-muted leading-relaxed font-medium block">Foto dokumentasi visual di setiap tahap kerja</span>
              </div>
            </div>

            {/* Checklist item 4 */}
            <div className="flex items-start gap-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold ${
                completeness.hasVendor ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {completeness.hasVendor ? '✓' : '•'}
              </span>
              <div>
                <span className={`text-xs font-bold block ${completeness.hasVendor ? 'text-text-primary' : 'text-text-muted'}`}>
                  Vendor Pelaksana & PIC
                </span>
                <span className="text-[9px] text-text-muted leading-relaxed font-medium block">Data vendor, kontak, dan PIC penanggung jawab</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  completeness.isComplete ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${completeness.scorePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
