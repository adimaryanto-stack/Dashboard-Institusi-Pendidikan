'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import { mockAnomalies } from '@/lib/data';
import { AuditAnomaly } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { fmtRupiah } from '@/lib/utils/formatters';
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Play,
  Loader2, CheckCircle2, FileText, RefreshCw, Info,
  HelpCircle, MapPin, Calendar, User, Wrench, Send,
  MessageSquare, FileSearch, X
} from 'lucide-react';

// Pre-defined Gemini audit reports based on selected institution
const SIMULATED_REPORTS: Record<string, {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CLEAN';
  isAnomalyDetected: boolean;
  findings: Array<{ item: string; issue: string; estimatedLoss: number }>;
  reasoning: string;
}> = {
  'inst-universitas-0': {
    severity: 'HIGH',
    isAnomalyDetected: true,
    findings: [
      { item: 'Pembangunan Gedung Mahasiswa Baru', issue: 'Mark-up Rencana Anggaran Biaya (RAB) sebesar 35% di atas nilai wajar pasar regional.', estimatedLoss: 45000000000 }
    ],
    reasoning: 'Analisis Gemini mendeteksi harga satuan bahan konstruksi beton dan finishing besi struktur dilaporkan 1.5x lebih mahal dari e-Katalog LKPP Jawa Barat tahun 2026.'
  },
  'inst-sma-0': {
    severity: 'MEDIUM',
    isAnomalyDetected: true,
    findings: [
      { item: 'Kuitansi Buku Pelajaran Kurikulum Merdeka', issue: 'Duplikasi Invoice dengan nomor seri INV-2026-089A dan nominal yang sama persis.', estimatedLoss: 120000000 }
    ],
    reasoning: 'Gemini mencocokkan dua entri pencatatan di bulan Januari yang melampirkan file scan kuitansi yang identik, mengindikasikan pencatatan ganda atau potensi transfer dana ganda.'
  },
  'inst-smp-2': {
    severity: 'LOW',
    isAnomalyDetected: true,
    findings: [
      { item: 'Pajak PPN Belanja ATK & Laptop Kurikulum', issue: 'Kurang bayar setoran PPN 11% (Disetor Rp 2.500.000 dari kewajiban Rp 7.000.000).', estimatedLoss: 4500000 }
    ],
    reasoning: 'Pajak yang dipotong pada transaksi pembelian alat penunjang belajar mengajar tidak dilaporkan secara penuh. Selisih Rp 4.500.000 terdeteksi sebagai utang pajak.'
  },
  'inst-universitas-1': {
    severity: 'HIGH',
    isAnomalyDetected: true,
    findings: [
      { item: 'Penarikan Tunai Kas Operasional Mandiri', issue: 'Realisasi penarikan dana kas tunai tanpa dokumen SPJ (Surat Pertanggungjawaban) pendukung.', estimatedLoss: 12000000000 }
    ],
    reasoning: 'Ditemukan selisih saldo bank sebesar Rp 12.000.000.000 yang ditarik tunai pada tanggal 05 April 2026, tetapi tidak diiringi dengan rincian nota belanja yang di-upload ke sistem.'
  },
  'inst-sd-0': {
    severity: 'MEDIUM',
    isAnomalyDetected: true,
    findings: [
      { item: 'Indikasi Pengeluaran Fiktif ATK', issue: 'Pembelian alat tulis kantor dalam jumlah berlebihan yang melebihi kapasitas operasional normal sekolah dasar.', estimatedLoss: 35000000 }
    ],
    reasoning: 'Volume pembelian ATK yang dilaporkan dinilai melebihi kebutuhan riil sekolah dan tidak didukung bukti fisik di gudang.'
  },
  'clean': {
    severity: 'CLEAN',
    isAnomalyDetected: false,
    findings: [],
    reasoning: 'Pemindaian Gemini AI tidak menemukan anomali harga, indikasi kuitansi ganda, maupun selisih pajak. Semua pengeluaran berada dalam batas toleransi wajar dan dokumen pendukung lengkap.'
  }
};

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function AuditPage() {
  const [anomalies, setAnomalies] = useState<AuditAnomaly[]>(mockAnomalies.filter(a => a.institusi_id === 'inst-sd-0'));
  const [selectedInst, setSelectedInst] = useState('inst-sd-0');
  const [scanStatus, setScanStatus] = useState<'IDLE' | 'SCANNING' | 'DONE'>('IDLE');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState('');
  const [activeReport, setActiveReport] = useState<typeof SIMULATED_REPORTS[string] | null>(null);
  
  // Investigation Modal states
  const [selectedAnomaly, setSelectedAnomaly] = useState<AuditAnomaly | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Statistics
  const activeCount = anomalies.filter(a => a.status !== 'SELESAI').length;
  const totalLoss = anomalies
    .filter(a => a.status !== 'SELESAI')
    .reduce((sum, a) => sum + a.nominal_selisih, 0);
  const resolvedCount = anomalies.filter(a => a.status === 'SELESAI').length;

  // Initial greeting when an anomaly is selected
  useEffect(() => {
    if (selectedAnomaly) {
      setChatMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `Halo! Saya Asisten Audit Gemini. Saya dapat membantu menganalisis temuan anomali di **${selectedAnomaly.nama_institusi}** secara rinci. Silakan tanyakan informasi mengenai vendor, alasan kecurigaan, kronologi kejadian, atau rekomendasi perbaikan.`,
          timestamp: new Date()
        }
      ]);
    }
  }, [selectedAnomaly]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiTyping]);

  // Severity style helper
  const getSeverityBadge = (sev: 'LOW' | 'MEDIUM' | 'HIGH' | 'CLEAN') => {
    switch (sev) {
      case 'HIGH':
        return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'LOW':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    }
  };

  // Status style helper
  const getStatusBadge = (status: 'TEMUAN' | 'INVESTIGASI' | 'SELESAI') => {
    switch (status) {
      case 'TEMUAN':
        return 'bg-red-50 text-red-600 border-red-200';
      case 'INVESTIGASI':
        return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case 'SELESAI':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
  };

  // Run Gemini AI Scan simulation
  const handleStartScan = () => {
    setScanStatus('SCANNING');
    setScanProgress(0);
    setActiveReport(null);
    
    const messages = [
      'Menghubungkan ke InsForge AI Gateway...',
      'Membaca histori sumber dana & alokasi bank...',
      'Memindai dokumen kuitansi & nota belanja bulanan...',
      'Mengevaluasi kepatuhan PPN (11%) & PPh...',
      'Menganalisis perbandingan harga satuan dengan e-Katalog nasional...',
      'Merumuskan kesimpulan analitis forensik...'
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setScanProgress(Math.min(currentStep * 16.6, 100));
      setScanMessage(messages[Math.min(currentStep, messages.length - 1)]);

      if (currentStep >= 6) {
        clearInterval(interval);
        setScanStatus('DONE');
        const reportKey = SIMULATED_REPORTS[selectedInst] ? selectedInst : 'clean';
        setActiveReport(SIMULATED_REPORTS[reportKey]);

        // If it's a new anomaly that is not in the list, we can add it
        if (reportKey !== 'clean' && !anomalies.some(a => a.institusi_id === reportKey)) {
          // add to table simulation
          const nameMap: Record<string, string> = {
            'inst-sd-0': 'SDN 01 Menteng'
          };
          const jenjangMap: Record<string, any> = {
            'inst-sd-0': 'SD'
          };

          const newAnomaly: AuditAnomaly = {
            id: `anom-${Date.now()}`,
            institusi_id: reportKey,
            nama_institusi: nameMap[reportKey] || 'Institusi Baru',
            jenjang: jenjangMap[reportKey] || 'SMA',
            bulan: 'Mei',
            nomor_bulan: 5,
            tipe_anomali: SIMULATED_REPORTS[reportKey].findings[0]?.item || 'Anomali Anggaran',
            keterangan: SIMULATED_REPORTS[reportKey].findings[0]?.issue || '',
            nominal_selisih: SIMULATED_REPORTS[reportKey].findings[0]?.estimatedLoss || 0,
            tingkat_keparahan: SIMULATED_REPORTS[reportKey].severity as any,
            status: 'TEMUAN',
            tanggal_ditemukan: new Date().toISOString().split('T')[0],
            audit_what: SIMULATED_REPORTS[reportKey].findings[0]?.item + ': ' + SIMULATED_REPORTS[reportKey].findings[0]?.issue,
            audit_why: SIMULATED_REPORTS[reportKey].reasoning,
            audit_where: `${nameMap[reportKey]}, Kantor Administrasi Keuangan.`,
            audit_when: 'Mei 2026.',
            audit_who: 'Kepala Bagian Keuangan & Vendor Pelaksana.',
            audit_how: 'Lakukan audit verifikasi fisik kuitansi dan sesuaikan dengan regulasi harga pasar.',
          };
          setAnomalies(prev => [newAnomaly, ...prev]);
          
          // Sync with Zustand and Supabase
          const { isSupabaseMode, dbData, setDbData } = useAppStore.getState();
          if (isSupabaseMode && dbData) {
            setDbData({ ...dbData, audit_anomaly: [newAnomaly, ...dbData.audit_anomaly] });
            supabase
              .from('audit_anomaly')
              .insert([newAnomaly])
              .then(({ error }) => {
                if (error) console.error('Failed to insert anomaly to Supabase:', error.message);
              });
          }
        }
      }
    }, 800);
  };

  const updateAnomalyStatus = (id: string, newStatus: 'TEMUAN' | 'INVESTIGASI' | 'SELESAI') => {
    setAnomalies(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    if (selectedAnomaly && selectedAnomaly.id === id) {
      setSelectedAnomaly(prev => prev ? { ...prev, status: newStatus } : null);
    }

    // Sync with Zustand and Supabase
    const { isSupabaseMode, dbData, setDbData } = useAppStore.getState();
    if (isSupabaseMode && dbData) {
      const updatedAnoms = dbData.audit_anomaly.map((a: any) => a.id === id ? { ...a, status: newStatus } : a);
      setDbData({ ...dbData, audit_anomaly: updatedAnoms });
      supabase
        .from('audit_anomaly')
        .update({ status: newStatus })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Failed to update status in Supabase:', error.message);
        });
    }
  };

  // Chat Q&A response generation logic
  const handleSendChat = () => {
    if (!chatInput.trim() || !selectedAnomaly) return;

    const userText = chatInput.trim();
    const newUserMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: userText,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsAiTyping(true);

    // Simulate AI response based on the anomaly context
    setTimeout(() => {
      let aiText = '';
      const textLower = userText.toLowerCase();

      // UI (Gedung UI)
      if (selectedAnomaly.id === 'anom-1') {
        if (textLower.includes('siapa') || textLower.includes('vendor') || textLower.includes('kontraktor') || textLower.includes('who')) {
          aiText = `Untuk pembangunan Gedung Hub Mahasiswa di **Universitas Indonesia**, penanggung jawab pengaju anggaran adalah **Dr. Ir. Hermawan, M.T. (Pejabat Pembuat Komitmen/PPK)**. Pelaksana proyek konstruksi adalah kontraktor **PT Pembangunan Nusantara Jaya**.`;
        } else if (textLower.includes('bagaimana') || textLower.includes('solusi') || textLower.includes('tindak') || textLower.includes('how')) {
          aiText = `Rekomendasi tindakan mitigasi:
1. **Revisi RAB**: Sesuaikan harga satuan besi struktur & beton dengan e-Katalog LKPP Jawa Barat (potensi penghematan Rp 45 Milyar).
2. **Audit Fisik Lapangan**: Lakukan pengukuran ketebalan & mutu beton ready mix terpasang.
3. **Penundaan**: Batasi sisa termin pencairan dana ke vendor PT Pembangunan Nusantara Jaya sampai klarifikasi RAB diselesaikan.`;
        } else if (textLower.includes('kenapa') || textLower.includes('mengapa') || textLower.includes('bukti') || textLower.includes('why')) {
          aiText = `Dicurigai karena adanya *markup* (penggelembungan) harga material pokok konstruksi. Besi struktur dilaporkan seharga **Rp 150.000/kg** (harga pasar Rp 95.000/kg) dan beton ready mix K-350 seharga **Rp 1.800.000/m³** (harga pasar Rp 1.100.000/m³).`;
        } else {
          aiText = `Temuan di **Universitas Indonesia** ini diklasifikasikan berisiko **HIGH** karena mencakup potensi mark-up bernilai fantastis (Rp 45 Milyar). Disarankan segera memanggil Dr. Ir. Hermawan untuk melakukan gelar klarifikasi kontrak RAB dengan PT Pembangunan Nusantara Jaya. Ada hal spesifik dari proyek konstruksi ini yang ingin Anda tanyakan lagi?`;
        }
      } 
      // SMAN 1 (Duplikasi Buku)
      else if (selectedAnomaly.id === 'anom-2') {
        if (textLower.includes('siapa') || textLower.includes('bendahara') || textLower.includes('vendor') || textLower.includes('who')) {
          aiText = `Transaksi buku pelajaran **SMAN 1 Jakarta** ini diajukan oleh Bendahara BOS Sekolah yaitu **Ibu Retno Lestari**, dengan supplier penyedia buku yaitu **CV Pustaka Raya**.`;
        } else if (textLower.includes('bagaimana') || textLower.includes('solusi') || textLower.includes('tindak') || textLower.includes('how')) {
          aiText = `Rekomendasi tindakan penyelesaian:
1. **Recall Dana**: Minta **CV Pustaka Raya** mengembalikan kelebihan bayar Rp 120.000.000 ke rekening BOS sekolah.
2. **Penghapusan Buku Kas**: Hapus entri jurnal pengeluaran kedua pada tanggal 24 Januari 2026.
3. **Evaluasi Internal**: Berikan surat teguran kepada Ibu Retno Lestari agar memperketat rekonsiliasi invoice ganda.`;
        } else if (textLower.includes('kenapa') || textLower.includes('mengapa') || textLower.includes('bukti') || textLower.includes('why')) {
          aiText = `Penyebabnya adalah **Double Billing**. Sistem mendeteksi nomor invoice yang identik (**INV-2026-089A**) dengan file scan lampiran kuitansi yang 100% sama di-upload pada dua transaksi berbeda (12 Januari & 24 Januari).`;
        } else {
          aiText = `Untuk kasus **SMAN 1 Jakarta**, anomali ini bersumber dari kesalahan input/pembayaran ganda kepada CV Pustaka Raya senilai Rp 120 Juta. Kami merekomendasikan penarikan saldo lebih tersebut. Apakah Anda ingin mengunduh salinan kedua file kuitansi yang duplikat tersebut?`;
        }
      }
      // SMPN 1 (PPN)
      else if (selectedAnomaly.id === 'anom-3') {
        if (textLower.includes('siapa') || textLower.includes('kepala') || textLower.includes('who')) {
          aiText = `Penanggung jawab anggaran adalah Kepala Sekolah SMPN 1 Surabaya, **Bapak Drs. Bambang Utomo**, dengan transaksi pembayaran ditujukan kepada rekanan penyedia **CV Computerindo Surabaya**.`;
        } else if (textLower.includes('bagaimana') || textLower.includes('solusi') || textLower.includes('tindak') || textLower.includes('how')) {
          aiText = `Rekomendasi perbaikan:
1. **Penerbitan SSP**: Terbitkan Surat Setoran Pajak (SSP) manual untuk menyetorkan sisa kekurangan PPN Rp 4.500.000 ke Kantor Pajak Pratama setempat.
2. **Klarifikasi Faktur**: Minta CV Computerindo melampirkan Faktur Pajak e-Faktur yang sah senilai 11% dari subtotal transaksi (yaitu Rp 7.000.000).`;
        } else if (textLower.includes('kenapa') || textLower.includes('mengapa') || textLower.includes('bukti') || textLower.includes('why')) {
          aiText = `Indikasi anomali ini karena **kurang bayar setoran pajak**. Subtotal pembelian riil adalah Rp 63.636.363 yang mana kewajiban PPN 11% harusnya Rp 7.000.000, tetapi catatan pajak disetor yang terlaporkan ke kas daerah hanya Rp 2.500.000.`;
        } else {
          aiText = `Masalah di **SMPN 1 Surabaya** adalah ketidaksesuaian nominal PPN sebesar Rp 4,5 Juta. Ini tergolong risiko **LOW** dan dapat diselesaikan dengan menyetorkan kekurangan pajak via bank persepsi. Apakah Anda memerlukan kode billing pajak untuk transaksi ini?`;
        }
      }
      // ITB (Unrecorded Cash)
      else if (selectedAnomaly.id === 'anom-4') {
        if (textLower.includes('siapa') || textLower.includes('biro') || textLower.includes('who')) {
          aiText = `Penanggung jawab administrasi mutasi bank ini adalah Kepala Biro Keuangan ITB, **Bapak Ahmad Faisal**. Bank penampung transaksi penarikan adalah **Bank Mandiri KCP ITB**.`;
        } else if (textLower.includes('bagaimana') || textLower.includes('solusi') || textLower.includes('tindak') || textLower.includes('how')) {
          aiText = `Rekomendasi tindak lanjut:
1. **Batas Waktu Dokumen**: Berikan tenggat waktu resmi selama 14 hari kerja bagi Biro Keuangan untuk melampirkan semua kuitansi belanja pendukung senilai Rp 12 Milyar.
2. **Penyetoran Sisa**: Sisa dana kas tunai yang belum digunakan wajib langsung disetorkan kembali ke rekening giro bank ITB untuk menghindari penyalahgunaan sisa kas.`;
        } else if (textLower.includes('kenapa') || textLower.includes('mengapa') || textLower.includes('bukti') || textLower.includes('why')) {
          aiText = `Anomali ini terdeteksi karena **penarikan tunai tanpa pertanggungjawaban (SPJ)**. Rekening bank ITB didebet Rp 12.000.000.000 tunai pada 05 April 2026, tetapi tidak ada satupun dokumen SPJ/kuitansi rincian yang diunggah ke sistem keuangan daerah.`;
        } else {
          aiText = `Kasus di **ITB** dinilai berisiko **HIGH** karena melibatkan dana tunai non-lapor sebesar Rp 12 Milyar. Kami menyarankan untuk melakukan pemblokiran sementara limit debet rekening bank penampung jika kuitansi tidak di-upload melewati batas tenggat waktu. Ada dokumen lain yang ingin Anda periksa?`;
        }
      }
      // SDN 01 Menteng (Fiktif ATK)
      else if (selectedAnomaly.id === 'anom-5') {
        if (textLower.includes('siapa') || textLower.includes('bendahara') || textLower.includes('toko') || textLower.includes('who')) {
          aiText = `Pengadaan ATK diajukan oleh Bendahara BOS SDN 01 Menteng, **Ibu Rina Amalia**, dan dibeli dari rekanan penyedia **Toko ATK Makmur Jaya**.`;
        } else if (textLower.includes('bagaimana') || textLower.includes('solusi') || textLower.includes('tindak') || textLower.includes('how')) {
          aiText = `Rekomendasi audit fisik:
1. **Stock Opname**: Kunjungi gudang logistik SDN 01 Menteng untuk mencocokkan stok fisik rim kertas A4, spidol, dan alat tulis lainnya dengan catatan nota pembelian.
2. **Surat Jalan**: Verifikasi dokumen Surat Jalan pengiriman dari Toko ATK Makmur Jaya untuk memastikan barang benar-benar dikirim dan diterima secara fisik.`;
        } else if (textLower.includes('kenapa') || textLower.includes('mengapa') || textLower.includes('bukti') || textLower.includes('why')) {
          aiText = `Dicurigai sebagai **pengadaan fiktif** karena volume belanja ATK yang dilaporkan (misal: 500 rim kertas A4 dalam 1 bulan) dinilai melampaui rata-rata kebutuhan normal sekolah dasar yang hanya membutuhkan sekitar 50 rim per bulan.`;
        } else {
          aiText = `Kasus di **SDN 01 Menteng** terkait dugaan pembelian ATK fiktif senilai Rp 35 Juta (Risiko **MEDIUM**). Direkomendasikan melakukan sidak fisik ke gudang sekolah. Apakah Anda ingin menjadwalkan kunjungan investigasi lapangan?`;
        }
      }
      // Fallback
      else {
        aiText = `Berdasarkan analisis forensik Gemini, kasus ini merupakan anomali tingkat **${selectedAnomaly.tingkat_keparahan}** di **${selectedAnomaly.nama_institusi}** terkait **${selectedAnomaly.tipe_anomali}**. Rekomendasi utama adalah melakukan klarifikasi formal dengan pihak manajemen institusi dan membatasi pencairan dana sementara sampai seluruh dokumen lengkap diunggah.`;
      }

      const newAiMessage: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'ai',
        text: aiText,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, newAiMessage]);
      setIsAiTyping(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen">
      <Header title="Audit Anggaran" subtitle="Panel pengawasan, deteksi fraud, dan verifikasi alokasi anggaran bertenaga Gemini AI" />

      <div className="p-6 space-y-6">
        {/* Metrik Ringkasan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="metric-card accent-rose">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Anomali Belum Selesai</p>
                <h3 className="text-2xl font-bold text-rose-600 mt-2">{activeCount} Temuan</h3>
                <p className="text-xs text-text-secondary mt-1">Perlu investigasi lebih lanjut</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-inner">
                <ShieldAlert size={20} />
              </div>
            </div>
          </div>

          <div className="metric-card accent-amber">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Potensi Kerugian</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-2">{fmtRupiah(totalLoss)}</h3>
                <p className="text-xs text-text-secondary mt-1">Estimasi nominal indikasi fraud</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-inner">
                <AlertTriangle size={20} />
              </div>
            </div>
          </div>

          <div className="metric-card accent-emerald">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Kasus Terselesaikan</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-2">{resolvedCount} Kasus</h3>
                <p className="text-xs text-text-secondary mt-1">Laporan SPJ telah direvisi/diklarifikasi</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-inner">
                <ShieldCheck size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Baris Utama: Log Temuan & Simulator AI Scan */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel Kiri: Daftar Anomali */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex justify-between items-center bg-white/40">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-500" />
                  <h3 className="text-sm font-semibold text-text-primary">Daftar Temuan Anomali Anggaran</h3>
                </div>
                <span className="badge bg-rose-50 text-rose-700 border-rose-200 text-xs">Simulasi Live</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="sheet-header-cell text-center" style={{ width: 40 }}>No</th>
                      <th className="sheet-header-cell text-left">Institusi</th>
                      <th className="sheet-header-cell text-left">Tipe Temuan</th>
                      <th className="sheet-header-cell text-right">Potensi Selisih</th>
                      <th className="sheet-header-cell text-center">Keparahan</th>
                      <th className="sheet-header-cell text-center">Status</th>
                      <th className="sheet-header-cell text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalies.map((anom, idx) => (
                      <tr key={anom.id} className="hover:bg-indigo-50/30 transition">
                        <td className="sheet-cell text-center text-text-muted text-xs">{idx + 1}</td>
                        <td className="sheet-cell text-left font-medium text-text-primary">
                          <div>
                            <p className="text-xs font-semibold">{anom.nama_institusi}</p>
                            <p className="text-[10px] text-text-muted uppercase">{anom.jenjang} • {anom.bulan}</p>
                          </div>
                        </td>
                        <td className="sheet-cell text-left text-text-secondary text-xs truncate max-w-[180px]" title={anom.tipe_anomali}>
                          {anom.tipe_anomali}
                        </td>
                        <td className="sheet-cell text-right font-medium text-rose-600 text-xs">
                          {fmtRupiah(anom.nominal_selisih)}
                        </td>
                        <td className="sheet-cell text-center">
                          <span className={`badge ${getSeverityBadge(anom.tingkat_keparahan)}`}>
                            {anom.tingkat_keparahan}
                          </span>
                        </td>
                        <td className="sheet-cell text-center">
                          <span className={`badge ${getStatusBadge(anom.status)}`}>
                            {anom.status}
                          </span>
                        </td>
                        <td className="sheet-cell text-center">
                          <button
                            onClick={() => setSelectedAnomaly(anom)}
                            className="btn btn-ghost py-1 px-2.5 text-[11px] font-semibold"
                          >
                            Detil
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Panel Kanan: AI Gemini Audit Scan */}
          <div className="space-y-6">
            <div className="glass-card p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-indigo-100/80">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                </span>
                <h3 className="text-sm font-semibold text-text-primary">Gemini AI Audit Scan</h3>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                Pilih institusi di bawah ini untuk memicu audit anggaran instan. Gemini akan menganalisis histori SPJ, nota, dan kewajiban pajak PPN 11% secara forensik.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-text-muted block mb-1">PILIH SASARAN AUDIT</label>
                  <select
                    value={selectedInst}
                    onChange={(e) => {
                      setSelectedInst(e.target.value);
                      setScanStatus('IDLE');
                      setActiveReport(null);
                    }}
                    className="select-dropdown w-full"
                    disabled={scanStatus === 'SCANNING'}
                  >
                    <option value="inst-sd-0">SDN 01 Menteng (Medium Risk - Fiktif)</option>
                  </select>
                </div>

                {scanStatus === 'IDLE' && (
                  <button
                    onClick={handleStartScan}
                    className="btn btn-primary w-full justify-center py-2.5 shadow-md shadow-indigo-500/10 font-bold"
                  >
                    <Play size={14} className="fill-white" />
                    Jalankan Audit AI
                  </button>
                )}

                {scanStatus === 'SCANNING' && (
                  <div className="p-4 bg-white/80 border border-indigo-100 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 animate-pulse">
                      <Loader2 size={14} className="animate-spin" />
                      <span>{scanMessage}</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill bg-gradient-to-r from-indigo-500 to-purple-600"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-right text-text-muted font-mono">{Math.round(scanProgress)}%</div>
                  </div>
                )}

                {scanStatus === 'DONE' && activeReport && (
                  <div className="space-y-3 animate-fade-in-up">
                    <div className="flex items-center gap-2 p-3 rounded-xl border bg-white/90">
                      {activeReport.isAnomalyDetected ? (
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
                          <ShieldAlert size={16} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-text-primary">
                          {activeReport.isAnomalyDetected ? 'Terdeteksi Anomali!' : 'Laporan Audit Bersih'}
                        </h4>
                        <p className="text-[10px] text-text-muted">
                          Tingkat Risiko: <span className="font-bold">{activeReport.severity}</span>
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-white/90 border border-border rounded-xl space-y-3 text-xs leading-relaxed shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase border-b border-border pb-1">
                        <FileText size={12} />
                        <span>Laporan Analisis Gemini</span>
                      </div>
                      
                      {activeReport.isAnomalyDetected ? (
                        <div className="space-y-2">
                          {activeReport.findings.map((f, i) => (
                            <div key={i} className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg">
                              <p className="font-bold text-rose-700 text-[11px]">{f.item}</p>
                              <p className="text-[10px] text-text-secondary mt-0.5">{f.issue}</p>
                              <p className="text-[10px] font-semibold text-rose-600 mt-1">Potensi Selisih: {fmtRupiah(f.estimatedLoss)}</p>
                            </div>
                          ))}
                          <p className="text-[10px] text-text-secondary leading-relaxed bg-gray-50 p-2 rounded border border-border/40 italic">
                            &ldquo;{activeReport.reasoning}&rdquo;
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 py-1">
                          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            ✓ Kepatuhan Sempurna (100% Verified)
                          </p>
                          <p className="text-[10px] text-text-secondary bg-emerald-50/30 p-2.5 rounded-lg border border-emerald-100/50 italic">
                            &ldquo;{activeReport.reasoning}&rdquo;
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => setScanStatus('IDLE')}
                        className="btn btn-ghost w-full py-1.5 text-[10px] font-bold mt-2"
                      >
                        <RefreshCw size={10} />
                        Scan Institusi Lain
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Detail Investigasi Anomali (Dua Kolom: 5W1H & Chat Q&A AI) */}
        {selectedAnomaly && (
          <div className="modal-overlay" onClick={() => setSelectedAnomaly(null)}>
            <div 
              className="bg-white/95 backdrop-blur-2xl border border-white/60 rounded-2xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[650px] max-w-4xl w-[95%] shadow-2xl animate-fade-in-up" 
              onClick={(e) => e.stopPropagation()}
            >
              {/* KOLOM KIRI: Analisis 5W1H */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-border flex flex-col justify-between bg-white">
                <div className="space-y-5">
                  <div className="flex justify-between items-start border-b border-border pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                        <ShieldAlert size={16} className="text-rose-500" />
                        Analisis Audit Forensik (5W1H)
                      </h3>
                      <p className="text-[10px] text-text-muted mt-0.5">Institusi: <span className="font-bold text-text-primary">{selectedAnomaly.nama_institusi}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${getSeverityBadge(selectedAnomaly.tingkat_keparahan)}`}>
                        {selectedAnomaly.tingkat_keparahan}
                      </span>
                      <button 
                        onClick={() => setSelectedAnomaly(null)}
                        className="p-1 rounded-full hover:bg-gray-100 text-text-muted transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* 5W1H Structured Grid */}
                  <div className="space-y-3.5 pr-1">
                    
                    {/* WHAT */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5">
                        <FileSearch size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">What (Apa Temuannya?)</h4>
                        <p className="text-xs text-text-primary font-medium mt-0.5">
                          {selectedAnomaly.audit_what || selectedAnomaly.tipe_anomali}
                        </p>
                      </div>
                    </div>

                    {/* WHY */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 mt-0.5">
                        <AlertTriangle size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Why (Mengapa Terjadi Anomali?)</h4>
                        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                          {selectedAnomaly.audit_why || selectedAnomaly.keterangan}
                        </p>
                      </div>
                    </div>

                    {/* WHERE */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                        <MapPin size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Where (Di Mana Lokasi Anggaran?)</h4>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {selectedAnomaly.audit_where || `${selectedAnomaly.nama_institusi}, ${selectedAnomaly.jenjang}`}
                        </p>
                      </div>
                    </div>

                    {/* WHEN */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                        <Calendar size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">When (Kapan Temuan Dideteksi?)</h4>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {selectedAnomaly.audit_when || `Bulan ${selectedAnomaly.bulan} 2026, terdeteksi sistem tanggal ${selectedAnomaly.tanggal_ditemukan}`}
                        </p>
                      </div>
                    </div>

                    {/* WHO */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500 shrink-0 mt-0.5">
                        <User size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Who (Siapa Pihak Terkait?)</h4>
                        <p className="text-xs text-text-secondary mt-0.5 font-medium">
                          {selectedAnomaly.audit_who || 'Bendahara Pengeluaran & Rekanan Toko'}
                        </p>
                      </div>
                    </div>

                    {/* HOW */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                        <Wrench size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">How (Bagaimana Solusi Rekomendasi?)</h4>
                        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed bg-emerald-50/20 border border-emerald-100/40 p-2 rounded-lg">
                          {selectedAnomaly.audit_how || 'Minta klarifikasi dokumen pembukuan SPJ.'}
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Status Update Bar */}
                <div className="border-t border-border pt-4 mt-4 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-text-muted uppercase">Tindak Lanjut Auditor</span>
                    <span className="text-[10px] font-semibold text-rose-600 font-mono">Kerugian: {fmtRupiah(selectedAnomaly.nominal_selisih)}</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateAnomalyStatus(selectedAnomaly.id, 'TEMUAN')}
                      className={`btn flex-1 py-1.5 text-xs font-semibold justify-center ${selectedAnomaly.status === 'TEMUAN' ? 'bg-red-600 text-white shadow-sm' : 'btn-ghost'}`}
                    >
                      Temuan
                    </button>
                    <button
                      onClick={() => updateAnomalyStatus(selectedAnomaly.id, 'INVESTIGASI')}
                      className={`btn flex-1 py-1.5 text-xs font-semibold justify-center ${selectedAnomaly.status === 'INVESTIGASI' ? 'bg-indigo-600 text-white shadow-sm' : 'btn-ghost'}`}
                    >
                      Investigasi
                    </button>
                    <button
                      onClick={() => updateAnomalyStatus(selectedAnomaly.id, 'SELESAI')}
                      className={`btn flex-1 py-1.5 text-xs font-semibold justify-center ${selectedAnomaly.status === 'SELESAI' ? 'bg-emerald-600 text-white shadow-sm' : 'btn-ghost'}`}
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              </div>

              {/* KOLOM KANAN: Chat Q&A AI (Gemini) */}
              <div className="w-full md:w-[380px] bg-slate-50 flex flex-col h-[400px] md:h-full justify-between">
                
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-border bg-white flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                    G
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">Tanya Jawab AI (Gemini)</h4>
                    <p className="text-[9px] text-emerald-600 flex items-center gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      Online • Siap Menganalisis
                    </p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white text-text-primary border border-border rounded-tl-none shadow-sm'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[8px] text-text-muted mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}

                  {isAiTyping && (
                    <div className="flex items-center gap-2 text-text-muted text-[10px] p-2 bg-white/60 rounded-xl border border-border/50 max-w-[120px]">
                      <Loader2 size={12} className="animate-spin text-indigo-500" />
                      <span>Gemini berpikir...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-3 border-t border-border bg-white flex items-center gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendChat();
                    }}
                    placeholder="Tanyakan detail temuan ini..."
                    className="flex-1 text-xs border border-border rounded-lg px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 bg-slate-50"
                    disabled={isAiTyping}
                  />
                  <button
                    onClick={handleSendChat}
                    className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition shrink-0 shadow-sm"
                    disabled={isAiTyping || !chatInput.trim()}
                  >
                    <Send size={12} className="fill-white" />
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
