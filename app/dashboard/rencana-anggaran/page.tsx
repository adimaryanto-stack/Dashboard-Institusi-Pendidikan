'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import { getAllInstitusi, MENTENG_TRANSACTIONS, MENTENG_YEAR_DATA } from '@/lib/data';
import { useAppStore } from '@/lib/store';
import { fmtRupiah } from '@/lib/utils/formatters';
import {
  CreditCard, Search, Plus, Eye, X, Calendar, User, Building2,
  CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck, Tag, ShoppingBag, Landmark,
  Camera, Trash2, Settings, MoreHorizontal, BookOpen, Wrench, Users, GraduationCap, RefreshCw
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { parseReceiptText } from '@/lib/utils/ocrParser';
import Link from 'next/link';
import DiskusiRAB from '@/components/DiskusiRAB';

interface TransaksiGlobal {
  id: string;
  tanggal: string;
  institusiId: string;
  namaInstitusi: string;
  jenjang: string;
  kategori: 'Sarana Prasarana' | 'Gaji Honorer' | 'Operasional' | 'Buku & Perpus' | 'Kegiatan Siswa' | 'Lainnya';
  item: string;
  qty: number;
  hargaSatuan: number;
  nominal: number;
  strukStatus: 'VALID' | 'DUPLIKAT' | 'ANOMALI_PAJAK' | 'STRUK_BURAM';
  strukMessage: string;
  invoiceNo: string;
  vendorName: string;
}

export default function RencanaAnggaranPage() {
  const { activeTahun, dbData, isSupabaseMode, addNotification, rencanaList, setRencanaList, addTransaksi, removeRencana } = useAppStore();
  const allInstitusi = useMemo(() => getAllInstitusi(), [dbData, isSupabaseMode]);

  const transactionsWithActiveYear = useMemo(() => {
    return rencanaList.filter(t => t.tanggal.includes(activeTahun.toString()));
  }, [rencanaList, activeTahun]);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState('Semua');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' or 'asc'

  // Modals States
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tambahModalOpen, setTambahModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [previewStrukOpen, setPreviewStrukOpen] = useState(false);
  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiGlobal | null>(null);

  // Form Edit Mode States
  const [formIsEditMode, setFormIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form States
  const [formStatus, setFormStatus] = useState<'PLANNED' | 'REALIZED'>('PLANNED');
  const [formTanggal, setFormTanggal] = useState('2026-06-06');
  const [formSchoolId, setFormSchoolId] = useState('inst-sd-0');
  const [formKategori, setFormKategori] = useState<TransaksiGlobal['kategori']>('Operasional');
  const [formVendor, setFormVendor] = useState('');
  const [formSumberDana, setFormSumberDana] = useState('BOS Reguler');
  const [formItems, setFormItems] = useState<{ id: string; name: string; qty: number; price: number; unit: string; notes: string }[]>([
    { id: '1', name: '', qty: 1, price: 0, unit: 'pcs', notes: '' }
  ]);
  const [formOngkir, setFormOngkir] = useState(0);
  const [formPajak, setFormPajak] = useState(11); // default 11%
  const [formKeterangan, setFormKeterangan] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // VERCEL-STYLE Inline Editing States
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleSaveEdit = () => {
    if (!editingCell) return;
    const numVal = parseFloat(editValue) || 0;
    if (editingCell.field === 'nominal') {
      setRencanaList(prev => prev.map(t => {
        if (t.id === editingCell.id) {
          return { ...t, nominal: numVal };
        }
        return t;
      }));
    }
    setEditingCell(null);
  };

  // Form Items Helper Functions
  const handleAddFormItem = () => {
    setFormItems(prev => [...prev, { id: Date.now().toString(), name: '', qty: 1, price: 0, unit: 'pcs', notes: '' }]);
  };

  const handleRemoveFormItem = (itemId: string) => {
    if (formItems.length === 1) return;
    setFormItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleEditFormItem = (itemId: string, field: string, value: any) => {
    setFormItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const dateToYmd = (dateStr: string): string => {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', jun: '06',
      jul: '07', agu: '08', sep: '09', okt: '10', nov: '11', des: '12'
    };
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = months[parts[1].toLowerCase()] || '01';
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return '2026-06-06';
  };

  const handleOpenTambahModal = () => {
    setFormIsEditMode(false);
    setEditId(null);
    setFormStatus('PLANNED');
    setFormTanggal('2026-06-06');
    setFormSchoolId('inst-sd-0');
    setFormKategori('Operasional');
    setFormVendor('');
    setFormItems([{ id: '1', name: '', qty: 1, price: 0, unit: 'pcs', notes: '' }]);
    setFormOngkir(0);
    setFormPajak(11);
    setFormKeterangan('');
    setTambahModalOpen(true);
  };

  const handleOpenEditModal = (row: TransaksiGlobal) => {
    setFormIsEditMode(true);
    setEditId(row.id);
    setFormStatus('PLANNED');
    setFormTanggal(dateToYmd(row.tanggal));
    setFormSchoolId(row.institusiId);
    setFormKategori(row.kategori);
    setFormVendor(row.vendorName);
    
    const itemQty = row.qty || 1;
    const cleanItemQty = itemQty > 0 ? itemQty : 1;
    const itemPrice = row.hargaSatuan || Math.round(row.nominal / cleanItemQty);
    const cleanItemName = row.item.replace(/^\d+x\s+/, '');
    
    const subtotal = cleanItemQty * itemPrice;
    const taxAmount = Math.max(0, row.nominal - subtotal);
    const calculatedTaxPercent = subtotal > 0 ? Math.round((taxAmount / subtotal) * 100) : 0;
    
    setFormItems([
      {
        id: `edit-item-${Date.now()}`,
        name: cleanItemName,
        qty: itemQty,
        price: itemPrice,
        unit: 'pcs',
        notes: ''
      }
    ]);
    setFormOngkir(0);
    setFormPajak(calculatedTaxPercent);
    setFormKeterangan(row.strukMessage || '');
    setTambahModalOpen(true);
  };

  const handlePrintReceipt = () => {
    if (!selectedTransaksi) return;
    const printContent = document.getElementById('print-receipt-content-global')?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Cetak Struk - \${selectedTransaksi.invoiceNo}</title>
              <style>
                body { font-family: monospace; padding: 20px; color: #000; }
                .text-center { text-align: center; }
                .flex { display: flex; }
                .justify-between { display: flex; justify-content: space-between; }
                .border-b-2 { border-bottom: 2px dashed #000; margin-bottom: 8px; padding-bottom: 8px; }
                .border-t-2 { border-top: 2px dashed #000; margin-top: 8px; padding-top: 8px; }
                .pb-4 { padding-bottom: 16px; }
                .pt-4 { padding-top: 16px; }
                .mt-4 { margin-top: 16px; }
                .space-y-4 > * + * { margin-top: 16px; }
                .space-y-1 > * + * { margin-top: 4px; }
                .space-y-2 > * + * { margin-top: 8px; }
                .font-bold { font-weight: bold; }
                .text-xs { font-size: 11px; }
                .text-sm { font-size: 13px; }
                .text-md { font-size: 15px; }
                .uppercase { text-transform: uppercase; }
                .font-mono { font-family: monospace; }
                .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .max-w-\\[150px\\] { max-width: 150px; }
                .max-w-\\[70\\%\\] { max-width: 70%; }
                .text-right { text-align: right; }
              </style>
            </head>
            <body>
              <div style="max-width: 320px; margin: 0 auto; border: 1px solid #ddd; padding: 16px; border-radius: 8px; background: #fff;">
                \${printContent}
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleScanDemo = () => {
    setIsScanning(true);
    setTimeout(() => {
      setFormKategori('Buku & Perpus');
      setFormVendor('CV Pustaka Mandiri Jaya');
      setFormTanggal('2026-06-06');
      setFormSumberDana('BOS Reguler');
      setFormItems([
        { id: 'scanned-1', name: 'Buku Pelajaran Matematika SD Kelas IV', qty: 150, price: 45000, unit: 'pcs', notes: 'Kurikulum Merdeka' }
      ]);
      setFormOngkir(75000);
      setFormPajak(11); // 11%
      setFormKeterangan('Pemindaian otomatis AI: Pengadaan buku pelajaran penunjang Kurikulum Merdeka.');
      setIsScanning(false);
    }, 1500);
  };

  const handleScanReceipt = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        try {
          const result = await Tesseract.recognize(
            dataUrl,
            'eng+ind',
            {
              logger: m => console.log('[OCR Progress]', m)
            }
          );
          
          const text = result.data.text;
          console.log('[OCR Extracted Text]\n', text);
          
          const parsed = parseReceiptText(text);
          
          if (parsed.category) setFormKategori(parsed.category as any);
          if (parsed.vendor) setFormVendor(parsed.vendor);
          if (parsed.date) setFormTanggal(parsed.date);
          if (parsed.items && parsed.items.length > 0) setFormItems(parsed.items);
          setFormOngkir(parsed.ongkir);
          
          const subtotal = parsed.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
          const taxPercent = subtotal > 0 ? Math.round((parsed.pajak / subtotal) * 100) : 0;
          setFormPajak(taxPercent || 11);
          
          setFormKeterangan(parsed.keterangan);
        } catch (ocrErr) {
          console.error('[OCR Error, running fallback]', ocrErr);
          handleScanDemo();
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('[File Read Error]', err);
      handleScanDemo();
      setIsScanning(false);
    }
  };

  // Add Transaksi Handler
  const handleAddTransaksiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotalItems = formItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const calculatedPajak = Math.round((subtotalItems * formPajak) / 100);
    const overallTotal = subtotalItems + formOngkir + calculatedPajak;
    if (overallTotal <= 0) return;

    const school = allInstitusi.find(i => i.id === formSchoolId);
    const schoolName = school ? school.nama_institusi : 'Institusi Umum';
    const schoolJenjang = school ? school.jenjang : 'SD';

    const mainItemName = formItems[0]?.name || 'Belanja Umum';
    const mainQty = formItems[0]?.qty || 1;
    const mainHarga = formItems[0]?.price || 0;
    const itemDescription = formItems.length > 1
      ? `${mainQty}x ${mainItemName} (+ ${formItems.length - 1} item lainnya)`
      : `${mainQty}x ${mainItemName}`;

    if (formIsEditMode && editId) {
      if (formStatus === 'REALIZED') {
        // Move to realisasi
        removeRencana(editId);
        const newTrans: TransaksiGlobal = {
            id: `tr-glob-manual-${Date.now()}`,
            tanggal: new Date(formTanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            institusiId: formSchoolId,
            namaInstitusi: schoolName,
            jenjang: schoolJenjang,
            kategori: formKategori,
            item: itemDescription,
            qty: formItems.reduce((sum, item) => sum + item.qty, 0),
            hargaSatuan: mainHarga,
            nominal: overallTotal,
            strukStatus: 'VALID',
            strukMessage: 'Dibuat dari realisasi rencana anggaran.',
            invoiceNo: `INV-MAN-${Date.now().toString().slice(-4)}`,
            vendorName: formVendor || 'Vendor Umum'
        };
        addTransaksi(newTrans);
        addNotification({
          message: `Realisasi Rencana: Rencana "${itemDescription}" di ${schoolName} senilai Rp ${fmtRupiah(overallTotal)} telah direalisasikan.`,
          type: 'success',
          link: `/dashboard/pengeluaran`
        });
      } else {
        setRencanaList(prev => prev.map(t => {
          if (t.id === editId) {
            return {
              ...t,
              tanggal: new Date(formTanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
              institusiId: formSchoolId,
              namaInstitusi: schoolName,
              jenjang: schoolJenjang,
              kategori: formKategori,
              item: itemDescription,
              qty: formItems.reduce((sum, item) => sum + item.qty, 0),
              hargaSatuan: mainHarga,
              nominal: overallTotal,
              vendorName: formVendor || 'Vendor Umum'
            };
          }
          return t;
        }));

        addNotification({
          message: `Update Rencana: Rencana "${itemDescription}" di ${schoolName} diperbarui menjadi Rp ${fmtRupiah(overallTotal)}.`,
          type: 'info',
          link: `/dashboard/rencana-anggaran`
        });
      }
    } else {
      const newTrans: TransaksiGlobal = {
        id: `rab-${Date.now()}`,
        tanggal: new Date(formTanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
        institusiId: formSchoolId,
        namaInstitusi: schoolName,
        jenjang: schoolJenjang,
        kategori: formKategori,
        item: itemDescription,
        qty: formItems.reduce((sum, item) => sum + item.qty, 0),
        hargaSatuan: mainHarga,
        nominal: overallTotal,
        strukStatus: 'VALID',
        strukMessage: 'Rencana anggaran dibuat secara manual.',
        invoiceNo: `RAB-${Date.now().toString().slice(-4)}`,
        vendorName: formVendor || 'Vendor Umum'
      };
      setRencanaList(prev => [newTrans, ...prev]);

      addNotification({
        message: `Penambahan Rencana: Rencana baru "${itemDescription}" senilai Rp ${fmtRupiah(overallTotal)} berhasil disimpan untuk ${schoolName}.`,
        type: 'success',
        link: `/dashboard/rencana-anggaran`
      });
    }

    setTambahModalOpen(false);

    // Reset Form
    setFormVendor('');
    setFormTanggal('2026-06-06');
    setFormSumberDana('BOS Reguler');
    setFormItems([{ id: '1', name: '', qty: 1, price: 0, unit: 'pcs', notes: '' }]);
    setFormOngkir(0);
    setFormPajak(11);
    setFormKeterangan('');
  };

  // Statistics summaries
  const stats = useMemo(() => {
    const total = transactionsWithActiveYear.reduce((sum, t) => sum + t.nominal, 0);
    const mentengData = MENTENG_YEAR_DATA[activeTahun] || MENTENG_YEAR_DATA[2026];
    const totalAnggaran = mentengData.alokasi;
    const sisaAnggaran = totalAnggaran - total;
    return { total, totalAnggaran, sisaAnggaran };
  }, [transactionsWithActiveYear, activeTahun]);

  // Helpers for Month & Date Sorting
  const getMonthFromDateStr = (dateStr: string) => {
    const monthMap: Record<string, string> = {
      jan: 'Januari', feb: 'Februari', mar: 'Maret', apr: 'April',
      mei: 'Mei', jun: 'Juni', jul: 'Juli', agu: 'Agustus',
      sep: 'September', okt: 'Oktober', nov: 'November', des: 'Desember'
    };
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const monthShort = parts[1].toLowerCase();
      return monthMap[monthShort] || 'Lainnya';
    }
    return 'Lainnya';
  };

  const parseDateToTimestamp = (dateStr: string) => {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5,
      jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11
    };
    const parts = dateStr.split(' ');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = months[parts[1].toLowerCase()] ?? 0;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day).getTime();
    }
    return 0;
  };

  // Filtered & Sorted Transaksi
  const filteredTransaksi = useMemo(() => {
    const filtered = transactionsWithActiveYear.filter(t => {
      // Search
      const matchSearch =
        t.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.namaInstitusi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase());

      // Category
      const matchCategory = selectedCategory === 'Semua' || t.kategori === selectedCategory;

      // Month
      const matchMonth = selectedMonthFilter === 'Semua' || getMonthFromDateStr(t.tanggal) === selectedMonthFilter;

      return matchSearch && matchCategory && matchMonth;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      const timeA = parseDateToTimestamp(a.tanggal);
      const timeB = parseDateToTimestamp(b.tanggal);
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [transactionsWithActiveYear, searchTerm, selectedCategory, selectedMonthFilter, sortOrder]);

  const getStrukStatusBadge = (status: TransaksiGlobal['strukStatus']) => {
    switch (status) {
      case 'VALID': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DUPLIKAT': return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-bold';
      case 'ANOMALI_PAJAK': return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
      case 'STRUK_BURAM': return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStrukStatusIcon = (status: TransaksiGlobal['strukStatus']) => {
    switch (status) {
      case 'VALID': return <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />;
      case 'DUPLIKAT': return <ShieldAlert className="text-rose-500 shrink-0" size={18} />;
      case 'ANOMALI_PAJAK': return <AlertTriangle className="text-amber-500 shrink-0" size={18} />;
      case 'STRUK_BURAM': return <AlertTriangle className="text-gray-500 shrink-0" size={18} />;
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <Header
        title="Daftar Rencana (RAB)"
        subtitle="Verifikasi dan pantau rencana anggaran belanja (RAB) sebelum direalisasikan"
      />

      <div className="p-6 space-y-6">
        {/* ===== SUMMARY CARDS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="metric-card accent-blue">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Total Anggaran {activeTahun}</span>
            <p className="text-xl font-extrabold text-blue-600">{fmtRupiah(stats.totalAnggaran)}</p>
            <span className="text-[10px] text-text-muted mt-2 block">Pagu anggaran yang tersedia</span>
          </div>
          <div className="metric-card accent-indigo">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Total Rencana (RAB)</span>
            <p className="text-xl font-extrabold text-indigo-600">{fmtRupiah(stats.total)}</p>
            <span className="text-[10px] text-text-muted mt-2 block">Akumulasi rencana pengeluaran</span>
          </div>
          <div className={`metric-card ${stats.sisaAnggaran < 0 ? 'accent-rose' : 'accent-emerald'}`}>
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Status Saldo Rencana</span>
            <p className={`text-xl font-extrabold ${stats.sisaAnggaran < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stats.sisaAnggaran < 0 ? 'DEFISIT ' : 'SISA '}{fmtRupiah(Math.abs(stats.sisaAnggaran))}
            </p>
            <span className={`text-[10px] font-medium mt-2 block ${stats.sisaAnggaran < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {stats.sisaAnggaran < 0 ? 'Rencana melebihi pagu anggaran!' : 'Anggaran masih aman'}
            </span>
          </div>
        </div>

        {/* ===== CONTROLS TOOLBAR ===== */}
        <div className="glass-card p-5 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-3 w-full lg:max-w-3xl">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Cari transaksi berdasarkan item, vendor, invoice, atau sekolah..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Month Filter Dropdown */}
              <select
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
              >
                <option value="Semua">Semua Bulan</option>
                <option value="Januari">Januari</option>
                <option value="Februari">Februari</option>
                <option value="Maret">Maret</option>
                <option value="April">April</option>
                <option value="Mei">Mei</option>
                <option value="Juni">Juni</option>
                <option value="Juli">Juli</option>
                <option value="Agustus">Agustus</option>
                <option value="September">September</option>
                <option value="Oktober">Oktober</option>
                <option value="November">November</option>
                <option value="Desember">Desember</option>
              </select>

              {/* Date Sorting Dropdown */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors font-semibold"
              >
                <option value="desc">Terbaru ke Terlama</option>
                <option value="asc">Terlama ke Terbaru</option>
              </select>
            </div>

            <Link
              href="/dashboard/rencana-anggaran/paket-project"
              className="btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10 font-bold py-2 px-4 text-xs w-full lg:w-auto shrink-0 cursor-pointer flex items-center gap-1.5 rounded-xl transition-all"
            >
              <Plus size={14} />
              Paket Project
            </Link>
            <button
              onClick={handleOpenTambahModal}
              className="btn btn-primary shadow-lg shadow-indigo-500/10 font-bold py-2 px-4 text-xs w-full lg:w-auto shrink-0 cursor-pointer"
            >
              <Plus size={14} />
              Tambah Pengeluaran
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
            {['Semua', 'Sarana Prasarana', 'Gaji Honorer', 'Operasional', 'Buku & Perpus', 'Kegiatan Siswa', 'Lainnya'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ===== TRANSACTION LEDGER TABLE ===== */}
        <div className="glass-card overflow-hidden">
              {/* Table Header mimicking benchmark style with a zig-zag list icon */}
          <div className="bg-slate-50 border-b border-slate-200/60 p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold">📋</span>
              Semua Rencana (RAB)
            </span>
            <span className="text-xs text-text-muted font-medium">Ditemukan {filteredTransaksi.length} rencana</span>
          </div>

          <div className="sheet-container" style={{ maxHeight: 'none' }}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                  <th className="sheet-header-cell text-left" style={{ width: 110 }}>Tanggal</th>
                  <th className="sheet-header-cell text-left" style={{ width: 180 }}>Institusi</th>
                  <th className="sheet-header-cell text-left" style={{ minWidth: 260 }}>Kategori & Rincian Belanja</th>
                  <th className="sheet-header-cell text-center" style={{ width: 100 }}>Item</th>
                  <th className="sheet-header-cell text-right" style={{ width: 160 }}>Nominal</th>
                  <th className="sheet-header-cell text-center" style={{ width: 100 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransaksi.length > 0 ? (
                  filteredTransaksi.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-indigo-50/40 transition">
                      <td className="sheet-cell text-center text-text-muted text-xs font-mono">{idx + 1}</td>
                      <td className="sheet-cell text-left text-xs font-medium text-text-secondary">{row.tanggal}</td>
                      <td className="sheet-cell text-left">
                        <Link
                          href={`/dashboard/profil-institusi/${row.institusiId}`}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline font-semibold text-xs block truncate"
                          title={row.namaInstitusi}
                        >
                          {row.namaInstitusi}
                        </Link>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase mt-0.5 inline-block">
                          {row.jenjang}
                        </span>
                      </td>
                      <td className="sheet-cell text-left">
                        <span className="font-semibold text-text-primary text-xs block leading-snug">{row.item}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-text-muted font-mono">Inv: {row.invoiceNo}</span>
                          <span className="text-[10px] text-text-muted font-medium">• Vendor: {row.vendorName}</span>
                          {row.strukStatus !== 'VALID' && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Terdeteksi Anomali" />
                          )}
                        </div>
                      </td>
                      <td className="sheet-cell text-center">
                        <span className="badge bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                          {row.qty > 0 ? `${row.qty} Produk` : '—'}
                        </span>
                      </td>
                      <td className="sheet-cell text-right font-extrabold font-mono text-xs text-rose-600">
                        {fmtRupiah(row.nominal)}
                      </td>
                      <td className="sheet-cell text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTransaksi(row);
                              setPreviewStrukOpen(true);
                            }}
                            className="btn py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-text-primary flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                          >
                            <Eye size={12} />
                            Struk
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(row)}
                            className="btn py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                          >
                            <Settings size={12} />
                            Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="sheet-cell text-center text-text-muted py-12">
                      <ShoppingBag size={36} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-xs font-semibold">Tidak ada rencana anggaran ditemukan</p>
                      <p className="text-[10px] mt-0.5 text-text-muted">Coba ubah kata kunci pencarian atau filter kategori Anda</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== DISKUSI RAB SECTION ===== */}
        <DiskusiRAB />

        {/* ===== MODAL 1: DETAIL SCAN STRUK & AI STATUS ===== */}
        {detailModalOpen && selectedTransaksi && (
          <div className="modal-backdrop z-50">
            <div className="modal-content w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 relative animate-scale-up">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>

              <h3 className="text-base font-bold text-text-primary mb-1 flex items-center gap-2">
                <span>🧾</span> Detail Transaksi & Pratinjau Kuitansi
              </h3>
              <p className="text-xs text-text-muted mb-4">No Invoice: {selectedTransaksi.invoiceNo}</p>

              {/* Status AI Card */}
              <div className={`border rounded-2xl p-4 flex gap-3.5 mb-5 ${
                selectedTransaksi.strukStatus === 'VALID'
                  ? 'bg-emerald-50/50 border-emerald-100'
                  : selectedTransaksi.strukStatus === 'DUPLIKAT'
                    ? 'bg-rose-50/50 border-rose-100'
                    : 'bg-amber-50/50 border-amber-100'
              }`}>
                {getStrukStatusIcon(selectedTransaksi.strukStatus)}
                <div>
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
                    Hasil Verifikasi AI Agen Audit
                    <span className={`badge ${getStrukStatusBadge(selectedTransaksi.strukStatus)} text-[9px]`}>
                      {selectedTransaksi.strukStatus}
                    </span>
                  </h4>
                  <p className="text-xs text-text-secondary mt-1 font-medium leading-relaxed">
                    {selectedTransaksi.strukMessage}
                  </p>
                </div>
              </div>

              {/* Transaction Metadata */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs mb-5">
                <div className="flex justify-between">
                  <span className="text-text-muted">Institusi Pendidikan:</span>
                  <span className="font-bold text-text-primary">{selectedTransaksi.namaInstitusi} ({selectedTransaksi.jenjang})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Tanggal Belanja:</span>
                  <span className="font-semibold text-text-primary">{selectedTransaksi.tanggal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Kategori Anggaran:</span>
                  <span className="font-semibold text-text-primary flex items-center gap-1">
                    <Tag size={12} className="text-indigo-500" />
                    {selectedTransaksi.kategori}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Nama Item/Pekerjaan:</span>
                  <span className="font-semibold text-text-primary text-right max-w-[280px] truncate">{selectedTransaksi.item}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Kuantitas & Harga Satuan:</span>
                  <span className="font-semibold text-text-primary">
                    {selectedTransaksi.qty > 0 ? `${selectedTransaksi.qty} x ${fmtRupiah(selectedTransaksi.hargaSatuan)}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200/60 text-sm font-bold">
                  <span className="text-text-primary">Total Nominal:</span>
                  <span className="text-rose-600 font-mono">{fmtRupiah(selectedTransaksi.nominal)}</span>
                </div>
              </div>

              {/* Receipt Visual Simulator */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Visual Scan Kuitansi Fisik</label>
                <div className="relative border-2 border-dashed border-slate-200 bg-white rounded-2xl p-6 min-h-[180px] flex flex-col items-center justify-center text-center shadow-inner overflow-hidden">
                  {/* Decorative receipt lines */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  
                  <div className="w-full max-w-[260px] font-mono text-[10px] text-left text-slate-800 space-y-1 p-2 border border-slate-100 rounded bg-slate-50">
                    <div className="text-center font-bold text-slate-900 border-b border-dashed border-slate-300 pb-1.5 mb-1.5 uppercase">
                      {selectedTransaksi.vendorName}
                    </div>
                    <div className="flex justify-between">
                      <span>No: {selectedTransaksi.invoiceNo}</span>
                      <span>{selectedTransaksi.tanggal}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-b border-dashed border-slate-200 pb-1 mt-1 mb-1">
                      <span>Item</span>
                      <span>Sub-Total</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="max-w-[150px] truncate">{selectedTransaksi.item}</span>
                      <span>{fmtRupiah(selectedTransaksi.nominal)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-1.5 mt-2">
                      <span>TOTAL BELANJA</span>
                      <span>{fmtRupiah(selectedTransaksi.nominal)}</span>
                    </div>
                    <div className="text-center text-[9px] text-text-muted pt-2">
                      *** LUNAS TERBAYAR ***
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ===== MODAL 2: TAMBAH PENGELUARAN ===== */}
      {tambahModalOpen && (
        <div className="modal-overlay" onClick={() => setTambahModalOpen(false)}>
          <div className="modal-content modal-content-wide w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 relative animate-scale-up border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span className={`p-1.5 rounded-lg ${formIsEditMode ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                  {formIsEditMode ? <Settings size={16} /> : <Plus size={16} />}
                </span>
                {formIsEditMode ? 'Edit Rencana Anggaran' : 'Tambah Rencana Manual'}
              </h3>
              <button
                onClick={() => setTambahModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-text-muted transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddTransaksiSubmit} className="space-y-5">
              {/* Hidden File Input for OCR */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Scan receipt button */}
              {isScanning ? (
                <div className="border-2 border-dashed border-indigo-200 bg-indigo-50/20 rounded-2xl p-6 text-center mb-5 flex flex-col items-center justify-center min-h-[90px]">
                  <RefreshCw className="animate-spin text-indigo-600 mb-2" size={20} />
                  <span className="text-xs text-indigo-700 font-semibold">Membaca & menganalisis struk belanja dengan AI...</span>
                </div>
              ) : (
                <div
                  onClick={handleScanReceipt}
                  className="border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-6 text-center mb-5 hover:bg-slate-50 transition cursor-pointer flex flex-col items-center justify-center"
                >
                  <button type="button" className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-xs font-bold py-2.5 px-6 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer">
                    <Camera size={14} />
                    UNGGAH / SCAN STRUK (AI)
                  </button>
                  <span className="text-[10px] text-text-muted mt-2 uppercase font-semibold tracking-wider">
                    Gunakan foto nota/struk belanja yang jelas atau{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScanDemo();
                      }}
                      className="text-blue-600 underline cursor-pointer hover:text-blue-800 font-bold uppercase"
                    >
                      Gunakan Struk Demo
                    </button>
                  </span>
                </div>
              )}

              {/* Grid Category selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">PILIH KATEGORI</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { val: 'Buku & Perpus', label: 'Buku & Perpustakaan', icon: <BookOpen size={16} /> },
                    { val: 'Sarana Prasarana', label: 'Sarana & Prasarana', icon: <Wrench size={16} /> },
                    { val: 'Gaji Honorer', label: 'Gaji & Honor', icon: <Users size={16} /> },
                    { val: 'Operasional', label: 'Operasional', icon: <Settings size={16} /> },
                    { val: 'Kegiatan Siswa', label: 'Kegiatan Siswa', icon: <GraduationCap size={16} /> },
                    { val: 'Lainnya', label: 'Lainnya', icon: <MoreHorizontal size={16} /> },
                  ].map((cat) => {
                    const active = formKategori === cat.val;
                    return (
                      <button
                        key={cat.val}
                        type="button"
                        onClick={() => setFormKategori(cat.val as any)}
                        className={`flex flex-col sm:flex-row items-center gap-2 p-3 text-center sm:text-left border-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          active
                            ? 'border-blue-500 bg-blue-50/50 text-blue-600 shadow-sm'
                            : 'border-slate-100 bg-white text-text-secondary hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <span className={`p-1 rounded-lg ${active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>{cat.icon}</span>
                        <span className="text-[11px] leading-tight">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* School Selector - Locked to SDN 01 Menteng */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Institusi Pendidikan</label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    disabled
                    value="SDN 01 Menteng (SD)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-text-muted font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* General inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">Tanggal</label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="date"
                      required
                      value={formTanggal}
                      onChange={(e) => setFormTanggal(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">Nama Vendor / Toko</label>
                  <div className="relative">
                    <ShoppingBag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Contoh: Toko Gramedia"
                      value={formVendor}
                      onChange={(e) => setFormVendor(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">Sumber Dana</label>
                  <div className="relative">
                    <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Contoh: BOS Reguler"
                      value={formSumberDana}
                      onChange={(e) => setFormSumberDana(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">RINCIAN ITEM ({formItems.length} ITEM)</span>
                  <button
                    type="button"
                    onClick={handleAddFormItem}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus size={14} />
                    Tambah Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formItems.map((item, idx) => (
                    <div key={item.id} className="p-4 border border-slate-200 bg-white rounded-2xl space-y-3 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-extrabold">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                            {item.name ? item.name.toUpperCase() : "JUDUL ITEM"}
                          </span>
                        </div>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            required
                            placeholder="Contoh: Pengadaan Meja Guru, Buku Matematika"
                            value={item.name}
                            onChange={(e) => handleEditFormItem(item.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                        <div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">Rp</span>
                            <input
                              type="number"
                              min="0"
                              required
                              value={item.price || ''}
                              placeholder="Harga"
                              onChange={(e) => handleEditFormItem(item.id, 'price', parseInt(e.target.value, 10) || 0)}
                              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.qty}
                            placeholder="Qty"
                            onChange={(e) => handleEditFormItem(item.id, 'qty', parseInt(e.target.value, 10) || 1)}
                            className="w-[60px] px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-center focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) => handleEditFormItem(item.id, 'unit', e.target.value)}
                            className="select-dropdown flex-1 text-center text-xs py-2"
                          >
                            <option value="pcs">pcs</option>
                            <option value="unit">unit</option>
                            <option value="rim">rim</option>
                            <option value="box">box</option>
                            <option value="lembar">lembar</option>
                            <option value="paket">paket</option>
                            <option value="kali">kali</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center pt-1">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            placeholder="Catatan (opsional)"
                            value={item.notes}
                            onChange={(e) => handleEditFormItem(item.id, 'notes', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="text-right text-xs text-text-secondary font-medium">
                          Subtotal: <span className="font-extrabold text-slate-800 font-mono">Rp {fmtRupiah(item.qty * item.price)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extra costs & Keterangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">Ongkos Kirim / Kurir</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">Rp</span>
                    <input
                      type="number"
                      min="0"
                      value={formOngkir || ''}
                      placeholder="0"
                      onChange={(e) => setFormOngkir(parseInt(e.target.value, 10) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted block mb-1">Pajak (PPN / PPh %)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formPajak || ''}
                      placeholder="11"
                      onChange={(e) => setFormPajak(parseInt(e.target.value, 10) || 0)}
                      className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-mono text-right focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-semibold">%</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-muted block mb-1">Keterangan Tambahan (opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Pembelian buku kurikulum merdeka semester genap"
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500 focus:bg-white transition-all h-16 resize-none"
                />
              </div>

              {/* Summaries Panel */}
              <div className="bg-blue-50/40 border border-blue-100/40 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-600 font-medium">
                  <span>Subtotal Item ({formItems.length})</span>
                  <span className="font-mono">Rp {fmtRupiah(formItems.reduce((sum, item) => sum + (item.qty * item.price), 0))}</span>
                </div>
                {formOngkir > 0 && (
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Ongkos Kirim / Kurir</span>
                    <span className="font-mono">Rp {fmtRupiah(formOngkir)}</span>
                  </div>
                )}
                {formPajak > 0 && (
                  <div className="flex justify-between items-center text-slate-600 font-medium">
                    <span>Pajak ({formPajak}%)</span>
                    <span className="font-mono">Rp {fmtRupiah(Math.round((formItems.reduce((sum, item) => sum + (item.qty * item.price), 0) * formPajak) / 100))}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-blue-200/50 pt-2 text-sm font-bold">
                  <span className="text-blue-900 uppercase">TOTAL</span>
                  <span className="text-xl text-blue-600 font-mono">
                    Rp {fmtRupiah(
                      formItems.reduce((sum, item) => sum + (item.qty * item.price), 0) +
                      formOngkir +
                      Math.round((formItems.reduce((sum, item) => sum + (item.qty * item.price), 0) * formPajak) / 100)
                    )}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-between border-t border-slate-100 pt-4 mt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-600">Status:</label>
                  <select 
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'PLANNED' | 'REALIZED')}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-500 focus:outline-none"
                    disabled={!formIsEditMode}
                  >
                     <option value="PLANNED">Rencana (PLANNED)</option>
                     <option value="REALIZED">Terealisasi (REALIZED)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all uppercase ${
                      formItems.reduce((sum, item) => sum + (item.qty * item.price), 0) +
                      formOngkir +
                      Math.round((formItems.reduce((sum, item) => sum + (item.qty * item.price), 0) * formPajak) / 100) > 0
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                    disabled={
                      formItems.reduce((sum, item) => sum + (item.qty * item.price), 0) +
                      formOngkir +
                      Math.round((formItems.reduce((sum, item) => sum + (item.qty * item.price), 0) * formPajak) / 100) === 0
                    }
                  >
                    SIMPAN RENCANA
                  </button>
                  <button
                    type="button"
                    onClick={() => setTambahModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all uppercase cursor-pointer"
                  >
                    BATAL
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ===== MODAL: PRATINJAU & PRINT STRUK ===== */}
      {previewStrukOpen && selectedTransaksi && (
        <div className="modal-overlay" onClick={() => setPreviewStrukOpen(false)}>
          <div className="modal-content w-full max-w-sm rounded-3xl p-6 relative animate-scale-up border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewStrukOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <span>🧾</span> Pratinjau Kuitansi
            </h3>

            {/* Receipt Print Content */}
            <div id="print-receipt-content-global" className="bg-white p-4 border border-slate-200 rounded-2xl shadow-inner font-mono text-xs text-slate-800 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="text-center font-bold text-slate-900 border-b border-dashed border-slate-300 pb-2 mb-2 uppercase">
                {selectedTransaksi.vendorName}
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mb-1">
                <span>No: {selectedTransaksi.invoiceNo}</span>
                <span>{selectedTransaksi.tanggal}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 border-b border-dashed border-slate-200 pb-1 mt-1 mb-1 font-mono">
                <span>Item</span>
                <span>Sub-Total</span>
              </div>
              <div className="flex justify-between">
                <span className="max-w-[70%] truncate">{selectedTransaksi.item}</span>
                <span>{fmtRupiah(selectedTransaksi.nominal)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-dashed border-slate-300 pt-2 mt-2 font-mono">
                <span>TOTAL BELANJA</span>
                <span>{fmtRupiah(selectedTransaksi.nominal)}</span>
              </div>
              <div className="text-center text-[10px] text-text-muted pt-3">
                *** LUNAS TERBAYAR ***
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                Cetak Struk
              </button>
              <button
                type="button"
                onClick={() => setPreviewStrukOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all uppercase cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
