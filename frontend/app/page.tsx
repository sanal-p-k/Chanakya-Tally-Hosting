'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('chanakya_token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue mx-auto" />
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Loading Workspace Portal...</p>
      </div>
    </div>
  );
}

