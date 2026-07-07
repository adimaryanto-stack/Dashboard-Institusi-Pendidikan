import { create } from 'zustand';
import { TransaksiGlobal, PaketProject, ProjectPhoto, ProjectExpense, ProjectVendor } from '@/types';
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

  // Paket Project states
  paketProjectList: PaketProject[];
  addPaketProject: (p: PaketProject) => void;
  updatePaketProject: (id: string, data: Partial<PaketProject>) => void;
  removePaketProject: (id: string) => void;
  setPaketProjectList: (list: PaketProject[] | ((prev: PaketProject[]) => PaketProject[])) => void;

  projectPhotos: ProjectPhoto[];
  addProjectPhoto: (photo: ProjectPhoto) => void;
  removeProjectPhoto: (id: string) => void;
  setProjectPhotos: (list: ProjectPhoto[] | ((prev: ProjectPhoto[]) => ProjectPhoto[])) => void;

  projectExpenses: ProjectExpense[];
  addProjectExpense: (expense: ProjectExpense) => void;
  updateProjectExpense: (id: string, data: Partial<ProjectExpense>) => void;
  removeProjectExpense: (id: string) => void;
  setProjectExpenses: (list: ProjectExpense[] | ((prev: ProjectExpense[]) => ProjectExpense[])) => void;

  projectVendors: ProjectVendor[];
  addProjectVendor: (vendor: ProjectVendor) => void;
  updateProjectVendor: (id: string, data: Partial<ProjectVendor>) => void;
  removeProjectVendor: (id: string) => void;
  setProjectVendors: (list: ProjectVendor[] | ((prev: ProjectVendor[]) => ProjectVendor[])) => void;
}

// Seed data
export const SEED_PROJECTS: PaketProject[] = [
  {
    id: 'proj-001',
    nama_paket: 'Produksi Video Profil Sekolah',
    deskripsi: 'Pembuatan video profil SDN 01 Menteng untuk keperluan akreditasi dan promosi penerimaan siswa baru tahun ajaran 2026/2027.',
    tanggal_mulai: '2026-07-01',
    tanggal_selesai: '2026-08-15',
    status: 'berjalan',
    created_by: 'admin.sd01menteng',
    created_at: '2026-07-01T08:00:00Z',
    updated_at: '2026-07-05T10:30:00Z',
  },
  {
    id: 'proj-002',
    nama_paket: 'Event Peringatan HUT RI ke-81',
    deskripsi: 'Penyelenggaraan kegiatan peringatan Hari Kemerdekaan RI meliputi upacara, lomba, dan pentas seni.',
    tanggal_mulai: '2026-08-01',
    tanggal_selesai: '2026-08-20',
    status: 'draft',
    created_by: 'admin.sd01menteng',
    created_at: '2026-07-05T09:00:00Z',
    updated_at: '2026-07-05T09:00:00Z',
  },
];

export const SEED_EXPENSES: ProjectExpense[] = [
  {
    id: 'exp-001',
    project_id: 'proj-001',
    tahap: 'pra_produksi',
    nama_item: 'Sewa Drone DJI Mavic 3',
    jumlah: 2,
    satuan: 'hari',
    harga_satuan: 1500000,
    subtotal: 3000000,
    jenis_pajak: 'ppn',
    persentase_pajak: 11,
    nilai_pajak: 330000,
    total_setelah_pajak: 3330000,
    bukti_file_url: '',
    catatan: 'Untuk aerial shot sekolah',
    created_at: '2026-07-02T10:00:00Z',
  },
  {
    id: 'exp-002',
    project_id: 'proj-001',
    tahap: 'produksi',
    nama_item: 'Jasa Videographer & Editor',
    jumlah: 1,
    satuan: 'paket',
    harga_satuan: 8000000,
    subtotal: 8000000,
    jenis_pajak: 'pph23',
    persentase_pajak: 2,
    nilai_pajak: 160000,
    total_setelah_pajak: 8160000,
    bukti_file_url: '',
    catatan: 'Include editing dan color grading',
    created_at: '2026-07-03T14:00:00Z',
  },
  {
    id: 'exp-003',
    project_id: 'proj-001',
    tahap: 'pasca_produksi',
    nama_item: 'Cetak DVD & Packaging',
    jumlah: 100,
    satuan: 'pcs',
    harga_satuan: 25000,
    subtotal: 2500000,
    jenis_pajak: 'ppn',
    persentase_pajak: 11,
    nilai_pajak: 275000,
    total_setelah_pajak: 2775000,
    bukti_file_url: '',
    catatan: 'Untuk distribusi ke dinas dan orang tua',
    created_at: '2026-07-04T09:00:00Z',
  },
];

