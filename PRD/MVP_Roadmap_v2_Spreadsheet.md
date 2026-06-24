# MVP Roadmap v2 - Spreadsheet Interface
# Dashboard Institusi

**Project**: Dashboard Institusi - Spreadsheet Interface  
**Timeline**: 8 Weeks (4 Sprints x 2 Weeks)  
**Approach**: Excel-like web application dengan real-time calculation  
**Tech**: Next.js 16 + Supabase/InsForge + Zustand

---

## 🎯 SPRINT 1: Foundation & Dashboard (Week 1-2)

### Week 1: Project Setup & Database

**Day 1-2: Project Initialization**
```bash
# Create Next.js project
npx create-next-app@latest transparansi-anggaran --typescript --tailwind --app
cd transparansi-anggaran

# Install dependencies
npm install drizzle-orm postgres
npm install -D drizzle-kit
npm install @tanstack/react-table react-data-grid
npm install zustand react-hook-form zod
npm install numeral exceljs file-saver
npm install better-auth
npm install recharts lucide-react
npm install @radix-ui/react-dropdown-menu # shadcn/ui deps
```

**Folder Structure**:
```
/app
  /api
    /auth
    /dashboard
    /provinsi
    /kabupaten-kota
    /institusi
    /users
  /dashboard
    /page.tsx (main dashboard)
    /provinsi/page.tsx
    /kabupaten-kota/page.tsx
    /jenjang
      /universitas/page.tsx
      /sma/page.tsx
      /smp/page.tsx
      /sd/page.tsx
      /paud/page.tsx
    /users/page.tsx
  /login/page.tsx
/components
  /ui (shadcn components)
  /spreadsheet
    /SpreadsheetTable.tsx (reusable component)
    /NumberEditor.tsx
    /PercentageCell.tsx
    /TotalRow.tsx
  /shared
    /Sidebar.tsx
    /Header.tsx
/lib
  /db
    /schema.ts (Drizzle schema)
    /migrations
  /auth
  /utils
    /formatters.ts (Rupiah, percentage)
    /calculations.ts
/types
  /index.ts
```

**Tasks**:
- [x] Initialize project dengan structure
- [x] Setup Tailwind + shadcn/ui
- [x] Create .env.example
- [x] Setup ESLint + Prettier

**Deliverable**: Project structure ready

---

**Day 3-4: Database Schema & Seed**

**Schema Definition** (`lib/db/schema.ts`):
```typescript
import { pgTable, uuid, varchar, decimal, integer, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', [
  'SUPER_ADMIN', 'ADMIN', 'VIEWER', 'ADMIN_PROVINSI', 'ADMIN_KABKOTA', 'AUDITOR'
]);

export const jenjangEnum = pgEnum('jenjang', [
  'UNIVERSITAS', 'SMA', 'SMP', 'SD', 'PAUD'
]);

// Tables
export const tahunAnggaran = pgTable('tahun_anggaran', {
  id: uuid('id').primaryKey().defaultRandom(),
  tahun: integer('tahun').notNull().unique(),
  totalAnggaran: decimal('total_anggaran', { precision: 15, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow()
});

export const provinsi = pgTable('provinsi', {
  id: uuid('id').primaryKey().defaultRandom(),
  kodeProvinsi: varchar('kode_provinsi', { length: 10 }).unique(),
  namaProvinsi: varchar('nama_provinsi', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const alokasiProvinsi = pgTable('alokasi_provinsi', {
  id: uuid('id').primaryKey().defaultRandom(),
  tahunAnggaranId: uuid('tahun_anggaran_id').references(() => tahunAnggaran.id),
  provinsiId: uuid('provinsi_id').references(() => provinsi.id),
  nominalAlokasi: decimal('nominal_alokasi', { precision: 15, scale: 2 }).notNull(),
  realisasiTotal: decimal('realisasi_total', { precision: 15, scale: 2 }).default('0'),
  // Computed columns
  selisih: decimal('selisih', { precision: 15, scale: 2 })
    .generatedAlwaysAs(sql`nominal_alokasi - realisasi_total`),
  persentasePenyerapan: decimal('persentase_penyerapan', { precision: 5, scale: 2 })
    .generatedAlwaysAs(sql`
      CASE WHEN nominal_alokasi > 0 
      THEN (realisasi_total / nominal_alokasi) * 100 
      ELSE 0 END
    `),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const kabupatenKota = pgTable('kabupaten_kota', {
  id: uuid('id').primaryKey().defaultRandom(),
  provinsiId: uuid('provinsi_id').references(() => provinsi.id),
  kodeKabupatenKota: varchar('kode_kabupaten_kota', { length: 10 }).unique(),
  namaKabupatenKota: varchar('nama_kabupaten_kota', { length: 255 }).notNull(),
  tipe: varchar('tipe', { length: 20 }), // KABUPATEN or KOTA
  createdAt: timestamp('created_at').defaultNow()
});

export const alokasiKabupatenKota = pgTable('alokasi_kabupaten_kota', {
  id: uuid('id').primaryKey().defaultRandom(),
  alokasiProvinsiId: uuid('alokasi_provinsi_id').references(() => alokasiProvinsi.id),
  kabupatenKotaId: uuid('kabupaten_kota_id').references(() => kabupatenKota.id),
  nominalAlokasi: decimal('nominal_alokasi', { precision: 15, scale: 2 }).notNull(),
  realisasiTotal: decimal('realisasi_total', { precision: 15, scale: 2 }).default('0'),
  selisih: decimal('selisih', { precision: 15, scale: 2 })
    .generatedAlwaysAs(sql`nominal_alokasi - realisasi_total`),
  persentasePenyerapan: decimal('persentase_penyerapan', { precision: 5, scale: 2 })
    .generatedAlwaysAs(sql`
      CASE WHEN nominal_alokasi > 0 
      THEN (realisasi_total / nominal_alokasi) * 100 
      ELSE 0 END
    `),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const institusiPendidikan = pgTable('institusi_pendidikan', {
  id: uuid('id').primaryKey().defaultRandom(),
  npsn: varchar('npsn', { length: 20 }).unique().notNull(),
  namaInstitusi: varchar('nama_institusi', { length: 255 }).notNull(),
  jenjang: jenjangEnum('jenjang').notNull(),
  kabupatenKotaId: uuid('kabupaten_kota_id').references(() => kabupatenKota.id),
  nominalAlokasi: decimal('nominal_alokasi', { precision: 15, scale: 2 }).notNull(),
  realisasiTotal: decimal('realisasi_total', { precision: 15, scale: 2 }).default('0'),
  selisih: decimal('selisih', { precision: 15, scale: 2 })
    .generatedAlwaysAs(sql`nominal_alokasi - realisasi_total`),
  persentasePenyerapan: decimal('persentase_penyerapan', { precision: 5, scale: 2 })
    .generatedAlwaysAs(sql`
      CASE WHEN nominal_alokasi > 0 
      THEN (realisasi_total / nominal_alokasi) * 100 
      ELSE 0 END
    `),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: roleEnum('role').notNull(),
  provinsiId: uuid('provinsi_id').references(() => provinsi.id),
  kabupatenKotaId: uuid('kabupaten_kota_id').references(() => kabupatenKota.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});
```

