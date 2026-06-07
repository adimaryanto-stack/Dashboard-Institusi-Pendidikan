'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';

export default function ProfilInstitusiPage() {
  const router = useRouter();
  const schoolId = 'inst-sd-0'; // SDN 01 Menteng (matching user login)

  useEffect(() => {
    router.replace(`/dashboard/profil-institusi/${schoolId}`);
  }, [router]);

  return (
    <div className="min-h-screen">
      <Header
        title="Profil Institusi"
        subtitle="Mengalihkan ke profil keuangan institusi..."
        showYearSelector={false}
        showSearch={false}
      />
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-muted font-medium">Mengalihkan ke profil keuangan sekolah...</p>
        </div>
      </div>
    </div>
  );
}
