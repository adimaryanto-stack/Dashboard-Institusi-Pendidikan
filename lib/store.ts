import { create } from 'zustand';
import { TransaksiGlobal } from '@/types';
import { INITIAL_TRANSACTIONS } from './data/transactions';

export interface NotificationItem {
  id: string;
  message: string;
  time: string;
  unread: boolean;
  type: 'info' | 'success' | 'warning';
  link: string;
}

interface DbData {
  tahun_anggaran: any[];
  provinsi: any[];
  alokasi_provinsi: any[];
  kabupaten_kota: any[];
  alokasi_kabupaten_kota: any[];
  institusi_pendidikan: any[];
  sumber_dana_institusi: any[];
  pengeluaran_bulanan_institusi: any[];
  rincian_pengeluaran_item: any[];
  users: any[];
  audit_anomaly: any[];
}

interface AppState {
  activeTahun: number;
  setActiveTahun: (tahun: number) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  
  // Supabase states
  isSupabaseMode: boolean;
  setIsSupabaseMode: (active: boolean) => void;
  dbData: DbData | null;
  setDbData: (data: DbData | null) => void;
  isLoadingDb: boolean;
  setIsLoadingDb: (loading: boolean) => void;

  // Transaction states
  transaksiList: TransaksiGlobal[];
  addTransaksi: (t: TransaksiGlobal) => void;
  setTransaksiList: (list: TransaksiGlobal[] | ((prev: TransaksiGlobal[]) => TransaksiGlobal[])) => void;

  // Rencana states
  rencanaList: TransaksiGlobal[];
  setRencanaList: (list: TransaksiGlobal[] | ((prev: TransaksiGlobal[]) => TransaksiGlobal[])) => void;
  removeRencana: (id: string) => void;

  // Notification states
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'time' | 'unread'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  markAllAsUnread: () => void;
  setNotifications: (list: NotificationItem[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTahun: 2026,
  setActiveTahun: (tahun) => set({ activeTahun: tahun }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  // Supabase initial states
  isSupabaseMode: false,
  setIsSupabaseMode: (active) => set({ isSupabaseMode: active }),
  dbData: null,
  setDbData: (data) => set({ dbData: data }),
  isLoadingDb: false,
  setIsLoadingDb: (loading) => set({ isLoadingDb: loading }),

  // Transaction initial states
  transaksiList: INITIAL_TRANSACTIONS,
  addTransaksi: (t) => set((state) => ({ transaksiList: [t, ...state.transaksiList] })),
  setTransaksiList: (list) => set((state) => ({
    transaksiList: typeof list === 'function' ? list(state.transaksiList) : list
  })),

  // Rencana initial states
  rencanaList: [
    {
      id: 'rab-1',
      tanggal: '15 Sep 2026',
      institusiId: 'inst-sd-0',
      namaInstitusi: 'SDN 01 Menteng',
      jenjang: 'SD',
      kategori: 'Sarana Prasarana',
      item: 'Rencana Pengadaan AC Kelas',
      qty: 5,
      hargaSatuan: 4000000,
      nominal: 20000000,
      strukStatus: 'VALID',
      strukMessage: 'Rencana anggaran telah di-review',
      invoiceNo: 'RAB-AC-001',
      vendorName: 'Toko Elektronik Makmur'
    }
  ],
  setRencanaList: (list) => set((state) => ({
    rencanaList: typeof list === 'function' ? list(state.rencanaList) : list
  })),
  removeRencana: (id) => set((state) => ({
    rencanaList: state.rencanaList.filter((r) => r.id !== id)
  })),

  // Notification initial states
  notifications: [],
  setNotifications: (list) => set({ notifications: list }),
  addNotification: (n) => set((state) => ({
    notifications: [
      {
        ...n,
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        time: 'Baru saja',
        unread: true,
      },
      ...state.notifications
    ]
  })),
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, unread: false } : n)
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, unread: false }))
  })),
  markAllAsUnread: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, unread: true }))
  })),
}));
