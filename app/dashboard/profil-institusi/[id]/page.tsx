'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useAppStore } from '@/lib/store';
import { getProfilInstitusi, mockAnomalies, MENTENG_TRANSACTIONS, MENTENG_YEAR_DATA } from '@/lib/data';
import { fmtRupiah, fmtPct } from '@/lib/utils/formatters';
import { SumberDanaInstitusi, PengeluaranBulananInstitusi, AuditAnomaly } from '@/types';
import {
  ArrowLeft, Banknote, CreditCard, TrendingUp, TrendingDown,
  AlertTriangle, ShieldAlert, ShieldCheck, CheckCircle2, FileText,
  Users, Award, BookOpen, Coins, UploadCloud, FolderOpen,
  FileCheck, X, Briefcase, Calendar, MapPin, User, RefreshCw, FileSearch, Wrench,
  Plus, MessageSquare, Send, Eye, Paperclip, Camera, Trash2, Settings, MoreHorizontal,
  ShoppingBag, GraduationCap
} from 'lucide-react';
import Tesseract from 'tesseract.js';
import { parseReceiptText } from '@/lib/utils/ocrParser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const bulanNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface TransaksiItem {
  id: string;
  tanggal: string;
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

interface ChatMessage {
  id: string;
  sender: 'auditor' | 'sekolah';
  senderName: string;
  text: string;
  time: string;
}