**Seed Script** (`lib/db/seed.ts`):
```typescript
import { db } from './index';
import { provinsi, tahunAnggaran, users } from './schema';
import bcrypt from 'bcrypt';

// 38 Provinsi Indonesia
const provinsiData = [
  { kodeProvinsi: '11', namaProvinsi: 'Aceh' },
  { kodeProvinsi: '12', namaProvinsi: 'Sumatera Utara' },
  { kodeProvinsi: '13', namaProvinsi: 'Sumatera Barat' },
  // ... 35 provinsi lainnya
  { kodeProvinsi: '94', namaProvinsi: 'Papua Barat' }
];

// Tahun Anggaran
const tahunAnggaranData = [
  { tahun: 2026, totalAnggaran: '769100000000000', status: 'ACTIVE' }
];

// Default Users
const defaultUsers = [
  {
    username: 'superadmin',
    email: 'admin@kemdikbud.go.id',
    passwordHash: await bcrypt.hash('password123', 10),
    role: 'SUPER_ADMIN',
    isActive: true
  },
  {
    username: 'viewer',
    email: 'viewer@kemdikbud.go.id',
    passwordHash: await bcrypt.hash('password123', 10),
    role: 'VIEWER',
    isActive: true
  }
];

// Seed function
export async function seed() {
  console.log('Seeding database...');
  
  // Insert provinsi
  await db.insert(provinsi).values(provinsiData);
  
  // Insert tahun anggaran
  await db.insert(tahunAnggaran).values(tahunAnggaranData);
  
  // Insert users
  await db.insert(users).values(defaultUsers);
  
  console.log('Seeding complete!');
}
```

**Tasks**:
- [x] Create Drizzle schema
- [x] Setup database connection (Railway/local PostgreSQL)
- [x] Run migrations: `npm run db:migrate`
- [x] Run seed script: `npm run db:seed`
- [x] Verify data in database

**Deliverable**: Database fully setup dengan 38 provinsi, 1 tahun anggaran, 2 default users

---

**Day 5: Authentication Setup**

**Auth Setup** (`lib/auth/index.ts`):
```typescript
import { betterAuth } from "better-auth";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});
```

**API Routes**:
- [x] `POST /api/auth/login`
- [x] `POST /api/auth/logout`
- [x] `GET /api/auth/session`

