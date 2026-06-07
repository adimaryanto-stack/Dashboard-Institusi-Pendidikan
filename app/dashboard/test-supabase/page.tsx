'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { supabase } from '@/lib/supabase';
import {
  Database, ShieldCheck, XCircle, AlertTriangle, RefreshCw, CheckCircle2,
  Copy, Check, Play, TableProperties, Sparkles, HelpCircle, Terminal, Loader2
} from 'lucide-react';

interface ConnectionStatus {
  status: 'connecting' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
  url: string;
}

interface TableStats {
  tahun_anggaran?: number;
  provinsi?: number;
  alokasi_provinsi?: number;
  kabupaten_kota?: number;
  alokasi_kabupaten_kota?: number;
  institusi_pendidikan?: number;
  sumber_dana_institusi?: number;
  pengeluaran_bulanan_institusi?: number;
  rincian_pengeluaran_item?: number;
  users?: number;
  audit_anomaly?: number;
}

export default function TestSupabasePage() {
  const [testResult, setTestResult] = useState<ConnectionStatus>({
    status: 'connecting',
    message: 'Mencoba menghubungkan ke Supabase...',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Tidak dikonfigurasi',
  });
  const [loading, setLoading] = useState(false);
  const [schemaSql, setSchemaSql] = useState('');
  const [copied, setCopied] = useState(false);

  // Migration states
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
    stats?: TableStats;
  } | null>(null);

  // Load Schema DDL from local API
  useEffect(() => {
    async function fetchSchema() {
      try {
        const res = await fetch('/api/import-supabase');
        const data = await res.json();
        if (data.sql) {
          setSchemaSql(data.sql);
        }
      } catch (err) {
        console.error('Failed to load SQL Schema:', err);
      }
    }
    fetchSchema();
    testConnection();
  }, []);

  const testConnection = async () => {
    setLoading(true);
    setTestResult(prev => ({ ...prev, status: 'connecting', message: 'Mengirimkan request uji coba ke Supabase...' }));

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!url || !key) {
      setTestResult({
        status: 'error',
        message: 'Konfigurasi .env tidak lengkap.',
        details: 'Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah terisi di file .env Anda.',
        url: url || 'Kosong',
      });
      setLoading(false);
      return;
    }

    try {
      // Test query to see if connection is correct and table exists
      const { data, error, status } = await supabase
        .from('tahun_anggaran')
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
          setTestResult({
            status: 'warning',
            message: 'Koneksi API Sukses, Tetapi Tabel Belum Terbuat!',
            details: `API Supabase merespons dengan sukses. Namun, tabel-tabel database belum dibuat di skema database Supabase Anda. Ikuti "Langkah 1" di bawah untuk setup tabel.`,
            url,
          });
        } else if (status === 401 || status === 403) {
          setTestResult({
            status: 'error',
            message: 'Koneksi Ditolak (Autentikasi Gagal)',
            details: `Supabase mengembalikan status ${status}. Periksa apakah NEXT_PUBLIC_SUPABASE_ANON_KEY Anda valid.`,
            url,
          });
        } else {
          setTestResult({
            status: 'error',
            message: 'Koneksi Mengembalikan Error',
            details: `${error.message} (Code: ${error.code})`,
            url,
          });
        }
      } else {
        setTestResult({
          status: 'success',
          message: 'Koneksi Sukses & Tabel Siap!',
          details: `Koneksi berhasil terjalin dan tabel 'tahun_anggaran' berhasil diakses. Database Supabase Anda siap digunakan.`,
          url,
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: 'Koneksi Gagal (Network Error)',
        details: err?.message || 'Tidak dapat menghubungi server Supabase. Periksa koneksi internet Anda.',
        url,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runMigration = async () => {
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch('/api/import-supabase', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMigrationResult({
          success: true,
          message: data.message,
          stats: data.inserted_rows,
        });
        // Retest connection to verify status is now green
        testConnection();
      } else {
        setMigrationResult({
          success: false,
          message: data.message || 'Gagal menjalankan migrasi.',
        });
      }
    } catch (err: any) {
      setMigrationResult({
        success: false,
        message: err.message || 'Terjadi kesalahan jaringan saat migrasi.',
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      <Header title="Integrasi Supabase & Migrasi" subtitle="Setup skema database dan sinkronisasi data awal dasbor" />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        
        {/* Connection Status Card */}
        <div className="glass-card p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Status Koneksi Supabase</h2>
              <p className="text-xs text-text-muted">Memeriksa ketersediaan API dari environment variables</p>
            </div>
          </div>

          <div className="mb-6 p-5 rounded-xl border flex gap-4 items-start bg-white shadow-sm">
            {testResult.status === 'connecting' && (
              <>
                <RefreshCw size={24} className="text-indigo-500 animate-spin mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-indigo-700">Menghubungkan...</h3>
                  <p className="text-xs text-slate-500 mt-1">{testResult.message}</p>
                </div>
              </>
            )}

            {testResult.status === 'success' && (
              <>
                <CheckCircle2 size={24} className="text-emerald-500 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700">{testResult.message}</h3>
                  <p className="text-xs text-slate-600 mt-1">{testResult.details}</p>
                </div>
              </>
            )}

            {testResult.status === 'warning' && (
              <>
                <AlertTriangle size={24} className="text-amber-500 mt-1 animate-pulse" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-700">{testResult.message}</h3>
                  <p className="text-xs text-slate-600 mt-1">{testResult.details}</p>
                </div>
              </>
            )}

            {testResult.status === 'error' && (
              <>
                <XCircle size={24} className="text-rose-500 mt-1" />
                <div>
                  <h3 className="text-sm font-semibold text-rose-700">{testResult.message}</h3>
                  <p className="text-xs text-slate-600 mt-1">{testResult.details}</p>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-50/50 p-4 rounded-lg border border-slate-100 text-text-secondary mb-4">
            <div>
              <span className="font-semibold text-slate-500 block mb-1">SUPABASE URL:</span>
              <span className="text-text-primary break-all">{testResult.url}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 block mb-1">SKEMA DATABASE:</span>
              <span className="text-text-primary">
                {testResult.status === 'success' ? '✓ SIAP (Tabel Ditemukan)' : '✗ BELUM SIAP (Tabel Kosong)'}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={testConnection}
              disabled={loading}
              className="btn btn-secondary flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Cek Ulang Koneksi
            </button>
          </div>
        </div>

        {/* Step-by-Step setup */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* STEP 1: Setup DDL SQL */}
          <div className="glass-card p-6 border border-slate-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
                  <h3 className="text-sm font-bold text-text-primary">Setup Skema Database DDL</h3>
                </div>
                <button
                  onClick={copyToClipboard}
                  disabled={!schemaSql}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span>{copied ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Skema tabel database diperlukan agar Supabase mengenali struktur data dasbor. Copy DDL SQL di bawah dan paste ke editor SQL Supabase Anda.
              </p>

              <div className="relative border border-slate-200 rounded-lg bg-slate-900 overflow-hidden font-mono text-[10px] text-slate-300">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950 text-slate-500 border-b border-slate-800">
                  <span className="flex items-center gap-1"><Terminal size={10} /> supabase_schema.sql</span>
                  <span>SQL Editor</span>
                </div>
                <pre className="p-3 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
                  {schemaSql || 'Memuat skema SQL...'}
                </pre>
              </div>

              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
                <span className="font-bold flex items-center gap-1"><HelpCircle size={12} className="text-indigo-600" /> Cara Menjalankan:</span>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Buka <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline hover:text-indigo-700">Supabase Console</a> proyek Anda</li>
                  <li>Pilih menu <strong>SQL Editor</strong> di sidebar kiri</li>
                  <li>Klik <strong>New Query</strong>, paste kode SQL di atas</li>
                  <li>Klik tombol <strong>Run</strong> di bagian kanan bawah</li>
                </ol>
              </div>
            </div>
          </div>

          {/* STEP 2: Migration Action */}
          <div className="glass-card p-6 border border-slate-200 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">2</span>
                <h3 className="text-sm font-bold text-text-primary">Sinkronisasi & Import Data</h3>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                Setelah tabel berhasil dibuat di Supabase melalui SQL Editor, Anda dapat mengklik tombol di bawah untuk mengimpor seluruh data transaksional anggaran pendidikan (Provinsi, Kabupaten, Sekolah, Pengeluaran Bulanan, Item Detail, dsb) dari mock engine ke Supabase Cloud.
              </p>

              {/* Status Warning if tables not created */}
              {testResult.status !== 'success' && testResult.status !== 'connecting' && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg flex gap-3 items-start text-xs">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <span className="font-semibold block mb-0.5">Tabel Belum Terdeteksi</span>
                    Anda harus menjalankan skema DDL di "Langkah 1" terlebih dahulu sebelum melakukan impor data, jika tidak API impor akan mengembalikan error.
                  </div>
                </div>
              )}

              {/* Migration Result UI */}
              {migrationResult && (
                <div className={`p-4 rounded-lg border text-xs space-y-3 ${
                  migrationResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                    : 'bg-rose-50 border-rose-200 text-rose-950'
                }`}>
                  <div className="flex items-center gap-2 font-semibold">
                    {migrationResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    ) : (
                      <XCircle size={16} className="text-rose-600" />
                    )}
                    <span>{migrationResult.success ? 'Impor Berhasil Terlaksana!' : 'Impor Gagal'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{migrationResult.message}</p>

                  {/* Table Stats Breakdown */}
                  {migrationResult.success && migrationResult.stats && (
                    <div className="border-t border-emerald-200/50 pt-2 mt-2 space-y-1">
                      <span className="font-semibold block text-[10px] text-emerald-800 uppercase tracking-wider mb-1.5">Rincian Data Tersinkron:</span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono">
                        <div className="flex justify-between border-b border-emerald-100 pb-0.5">
                          <span>Tahun Anggaran:</span>
                          <span className="font-bold">{migrationResult.stats.tahun_anggaran || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-emerald-100 pb-0.5">
                          <span>Provinsi:</span>
                          <span className="font-bold">{migrationResult.stats.provinsi || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-emerald-100 pb-0.5">
                          <span>Kabupaten/Kota:</span>
                          <span className="font-bold">{migrationResult.stats.kabupaten_kota || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-emerald-100 pb-0.5">
                          <span>Institusi:</span>
                          <span className="font-bold">{migrationResult.stats.institusi_pendidikan || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-emerald-100 pb-0.5">
                          <span>Pengeluaran Bulanan:</span>
                          <span className="font-bold">{migrationResult.stats.pengeluaran_bulanan_institusi || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-emerald-100 pb-0.5">
                          <span>Detail Item:</span>
                          <span className="font-bold">{migrationResult.stats.rincian_pengeluaran_item || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={runMigration}
                disabled={migrating}
                className="btn btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
              >
                {migrating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Memproses Impor (Batching)...
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    Impor Data ke Supabase
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Informative Footer */}
        <div className="text-xs text-text-muted flex gap-2 items-start bg-slate-50 p-4 rounded-lg border border-slate-100">
          <ShieldCheck size={16} className="text-indigo-500 shrink-0 mt-0.5" />
          <p>
            Dengan tersambungnya database ke Supabase, dasbor secara otomatis beralih menggunakan data dari Supabase secara real-time. Jika Anda mengosongkan tabel Supabase, dasbor akan secara otomatis kembali menggunakan data simulasi lokal (Mock Data) secara aman.
          </p>
        </div>
      </div>
    </div>
  );
}
