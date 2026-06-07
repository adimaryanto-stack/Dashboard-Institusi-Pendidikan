'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { tahunAnggaranData } from '@/lib/data';
import { Bell, Search, Menu, CheckCheck, Info, AlertTriangle, Sparkles } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showYearSelector?: boolean;
  showSearch?: boolean;
}

interface NotificationItem {
  id: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'info' | 'success' | 'warning';
  link: string;
}

export default function Header({ title, subtitle, showYearSelector = true, showSearch = true }: HeaderProps) {
  const { 
    activeTahun, 
    setActiveTahun, 
    toggleSidebar,
    notifications,
    markAsRead,
    markAllAsRead,
    markAllAsUnread
  } = useAppStore();
  const activeTahunList = tahunAnggaranData.filter(t => t.status !== 'DRAFT');
  const router = useRouter();

  // Notification States
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter(n => n.unread).length;
  const allRead = notifications.length > 0 && notifications.every(n => !n.unread);

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  return (
    <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-bg-card transition hidden lg:block">
            <Menu size={18} className="text-text-secondary" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Year selector */}
          {showYearSelector && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Tahun:</span>
              <select
                value={activeTahun}
                onChange={(e) => setActiveTahun(Number(e.target.value))}
                className="select-dropdown"
              >
                {activeTahunList.map(t => (
                  <option key={t.tahun} value={t.tahun}>
                    {t.tahun} {t.status === 'ACTIVE' ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search */}
          {showSearch && (
            <div className="relative hidden md:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cari..."
                className="search-input w-40"
              />
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={toggleNotifications}
              className={`relative p-2 rounded-lg transition hover:bg-bg-card ${showNotifications ? 'bg-indigo-50 text-indigo-600' : 'text-text-secondary'}`}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotifications && (
              <>
                {/* Click-outside backdrop overlay */}
                <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
                
                <div 
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200/80 shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                  style={{ right: 0 }}
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-indigo-500" />
                      Notifikasi Terbaru
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-indigo-600 hover:text-indigo-850 select-none">
                      <input
                        type="checkbox"
                        checked={allRead}
                        onChange={(e) => {
                          if (e.target.checked) {
                            markAllAsRead();
                          } else {
                            markAllAsUnread();
                          }
                        }}
                        className="h-3 w-3 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span>Semua Dibaca</span>
                    </label>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Tidak ada notifikasi baru
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            // Mark as read
                            markAsRead(n.id);
                            // Close dropdown
                            setShowNotifications(false);
                            // Navigate
                            router.push(n.link);
                          }}
                          className={`p-3.5 flex gap-3 cursor-pointer transition-colors ${n.unread ? 'bg-indigo-50/40 hover:bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {n.type === 'success' && <div className="p-1 rounded-md bg-emerald-100 text-emerald-600"><CheckCheck size={14} /></div>}
                            {n.type === 'info' && <div className="p-1 rounded-md bg-blue-100 text-blue-600"><Info size={14} /></div>}
                            {n.type === 'warning' && <div className="p-1 rounded-md bg-amber-100 text-amber-600"><AlertTriangle size={14} /></div>}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-relaxed ${n.unread ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                              {n.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                              {n.time}
                            </span>
                          </div>

                          {n.unread && (
                            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-600" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  
                  <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold">Sistem Transparansi Pendidikan v1.0</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
