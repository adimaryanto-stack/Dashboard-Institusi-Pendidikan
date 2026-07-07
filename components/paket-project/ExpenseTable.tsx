'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import {
  TahapProject, JenisPajak, ProjectExpense,
  TAHAP_LABELS, JENIS_PAJAK_LABELS, DEFAULT_TAX_RATES
} from '@/types';
import { fmtRupiah } from '@/lib/utils/formatters';
import { Plus, Trash2, Tag, Percent, Receipt, FileText, AlertTriangle, Pencil, Copy } from 'lucide-react';

interface ExpenseTableProps {
  projectId: string;
}

export default function ExpenseTable({ projectId }: ExpenseTableProps) {
  const {
    projectExpenses,
    addProjectExpense,
    updateProjectExpense,
    removeProjectExpense,
    addNotification
  } = useAppStore();

  // Filter expenses belonging to this project
  const expenses = useMemo(() => {
    return projectExpenses.filter(e => e.project_id === projectId);
  }, [projectExpenses, projectId]);

  // Form open states per stage
  const [openFormStage, setOpenFormStage] = useState<TahapProject | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // Form fields state
  const [namaItem, setNamaItem] = useState('');
  const [jumlah, setJumlah] = useState(1);
  const [satuan, setSatuan] = useState('pcs');
  const [hargaSatuan, setHargaSatuan] = useState(0);
  const [jenisPajak, setJenisPajak] = useState<JenisPajak>('tanpa_pajak');
  const [persentasePajak, setPersentasePajak] = useState(0);
  const [catatan, setCatatan] = useState('');
  const [simulatedFileUrl, setSimulatedFileUrl] = useState('');

  const handleTaxTypeChange = (type: JenisPajak) => {
    setJenisPajak(type);
    setPersentasePajak(DEFAULT_TAX_RATES[type]);
  };

  const handleStartEdit = (expense: ProjectExpense) => {
    setOpenFormStage(expense.tahap);
    setEditingExpenseId(expense.id);
    setNamaItem(expense.nama_item);
    setJumlah(expense.jumlah);
    setSatuan(expense.satuan);
    setHargaSatuan(expense.harga_satuan);
    setJenisPajak(expense.jenis_pajak);
    setPersentasePajak(expense.persentase_pajak);
    setCatatan(expense.catatan || '');
    setSimulatedFileUrl(expense.bukti_file_url || '');
  };

  const handleDuplicateExpense = (expense: ProjectExpense) => {
    const duplicated: ProjectExpense = {
      ...expense,
      id: `exp-${Date.now()}`,
      nama_item: `${expense.nama_item} (Salinan)`,
      created_at: new Date().toISOString()
    };

    addProjectExpense(duplicated);
    addNotification({
      message: `Pekerjaan "${expense.nama_item}" berhasil diduplikat.`,
      type: 'success',
      link: `/dashboard/rencana-anggaran/paket-project/${projectId}`,
    });
  };

  const handleCancelForm = () => {
    setNamaItem('');
    setJumlah(1);
    setSatuan('pcs');
    setHargaSatuan(0);
    setJenisPajak('tanpa_pajak');
    setPersentasePajak(0);
    setCatatan('');
    setSimulatedFileUrl('');
    setOpenFormStage(null);
    setEditingExpenseId(null);
  };

  const handleSaveExpense = (tahap: TahapProject) => {
    if (!namaItem.trim() || jumlah <= 0 || hargaSatuan <= 0) return;

    const subtotal = jumlah * hargaSatuan;
    const nilaiPajak = Math.round((subtotal * persentasePajak) / 100);
    const totalSetelahPajak = subtotal + nilaiPajak;

    if (editingExpenseId) {
      updateProjectExpense(editingExpenseId, {
        nama_item: namaItem,
        jumlah: jumlah,
        satuan: satuan,
        harga_satuan: hargaSatuan,
        subtotal: subtotal,
        jenis_pajak: jenisPajak,
        persentase_pajak: persentasePajak,
        nilai_pajak: nilaiPajak,
        total_setelah_pajak: totalSetelahPajak,
        bukti_file_url: simulatedFileUrl,
        catatan: catatan,
      });

      addNotification({
        message: `Pekerjaan "${namaItem}" berhasil diperbarui.`,
        type: 'info',
        link: `/dashboard/rencana-anggaran/paket-project/${projectId}`,
      });
    } else {
      const newExpense: ProjectExpense = {
        id: `exp-${Date.now()}`,
        project_id: projectId,
        tahap: tahap,
        nama_item: namaItem,
        jumlah: jumlah,
        satuan: satuan,
        harga_satuan: hargaSatuan,
        subtotal: subtotal,
        jenis_pajak: jenisPajak,
        persentase_pajak: persentasePajak,
        nilai_pajak: nilaiPajak,
        total_setelah_pajak: totalSetelahPajak,
        bukti_file_url: simulatedFileUrl || '',
        catatan: catatan,
        created_at: new Date().toISOString(),
      };

      addProjectExpense(newExpense);
      addNotification({
        message: `Pekerjaan "${namaItem}" untuk tahap ${TAHAP_LABELS[tahap]} berhasil ditambahkan.`,
        type: 'success',
        link: `/dashboard/rencana-anggaran/paket-project/${projectId}`,
      });
    }

    handleCancelForm();
  };

  const handleFileChangeSimulated = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSimulatedFileUrl(URL.createObjectURL(file));
    }
  };

  // Grand totals
  const totals = useMemo(() => {
    return expenses.reduce((acc, curr) => {
      acc.subtotal += curr.subtotal;
      acc.nilaiPajak += curr.nilai_pajak;
      acc.total += curr.total_setelah_pajak;
      return acc;
    }, { subtotal: 0, nilaiPajak: 0, total: 0 });
  }, [expenses]);

  const stages: TahapProject[] = ['pra_produksi', 'produksi', 'pasca_produksi'];

  return (
    <div className="space-y-6">
      {stages.map((stage) => {
        const stageExpenses = expenses.filter(e => e.tahap === stage);
        const stageSubtotal = stageExpenses.reduce((sum, e) => sum + e.subtotal, 0);
        const stageTax = stageExpenses.reduce((sum, e) => sum + e.nilai_pajak, 0);
        const stageTotal = stageExpenses.reduce((sum, e) => sum + e.total_setelah_pajak, 0);

        return (
          <div key={stage} className="glass-card overflow-hidden">
            {/* Stage Header */}
            <div className="bg-slate-50 border-b border-slate-200/60 p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold">🎯</span>
                {TAHAP_LABELS[stage]}
              </span>
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-text-muted font-bold font-mono">
                  Subtotal: Rp {fmtRupiah(stageTotal)}
                </span>
                <button
                  onClick={() => {
                    if (openFormStage === stage && !editingExpenseId) {
                      handleCancelForm();
                    } else {
                      handleCancelForm();
                      setOpenFormStage(stage);
                    }
                  }}
                  className="btn py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 text-[10px] font-semibold cursor-pointer rounded-lg"
                >
                  <Plus size={12} />
                  Tambah Item
                </button>
              </div>
            </div>

            {/* Inline Input Form */}
            {openFormStage === stage && (
              <div className="p-4 bg-slate-50/50 border-b border-slate-100 space-y-4">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                  <span>⚙️</span>
                  <span>{editingExpenseId ? 'Edit Pekerjaan' : 'Tambah Pekerjaan Baru'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-bold text-text-muted block mb-1">NAMA ITEM / PEKERJAAN</label>
                    <input
                      type="text"
                      placeholder="Contoh: Sewa Kamera Sony A7SIII, Konsumsi Tim"
                      value={namaItem}
                      onChange={(e) => setNamaItem(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-text-muted block mb-1">HARGA SATUAN</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">Rp</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={hargaSatuan || ''}
                        onChange={(e) => setHargaSatuan(parseInt(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/3">
                      <label className="text-[9px] font-bold text-text-muted block mb-1">QTY</label>
                      <input
                        type="number"
                        min="1"
                        value={jumlah}
                        onChange={(e) => setJumlah(parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-center focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-text-muted block mb-1">SATUAN</label>
                      <select
                        value={satuan}
                        onChange={(e) => setSatuan(e.target.value)}
                        className="select-dropdown w-full text-center text-xs py-2"
                      >
                        <option value="pcs">pcs</option>
                        <option value="unit">unit</option>
                        <option value="paket">paket</option>
                        <option value="hari">hari</option>
                        <option value="bulan">bulan</option>
                        <option value="kali">kali</option>
                        <option value="box">box</option>
                        <option value="rim">rim</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="text-[9px] font-bold text-text-muted block mb-1">JENIS PAJAK</label>
                    <select
                      value={jenisPajak}
                      onChange={(e) => handleTaxTypeChange(e.target.value as JenisPajak)}
                      className="select-dropdown w-full text-xs py-2 font-medium"
                    >
                      {Object.entries(JENIS_PAJAK_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-text-muted block mb-1">PERSENTASE (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={persentasePajak}
                        onChange={(e) => setPersentasePajak(parseInt(e.target.value) || 0)}
                        className="w-full pr-8 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-blue-500 transition-all"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">%</span>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex gap-3 items-center">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-text-muted block mb-1">CATATAN / KETERANGAN</label>
                      <input
                        type="text"
                        placeholder="Catatan tambahan..."
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-text-muted block mb-1">BUKTI FILE</label>
                      <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs text-text-secondary cursor-pointer border-dashed transition font-semibold h-[34px]">
                        <Receipt size={14} className="text-slate-400" />
                        <span>{simulatedFileUrl ? 'Dipilih' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleFileChangeSimulated}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                  <div className="text-xs text-text-secondary">
                    Subtotal: <span className="font-bold font-mono">Rp {fmtRupiah(jumlah * hargaSatuan)}</span>
                    <span className="mx-2">•</span>
                    Pajak: <span className="font-bold font-mono text-amber-600">Rp {fmtRupiah(Math.round((jumlah * hargaSatuan * persentasePajak) / 100))}</span>
                    <span className="mx-2">•</span>
                    Total: <span className="font-extrabold font-mono text-blue-600">Rp {fmtRupiah(jumlah * hargaSatuan + Math.round((jumlah * hargaSatuan * persentasePajak) / 100))}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCancelForm}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveExpense(stage)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition cursor-pointer"
                    >
                      {editingExpenseId ? 'Perbarui Item' : 'Simpan Item'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Expenses List Table */}
            <div className="sheet-container" style={{ maxHeight: 'none' }}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="sheet-header-cell text-center" style={{ width: 45 }}>No</th>
                    <th className="sheet-header-cell text-left">Deskripsi Pekerjaan</th>
                    <th className="sheet-header-cell text-center" style={{ width: 90 }}>Volume</th>
                    <th className="sheet-header-cell text-right" style={{ width: 140 }}>Harga Satuan</th>
                    <th className="sheet-header-cell text-right" style={{ width: 140 }}>Subtotal</th>
                    <th className="sheet-header-cell text-center" style={{ width: 100 }}>Pajak</th>
                    <th className="sheet-header-cell text-right" style={{ width: 140 }}>Total RAB</th>
                    <th className="sheet-header-cell text-center" style={{ width: 80 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {stageExpenses.length > 0 ? (
                    stageExpenses.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-indigo-50/20 transition">
                        <td className="sheet-cell text-center text-text-muted font-mono">{idx + 1}</td>
                        <td className="sheet-cell text-left">
                          <span className="font-semibold text-text-primary block">{row.nama_item}</span>
                          {row.catatan && (
                            <span className="text-[10px] text-text-muted font-medium mt-0.5 block">{row.catatan}</span>
                          )}
                          {row.bukti_file_url && (
                            <a
                              href={row.bukti_file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-blue-600 hover:underline flex items-center gap-0.5 mt-1 font-bold"
                            >
                              <FileText size={10} />
                              Lihat Bukti Nota
                            </a>
                          )}
                        </td>
                        <td className="sheet-cell text-center">
                          <span className="badge bg-slate-50 border-slate-200 text-slate-700 text-[10px] font-mono">
                            {row.jumlah} {row.satuan}
                          </span>
                        </td>
                        <td className="sheet-cell text-right font-mono font-medium text-text-secondary">
                          {fmtRupiah(row.harga_satuan)}
                        </td>
                        <td className="sheet-cell text-right font-mono font-medium text-text-secondary">
                          {fmtRupiah(row.subtotal)}
                        </td>
                        <td className="sheet-cell text-center">
                          {row.jenis_pajak !== 'tanpa_pajak' ? (
                            <div className="flex flex-col items-center">
                              <span className="badge bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold uppercase py-0.5 px-1.5 flex items-center gap-0.5">
                                <Tag size={8} />
                                {JENIS_PAJAK_LABELS[row.jenis_pajak]} ({row.persentase_pajak}%)
                              </span>
                              <span className="text-[9px] text-amber-600 font-mono mt-0.5 font-bold">
                                Rp {fmtRupiah(row.nilai_pajak)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-text-muted text-[10px] font-medium">—</span>
                          )}
                        </td>
                        <td className="sheet-cell text-right font-bold font-mono text-blue-600">
                          {fmtRupiah(row.total_setelah_pajak)}
                        </td>
                        <td className="sheet-cell text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(row)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Edit Pekerjaan"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleDuplicateExpense(row)}
                              className="p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Duplikat Pekerjaan"
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              onClick={() => removeProjectExpense(row.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-100 transition cursor-pointer"
                              title="Hapus Pekerjaan"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="sheet-cell text-center text-text-muted py-6 text-[11px] font-medium">
                        Belum ada item anggaran di tahap ini
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Stage Footer Summary */}
            {stageExpenses.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[10px] font-semibold text-text-secondary px-6">
                <div>
                  Item: <span className="font-bold">{stageExpenses.length}</span>
                </div>
                <div className="flex gap-4">
                  <span>Subtotal: <span className="font-mono text-slate-700">Rp {fmtRupiah(stageSubtotal)}</span></span>
                  <span>Pajak: <span className="font-mono text-amber-600">Rp {fmtRupiah(stageTax)}</span></span>
                  <span>Total: <span className="font-mono text-blue-600 font-bold">Rp {fmtRupiah(stageTotal)}</span></span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Grand summary of the tables */}
      {expenses.length > 0 && (
        <div className="glass-card p-5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border border-blue-100/50 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              💰
            </div>
            <div>
              <h4 className="text-xs font-bold text-text-primary">Ringkasan Nilai RAB Paket</h4>
              <p className="text-[10px] text-text-muted mt-0.5 font-medium">Akumulasi pengeluaran dari seluruh tahap produksi</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-right">
            <div>
              <span className="text-[10px] text-text-muted block uppercase tracking-wider font-bold">Total Sebelum Pajak</span>
              <span className="text-sm font-extrabold font-mono text-slate-700">Rp {fmtRupiah(totals.subtotal)}</span>
            </div>
            <div>
              <span className="text-[10px] text-text-muted block uppercase tracking-wider font-bold text-amber-600">Total Pajak</span>
              <span className="text-sm font-extrabold font-mono text-amber-600">Rp {fmtRupiah(totals.nilaiPajak)}</span>
            </div>
            <div className="border-l border-slate-200 pl-6">
              <span className="text-[10px] text-text-muted block uppercase tracking-wider font-bold text-blue-600">Total Anggaran (RAB)</span>
              <span className="text-base font-black font-mono text-blue-600">Rp {fmtRupiah(totals.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
