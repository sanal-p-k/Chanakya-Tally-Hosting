'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, User, Key, Server, FolderOpen, Shield, 
  Monitor, Loader2, RefreshCw, CheckCircle, HelpCircle
} from 'lucide-react';

export default function UserDetails() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const savedToken = localStorage.getItem('chanakya_token');
    if (!savedToken) {
      router.push('/login');
      return;
    }
    setToken(savedToken);
  }, [router]);

  // Query details via React Query
  const { data: userDetails, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve user details');
      return await response.json();
    },
    enabled: !!token && !!id
  });

  // Query global apps to match names
  const { data: globalApps } = useQuery({
    queryKey: ['apps'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5000/api/apps', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return await response.json();
    },
    enabled: !!token
  });

  if (isLoading || !userDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
          <span className="text-xs font-bold">Retrieving user Active Directory sync metrics...</span>
        </div>
      </div>
    );
  }

  // Filter user assigned applications
  const assignedAppsList = globalApps?.filter((app: any) => 
    userDetails.allowedApplications?.includes(app.id)
  ) || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans">
      
      <div className="max-w-3xl mx-auto space-y-6">
        <button 
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-550 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>

        {/* User Card Header */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#005fa8]/10 flex items-center justify-center border border-[#005fa8]/20 shrink-0">
              <User className="w-6 h-6 text-[#005fa8]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-950 tracking-tight">{userDetails.name}</h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{userDetails.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-wider capitalize">
              {userDetails.role?.replace('_', ' ').toLowerCase()}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${userDetails.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-red-500/10 text-red-500 border-red-500/10'}`}>
              {userDetails.status}
            </span>
          </div>
        </div>

        {/* Sync telemetry parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Active Directory Account Mappings */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Key className="w-4 h-4 text-brand-orange" />
              <span>Active Directory Mapping</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-600 font-semibold">
              <div className="flex justify-between">
                <span>Windows Username:</span>
                <code className="text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border border-slate-200">{userDetails.windowsUsername || 'not-assigned'}</code>
              </div>
              <div className="flex justify-between">
                <span>RDP Host Server:</span>
                <span className="text-slate-900">Primary RDP Node (3.110.6.9)</span>
              </div>
              <div className="flex justify-between">
                <span>Provision status:</span>
                <span className="text-emerald-500 font-bold uppercase">{userDetails.provisionStatus || 'PROVISIONED'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Shared Folder Directory Permissions */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <FolderOpen className="w-4 h-4 text-brand-blue" />
              <span>NTFS Storage Allocation</span>
            </h3>
            <div className="space-y-3 text-xs text-slate-600 font-semibold">
              <div className="flex justify-between">
                <span>Storage path:</span>
                <code className="text-slate-800 font-mono text-[10px]">C:\Companies\{userDetails.company?.slug || 'global'}</code>
              </div>
              <div className="flex justify-between">
                <span>NTFS permissions:</span>
                <span className="text-[#005fa8] font-bold">Modify / Read / Write</span>
              </div>
              <div className="flex justify-between">
                <span>Security Group:</span>
                <span className="text-slate-900">Remote Desktop Users</span>
              </div>
            </div>
          </div>

        </div>

        {/* Assigned Apps Catalogue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2">
            <Monitor className="w-4.5 h-4.5 text-[#005fa8]" />
            <span>Assigned Workspace Applications ({assignedAppsList.length})</span>
          </h2>
          {assignedAppsList.length === 0 ? (
            <div className="text-xs text-slate-450 italic py-4 text-center">No applications assigned to this user profile.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignedAppsList.map((app: any) => (
                <div key={app.id} className="p-3.5 border border-slate-200 rounded-xl flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-brand-blue/10 text-brand-blue">
                      <Monitor className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-950">{app.name}</div>
                      <div className="text-[9px] text-slate-450 font-mono mt-0.5">{app.executable.substring(0, 32)}...</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">Mapped</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