export default function ProfilInstitusiDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { activeTahun, addNotification, transaksiList, setTransaksiList } = useAppStore();

  const profilData = useMemo(() => getProfilInstitusi(id, activeTahun), [id, activeTahun]);

  // Tab State: 'ringkasan' | 'transaksi' | 'analitik' | 'audit'
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'transaksi' | 'analitik' | 'audit'>('ringkasan');

  // Page States
  const [sumberDana, setSumberDana] = useState<SumberDanaInstitusi[]>([]);
  const [pengeluaran, setPengeluaran] = useState<PengeluaranBulananInstitusi[]>([]);
  const [nomorRekening, setNomorRekening] = useState('');
  
  // Anomalies local state
  const [anomalies, setAnomalies] = useState<AuditAnomaly[]>([]);
  const [activeAnomaly, setActiveAnomaly] = useState<AuditAnomaly | null>(null);

  // VERCEL-STYLE 1: Transaksi List State
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Semua');

  // VERCEL-STYLE 2: Tambah Pengeluaran Modal State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tambahModalOpen, setTambahModalOpen] = useState(false);
  const [formTanggal, setFormTanggal] = useState('2026-06-06');
  const [formKategori, setFormKategori] = useState<TransaksiItem['kategori']>('Operasional');
  const [formVendor, setFormVendor] = useState('');
  const [formSumberDana, setFormSumberDana] = useState('BOS Reguler');
  const [formItems, setFormItems] = useState<{ id: string; name: string; qty: number; price: number; unit: string; notes: string }[]>([
    { id: '1', name: '', qty: 1, price: 0, unit: 'pcs', notes: '' }
  ]);
  const [formOngkir, setFormOngkir] = useState(0);
  const [formPajak, setFormPajak] = useState(11);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // VERCEL-STYLE Inline Editing States
  const [editingCell, setEditingCell] = useState<{ type: 'sumberDana' | 'pengeluaran' | 'transaksi'; id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // VERCEL-STYLE 3: Preview Scan Struk Modal State
  const [previewStrukOpen, setPreviewStrukOpen] = useState(false);
  const [selectedTransaksi, setSelectedTransaksi] = useState<TransaksiItem | null>(null);

  // VERCEL-STYLE 4: Forum Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Digital SPJ list state (from earlier tab 3)
  const [documents, setDocuments] = useState<{
    id: string;
    name: string;
    month: string;
    size: string;
    status: 'VERIFIED' | 'UNDER_REVIEW' | 'MISSING';
    uploadedAt: string;
  }[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadMonth, setUploadMonth] = useState('Januari');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (profilData) {
      setSumberDana(profilData.sumber_dana);
      setPengeluaran(profilData.pengeluaran_bulanan);
      setNomorRekening(profilData.institusi.nomor_rekening || '');
    }
  }, [profilData]);

  // Load anomalies, mock transactions, and chat history
  useEffect(() => {
    setAnomalies(mockAnomalies);
    
    // Initial mock documents
    const initialDocs: typeof documents = [
      { id: 'doc-1', name: 'SPJ_Belanja_ATK_Januari.pdf', month: 'Januari', size: '1.2 MB', status: 'VERIFIED', uploadedAt: '2026-02-05' },
      { id: 'doc-2', name: 'SPJ_Gaji_Honorer_Januari.pdf', month: 'Januari', size: '850 KB', status: 'VERIFIED', uploadedAt: '2026-02-05' },
      { id: 'doc-3', name: 'SPJ_Belanja_ATK_Februari.pdf', month: 'Februari', size: '1.1 MB', status: 'VERIFIED', uploadedAt: '2026-03-04' },
      { id: 'doc-4', name: 'SPJ_Listrik_Internet_Februari.pdf', month: 'Februari', size: '420 KB', status: 'VERIFIED', uploadedAt: '2026-03-05' },
    ];

    // Populate transaction list based on school id
    let initialTrans: TransaksiItem[] = [
      { id: 'tr-1', tanggal: '12 Jan 2026', kategori: 'Gaji Honorer', item: 'Pembayaran Honor Guru Honorer (Januari)', qty: 15, hargaSatuan: 2500000, nominal: 37500000, strukStatus: 'VALID', strukMessage: 'Nominal sesuai dengan SK penetapan guru honorer.', invoiceNo: 'INV-2026-001H', vendorName: 'Kas Utama Sekolah' },
      { id: 'tr-2', tanggal: '18 Jan 2026', kategori: 'Operasional', item: 'Pembayaran Tagihan Listrik & Internet WiFi', qty: 1, hargaSatuan: 4700000, nominal: 4700000, strukStatus: 'VALID', strukMessage: 'Faktur PLN & Indihome terverifikasi lunas.', invoiceNo: 'INV-PLN-8827A', vendorName: 'PT PLN (Persero)' },
      { id: 'tr-3', tanggal: '05 Feb 2026', kategori: 'Sarana Prasarana', item: 'Pembelian Meja & Kursi Kelas Kayu Jati', qty: 30, hargaSatuan: 400000, nominal: 12000000, strukStatus: 'VALID', strukMessage: 'Struk terverifikasi dengan fisik barang di gudang.', invoiceNo: 'INV-2026-MEBEL', vendorName: 'UD Kayu Jaya Mandiri' },
    ];

    // Populate school chat messages
    let initialChats: ChatMessage[] = [
      { id: 'c-1', sender: 'sekolah', senderName: 'Bendahara Sekolah', text: 'Selamat pagi pak, kami telah mengunggah semua kuitansi belanja Januari dan Februari ke sistem.', time: '09:12' },
    ];

    if (id === 'inst-sd-0') { // SDN 01 Menteng
      const mentengData = MENTENG_YEAR_DATA[activeTahun] || MENTENG_YEAR_DATA[2026];
      const targetRealisasi = mentengData.realisasi;
      const baseRealisasi = 1_129_655_153;
      const scaleFactor = targetRealisasi / baseRealisasi;

      const scaledMentengTrans = MENTENG_TRANSACTIONS.map(t => {
        // Update date year
        let newTanggal = t.tanggal;
        const dateParts = t.tanggal.split(' ');
        if (dateParts.length === 3) {
          newTanggal = `${dateParts[0]} ${dateParts[1]} ${activeTahun}`;
        }

        // Scale nominal and round
        const scaledNominal = Math.round(t.nominal * scaleFactor);
        const scaledHargaSatuan = t.qty > 0 ? Math.round(scaledNominal / t.qty) : Math.round(t.hargaSatuan * scaleFactor);

        return {
          id: t.id,
          tanggal: newTanggal,
          kategori: t.kategori,
          item: t.item,
          qty: t.qty,
          hargaSatuan: scaledHargaSatuan,
          nominal: scaledNominal,
          strukStatus: t.strukStatus,
          strukMessage: t.strukMessage,
          invoiceNo: t.invoiceNo,
          vendorName: t.vendorName
        };
      });

      // Distribute any rounding error to the last transaction
      const sumOfScaled = scaledMentengTrans.reduce((sum, t) => sum + t.nominal, 0);
      const diff = targetRealisasi - sumOfScaled;
      if (diff !== 0 && scaledMentengTrans.length > 0) {
        const lastIdx = scaledMentengTrans.length - 1;
        scaledMentengTrans[lastIdx].nominal += diff;
        if (scaledMentengTrans[lastIdx].qty > 0) {
          scaledMentengTrans[lastIdx].hargaSatuan = Math.round(scaledMentengTrans[lastIdx].nominal / scaledMentengTrans[lastIdx].qty);
        } else {
          scaledMentengTrans[lastIdx].hargaSatuan = scaledMentengTrans[lastIdx].nominal;
        }
      }

      initialTrans = scaledMentengTrans;

      // Also add chat messages for SDN 01 Menteng!
      initialChats.push(
        { id: 'c-sd-1', sender: 'auditor', senderName: 'Auditor BPK', text: 'Terdapat anomali pengadaan fiktif ATK di bulan Maret. Mohon unggah stock opname fisik gudang.', time: '14:30' },
        { id: 'c-sd-2', sender: 'sekolah', senderName: 'Bendahara Sekolah', text: 'Baik pak, kami sedang melakukan stock opname fisik bersama tim sarpras. Segera kami update laporannya.', time: '15:10' }
      );
    } else if (id === 'inst-universitas-0') { // UI
      initialDocs.push(
        { id: 'doc-5', name: 'RAB_Gedung_Hub_Mahasiswa_Revised.pdf', month: 'Maret', size: '4.8 MB', status: 'UNDER_REVIEW' as const, uploadedAt: '2026-03-12' },
        { id: 'doc-6', name: 'SPJ_Konstruksi_Gedung_PT_PNJ.pdf', month: 'Maret', size: '12.4 MB', status: 'MISSING' as const, uploadedAt: '—' }
      );
      initialTrans.push(
        { id: 'tr-ui-1', tanggal: '31 Mar 2026', kategori: 'Sarana Prasarana', item: 'Pembangunan Gedung Hub Mahasiswa Baru', qty: 1, hargaSatuan: 45000000000, nominal: 45000000000, strukStatus: 'DUPLIKAT', strukMessage: 'Rencana Anggaran Biaya (RAB) terindikasi markup 35% di atas standar harga LKPP Jawa Barat.', invoiceNo: 'CONSTR-UI-029', vendorName: 'PT Pembangunan Nusantara Jaya' }
      );
      initialChats.push(
        { id: 'c-2', sender: 'auditor', senderName: 'Auditor BPK', text: 'Tolong jelaskan penggelembungan dana pada item konstruksi Gedung Hub Mahasiswa di bulan Maret. Harga besi struktur 1.5x lebih mahal dari pasar.', time: '10:05' },
        { id: 'c-3', sender: 'sekolah', senderName: 'Dr. Ir. Hermawan (PPK UI)', text: 'Baik pak, kenaikan harga tersebut dikarenakan spesifikasi besi menggunakan standar anti-gempa tinggi yang diimpor khusus. Berkas teknis sedang kami persiapkan.', time: '10:20' }
      );
    } else if (id === 'inst-sma-0') { // SMAN 1
      initialDocs.push(
        { id: 'doc-5', name: 'Invoice_CV_Pustaka_Raya_089A.pdf', month: 'Januari', size: '1.5 MB', status: 'UNDER_REVIEW' as const, uploadedAt: '2026-01-24' }
      );
      initialTrans.push(
        { id: 'tr-sma-1', tanggal: '12 Jan 2026', kategori: 'Buku & Perpus', item: 'Pengadaan Buku Pelajaran Kurikulum Merdeka', qty: 1, hargaSatuan: 120000000, nominal: 120000000, strukStatus: 'VALID', strukMessage: 'Faktur buku terverifikasi lengkap.', invoiceNo: 'INV-2026-089A', vendorName: 'CV Pustaka Raya' },
        { id: 'tr-sma-2', tanggal: '24 Jan 2026', kategori: 'Buku & Perpus', item: 'Pengadaan Buku Paket Pelajaran Tambahan', qty: 1, hargaSatuan: 120000000, nominal: 120000000, strukStatus: 'DUPLIKAT', strukMessage: 'Peringatan: Duplikasi Invoice terdeteksi! File scan kuitansi identik dengan transaksi tanggal 12 Jan.', invoiceNo: 'INV-2026-089A', vendorName: 'CV Pustaka Raya' }
      );
      initialChats.push(
        { id: 'c-2', sender: 'auditor', senderName: 'Auditor BPK', text: 'Ada transaksi ganda senilai Rp 120.000.000 untuk CV Pustaka Raya di bulan Januari dengan invoice yang sama. Mohon segera diklarifikasi.', time: '11:15' },
        { id: 'c-3', sender: 'sekolah', senderName: 'Retno Lestari (Bendahara)', text: 'Mohon maaf pak, terdapat kesalahan penulisan jurnal kas oleh staf magang kami. Uang lebih tersebut sudah kami mintakan retur kembali dari vendor.', time: '11:30' }
      );
    } else if (id === 'inst-smp-2') { // SMPN 1
      initialDocs.push(
        { id: 'doc-5', name: 'Kuitansi_Pembelian_Komputer_CV_CS.pdf', month: 'Februari', size: '2.1 MB', status: 'VERIFIED' as const, uploadedAt: '2026-02-15' },
        { id: 'doc-6', name: 'SSP_Pajak_PPN_ATK_Koreksi.pdf', month: 'Februari', size: '650 KB', status: 'UNDER_REVIEW' as const, uploadedAt: '2026-02-20' }
      );
      initialTrans.push(
        { id: 'tr-smp-1', tanggal: '15 Feb 2026', kategori: 'Operasional', item: 'Pengadaan Komputer & ATK Sekolah', qty: 1, hargaSatuan: 63636363, nominal: 63636363, strukStatus: 'ANOMALI_PAJAK', strukMessage: 'Kurang bayar setoran PPN 11%. Disetor Rp 2.500.000 dari kewajiban Rp 7.000.000.', invoiceNo: 'INV-2026-COMP', vendorName: 'CV Computerindo Surabaya' }
      );
      initialChats.push(
        { id: 'c-2', sender: 'auditor', senderName: 'Auditor BPK', text: 'Setoran PPN untuk belanja komputer senilai Rp 63.6 Juta kurang Rp 4.5 Juta. Harap segera disetorkan.', time: '13:02' }
      );
    } else if (id === 'inst-universitas-1') { // ITB
      initialDocs.push(
        { id: 'doc-5', name: 'Kuitansi_Tunai_Operasional_April.pdf', month: 'April', size: '512 KB', status: 'MISSING' as const, uploadedAt: '—' }
      );
      initialTrans.push(
        { id: 'tr-itb-1', tanggal: '05 Apr 2026', kategori: 'Operasional', item: 'Penarikan Kas Tunai Operasional Mandiri', qty: 1, hargaSatuan: 12000000000, nominal: 12000000000, strukStatus: 'STRUK_BURAM', strukMessage: 'Penarikan tunai besar-besaran tanpa disertai nota rincian belanja pendukung (SPJ).', invoiceNo: 'CASH-OUT-ITB', vendorName: 'Biro Keuangan ITB' }
      );
      initialChats.push(
        { id: 'c-2', sender: 'auditor', senderName: 'Auditor BPK', text: 'Penarikan tunai Rp 12 Milyar pada 5 April belum melampirkan kuitansi detail belanja. Kami beri waktu 14 hari sebelum diblokir.', time: '14:20' }
      );
    }

    setDocuments(initialDocs);
    setTransaksiList(initialTrans);
    setChatMessages(initialChats);
  }, [id, activeTahun, setTransaksiList]);

  // Sync active anomaly
  useEffect(() => {
    const found = anomalies.find(a => a.institusi_id === id);
    setActiveAnomaly(found || null);
  }, [anomalies, id]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiReplying]);

  if (!profilData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-text-primary mb-2">Institusi tidak ditemukan</h2>
          <p className="text-text-muted mb-4">ID: {id}</p>
          <button onClick={() => router.back()} className="btn btn-primary">
            <ArrowLeft size={16} />
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const { institusi } = profilData;

  // ===== Calculated totals (Dinamis dari state) =====
  const totalNominalSumber = sumberDana.reduce((s, d) => s + d.nominal, 0);
  const totalRealisasiSumber = sumberDana.reduce((s, d) => s + d.realisasi, 0);
  const totalSaldoDiBank = sumberDana.reduce((s, d) => s + d.saldo_di_bank, 0);
  const saldoSurplusDefisit = totalNominalSumber - totalRealisasiSumber;

  // Total pengeluaran dinamis dijumlah dari:
  // - Pengeluaran bulanan bawaan
  // - Ditambah pengeluaran dari transaksiList yang baru ditambahkan secara manual
  const totalPengeluaran = useMemo(() => {
    const defaultPb = pengeluaran.reduce((s, p) => s + p.sub_total, 0);
    const manualTotal = transaksiList
      .filter(t => t.id.startsWith('tr-manual-'))
      .reduce((s, t) => s + t.nominal, 0);
    return defaultPb + manualTotal;
  }, [pengeluaran, transaksiList]);

  // ===== Dynamic Academic KPIs (Value for Money) =====
  const studentCount = useMemo(() => {
    switch (institusi.jenjang) {
      case 'UNIVERSITAS': return 12450;
      case 'SMA': return 860;
      case 'SMP': return 620;
      case 'SD': return 410;
      case 'PAUD': return 85;
      default: return 500;
    }
  }, [institusi.jenjang]);

  const teacherRatio = useMemo(() => {
    switch (institusi.jenjang) {
      case 'UNIVERSITAS': return '1 : 12';
      case 'SMA': return '1 : 16';
      case 'SMP': return '1 : 15';
      case 'SD': return '1 : 20';
      case 'PAUD': return '1 : 8';
      default: return '1 : 15';
    }
  }, [institusi.jenjang]);

  const costPerStudent = useMemo(() => {
    return Math.round(totalPengeluaran / studentCount);
  }, [totalPengeluaran, studentCount]);

  const schoolAkreditasi = useMemo(() => {
    return institusi.status_sekolah === 'SWASTA' ? 'A (Sangat Baik)' : 'Unggul (A)';
  }, [institusi.status_sekolah]);

  // ===== Standar Nasional Pendidikan (SNP) Breakdown =====
  const snpData = useMemo(() => {
    return [
      { name: 'Standar Isi & Proses', Nominal: Math.round(totalNominalSumber * 0.25), Realisasi: Math.round(totalRealisasiSumber * 0.25), color: '#6366f1' },
      { name: 'Pendidik & PTK', Nominal: Math.round(totalNominalSumber * 0.35), Realisasi: Math.round(totalRealisasiSumber * 0.35), color: '#10b981' },
      { name: 'Sarana & Prasarana', Nominal: Math.round(totalNominalSumber * 0.20), Realisasi: Math.round(totalRealisasiSumber * 0.20), color: '#2563eb' },
      { name: 'Pengelolaan & Operasional', Nominal: Math.round(totalNominalSumber * 0.15), Realisasi: Math.round(totalRealisasiSumber * 0.15), color: '#f59e0b' },
      { name: 'Standar Penilaian', Nominal: Math.round(totalNominalSumber * 0.05), Realisasi: Math.round(totalRealisasiSumber * 0.05), color: '#ec4899' },
    ];
  }, [totalNominalSumber, totalRealisasiSumber]);

  // ===== Category Filtered Transaksi (VERCEL-STYLE 1) =====
  const filteredTransaksi = useMemo(() => {
    if (selectedCategoryFilter === 'Semua') return transaksiList;
    return transaksiList.filter(t => t.kategori === selectedCategoryFilter);
  }, [transaksiList, selectedCategoryFilter]);

  // ===== Dynamic badge for transaction status =====
  const getStrukStatusBadge = (status: TransaksiItem['strukStatus']) => {
    switch (status) {
      case 'VALID': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DUPLIKAT': return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      case 'ANOMALI_PAJAK': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'STRUK_BURAM': return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // ===== Audit update handler =====
  const updateAnomalyStatus = (newStatus: 'TEMUAN' | 'INVESTIGASI' | 'SELESAI') => {
    setAnomalies(prev => prev.map(a => a.institusi_id === id ? { ...a, status: newStatus } : a));
  };

  // ===== Shared Cell Render Helpers & Inline Editor =====
  const handleSaveEdit = () => {
    if (!editingCell) return;
    const numVal = parseFloat(editValue) || 0;

    if (editingCell.type === 'sumberDana') {
      const targetSd = sumberDana.find(sd => sd.id === editingCell.id);
      if (targetSd) {
        const fieldName = editingCell.field === 'nominal' ? 'Alokasi (Saldo Masuk)' : 'Realisasi (Saldo Keluar)';
        const oldVal = targetSd[editingCell.field as 'nominal' | 'realisasi'] || 0;
        
        addNotification({
          message: `Penyesuaian Dana: ${targetSd.nama_sumber} (${fieldName}) disesuaikan dari Rp ${fmtRupiah(oldVal)} menjadi Rp ${fmtRupiah(numVal)}.`,
          type: 'info',
          link: `/dashboard/profil-institusi/${id}`
        });
      }

      setSumberDana(prev => prev.map(sd => {
        if (sd.id === editingCell.id) {
          const updated = { ...sd, [editingCell.field]: numVal };
          updated.saldo_di_bank = updated.nominal - updated.realisasi;
          return updated;
        }
        return sd;
      }));
    } else if (editingCell.type === 'pengeluaran') {
      const targetP = pengeluaran.find(p => p.id === editingCell.id);
      if (targetP) {
        const oldVal = targetP.nominal_pengeluaran;
        addNotification({
          message: `Penyesuaian Belanja Bulanan: Pengeluaran bulan ${targetP.bulan} disesuaikan dari Rp ${fmtRupiah(oldVal)} menjadi Rp ${fmtRupiah(numVal)}.`,
          type: 'info',
          link: `/dashboard/profil-institusi/${id}`
        });
      }

      setPengeluaran(prev => prev.map(p => {
        if (p.id === editingCell.id) {
          const updated = { ...p, [editingCell.field]: numVal };
          updated.sub_total = updated.nominal_pengeluaran * updated.qty;
          return updated;
        }
        return p;
      }));
    } else if (editingCell.type === 'transaksi') {
      setTransaksiList(prev => prev.map(t => {
        if (t.id === editingCell.id) {
          const oldVal = t.nominal;
          const diff = numVal - oldVal;

          addNotification({
            message: `Penyesuaian Transaksi: Belanja "${t.item}" disesuaikan dari Rp ${fmtRupiah(oldVal)} menjadi Rp ${fmtRupiah(numVal)}.`,
            type: 'info',
            link: `/dashboard/profil-institusi/${id}`
          });
          
          // 1. Update matching month in pengeluaran
          const monthMap: Record<string, string> = {
            'Jan': 'Januari', 'Feb': 'Februari', 'Mar': 'Maret', 'Apr': 'April',
            'Mei': 'Mei', 'Jun': 'Juni', 'Jul': 'Juli', 'Agu': 'Agustus',
            'Sep': 'September', 'Okt': 'Oktober', 'Nov': 'November', 'Des': 'Desember'
          };
          const tMonthShort = t.tanggal.split(' ')[1];
          const fullMonthName = monthMap[tMonthShort] || 'Januari';
          
          setPengeluaran(prevPb => prevPb.map(p => {
            if (p.bulan === fullMonthName) {
              const updatedSubTotal = Math.max(0, p.sub_total + diff);
              return { ...p, sub_total: updatedSubTotal, nominal_pengeluaran: updatedSubTotal };
            }
            return p;
          }));

          // 2. Update matching source of funds in sumberDana
          setSumberDana(prevSd => {
            if (prevSd.length > 0) {
              return prevSd.map((sd, idx) => {
                const isMatching = idx === 0 || sd.nama_sumber.toLowerCase().includes('bos');
                if (isMatching) {
                  const updatedRealisasi = Math.max(0, sd.realisasi + diff);
                  return { ...sd, realisasi: updatedRealisasi, saldo_di_bank: sd.nominal - updatedRealisasi };
                }
                return sd;
              });
            }
            return prevSd;
          });

          return { ...t, nominal: numVal };
        }
        return t;
      }));
    }

    setEditingCell(null);
  };

  const renderEditableCellSD = (row: SumberDanaInstitusi, field: 'nominal' | 'realisasi') => {
    const value = row[field];
    const isEditing = editingCell?.type === 'sumberDana' && editingCell?.id === row.id && editingCell?.field === field;
    return (
      <td
        className={`sheet-cell text-right font-mono sheet-cell-editable ${isEditing ? 'sheet-cell-editing' : ''}`}
        onClick={() => {
          setEditingCell({ type: 'sumberDana', id: row.id, field });
          setEditValue(value.toString());
        }}
      >
        {isEditing ? (
          <input
            type="number"
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setEditingCell(null);
            }}
            className="w-full text-right bg-white border border-indigo-600 focus:outline-none rounded px-1 py-0.5 font-mono text-xs text-text-primary"
          />
        ) : (
          fmtRupiah(value)
        )}
      </td>
    );
  };

  const renderEditableCellPB = (row: PengeluaranBulananInstitusi, field: 'nominal_pengeluaran' | 'qty') => {
    const value = row[field];
    const isEditing = editingCell?.type === 'pengeluaran' && editingCell?.id === row.id && editingCell?.field === field;
    return (
      <td
        className={`sheet-cell text-right font-mono sheet-cell-editable ${isEditing ? 'sheet-cell-editing' : ''}`}
        onClick={() => {
          setEditingCell({ type: 'pengeluaran', id: row.id, field });
          setEditValue(value.toString());
        }}
      >
        {isEditing ? (
          <input
            type="number"
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setEditingCell(null);
            }}
            className="w-full text-right bg-white border border-indigo-600 focus:outline-none rounded px-1 py-0.5 font-mono text-xs text-text-primary"
          />
        ) : (
          field === 'qty' ? value : fmtRupiah(value)
        )}
      </td>
    );
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
          
          // Calculate parsed tax as a percentage relative to items subtotal
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

  // ===== VERCEL-STYLE 2: Tambah Pengeluaran submit handler =====
  const handleAddTransaksiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotalItems = formItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const calculatedPajak = Math.round((subtotalItems * formPajak) / 100);
    const overallTotal = subtotalItems + formOngkir + calculatedPajak;
    if (overallTotal <= 0) return;

    const mainItemName = formItems[0]?.name || 'Belanja Umum';
    const mainQty = formItems[0]?.qty || 1;
    const mainHarga = formItems[0]?.price || 0;
    const itemDescription = formItems.length > 1
      ? `${mainQty}x ${mainItemName} (+ ${formItems.length - 1} item lainnya)`
      : `${mainQty}x ${mainItemName}`;

    const newTrans: TransaksiItem = {
      id: `tr-manual-${Date.now()}`,
      tanggal: new Date(formTanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
      kategori: formKategori,
      item: itemDescription,
      qty: formItems.reduce((sum, item) => sum + item.qty, 0),
      hargaSatuan: mainHarga,
      nominal: overallTotal,
      strukStatus: 'VALID',
      strukMessage: 'Dibuat secara manual dan disetujui instansi.',
      invoiceNo: `INV-MAN-${Date.now().toString().slice(-4)}`,
      vendorName: formVendor || 'Vendor Umum'
    };

    setTransaksiList(prev => [newTrans, ...prev]);
    setTambahModalOpen(false);

    // Add notifications
    addNotification({
      message: `Penambahan Belanja: Transaksi baru "${itemDescription}" senilai Rp ${fmtRupiah(overallTotal)} berhasil disimpan untuk ${profilData?.institusi?.nama_institusi || 'Sekolah'}.`,
      type: 'success',
      link: `/dashboard/profil-institusi/${id}`
    });
    addNotification({
      message: `Saldo Keluar: Pengeluaran sebesar Rp ${fmtRupiah(overallTotal)} dicatat di bank untuk ${profilData?.institusi?.nama_institusi || 'Sekolah'}.`,
      type: 'warning',
      link: `/dashboard/profil-institusi/${id}`
    });

    // Sync with Sumber Dana (sumberDana)
    setSumberDana(prevSd => {
      let matched = false;
      const updated = prevSd.map(sd => {
        if (sd.nama_sumber.toLowerCase() === formSumberDana.toLowerCase()) {
          matched = true;
          const newReal = sd.realisasi + overallTotal;
          return { ...sd, realisasi: newReal, saldo_di_bank: sd.nominal - newReal };
        }
        return sd;
      });
      if (!matched && updated.length > 0) {
        // Fallback: update the first one
        const newReal = updated[0].realisasi + overallTotal;
        updated[0] = { ...updated[0], realisasi: newReal, saldo_di_bank: updated[0].nominal - newReal };
      }
      return updated;
    });

    // Sync with Jurnal Penyerapan (pengeluaran)
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const transMonthIndex = new Date(formTanggal).getMonth();
    const transMonthName = monthNames[transMonthIndex] || 'Januari';

    setPengeluaran(prevPb => prevPb.map(p => {
      if (p.bulan === transMonthName) {
        const newSub = p.sub_total + overallTotal;
        const newQty = p.qty + formItems.reduce((sum, item) => sum + item.qty, 0);
        return {
          ...p,
          sub_total: newSub,
          nominal_pengeluaran: newSub,
          qty: newQty
        };
      }
      return p;
    }));

    // Reset Form
    setFormVendor('');
    setFormTanggal('2026-06-06');
    setFormSumberDana('BOS Reguler');
    setFormItems([{ id: '1', name: '', qty: 1, price: 0, unit: 'pcs', notes: '' }]);
    setFormOngkir(0);
    setFormPajak(0);
    setFormKeterangan('');
  };

  const handlePrintReceipt = () => {
    if (!selectedTransaksi) return;
    const printContent = document.getElementById('print-receipt-content')?.innerHTML;
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

  // ===== VERCEL-STYLE 4: Send chat message & AI Reply simulation =====
  const handleSendChat = () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `c-u-${Date.now()}`,
      sender: 'auditor',
      senderName: 'Auditor BPK (Anda)',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiReplying(true);

    // Simulate school admin reply after 1.5 seconds
    setTimeout(() => {
      let replyText = 'Baik pak, kami telah menerima catatan audit tersebut. Berkas pendukung/SPJ sedang dikompilasi oleh tim keuangan kami dan akan diunggah ke sistem secepatnya.';
      const lower = userMsg.text.toLowerCase();
      
      if (lower.includes('buku') || lower.includes('pustaka')) {
        replyText = 'Untuk kuitansi CV Pustaka Raya, kami konfirmasikan ada kesalahan administrasi input dari staf kami. Proses refund/retur dana ganda senilai Rp 120.000.000 ke rekening sekolah sedang berjalan.';
      } else if (lower.includes('pajak') || lower.includes('ppn')) {
        replyText = 'Mengenai kekurangan pajak PPN Rp 4,5 Juta, kode billing pembayaran sudah terbit. Staf kami akan menyetorkannya ke Bank Jatim besok pagi dan mengunggah bukti SSP-nya ke sini.';
      } else if (lower.includes('konstruksi') || lower.includes('gedung') || lower.includes('markup')) {
        replyText = 'Dr. Ir. Hermawan sedang melakukan rapat penyesuaian RAB dengan PT Pembangunan Nusantara Jaya. Kami akan menyerahkan adendum kontrak baru yang direvisi sesuai standar LKPP minggu depan.';
      } else if (lower.includes('tunai') || lower.includes('12 milyar')) {
        replyText = 'Penarikan tunai Rp 12 Milyar digunakan untuk dana taktis operasional riset semester berjalan. SPJ rincian belanjanya sedang diselesaikan oleh dewan riset fakultas.';
      }

      const schoolMsg: ChatMessage = {
        id: `c-s-${Date.now()}`,
        sender: 'sekolah',
        senderName: 'Bendahara Sekolah',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, schoolMsg]);
      setIsAiReplying(false);
    }, 1500);
  };

  // ===== Simulated file upload handler (tab 4) =====
  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileName) return;

    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const newDoc = {
              id: `doc-${Date.now()}`,
              name: uploadFileName.endsWith('.pdf') ? uploadFileName : `${uploadFileName}.pdf`,
              month: uploadMonth,
              size: '1.4 MB',
              status: 'UNDER_REVIEW' as const,
              uploadedAt: new Date().toISOString().split('T')[0]
            };
            setDocuments(prevDocs => [newDoc, ...prevDocs]);
            setIsUploading(false);
            setUploadModalOpen(false);
            setUploadFileName('');
          }, 300);
          return 100;
        }
        return prev + 20;
      });
    }, 200);
  };

  return (
    <div className="min-h-screen pb-12">
      <Header
        title={`Profil: ${institusi.nama_institusi}`}
        subtitle={`${institusi.jenjang} — ${institusi.kabupaten_kota_nama}, ${institusi.provinsi_nama} Tahun ${activeTahun}`}
      />

      <div className="p-6 space-y-6">
        {/* Navigation & Breadcrumb */}
        <div className="flex justify-end items-center text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Link href="/dashboard" className="hover:text-accent transition-colors">Dashboard</Link>
            <span>/</span>
            <span className="text-text-primary font-medium">{institusi.nama_institusi}</span>
          </div>
        </div>

        {/* ===== SYSTEM DETEKSI DINI / AI WARNING BANNER ===== */}
        {activeAnomaly && activeAnomaly.status !== 'SELESAI' && (
          <div className="metric-card accent-rose border border-rose-200 bg-rose-50/20 p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in-up">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100/80 flex items-center justify-center text-rose-600 shrink-0 shadow-sm border border-rose-200">
                <ShieldAlert size={24} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-text-primary uppercase tracking-wide">Peringatan Deteksi Dini AI (Fraud Alert)</h4>
                  <span className={`badge ${activeAnomaly.tingkat_keparahan === 'HIGH' ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-amber-100 text-amber-700 border-amber-300'} text-[10px]`}>
                    RISIKO {activeAnomaly.tingkat_keparahan}
                  </span>
                  <span className="badge bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                    STATUS: {activeAnomaly.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-rose-700 font-mono">
                  {activeAnomaly.tipe_anomali}
                </p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {activeAnomaly.keterangan}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('audit')}
              className="btn btn-danger py-2 px-4 shadow-md shadow-rose-500/10 text-xs font-bold"
            >
              <FileSearch size={14} />
              Periksa Tindak Lanjut (TLHP)
            </button>
          </div>
        )}

        {/* ===== HEADER INFO CARDS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Info Institusi */}
          <div className="metric-card accent-indigo">
            <div className="flex items-center gap-2 mb-3">
              <Banknote size={18} className="text-indigo-500" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Detail Institusi Pendidikan</span>
            </div>
            <p className="text-lg font-bold text-text-primary mb-1">{institusi.nama_institusi}</p>
            
            <div className="space-y-1.5 mt-3 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-text-muted">NPSN:</span>
                <span className="font-semibold text-text-primary font-mono">{institusi.npsn || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-text-muted">NISN Institusi:</span>
                <span className="font-semibold text-text-primary font-mono">{institusi.nisn || '—'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1">
                <span className="text-text-muted">No. Rekening Bank Himbara:</span>
                <span className="font-semibold text-text-primary font-mono">{nomorRekening || '—'}</span>
              </div>
              <div className="pt-1">
                <span className="text-text-muted block mb-0.5">Alamat Lengkap:</span>
                <span className="text-text-primary font-medium leading-relaxed">{institusi.alamat || '—'}</span>
              </div>
            </div>
          </div>

          {/* Saldo Surplus / Defisit */}
          <div className={`metric-card ${saldoSurplusDefisit >= 0 ? 'accent-emerald' : 'accent-rose'}`}>
            <div className="flex items-center gap-2 mb-3">
              {saldoSurplusDefisit >= 0 ? (
                <TrendingUp size={18} className="text-emerald-500" />
              ) : (
                <TrendingDown size={18} className="text-rose-500" />
              )}
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Saldo Surplus / Defisit</span>
            </div>
            <p className={`text-2xl font-bold ${saldoSurplusDefisit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {fmtRupiah(saldoSurplusDefisit)}
            </p>
            <p className="text-xs text-text-muted mt-1 font-medium">
              {saldoSurplusDefisit >= 0 ? '✅ Surplus — dana tersisa' : '❌ Defisit — pengeluaran melebihi anggaran'}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100/50 flex justify-between items-center text-xs">
              <span className="text-text-muted">Porsi Terserap:</span>
              <span className="font-bold text-text-primary">{fmtPct(totalRealisasiSumber > 0 ? (totalRealisasiSumber / totalNominalSumber) * 100 : 0)}</span>
            </div>
          </div>

          {/* Total Pengeluaran Bulanan */}
          <div className="metric-card accent-amber">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={18} className="text-amber-500" />
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Total Realisasi Pengeluaran</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {fmtRupiah(totalPengeluaran)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Total penggunaan anggaran s.d. Desember {activeTahun}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100/50 flex justify-between items-center text-xs">
              <span className="text-text-muted">Total Transaksi:</span>
              <span className="font-bold text-text-primary">{transaksiList.length} Item Pengeluaran</span>
            </div>
          </div>
        </div>

        {/* ===== TAB SWITCHER ===== */}
        <div className="flex border-b border-slate-200/80 gap-6 mt-8">
          <button
            onClick={() => setActiveTab('ringkasan')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'ringkasan' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            💰 Ringkasan & Sumber Dana
          </button>
          <button
            onClick={() => setActiveTab('transaksi')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'transaksi' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            📋 Daftar Transaksi Pengeluaran
          </button>
          <button
            onClick={() => setActiveTab('analitik')}
            className={`pb-3 text-sm font-semibold transition-all relative ${
              activeTab === 'analitik' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            🎓 Analitik & Kinerja (SNP & KPI)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            🛡️ Pusat Audit & Klarifikasi
            {activeAnomaly && activeAnomaly.status !== 'SELESAI' && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: RINGKASAN & SUMBER DANA */}
        {/* ======================================================== */}
        {activeTab === 'ringkasan' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* TABLE 1: SUMBER DANA */}
            <div>
              <div className="sheet-toolbar">
                <span className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  📁 Dana Masuk & Alokasi Perbankan
                </span>
                <span className="text-xs text-text-muted flex-1">({sumberDana.length} sumber dana)</span>
              </div>
              <div className="sheet-container" style={{ maxHeight: 'none' }}>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                      <th className="sheet-header-cell text-left" style={{ minWidth: 280 }}>Sumber Dana Pendidikan</th>
                      <th className="sheet-header-cell text-right" style={{ minWidth: 150 }}>Nominal</th>
                      <th className="sheet-header-cell text-right" style={{ minWidth: 150 }}>Realisasi</th>
                      <th className="sheet-header-cell text-right" style={{ minWidth: 150 }}>Saldo di Bank</th>
                      <th className="sheet-header-cell text-left" style={{ minWidth: 180 }}>Progress Penyerapan</th>
                      <th className="sheet-header-cell text-center" style={{ width: 130 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sumberDana.map((row, idx) => {
                      const pct = row.nominal > 0 ? (row.realisasi / row.nominal) * 100 : 0;
                      
                      let barColor = 'bg-indigo-500';
                      let statusText = 'Moderat';
                      let statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                      
                      if (pct > 100) {
                        barColor = 'bg-rose-600';
                        statusText = 'Overbudget';
                        statusBadge = 'bg-red-50 text-red-700 border-red-200';
                      } else if (pct >= 95) {
                        barColor = 'bg-emerald-500';
                        statusText = 'Sangat Baik';
                        statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      } else if (pct >= 75) {
                        barColor = 'bg-teal-500';
                        statusText = 'Baik';
                        statusBadge = 'bg-teal-50 text-teal-700 border-teal-200';
                      } else if (pct >= 45) {
                        barColor = 'bg-amber-500';
                        statusText = 'Moderat';
                        statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                      } else {
                        barColor = 'bg-rose-500';
                        statusText = 'Lambat';
                        statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                      }

                      return (
                        <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                          <td className="sheet-cell text-center text-text-muted text-xs">{idx + 1}</td>
                          <td className="sheet-cell text-left font-medium text-text-primary">{row.nama_sumber}</td>
                          {renderEditableCellSD(row, 'nominal')}
                          {renderEditableCellSD(row, 'realisasi')}
                          <td className={`sheet-cell text-right font-medium font-mono ${row.saldo_di_bank >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {fmtRupiah(row.saldo_di_bank)}
                          </td>
                          <td className="sheet-cell">
                            <div className="flex items-center gap-2">
                              <div className="progress-bar-track flex-1" style={{ minWidth: 80 }}>
                                <div className={`progress-bar-fill ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                              <span className="text-[10px] font-semibold text-text-secondary font-mono">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="sheet-cell text-center">
                            <span className={`badge ${statusBadge} text-[10px]`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="sheet-footer-cell" />
                      <td className="sheet-footer-cell text-left font-bold">TOTAL DANA MASUK</td>
                      <td className="sheet-footer-cell text-right font-mono">{fmtRupiah(totalNominalSumber)}</td>
                      <td className="sheet-footer-cell text-right font-mono">{fmtRupiah(totalRealisasiSumber)}</td>
                      <td className={`sheet-footer-cell text-right font-bold font-mono ${totalSaldoDiBank >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {fmtRupiah(totalSaldoDiBank)}
                      </td>
                      <td className="sheet-footer-cell">
                        <div className="flex items-center gap-2">
                          <div className="progress-bar-track flex-1">
                            <div
                              className="progress-bar-fill bg-gradient-to-r from-indigo-500 to-purple-600"
                              style={{ width: `${Math.min(totalNominalSumber > 0 ? (totalRealisasiSumber / totalNominalSumber) * 100 : 0, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-text-primary font-mono">
                            {((totalRealisasiSumber / totalNominalSumber) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="sheet-footer-cell text-center">
                        <span className="badge bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                          Gabungan
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* TABLE 2: PENGELUARAN BULANAN */}
            <div>
              <div className="sheet-toolbar">
                <span className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  📅 Jurnal Penyerapan Kas per Bulan (Jan - Des)
                </span>
              </div>
              <div className="sheet-container" style={{ maxHeight: 'none' }}>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                      <th className="sheet-header-cell text-left" style={{ minWidth: 200 }}>Bulan Anggaran</th>
                      <th className="sheet-header-cell text-right" style={{ minWidth: 200 }}>Alokasi Nominal</th>
                      <th className="sheet-header-cell text-center" style={{ width: 100 }}>Qty</th>
                      <th className="sheet-header-cell text-right" style={{ minWidth: 200 }}>Sub Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pengeluaran.map((row) => (
                      <tr key={row.id} className="hover:bg-indigo-50/50 transition">
                        <td className="sheet-cell text-center text-text-muted text-xs">{row.nomor}</td>
                        <td className="sheet-cell text-left font-medium text-text-primary">
                          <Link
                            href={`/dashboard/profil-institusi/${id}/rincian/${row.nomor}`}
                            className="text-accent hover:underline hover:text-accent-hover transition-colors flex items-center gap-1"
                          >
                            <FolderOpen size={12} className="text-indigo-400" />
                            {row.bulan}
                          </Link>
                        </td>
                        {renderEditableCellPB(row, 'nominal_pengeluaran')}
                        {renderEditableCellPB(row, 'qty')}
                        <td className="sheet-cell text-right font-medium text-text-primary font-mono">
                          {fmtRupiah(row.sub_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="sheet-footer-cell" />
                      <td className="sheet-footer-cell text-left font-bold" colSpan={3}>Total Kas Bulanan Terbayar</td>
                      <td className="sheet-footer-cell text-right font-bold font-mono text-emerald-600">
                        {fmtRupiah(pengeluaran.reduce((s, p) => s + p.sub_total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: DAFTAR TRANSAKSI PENGELUARAN */}
        {/* ======================================================== */}
        {activeTab === 'transaksi' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Toolbar with Filter Pills & Tambah Button */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-base font-bold text-text-primary">Daftar Pengeluaran Riil</h3>
                  <p className="text-xs text-text-muted mt-0.5">Ditemukan {filteredTransaksi.length} transaksi untuk kategori terpilih</p>
                </div>
                <button
                  onClick={() => setTambahModalOpen(true)}
                  className="btn btn-primary shadow-lg shadow-indigo-500/10 font-bold py-2 px-4 text-xs"
                >
                  <Plus size={14} />
                  Tambah Pengeluaran
                </button>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {['Semua', 'Sarana Prasarana', 'Gaji Honorer', 'Operasional', 'Buku & Perpus', 'Kegiatan Siswa', 'Lainnya'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                      selectedCategoryFilter === cat
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-text-secondary hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaksi Table */}
            <div className="sheet-container" style={{ maxHeight: 'none' }}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="sheet-header-cell text-center" style={{ width: 50 }}>No</th>
                    <th className="sheet-header-cell text-left" style={{ width: 120 }}>Tanggal</th>
                    <th className="sheet-header-cell text-center" style={{ width: 140 }}>Kategori</th>
                    <th className="sheet-header-cell text-left">Nama Pengeluaran / Jasa</th>
                    <th className="sheet-header-cell text-right" style={{ width: 180 }}>Nominal</th>
                    <th className="sheet-header-cell text-center" style={{ width: 130 }}>Status Struk</th>
                    <th className="sheet-header-cell text-center" style={{ width: 100 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransaksi.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="sheet-cell text-center text-text-muted py-8 italic">
                        Tidak ada transaksi ditemukan pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredTransaksi.map((tr, idx) => (
                      <tr key={tr.id} className="hover:bg-indigo-50/50 transition">
                        <td className="sheet-cell text-center text-text-muted text-xs">{idx + 1}</td>
                        <td className="sheet-cell text-left text-xs font-medium text-text-secondary">{tr.tanggal}</td>
                        <td className="sheet-cell text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-150">
                            {tr.kategori}
                          </span>
                        </td>
                        <td className="sheet-cell text-left">
                          <div>
                            <p className="font-semibold text-text-primary text-xs">{tr.item}</p>
                            <p className="text-[9px] text-text-muted uppercase font-mono mt-0.5">{tr.invoiceNo} • {tr.vendorName}</p>
                          </div>
                        </td>
                        <td
                          className={`sheet-cell text-right font-bold font-mono text-xs sheet-cell-editable ${
                            editingCell?.type === 'transaksi' && editingCell?.id === tr.id && editingCell?.field === 'nominal'
                              ? 'sheet-cell-editing'
                              : 'text-text-primary'
                          }`}
                          onClick={() => {
                            setEditingCell({ type: 'transaksi', id: tr.id, field: 'nominal' });
                            setEditValue(tr.nominal.toString());
                          }}
                        >
                          {editingCell?.type === 'transaksi' && editingCell?.id === tr.id && editingCell?.field === 'nominal' ? (
                            <input
                              type="number"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSaveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-full text-right bg-white border border-indigo-600 focus:outline-none rounded px-1 py-0.5 font-mono text-xs text-text-primary"
                            />
                          ) : (
                            fmtRupiah(tr.nominal)
                          )}
                        </td>
                        <td className="sheet-cell text-center">
                          <span className={`badge text-[9px] ${getStrukStatusBadge(tr.strukStatus)}`}>
                            {tr.strukStatus === 'VALID' ? '✓ Valid (Aman)' :
                             tr.strukStatus === 'DUPLIKAT' ? '⚠ Duplikasi' :
                             tr.strukStatus === 'ANOMALI_PAJAK' ? '⚠ Pajak Selisih' : '⚠ Struk Buram'}
                          </span>
                        </td>
                        <td className="sheet-cell text-center">
                          <button
                            onClick={() => {
                              setSelectedTransaksi(tr);
                              setPreviewStrukOpen(true);
                            }}
                            className="btn btn-ghost py-1 px-2.5 text-[10px] font-bold flex items-center gap-1"
                          >
                            <Eye size={12} />
                            Struk
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ANALITIK & KINERJA */}
        {/* ======================================================== */}
        {activeTab === 'analitik' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* KPI METRIC CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Jumlah Siswa */}
              <div className="metric-card accent-blue">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Jumlah Penerima Manfaat</p>
                    <h3 className="text-2xl font-bold text-blue-600 mt-2">{studentCount.toLocaleString('id-ID')} {institusi.jenjang === 'UNIVERSITAS' ? 'Mahasiswa' : 'Siswa'}</h3>
                    <p className="text-xs text-text-secondary mt-1">Terdaftar aktif di pangkalan data</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                    <Users size={18} />
                  </div>
                </div>
              </div>

              {/* Rasio Guru Siswa */}
              <div className="metric-card accent-indigo">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Rasio Pendidik : Siswa</p>
                    <h3 className="text-2xl font-bold text-indigo-600 mt-2">{teacherRatio}</h3>
                    <p className="text-xs text-text-secondary mt-1">Standar Pelayanan Minimum (SPM)</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
                    <BookOpen size={18} />
                  </div>
                </div>
              </div>

              {/* Biaya per Siswa */}
              <div className="metric-card accent-amber">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Biaya Operasional per Kepala</p>
                    <h3 className="text-2xl font-bold text-amber-600 mt-2">{fmtRupiah(costPerStudent)}</h3>
                    <p className="text-xs text-text-secondary mt-1">Rata-rata penggunaan dana / kepala / thn</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                    <Coins size={18} />
                  </div>
                </div>
              </div>

              {/* Akreditasi */}
              <div className="metric-card accent-emerald">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Status Akreditasi</p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-2">{schoolAkreditasi}</h3>
                    <p className="text-xs text-text-secondary mt-1">Terverifikasi BAN-PDM / BAN-PT</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                    <Award size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* SNP BREAKDOWN */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column (List details) - Span 3 */}
              <div className="lg:col-span-3 glass-card p-5">
                <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-1.5">
                  📂 Pembagian Anggaran Berdasarkan Standar Nasional Pendidikan (SNP)
                </h3>
                <div className="space-y-4">
                  {snpData.map((item, idx) => {
                    const penyerapan = item.Nominal > 0 ? (item.Realisasi / item.Nominal) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-100/50 transition">
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-text-primary">{item.name}</span>
                          </div>
                          <span className="font-bold text-text-secondary font-mono">{penyerapan.toFixed(1)}% Terserap</span>
                        </div>
                        <div className="progress-bar-track">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${penyerapan}%`,
                              backgroundColor: item.color
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-text-muted font-mono pt-0.5">
                          <span>Alokasi: {fmtRupiah(item.Nominal)}</span>
                          <span>Realisasi: {fmtRupiah(item.Realisasi)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column (Bar chart) - Span 2 */}
              <div className="lg:col-span-2 glass-card p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">Visualisasi Target vs Realisasi (SNP)</h3>
                  <p className="text-xs text-text-muted mb-4">Grafik perbandingan anggaran dalam Rupiah</p>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={snpData.map(item => ({
                      ShortName: item.name.split(' & ')[0].replace('Standar ', ''),
                      Alokasi: item.Nominal,
                      Realisasi: item.Realisasi
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="ShortName" tick={{ fill: '#64748b', fontSize: 9 }} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(v) => `${(v / 1e9).toFixed(0)}M`} />
                      <Tooltip
                        contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 10 }}
                        formatter={(v: any) => [fmtRupiah(Number(v)), '']}
                      />
                      <Legend wrapperStyle={{ fontSize: 9 }} />
                      <Bar dataKey="Alokasi" fill="#6366f1" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Realisasi" fill="#10b981" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: AUDIT & TINDAK LANJUT */}
        {/* ======================================================== */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Audit findings analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: 5W1H Analysis */}
              <div className="lg:col-span-2 glass-card p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <ShieldAlert size={18} className="text-rose-500" />
                      Detail Analisis Audit Forensik (5W1H)
                    </h3>
                    <p className="text-[10px] text-text-muted">Status penanganan audit terintegrasi sistem AI</p>
                  </div>
                  
                  {activeAnomaly ? (
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                      <button
                        onClick={() => updateAnomalyStatus('TEMUAN')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${activeAnomaly.status === 'TEMUAN' ? 'bg-rose-600 text-white shadow-sm' : 'text-text-secondary hover:bg-slate-200'}`}
                      >
                        Temuan
                      </button>
                      <button
                        onClick={() => updateAnomalyStatus('INVESTIGASI')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${activeAnomaly.status === 'INVESTIGASI' ? 'bg-indigo-600 text-white shadow-sm' : 'text-text-secondary hover:bg-slate-200'}`}
                      >
                        Investigasi
                      </button>
                      <button
                        onClick={() => updateAnomalyStatus('SELESAI')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors ${activeAnomaly.status === 'SELESAI' ? 'bg-emerald-600 text-white shadow-sm' : 'text-text-secondary hover:bg-slate-200'}`}
                      >
                        Selesai
                      </button>
                    </div>
                  ) : null}
                </div>

                {activeAnomaly ? (
                  <div className="space-y-4 pt-2">
                    {/* WHAT & WHY */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 bg-indigo-50/30 border border-indigo-100/50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1">
                          <FileSearch size={12} /> What (Apa Temuannya?)
                        </span>
                        <p className="text-xs text-text-primary font-semibold leading-relaxed">{activeAnomaly.audit_what || activeAnomaly.tipe_anomali}</p>
                      </div>
                      <div className="p-3.5 bg-rose-50/30 border border-rose-100/50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle size={12} /> Why (Mengapa Terjadi?)
                        </span>
                        <p className="text-xs text-text-secondary leading-relaxed">{activeAnomaly.audit_why || activeAnomaly.keterangan}</p>
                      </div>
                    </div>

                    {/* WHERE, WHEN, WHO */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                          <MapPin size={12} /> Where (Dimana?)
                        </span>
                        <p className="text-xs text-text-secondary">{activeAnomaly.audit_where || 'Kantor Kas Utama Sekolah'}</p>
                      </div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                          <Calendar size={12} /> When (Kapan?)
                        </span>
                        <p className="text-xs text-text-secondary">{activeAnomaly.audit_when || `Bulan ${activeAnomaly.bulan} ${activeTahun}`}</p>
                      </div>
                      <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1">
                          <User size={12} /> Who (Siapa?)
                        </span>
                        <p className="text-xs text-text-secondary font-medium">{activeAnomaly.audit_who || 'Kepala Sekolah & Bendahara'}</p>
                      </div>
                    </div>

                    {/* HOW */}
                    <div className="p-4 bg-emerald-50/20 border border-emerald-100/50 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                        <Wrench size={12} /> How (Rekomendasi Perbaikan)
                      </span>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {activeAnomaly.audit_how}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <h4 className="text-sm font-bold text-text-primary">Status Audit Bersih (Lolos Verifikasi)</h4>
                      <p className="text-xs text-text-muted leading-relaxed">
                        Sistem deteksi dini Gemini AI tidak menemukan anomali pengeluaran maupun manipulasi kuitansi pajak.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Column Right: Document list */}
              <div className="glass-card p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                      <FileText size={16} className="text-indigo-500" />
                      Dokumen Pendukung (SPJ)
                    </h3>
                    <button
                      onClick={() => setUploadModalOpen(true)}
                      className="btn btn-ghost py-1 px-2.5 text-[11px] font-bold flex items-center gap-1"
                    >
                      <UploadCloud size={12} />
                      Unggah SPJ
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex justify-between items-center p-2.5 bg-white/70 border border-slate-100 rounded-lg hover:border-indigo-100 transition shadow-sm"
                      >
                        <div className="space-y-0.5 max-w-[65%]">
                          <p className="text-xs font-semibold text-text-primary truncate" title={doc.name}>
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            Bulan: {doc.month} • {doc.size}
                          </p>
                        </div>
                        <span className={`badge shrink-0 text-[9px] ${
                          doc.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          doc.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {doc.status === 'VERIFIED' ? 'Verified' :
                           doc.status === 'UNDER_REVIEW' ? 'Review AI' : 'Missing'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-text-muted leading-relaxed italic bg-indigo-50/10 p-2.5 rounded-lg border border-indigo-100/30">
                  ⚠️ AI Scanner secara otomatis memindai semua file SPJ PDF yang diunggah untuk mencocokkan nomor seri faktur & mendeteksi markup material.
                </div>
              </div>
            </div>

            {/* Forum Klarifikasi Audit Chat */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <MessageSquare size={18} className="text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Forum Klarifikasi Audit</h3>
                  <p className="text-[10px] text-text-muted">Ruang mediasi interaktif antara Auditor BPK dengan Bendahara {institusi.nama_institusi}</p>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4 h-[300px] overflow-y-auto space-y-4">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'auditor' ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[9px] text-text-muted px-1.5 mb-1 font-semibold">
                      {msg.senderName} • {msg.time}
                    </span>
                    <div
                      className={`max-w-[75%] rounded-xl p-3 text-xs leading-relaxed ${
                        msg.sender === 'auditor'
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-white text-text-primary border border-slate-200 shadow-sm rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isAiReplying && (
                  <div className="flex items-center gap-2 text-text-muted text-[10px] p-2 bg-white/80 rounded-xl border border-slate-200 shadow-sm max-w-[150px]">
                    <RefreshCw size={12} className="animate-spin text-indigo-500" />
                    <span>Sekolah sedang mengetik...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Kirim pertanyaan klarifikasi audit baru di sini..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                  className="search-input flex-1 pl-4"
                  style={{ width: 'auto' }}
                  disabled={isAiReplying}
                />
                <button
                  onClick={handleSendChat}
                  className="btn btn-primary px-4 py-2 text-xs flex items-center justify-center font-bold"
                  disabled={isAiReplying || !chatInput.trim()}
                >
                  <Send size={12} />
                  Kirim
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL TAMBAH PENGELUARAN */}
      {tambahModalOpen && (
        <div className="modal-overlay" onClick={() => setTambahModalOpen(false)}>
          <div className="modal-content modal-content-wide w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 relative animate-scale-up border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Plus size={16} />
                </span>
                Tambah Transaksi Manual
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
                    <span>Pajak (PPN / PPh {formPajak}%)</span>
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
              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-2">
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
                  SIMPAN TRANSAKSI
                </button>
                <button
                  type="button"
                  onClick={() => setTambahModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all uppercase cursor-pointer"
                >
                  BATAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW SCAN STRUK */}
      {previewStrukOpen && selectedTransaksi && (
        <div className="modal-overlay" onClick={() => setPreviewStrukOpen(false)}>
          <div
            className="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[520px] max-w-3xl w-[95%] shadow-2xl animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* LEFT COLUMN: Visual Simulated Kuitansi/Struk */}
            <div id="print-receipt-content" className="flex-1 p-6 overflow-y-auto bg-amber-50/10 border-r border-slate-200 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Receipt Header */}
                <div className="text-center border-b-2 border-dashed border-slate-300 pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">BUKTI KUITANSI DIGITAL</h4>
                  <p className="text-[9px] text-text-muted font-mono mt-0.5">{selectedTransaksi.invoiceNo}</p>
                  <p className="text-[10px] text-text-secondary mt-1 font-semibold">{selectedTransaksi.vendorName}</p>
                </div>

                {/* Receipt Metadata */}
                <div className="space-y-1 text-[11px] text-text-secondary font-mono">
                  <div className="flex justify-between">
                    <span>Tanggal:</span>
                    <span>{selectedTransaksi.tanggal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Institusi:</span>
                    <span className="font-semibold text-text-primary text-right truncate max-w-[150px]">{institusi.nama_institusi}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2">
                    <span>Metode Pembayaran:</span>
                    <span>Transfer Bank Himbara</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2 py-1">
                  <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase font-mono">
                    <span>Deskripsi Item</span>
                    <span>Jumlah</span>
                  </div>
                  <div className="flex justify-between text-xs text-text-primary leading-tight">
                    <span className="max-w-[70%]">{selectedTransaksi.item}</span>
                    <span className="font-mono text-right font-semibold">
                      {selectedTransaksi.qty} x {fmtRupiah(selectedTransaksi.hargaSatuan)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="border-t-2 border-dashed border-slate-300 pt-4 mt-4 space-y-1">
                <div className="flex justify-between text-sm font-bold text-text-primary font-mono">
                  <span>TOTAL BAYAR:</span>
                  <span className="text-indigo-600">{fmtRupiah(selectedTransaksi.nominal)}</span>
                </div>
                <div className="text-center pt-2">
                  <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 font-semibold inline-block uppercase tracking-wider">
                    E-SPJ Terverifikasi Digital
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: AI Verification Result Panel */}
            <div className="w-full md:w-[320px] bg-slate-50 p-6 flex flex-col justify-between h-[300px] md:h-full">
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <ShieldCheck size={16} className="text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800">Verifikasi Berkas AI</h4>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 shadow-sm">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-text-muted">STATUS INTEGRITAS:</span>
                    <span className={`badge text-[9px] ${getStrukStatusBadge(selectedTransaksi.strukStatus)}`}>
                      {selectedTransaksi.strukStatus}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed bg-slate-50 p-2 rounded border border-slate-100 italic">
                    &ldquo;{selectedTransaksi.strukMessage}&rdquo;
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-text-muted uppercase">
                    <FileCheck size={12} className="text-indigo-500" />
                    <span>Langkah Deteksi Forensik:</span>
                  </div>
                  <ul className="text-[10px] text-text-secondary space-y-1.5 pl-2 list-disc">
                    <li>Kecocokan metadata tanggal & nominal bank (100% OK)</li>
                    <li>Pemindaian kesesuaian harga regional LKPP</li>
                    <li>Pencarian database nomor faktur duplikat nasional</li>
                    <li>Validasi kesesuaian potongan setoran PPN 11%</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2 border-t border-slate-200 pt-4 mt-2">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="btn btn-primary w-full justify-center text-xs py-1.5 font-bold cursor-pointer"
                >
                  Cetak Struk
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewStrukOpen(false)}
                  className="btn btn-ghost w-full justify-center text-xs py-1.5 font-bold cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD SPJ MODAL */}
      {uploadModalOpen && (
        <div className="modal-overlay" onClick={() => !isUploading && setUploadModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <UploadCloud size={16} className="text-indigo-600" />
                Unggah Dokumen SPJ / Kuitansi
              </h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-text-muted transition"
                disabled={isUploading}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-text-muted block mb-1">BULAN ANGGARAN</label>
                <select
                  value={uploadMonth}
                  onChange={(e) => setUploadMonth(e.target.value)}
                  className="select-dropdown w-full"
                  disabled={isUploading}
                >
                  {bulanNames.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-muted block mb-1">NAMA DOKUMEN / KUITANSI (.PDF)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SPJ_Pengadaan_Kertas_A4.pdf"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="search-input w-full pl-3"
                  style={{ width: '100%' }}
                  disabled={isUploading}
                />
              </div>

              <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2 hover:bg-indigo-50/20 transition cursor-pointer">
                <UploadCloud size={32} className="text-text-muted mx-auto" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-text-primary">Seret berkas di sini untuk memilih</p>
                  <p className="text-[10px] text-text-muted">Maksimal ukuran berkas: 25MB (Format PDF/JPEG)</p>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl animate-pulse">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Memindai dokumen dengan Gemini AI...</span>
                  </div>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill bg-indigo-600" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="btn btn-ghost"
                  disabled={isUploading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUploading}
                >
                  {isUploading ? 'Mengunggah...' : 'Unggah & Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