**Login Page** (`app/login/page.tsx`):
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (res.ok) {
      router.push('/dashboard');
    } else {
      alert('Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Transparansi Anggaran Pendidikan
        </h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
```

**Tasks**:
- [x] Setup Better Auth
- [x] Create auth API routes
- [x] Create login page
- [x] Implement protected route middleware
- [x] Test login flow

**Deliverable**: Authentication working, user can login and access dashboard

---

### Week 2: Dashboard Layout & Main Dashboard Page

**Day 6-7: Dashboard Layout**

**Layout Component** (`app/dashboard/layout.tsx`):
```typescript
import Sidebar from '@/components/shared/Sidebar';
import Header from '@/components/shared/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Sidebar Component** (`components/shared/Sidebar.tsx`):
```typescript



  { 
    label: 'Kabupaten/Kota', 
    href: '/dashboard/kabupaten-kota', 
    icon: Building2 
  },
  {
    label: 'Jenjang Pendidikan',
    icon: GraduationCap,
    submenu: [
      { label: 'Universitas', href: '/dashboard/jenjang/universitas' },
      { label: 'SMA', href: '/dashboard/jenjang/sma' },
      { label: 'SMP', href: '/dashboard/jenjang/smp' },
      { label: 'SD', href: '/dashboard/jenjang/sd' },
      { label: 'PAUD', href: '/dashboard/jenjang/paud' },
    ]
  },
  { 
    label: 'User Manager', 
    href: '/dashboard/users', 
    icon: Users 
  },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-blue-900 text-white">
      <div className="p-4">
        <h1 className="text-xl font-bold">
          Transparansi Anggaran
        </h1>
      </div>
      <nav className="mt-6">
        {menuItems.map((item) => (
          <div key={item.label}>
            {item.submenu ? (
              <details className="group">
                <summary className="flex items-center px-4 py-3 cursor-pointer hover:bg-blue-800">
                  <item.icon className="w-5 h-5 mr-3" />
                  <span>{item.label}</span>
                </summary>
                <div className="bg-blue-800">
                  {item.submenu.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      className="block px-12 py-2 hover:bg-blue-700"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              </details>
            ) : (
              <Link
                href={item.href}
                className="flex items-center px-4 py-3 hover:bg-blue-800"
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </Link>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
```

**Tasks**:
- [x] Create dashboard layout with sidebar
- [x] Create sidebar navigation (collapsible submenu untuk Jenjang)
- [x] Create header with user info & logout button
- [x] Style dengan Tailwind

**Deliverable**: Dashboard layout working dengan navigation

---

**Day 8-10: Main Dashboard Page**

**Dashboard Page** (`app/dashboard/page.tsx`):
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatRupiah } from '@/lib/utils/formatters';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [jenjangData, setJenjangData] = useState([]);

  useEffect(() => {
    // Fetch dashboard data
    fetch('/api/dashboard/summary?tahun=2026')
      .then(res => res.json())
      .then(data => {
        setSummary(data.summary);
        setJenjangData(data.jenjangData);
      });
  }, []);

  if (!summary) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Dashboard - Tahun Anggaran 2026
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Nominal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {formatRupiah(summary.totalNominal)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Realisasi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatRupiah(summary.totalRealisasi)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>% Penyerapan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {summary.persentasePenyerapan.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ringkasan Per Jenjang Pendidikan</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Jenjang</th>
                <th className="text-right p-2">Nominal</th>
                <th className="text-right p-2">Realisasi</th>
                <th className="text-right p-2">%</th>
              </tr>
            </thead>
            <tbody>
              {jenjangData.map((row) => (
                <tr key={row.jenjang} className="border-b">
                  <td className="p-2">{row.jenjang}</td>
                  <td className="text-right p-2">{formatRupiah(row.nominal)}</td>
                  <td className="text-right p-2">{formatRupiah(row.realisasi)}</td>
                  <td className="text-right p-2">
                    <span className={
                      row.persentase >= 80 ? 'text-green-600' :
                      row.persentase >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }>
                      {row.persentase.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Nominal vs Realisasi Per Jenjang</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={jenjangData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="jenjang" />
              <YAxis />
              <Tooltip formatter={(value) => formatRupiah(value)} />
              <Legend />
              <Bar dataKey="nominal" fill="#3b82f6" name="Nominal" />
              <Bar dataKey="realisasi" fill="#10b981" name="Realisasi" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
```

**API Endpoint** (`app/api/dashboard/summary/route.ts`):
```typescript
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tahun = searchParams.get('tahun') || '2026';

  // Get summary
  const summary = await db.execute(sql`
    SELECT 
      SUM(nominal_alokasi) as total_nominal,
      SUM(realisasi_total) as total_realisasi,
      (SUM(realisasi_total) / SUM(nominal_alokasi) * 100) as persentase_penyerapan
    FROM alokasi_provinsi ap
    JOIN tahun_anggaran ta ON ap.tahun_anggaran_id = ta.id
    WHERE ta.tahun = ${tahun}
  `);

  // Get per jenjang
  const jenjangData = await db.execute(sql`
    SELECT 
      jenjang,
      SUM(nominal_alokasi) as nominal,
      SUM(realisasi_total) as realisasi,
      (SUM(realisasi_total) / SUM(nominal_alokasi) * 100) as persentase
    FROM institusi_pendidikan
    GROUP BY jenjang
    ORDER BY jenjang
  `);

  return Response.json({
    summary: summary.rows[0],
    jenjangData: jenjangData.rows
  });
}
```

**Tasks**:
- [x] Create dashboard API endpoint
- [x] Create dashboard page with cards & chart
- [x] Implement formatRupiah utility
- [x] Test with real data from database



### Week 3: Provinsi Page (Spreadsheet)

**Day 11-12: react-data-grid Setup**

**Install react-data-grid**:
```bash
npm install react-data-grid
```

**Spreadsheet Component** (`components/spreadsheet/SpreadsheetTable.tsx`):
```typescript
'use client';

import { useState, useMemo } from 'react';
import DataGrid, { Column } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { formatRupiah, formatPercentage } from '@/lib/utils/formatters';

interface Row {
  id: string;
  no: number;
  namaProvinsi: string;
  nominalAlokasi: number;
  realisasiTotal: number;
  selisih: number;
  persentasePenyerapan: number;
}

export default function SpreadsheetTable() {
  const [rows, setRows] = useState<Row[]>([]);

  // Define columns
  const columns: Column<Row>[] = [
    { key: 'no', name: 'No', width: 60, frozen: true },
    { key: 'namaProvinsi', name: 'Nama Provinsi', width: 200, frozen: true },
    {
      key: 'nominalAlokasi',
      name: 'Nominal',
      width: 180,
      editable: true,
      renderCell: ({ row }) => formatRupiah(row.nominalAlokasi),
      renderEditCell: NumberEditor
    },
    {
      key: 'realisasiTotal',
      name: 'Realisasi',
      width: 180,
      editable: true,
      renderCell: ({ row }) => formatRupiah(row.realisasiTotal),
      renderEditCell: NumberEditor
    },
    {
      key: 'selisih',
      name: 'Selisih',
      width: 180,
      renderCell: ({ row }) => formatRupiah(row.selisih)
    },
    {
      key: 'persentasePenyerapan',
      name: '%',
      width: 100,
      renderCell: ({ row }) => (
        <div className={getPercentageColorClass(row.persentasePenyerapan)}>
          {formatPercentage(row.persentasePenyerapan)}
        </div>
      )
    }
  ];

  // Handle cell edit
  const handleRowsChange = async (newRows: Row[], { indexes, column }) => {
    const updatedRow = newRows[indexes[0]];
    
    // Recalculate
    updatedRow.selisih = updatedRow.nominalAlokasi - updatedRow.realisasiTotal;
    updatedRow.persentasePenyerapan = 
      (updatedRow.realisasiTotal / updatedRow.nominalAlokasi) * 100;
    
    // Save to backend
    await updateProvinsi(updatedRow.id, {
      [column.key]: updatedRow[column.key]
    });
    
    setRows(newRows);
  };

  // Calculate TOTAL row
  const totalRow = useMemo(() => ({
    id: 'total',
    no: '',
    namaProvinsi: 'TOTAL',
    nominalAlokasi: rows.reduce((sum, row) => sum + row.nominalAlokasi, 0),
    realisasiTotal: rows.reduce((sum, row) => sum + row.realisasiTotal, 0),
    selisih: rows.reduce((sum, row) => sum + row.selisih, 0),
    persentasePenyerapan: 
      (rows.reduce((sum, row) => sum + row.realisasiTotal, 0) / 
       rows.reduce((sum, row) => sum + row.nominalAlokasi, 0)) * 100
  }), [rows]);

  return (
    <DataGrid
      columns={columns}
      rows={[...rows, totalRow]}
      onRowsChange={handleRowsChange}
      className="rdg-light"
      rowKeyGetter={(row) => row.id}
      rowHeight={40}
    />
  );
}

// Helper functions
function getPercentageColorClass(percentage: number) {
  if (percentage >= 80) return 'bg-green-100 text-green-800 px-2 py-1 rounded';
  if (percentage >= 50) return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded';
  return 'bg-red-100 text-red-800 px-2 py-1 rounded';
}

async function updateProvinsi(id: string, data: any) {
  await fetch(`/api/provinsi/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}
```

**Number Editor** (`components/spreadsheet/NumberEditor.tsx`):
```typescript
import { useState } from 'react';
import { EditorProps } from 'react-data-grid';

export default function NumberEditor({ 
  row, 
  column, 
  onRowChange, 
  onClose 
}: EditorProps<any>) {
  const [value, setValue] = useState(row[column.key]);

  const handleSave = () => {
    onRowChange({ ...row, [column.key]: parseFloat(value) || 0 });
    onClose(true);
  };

  return (
    <input
      type="number"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') onClose(false);
      }}
      autoFocus
      className="w-full h-full px-2 border-0 outline-none"
    />
  );
}
```

**Tasks**:
- [x] Install react-data-grid
- [x] Create SpreadsheetTable component
- [x] Create NumberEditor custom editor
- [x] Implement conditional formatting
- [x] Test inline editing

**Deliverable**: Reusable spreadsheet component dengan editable cells

---

**Day 13-15: Provinsi Page Implementation**

**Provinsi Page** (`app/dashboard/provinsi/page.tsx`):
```typescript
'use client';

import { useEffect, useState } from 'react';
import SpreadsheetTable from '@/components/spreadsheet/SpreadsheetTable';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { exportToExcel } from '@/lib/utils/exporters';

export default function ProvinsiPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/provinsi?tahun=2026');
    const json = await res.json();
    setData(json.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = () => {
    exportToExcel(data, 'Provinsi_2026');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Provinsi - Tahun 2026</h1>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-4">
          <SpreadsheetTable data={data} />
        </div>
      )}
    </div>
  );
}
```

**API Endpoints**:
- `GET /api/provinsi?tahun={tahun}` - Fetch all provinsi
- `PUT /api/provinsi/:id` - Update nominal or realisasi

**Tasks**:
- [x] Create Provinsi page
- [x] Integrate SpreadsheetTable component
- [x] Implement refresh & export buttons
- [x] Create API routes
- [x] Test full CRUD flow

**Deliverable**: Provinsi page functional dengan spreadsheet editing & export

---

### Week 4: Kabupaten/Kota Page

**Day 16-18: Kabupaten/Kota dengan Filter**

**Kabupaten/Kota Page** (`app/dashboard/kabupaten-kota/page.tsx`):
```typescript
'use client';

import { useEffect, useState } from 'react';
import SpreadsheetTable from '@/components/spreadsheet/SpreadsheetTable';
import { Select } from '@/components/ui/select';

export default function KabupatenKotaPage() {
  const [provinsiList, setProvinsiList] = useState([]);
  const [selectedProvinsi, setSelectedProvinsi] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    // Fetch provinsi list for dropdown
    fetch('/api/provinsi').then(res => res.json()).then(setProvinsiList);
  }, []);

  useEffect(() => {
    if (selectedProvinsi) {
      // Fetch kabupaten/kota filtered by provinsi
      fetch(`/api/kabupaten-kota?provinsi_id=${selectedProvinsi}`)
        .then(res => res.json())
        .then(json => setData(json.data));
    }
  }, [selectedProvinsi]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Kabupaten/Kota</h1>

      {/* Filter */}
      <div className="mb-4">
        <label>Filter Provinsi:</label>
        <Select
          value={selectedProvinsi}
          onValueChange={setSelectedProvinsi}
        >
          {provinsiList.map((prov) => (
            <option key={prov.id} value={prov.id}>
              {prov.namaProvinsi}
            </option>
          ))}
        </Select>
      </div>

      {/* Spreadsheet */}
      {selectedProvinsi && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <SpreadsheetTable data={data} />
        </div>
      )}
    </div>
  );
}
```

**Database Trigger** (untuk cascade update):
```sql
-- Trigger untuk update realisasi_total di alokasi_provinsi 
-- ketika alokasi_kabupaten_kota berubah
CREATE OR REPLACE FUNCTION update_provinsi_realisasi()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE alokasi_provinsi
  SET realisasi_total = (
    SELECT COALESCE(SUM(realisasi_total), 0)
    FROM alokasi_kabupaten_kota
    WHERE alokasi_provinsi_id = NEW.alokasi_provinsi_id
  )
  WHERE id = NEW.alokasi_provinsi_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provinsi_realisasi
AFTER INSERT OR UPDATE OF realisasi_total ON alokasi_kabupaten_kota
FOR EACH ROW
EXECUTE FUNCTION update_provinsi_realisasi();
```

**Tasks**:
- [x] Create Kabupaten/Kota page dengan filter provinsi
- [x] Implement cascade dropdown (provinsi → kabkota)
- [x] Create database triggers untuk auto-update parent
- [x] Test cascade update (edit kabkota → auto update provinsi)

**Deliverable**: Kabupaten/Kota page functional dengan filtering & cascade update

---

**Day 19-20: Testing & Bug Fixes**

**Tasks**:
- [x] Manual testing Provinsi & Kabupaten/Kota
- [x] Test inline editing → auto-save
- [x] Test formula calculation (selisih, %)
- [x] Test conditional formatting
- [x] Test cascade update (kabkota → provinsi)
- [x] Fix bugs
- [x] Performance testing dengan large dataset

**Deliverable**: Sprint 2 complete, bug-free

---

### Sprint 2 Deliverables
✅ Provinsi page dengan spreadsheet interface  
✅ Kabupaten/Kota page dengan filter & cascade  
✅ Inline cell editing working  
✅ Conditional formatting (color-coded %)  
✅ Auto-calculation (selisih, %)  
✅ Export to Excel functionality  
✅ Database triggers untuk cascade update  

**Demo**: Show Provinsi spreadsheet → Edit cell → Auto-save → Navigate to Kabkota → Filter by Provinsi → Edit → Watch Provinsi auto-update

---

## 🎯 SPRINT 3: Jenjang Pendidikan (5 Sub-Menus) (Week 5-6)

### Week 5: Shared Institusi Component

**Day 21-23: Reusable Institusi Component**

**Institusi Component** (`components/features/InstitusiTable.tsx`):
```typescript
'use client';

import { useEffect, useState, useMemo } from 'react';
import DataGrid from 'react-data-grid';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download } from 'lucide-react';

interface Props {
  jenjang: 'UNIVERSITAS' | 'SMA' | 'SMP' | 'SD' | 'PAUD';
}

export default function InstitusiTable({ jenjang }: Props) {
  const [data, setData] = useState([]);
  const [provinsiList, setProvinsiList] = useState([]);
  const [kabkotaList, setKabkotaList] = useState([]);
  
  // Filters
  const [selectedProvinsi, setSelectedProvinsi] = useState('');
  const [selectedKabkota, setSelectedKabkota] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 100;

  // Fetch provinsi list
  useEffect(() => {
    fetch('/api/provinsi').then(res => res.json()).then(setProvinsiList);
  }, []);

  // Fetch kabkota when provinsi changes
  useEffect(() => {
    if (selectedProvinsi) {
      fetch(`/api/kabupaten-kota?provinsi_id=${selectedProvinsi}`)
        .then(res => res.json())
        .then(json => setKabkotaList(json.data));
    } else {
      setKabkotaList([]);
    }
    setSelectedKabkota(''); // Reset kabkota when provinsi changes
  }, [selectedProvinsi]);

  // Fetch institusi data
  useEffect(() => {
    const params = new URLSearchParams({
      jenjang,
      page: page.toString(),
      limit: pageSize.toString(),
      ...(selectedProvinsi && { provinsi_id: selectedProvinsi }),
      ...(selectedKabkota && { kabupaten_kota_id: selectedKabkota }),
      ...(searchTerm && { search: searchTerm })
    });

    fetch(`/api/institusi?${params}`)
      .then(res => res.json())
      .then(json => {
        setData(json.data);
        setTotalPages(json.totalPages);
      });
  }, [jenjang, selectedProvinsi, selectedKabkota, searchTerm, page]);

  const columns = [
    { key: 'no', name: 'No', width: 60 },
    { key: 'namaInstitusi', name: `Nama ${jenjang}`, width: 300 },
    { key: 'kabupatenKota', name: 'Kab/Kota', width: 150 },
    { 
      key: 'nominalAlokasi', 
      name: 'Nominal', 
      width: 150,
      editable: true,
      renderCell: ({ row }) => formatRupiah(row.nominalAlokasi)
    },
    { 
      key: 'realisasiTotal', 
      name: 'Realisasi', 
      width: 150,
      editable: true,
      renderCell: ({ row }) => formatRupiah(row.realisasiTotal)
    },
    { 
      key: 'persentasePenyerapan', 
      name: '%', 
      width: 100,
      renderCell: ({ row }) => (
        <div className={getPercentageColorClass(row.persentasePenyerapan)}>
          {formatPercentage(row.persentasePenyerapan)}
        </div>
      )
    },
    { key: 'npsn', name: 'NPSN', width: 120 }
  ];

  return (
    <div>
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Select
          placeholder="Pilih Provinsi"
          value={selectedProvinsi}
          onValueChange={setSelectedProvinsi}
        >
          <option value="">Semua Provinsi</option>
          {provinsiList.map((prov) => (
            <option key={prov.id} value={prov.id}>
              {prov.namaProvinsi}
            </option>
          ))}
        </Select>

        <Select
          placeholder="Pilih Kabupaten/Kota"
          value={selectedKabkota}
          onValueChange={setSelectedKabkota}
          disabled={!selectedProvinsi}
        >
          <option value="">Semua Kabupaten/Kota</option>
          {kabkotaList.map((kab) => (
            <option key={kab.id} value={kab.id}>
              {kab.namaKabupatenKota}
            </option>
          ))}
        </Select>

        <div className="flex gap-2">
          <Input
            placeholder="Cari nama institusi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <DataGrid
          columns={columns}
          rows={data}
          rowKeyGetter={(row) => row.id}
          rowHeight={40}
        />
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center">
        <div>
          Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.length)} 
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2">Page {page} of {totalPages}</span>
          <Button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**Tasks**:
- [x] Create reusable InstitusiTable component
- [x] Implement cascading filters (Provinsi → Kabkota)
- [x] Implement search functionality
- [x] Implement pagination (100 items per page)
- [x] Test with large dataset

**Deliverable**: Reusable InstitusiTable component working

---

**Day 24-25: Create 5 Jenjang Pages**

**Universitas Page** (`app/dashboard/jenjang/universitas/page.tsx`):
```typescript
import InstitusiTable from '@/components/features/InstitusiTable';

export default function UniversitasPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Jenjang: Universitas</h1>
      <InstitusiTable jenjang="UNIVERSITAS" />
    </div>
  );
}
```

**Duplicate untuk 4 jenjang lainnya**:
- `app/dashboard/jenjang/sma/page.tsx` → jenjang="SMA"
- `app/dashboard/jenjang/smp/page.tsx` → jenjang="SMP"
- `app/dashboard/jenjang/sd/page.tsx` → jenjang="SD"
- `app/dashboard/jenjang/paud/page.tsx` → jenjang="PAUD"

**API Endpoint** (`app/api/institusi/route.ts`):
```typescript
import { db } from '@/lib/db';
import { institusiPendidikan } from '@/lib/db/schema';
import { eq, and, like } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jenjang = searchParams.get('jenjang');
  const provinsiId = searchParams.get('provinsi_id');
  const kabupatenKotaId = searchParams.get('kabupaten_kota_id');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');

  let conditions = [eq(institusiPendidikan.jenjang, jenjang)];

  if (kabupatenKotaId) {
    conditions.push(eq(institusiPendidikan.kabupatenKotaId, kabupatenKotaId));
  }

  if (search) {
    conditions.push(like(institusiPendidikan.namaInstitusi, `%${search}%`));
  }

  const data = await db
    .select()
    .from(institusiPendidikan)
    .where(and(...conditions))
    .limit(limit)
    .offset((page - 1) * limit);

  const total = await db
    .select({ count: count() })
    .from(institusiPendidikan)
    .where(and(...conditions));

  return Response.json({
    data,
    totalPages: Math.ceil(total[0].count / limit),
    currentPage: page
  });
}
```

**Tasks**:
- [x] Create 5 jenjang pages (Universitas, SMA, SMP, SD, PAUD)
- [x] Create institusi API endpoint dengan filtering
- [x] Implement pagination on backend
- [x] Test filtering & search
- [x] Test pagination

**Deliverable**: 5 jenjang pages functional

---

### Week 6: Database Triggers & Testing

**Day 26-27: Cascade Update Triggers**

**Trigger untuk update Kabupaten/Kota dari Institusi**:
```sql
CREATE OR REPLACE FUNCTION update_kabkota_realisasi()
RETURNS TRIGGER AS $$
DECLARE
  v_kabkota_id UUID;
  v_alokasi_kabkota_id UUID;
BEGIN
  -- Get kabupaten_kota_id
  SELECT kabupaten_kota_id INTO v_kabkota_id
  FROM institusi_pendidikan
  WHERE id = NEW.id;
  
  -- Get alokasi_kabupaten_kota_id
  SELECT id INTO v_alokasi_kabkota_id
  FROM alokasi_kabupaten_kota akk
  JOIN kabupaten_kota kk ON akk.kabupaten_kota_id = kk.id
  WHERE kk.id = v_kabkota_id
  LIMIT 1;
  
  -- Update realisasi_total
  UPDATE alokasi_kabupaten_kota
  SET realisasi_total = (
    SELECT COALESCE(SUM(realisasi_total), 0)
    FROM institusi_pendidikan
    WHERE kabupaten_kota_id = v_kabkota_id
  )
  WHERE id = v_alokasi_kabkota_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kabkota_realisasi
AFTER INSERT OR UPDATE OF realisasi_total ON institusi_pendidikan
FOR EACH ROW
EXECUTE FUNCTION update_kabkota_realisasi();
```

**Tasks**:
- [x] Create database triggers
- [x] Test cascade: Edit Institusi → Update Kabkota → Update Provinsi
- [x] Test with multiple levels (PAUD → SD → SMP → SMA → Universitas)

**Deliverable**: Cascade update working end-to-end

---

**Day 28-30: Bulk Import & Testing**

**Bulk Import from Excel**:
```typescript
// API endpoint: POST /api/institusi/bulk-import
import { parse } from 'csv-parse/sync';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file');
  
  // Parse Excel/CSV
  const buffer = await file.arrayBuffer();
  const records = parse(Buffer.from(buffer), {
    columns: true,
    skip_empty_lines: true
  });
  
  // Bulk insert
  await db.insert(institusiPendidikan).values(records);
  
  return Response.json({ success: true, count: records.length });
}
```

**Tasks**:
- [x] Create bulk import endpoint
- [x] Create UI untuk upload Excel
- [x] Test bulk import dengan 1000+ records
- [x] Performance testing pagination
- [x] Final testing Sprint 3

**Deliverable**: Bulk import working, Sprint 3 complete

---

### Sprint 3 Deliverables
✅ 5 Jenjang Pendidikan pages (Universitas, SMA, SMP, SD, PAUD)  
✅ Reusable InstitusiTable component  
✅ Cascading filters (Provinsi → Kabkota)  
✅ Search functionality  
✅ Pagination (handle 150,000+ SD)  
✅ Cascade update triggers (Institusi → Kabkota → Provinsi)  
✅ Bulk import from Excel  

**Demo**: Navigate to SD → Filter Provinsi Jawa Barat → Filter Kabkota Bandung → Search "SDN 1" → Edit realisasi → Watch cascade update to Dashboard

---

## 🎯 SPRINT 4: User Management & Final Polish (Week 7-8)

### Week 7: User Management

**Day 31-33: User Manager Page**

**User Manager Page** (`app/dashboard/users/page.tsx`):
```typescript
'use client';

import { useState, useEffect } from 'react';
import DataGrid from 'react-data-grid';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash } from 'lucide-react';
import UserModal from '@/components/features/UserModal';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    const json = await res.json();
    setUsers(json.data);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete user?')) {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  const columns = [
    { key: 'no', name: 'No', width: 60 },
    { key: 'username', name: 'Username', width: 150 },
    { key: 'email', name: 'Email', width: 200 },
    { key: 'role', name: 'Role', width: 150 },
    { 
      key: 'isActive', 
      name: 'Status', 
      width: 100,
      renderCell: ({ row }) => (
        <span className={row.isActive ? 'text-green-600' : 'text-red-600'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      name: 'Actions',
      width: 150,
      renderCell: ({ row }) => (
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              setEditingUser(row);
              setModalOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            onClick={() => handleDelete(row.id)}
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">User Manager</h1>
        <Button onClick={() => {
          setEditingUser(null);
          setModalOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4">
        <DataGrid
          columns={columns}
          rows={users.map((u, i) => ({ ...u, no: i + 1 }))}
          rowKeyGetter={(row) => row.id}
          rowHeight={50}
        />
      </div>

      <UserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        user={editingUser}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
```

**User Modal** (`components/features/UserModal.tsx`):
```typescript
import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function UserModal({ open, onClose, user, onSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'VIEWER',
    isActive: true
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        isActive: user.isActive
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = user ? `/api/users/${user.id}` : '/api/users';
    const method = user ? 'PUT' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">
        {user ? 'Edit User' : 'Add User'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label>Username</label>
          <Input
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
        </div>
        <div className="mb-4">
          <label>Email</label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
        </div>
        <div className="mb-4">
          <label>Password {user && '(leave blank to keep current)'}</label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!user}
          />
        </div>
        <div className="mb-4">
          <label>Role</label>
          <Select
            value={formData.role}
            onValueChange={(val) => setFormData({ ...formData, role: val })}
          >
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="VIEWER">Viewer</option>
            <option value="ADMIN_PROVINSI">Admin Provinsi</option>
            <option value="ADMIN_KABKOTA">Admin Kabkota</option>
            <option value="AUDITOR">Auditor</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit">Save</Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
```

**API Endpoints**:
```typescript
// GET /api/users
export async function GET() {
  const users = await db.select().from(usersTable);
  return Response.json({ data: users });
}

// POST /api/users
export async function POST(request: Request) {
  const body = await request.json();
  const passwordHash = await bcrypt.hash(body.password, 10);
  
  const newUser = await db.insert(usersTable).values({
    ...body,
    passwordHash
  }).returning();
  
  return Response.json(newUser[0]);
}

// PUT /api/users/:id
export async function PUT(request: Request, { params }) {
  const body = await request.json();
  
  if (body.password) {
    body.passwordHash = await bcrypt.hash(body.password, 10);
    delete body.password;
  }
  
  const updated = await db
    .update(usersTable)
    .set(body)
    .where(eq(usersTable.id, params.id))
    .returning();
  
  return Response.json(updated[0]);
}

// DELETE /api/users/:id
export async function DELETE(request: Request, { params }) {
  await db
    .update(usersTable)
    .set({ isActive: false })
    .where(eq(usersTable.id, params.id));
  
  return Response.json({ success: true });
}
```

**Tasks**:
- [x] Create User Manager page
- [x] Create UserModal component (Add/Edit)
- [x] Implement CRUD API endpoints
- [x] Implement password hashing
- [x] Test user creation, edit, delete

**Deliverable**: User Manager functional

---

**Day 34-35: Role-Based Access Control (RBAC)**

**Middleware** (`middleware.ts`):
```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Check permissions
  const path = request.nextUrl.pathname;
  const role = session.user.role;
  
  // VIEWER cannot access /users
  if (path.startsWith('/dashboard/users') && role === 'VIEWER') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Add more permission checks as needed
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*']
};
```

**Tasks**:
- [x] Implement middleware untuk protected routes
- [x] Implement permission checks per role
- [x] Hide menu items based on role (frontend)
- [x] Test RBAC (VIEWER cannot edit, cannot access users)

**Deliverable**: RBAC working

---

### Week 8: Export, Performance, Final Testing

**Day 36-37: Enhanced Export**

**Export Utility** (`lib/utils/exporters.ts`):
```typescript
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportToExcel(data, filename) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');
  
  // Headers
  worksheet.columns = [
    { header: 'No', key: 'no', width: 5 },
    { header: 'Nama', key: 'nama', width: 30 },
    { header: 'Nominal', key: 'nominal', width: 20 },
    { header: 'Realisasi', key: 'realisasi', width: 20 },
    { header: 'Selisih', key: 'selisih', width: 20 },
    { header: '%', key: 'persentase', width: 10 }
  ];
  
  // Data rows dengan formula
  data.forEach((row, index) => {
    const rowIndex = index + 2;
    worksheet.addRow({
      no: index + 1,
      nama: row.nama,
      nominal: row.nominalAlokasi,
      realisasi: row.realisasiTotal
    });
    
    // Formulas
    worksheet.getCell(`E${rowIndex}`).value = { 
      formula: `C${rowIndex}-D${rowIndex}` 
    };
    worksheet.getCell(`F${rowIndex}`).value = { 
      formula: `D${rowIndex}/C${rowIndex}*100` 
    };
  });
  
  // TOTAL row
  const totalRow = data.length + 2;
  worksheet.addRow({ no: '', nama: 'TOTAL' });
  worksheet.getCell(`C${totalRow}`).value = { formula: `SUM(C2:C${totalRow-1})` };
  worksheet.getCell(`D${totalRow}`).value = { formula: `SUM(D2:D${totalRow-1})` };
  worksheet.getCell(`E${totalRow}`).value = { formula: `SUM(E2:E${totalRow-1})` };
  worksheet.getCell(`F${totalRow}`).value = { formula: `D${totalRow}/C${totalRow}*100` };
  
  // Styling
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = { 
    type: 'pattern', 
    pattern: 'solid', 
    fgColor: { argb: 'FF3B82F6' } 
  };
  worksheet.getRow(totalRow).font = { bold: true };
  
  // Number formatting
  ['C', 'D', 'E'].forEach(col => {
    worksheet.getColumn(col).numFmt = '#,##0';
  });
  worksheet.getColumn('F').numFmt = '0.00%';
  
  // Conditional formatting untuk %
  worksheet.addConditionalFormatting({
    ref: `F2:F${totalRow-1}`,
    rules: [
      {
        type: 'cellIs',
        operator: 'greaterThanOrEqual',
        formulae: [80],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF10B981' } } }
      },
      {
        type: 'cellIs',
        operator: 'between',
        formulae: [50, 79.99],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF59E0B' } } }
      },
      {
        type: 'cellIs',
        operator: 'lessThan',
        formulae: [50],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFEF4444' } } }
      }
    ]
  });
  
  // Download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, `${filename}.xlsx`);
}
```

**Tasks**:
- [x] Implement enhanced export dengan formula
- [x] Add conditional formatting to export
- [x] Add export button di semua pages
- [x] Test export dengan large dataset

**Deliverable**: Enhanced export with formulas & formatting

---

**Day 38-39: Performance Optimization**

**Database Indexing**:
```sql
-- Indexes untuk performance
CREATE INDEX idx_alokasi_provinsi_tahun ON alokasi_provinsi(tahun_anggaran_id);
CREATE INDEX idx_alokasi_kabkota_provinsi ON alokasi_kabupaten_kota(alokasi_provinsi_id);
CREATE INDEX idx_institusi_jenjang ON institusi_pendidikan(jenjang);
CREATE INDEX idx_institusi_kabkota ON institusi_pendidikan(kabupaten_kota_id);
CREATE INDEX idx_institusi_nama ON institusi_pendidikan(nama_institusi);
```

**Query Optimization**:
```typescript
// Use proper joins instead of N+1 queries
const data = await db
  .select({
    id: institusiPendidikan.id,
    namaInstitusi: institusiPendidikan.namaInstitusi,
    kabupatenKota: kabupatenKota.namaKabupatenKota,
    provinsi: provinsi.namaProvinsi,
    nominalAlokasi: institusiPendidikan.nominalAlokasi,
    realisasiTotal: institusiPendidikan.realisasiTotal,
    persentasePenyerapan: institusiPendidikan.persentasePenyerapan
  })
  .from(institusiPendidikan)
  .leftJoin(kabupatenKota, eq(institusiPendidikan.kabupatenKotaId, kabupatenKota.id))
  .leftJoin(provinsi, eq(kabupatenKota.provinsiId, provinsi.id))
  .where(eq(institusiPendidikan.jenjang, 'SD'))
  .limit(100);
```

**Tasks**:
- [x] Add database indexes
- [x] Optimize queries (use joins instead of N+1)
- [x] Implement lazy loading untuk large tables
- [x] Test performance dengan 150,000 records

**Deliverable**: Performance optimized (page load < 2s)

---

**Day 40: Documentation & Final Testing**

**Documentation**:
1. **README.md**: Setup instructions
2. **USER_MANUAL.md**: How to use the system
3. **API_DOCS.md**: API endpoints reference
4. **DEPLOYMENT.md**: Deployment guide

**Final Testing Checklist**:
- [x] Login/logout working
- [x] Dashboard showing correct data
- [x] Provinsi spreadsheet editing & export
- [x] Kabupaten/Kota filtering & cascade update
- [x] All 5 jenjang pages working
- [x] Filtering, search, pagination working
- [x] User Manager CRUD working
- [x] RBAC enforced
- [x] Export to Excel with formulas
- [x] Performance acceptable (< 2s page load)
- [x] No critical bugs

**Tasks**:
- [x] Write documentation
- [x] Final testing checklist
- [x] Fix remaining bugs
- [x] Prepare for deployment

**Deliverable**: Production-ready application dengan documentation

---

### Sprint 4 Deliverables
✅ User Manager functional (CRUD)  
✅ Role-based access control (RBAC)  
✅ Enhanced export (Excel dengan formula & conditional formatting)  
✅ Performance optimized (database indexes, query optimization)  
✅ Documentation complete  
✅ Production-ready  

**Final Demo**: Full walkthrough dari login → Dashboard → Provinsi → Kabkota → Jenjang (SD) → Edit data → Watch cascade update → Export → User Manager

---

## 📈 Post-MVP Enhancements (Optional)

### Phase 2: Advanced Features (Future Sprints)

**Sprint 5-6: Advanced Reporting & Analytics**
- Scheduled reports (weekly/monthly email)
- Custom report builder
- Advanced charts (trend analysis, forecasting)
- Dashboard widgets (drag & drop customization)

**Sprint 7-8: Mobile Optimization & PWA**
- Responsive design for mobile/tablet
- Progressive Web App (offline mode)
- Mobile-friendly spreadsheet interface
- Push notifications

**Sprint 9-10: Integration & API**
- Public API for third-party integration
- Webhook system
- Integration with e-procurement systems
- Integration dengan SIPD (Sistem Informasi Pemerintah Daerah)

---

**Document Version**: 2.0  
**Last Updated**: April 13, 2026  
**Status**: ✅ READY FOR DEVELOPMENT
