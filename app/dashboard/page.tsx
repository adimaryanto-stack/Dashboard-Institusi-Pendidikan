'use client';

import Header from '@/components/layout/Header';
import MetricCard from '@/components/ui/MetricCard';
import PctBadge from '@/components/ui/PctBadge';
import { getProfilInstitusi } from '@/lib/data';
import { fmtTriliun, fmtPct, fmtRupiah } from '@/lib/utils/formatters';
import { Wallet, TrendingUp, PieChart, Calendar, Landmark } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, Legend
} from 'recharts';
import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { activeTahun, setActiveTahun, dbData } = useAppStore();
  const router = useRouter();
  const schoolId = 'inst-sd-0'; // SDN 01 Menteng (SDN 01 Pagi benchmark)

  // Fetch active school details for active year
  const activeSchoolData = useMemo(() => {
    return getProfilInstitusi(schoolId, activeTahun);
  }, [activeTahun, dbData]);

  // Generate Year-over-Year data for SDN 01 Menteng (2020 - 2026)
  const yearlyData = useMemo(() => {
    const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    return years.map(yr => {
      const data = getProfilInstitusi(schoolId, yr);
      const nominal = data?.institusi.nominal_alokasi || 0;
      const realisasi = data?.institusi.realisasi_total || 0;
      const persentase = nominal > 0 ? (realisasi / nominal) * 100 : 0;
      const selisih = nominal - realisasi;
      return {
        tahun: yr,
        nominal,
        realisasi,
        persentase,
        selisih
      };
    });
  }, [schoolId, dbData]);

  const schoolName = activeSchoolData?.institusi.nama_institusi || 'SDN 01 Menteng';

  // Format chart data
  const chartData = useMemo(() => {
    return yearlyData.map(d => ({
      tahun: String(d.tahun),
      Nominal: d.nominal,
      Realisasi: d.realisasi,
    }));
  }, [yearlyData]);

  // Formatter for large values on chart axis
  const formatChartValue = (val: number) => {
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toFixed(1)} M`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(1)} Jt`;
    }
    return String(val);
  };

  const currentNominal = activeSchoolData?.institusi.nominal_alokasi || 0;
  const currentRealisasi = activeSchoolData?.institusi.realisasi_total || 0;
  const currentPercentage = currentNominal > 0 ? (currentRealisasi / currentNominal) * 100 : 0;
  
  // Cumulative bank balance rekapitulasi: sum of surplus from 2020 to activeTahun
  const currentSaldo = useMemo(() => {
    return yearlyData
      .filter(d => d.tahun <= activeTahun)
      .reduce((sum, d) => sum + d.selisih, 0);
  }, [yearlyData, activeTahun]);

  return (
    <div className="min-h-screen">
      <Header
        title={`Dashboard: ${schoolName}`}
        subtitle={`Ringkasan analisis audit anggaran sekolah untuk tahun anggaran ${activeTahun}`}
      />

      <div className="p-6 space-y-6">
        {/* Metric Cards - Localized for the school */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Alokasi Anggaran Sekolah"
            value={`Rp ${fmtRupiah(currentNominal)}`}
            subtitle={`Alokasi Dana Sekolah ${activeTahun}`}
            icon={<Wallet size={20} className="text-indigo-600" />}
            accent="indigo"
            trend={{ value: 4.8, label: `dari ${activeTahun - 1}` }}
          />
          <MetricCard
            title="Total Realisasi Belanja"
            value={`Rp ${fmtRupiah(currentRealisasi)}`}
            subtitle="Penyerapan anggaran sekolah saat ini"
            icon={<TrendingUp size={20} className="text-emerald-600" />}
            accent="emerald"
            trend={{ value: 3.5, label: 'dari bulan lalu' }}
          />
          <MetricCard
            title="Persentase Penyerapan"
            value={fmtPct(currentPercentage)}
            subtitle="Target minimal penyerapan 85%"
            icon={<PieChart size={20} className="text-amber-600" />}
            accent="amber"
          />
          <MetricCard
            title="Saldo Rekapitulasi di Bank"
            value={`Rp ${fmtRupiah(currentSaldo)}`}
            subtitle={`Akumulasi sisa anggaran 2020 - ${activeTahun}`}
            icon={<Landmark size={20} className="text-blue-600" />}
            accent="blue"
          />
        </div>

        {/* Ringkasan Pertahun Table */}
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Calendar size={18} className="text-indigo-600" />
            <h3 className="text-sm font-semibold text-text-primary">Ringkasan Penyerapan Anggaran Pertahun</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="sheet-header-cell text-left" style={{ width: 100 }}>Tahun</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 200 }}>Nominal Alokasi</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 200 }}>Realisasi Belanja</th>
                  <th className="sheet-header-cell text-right" style={{ minWidth: 200 }}>Sisa Anggaran (Surplus)</th>
                  <th className="sheet-header-cell text-center" style={{ width: 150 }}>% Penyerapan</th>
                  <th className="sheet-header-cell" style={{ width: 200 }}>Progress</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((d, idx) => {
                  const barColor = d.persentase >= 85 ? '#10b981' : d.persentase >= 70 ? '#f59e0b' : '#ef4444';
                  const isCurrent = d.tahun === activeTahun;
                  return (
                    <tr
                      key={d.tahun}
                      className={`transition cursor-pointer ${isCurrent ? 'bg-indigo-50/70 hover:bg-indigo-50 font-bold border-l-4 border-l-indigo-600' : 'hover:bg-indigo-50/30'}`}
                      style={{ animationDelay: `${idx * 80}ms` }}
                      onClick={() => {
                        setActiveTahun(d.tahun);
                        router.push('/dashboard/profil-institusi/inst-sd-0');
                      }}
                    >
                      <td className="sheet-cell text-left">
                        <span className={`text-xs font-semibold ${isCurrent ? 'text-indigo-700' : 'text-text-primary'}`}>
                          Tahun {d.tahun} {isCurrent ? ' (Aktif)' : ''}
                        </span>
                      </td>
                      <td className="sheet-cell text-right font-mono">Rp {fmtRupiah(d.nominal)}</td>
                      <td className="sheet-cell text-right font-mono">Rp {fmtRupiah(d.realisasi)}</td>
                      <td className={`sheet-cell text-right font-mono ${d.selisih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        Rp {fmtRupiah(d.selisih)}
                      </td>
                      <td className="sheet-cell text-center">
                        <PctBadge value={d.persentase} />
                      </td>
                      <td className="sheet-cell">
                        <div className="progress-bar-track">
                          <div
                            className="progress-bar-fill"
                            style={{
                              width: `${Math.min(d.persentase, 100)}%`,
                              background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bar Chart */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Perbandingan Anggaran vs Realisasi Pertahun</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tahun" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={formatChartValue}
                />
                <Tooltip
                  contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: any) => [`Rp ${fmtRupiah(Number(value))}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="Nominal" name="Anggaran Alokasi" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Realisasi" name="Realisasi Belanja" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trend Line/Area Chart */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-4">Tren Penyerapan Anggaran Sekolah (2020–2026)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradNominal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRealisasi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="tahun" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={formatChartValue}
                />
                <Tooltip
                  contentStyle={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, color: '#1e293b', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: any) => [`Rp ${fmtRupiah(Number(value))}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Area type="monotone" dataKey="Nominal" name="Anggaran Alokasi" stroke="#6366f1" fill="url(#gradNominal)" strokeWidth={2} />
                <Area type="monotone" dataKey="Realisasi" name="Realisasi Belanja" stroke="#10b981" fill="url(#gradRealisasi)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