export const SEED_VENDORS: ProjectVendor[] = [
  {
    id: 'vnd-001',
    project_id: 'proj-001',
    nama_vendor: 'CV Kreasi Visual Nusantara',
    kontak_vendor: '021-5551234 / kreasi.visual@email.com',
    nama_pic_internal: 'Budi Santoso, S.Pd',
    kontak_pic_internal: '0812-3456-7890',
    nilai_anggaran_kontrak: 15000000,
    jenis_pajak_kontrak: 'ppn',
    persentase_pajak_kontrak: 11,
    nilai_pajak_kontrak: 1650000,
    nilai_kontrak_setelah_pajak: 16650000,
    created_at: '2026-07-01T08:00:00Z',
  },
];

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

  // Paket Project states
  paketProjectList: [],
  addPaketProject: (p) => set((state) => ({ paketProjectList: [p, ...state.paketProjectList] })),
  updatePaketProject: (id, data) => set((state) => ({
    paketProjectList: state.paketProjectList.map(p => p.id === id ? { ...p, ...data, updated_at: new Date().toISOString() } : p)
  })),
  removePaketProject: (id) => set((state) => ({
    paketProjectList: state.paketProjectList.filter(p => p.id !== id)
  })),
  setPaketProjectList: (list) => set((state) => ({
    paketProjectList: typeof list === 'function' ? list(state.paketProjectList) : list
  })),

  // Project Photos
  projectPhotos: [],
  addProjectPhoto: (photo) => set((state) => ({ projectPhotos: [photo, ...state.projectPhotos] })),
  removeProjectPhoto: (id) => set((state) => ({
    projectPhotos: state.projectPhotos.filter(p => p.id !== id)
  })),
  setProjectPhotos: (list) => set((state) => ({
    projectPhotos: typeof list === 'function' ? list(state.projectPhotos) : list
  })),

  // Project Expenses
  projectExpenses: [],
  addProjectExpense: (expense) => set((state) => ({ projectExpenses: [expense, ...state.projectExpenses] })),
  updateProjectExpense: (id, data) => set((state) => ({
    projectExpenses: state.projectExpenses.map(e => e.id === id ? { ...e, ...data } : e)
  })),
  removeProjectExpense: (id) => set((state) => ({
    projectExpenses: state.projectExpenses.filter(e => e.id !== id)
  })),
  setProjectExpenses: (list) => set((state) => ({
    projectExpenses: typeof list === 'function' ? list(state.projectExpenses) : list
  })),

  // Project Vendors
  projectVendors: [],
  addProjectVendor: (vendor) => set((state) => ({ projectVendors: [vendor, ...state.projectVendors] })),
  updateProjectVendor: (id, data) => set((state) => ({
    projectVendors: state.projectVendors.map(v => v.id === id ? { ...v, ...data } : v)
  })),
  removeProjectVendor: (id) => set((state) => ({
    projectVendors: state.projectVendors.filter(v => v.id !== id)
  })),
  setProjectVendors: (list) => set((state) => ({
    projectVendors: typeof list === 'function' ? list(state.projectVendors) : list
  })),
}));

