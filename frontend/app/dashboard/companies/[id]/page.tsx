'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, Server, Users, Monitor, LayoutDashboard, 
  Database, FolderOpen, HardDrive, Key, Loader2, Play
} from 'lucide-react';
import Image from 'next/image';

export default function CompanyDetails() {
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

  // Fetch company info via React Query
  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      const response = await fetch(`http://localhost:5000/api/companies/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to retrieve company details');
      return await response.json();
    },
    enabled: !!token && !!id
  });

  if (isLoading || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
          <span className="text-xs font-bold">Querying Active Directory attributes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans">
      
      {/* Header bar */}
      <div className="max-w-4xl mx-auto space-y-6">
        <button 
          onClick={() => router.push('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-550 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>

        {/* Company Profile Banner */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-brand-blue" />
              <span>{company.name} Details</span>
            </h1>
            <p className="text-xs text-slate-550 leading-relaxed max-w-lg">
              Authorized vanity gateway endpoint: <code className="text-brand-orange font-bold font-mono">{company.slug}.chanakya.cloud</code>
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 font-bold text-xs">
            <span>Status:</span>
            <span className="uppercase">{company.status}</span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Server and Domain mapping */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-brand-blue" />
              <span>Server node</span>
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600 font-semibold">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>RDP Host Node:</span>
                <span className="text-slate-900">Primary RDP Node</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Domain Slug ID:</span>
                <span className="font-mono text-[10px] text-slate-800 bg-slate-50 px-1 py-0.5 rounded">{company.slug}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>SLA Level:</span>
                <span className="text-brand-blue">99.98% High SLA</span>
              </div>
            </div>
          </div>

          {/* Card 2: Shared Folder parameters */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-brand-blue" />
              <span>Shared Folder</span>
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600 font-semibold">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Windows Path:</span>
                <code className="text-slate-900 font-mono text-[10px]">C:\Companies\{company.slug}</code>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Folder ACL check:</span>
                <span className="text-emerald-500 font-bold">PROVISIONED</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Encryption Sync:</span>
                <span className="text-[#005fa8]">AES Verified</span>
              </div>
            </div>
          </div>

          {/* Card 3: Storage & quotas */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-brand-blue" />
              <span>System resources</span>
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600 font-semibold">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Server memory allocation:</span>
                <span className="text-slate-900">Dynamic allocation</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Access protocol:</span>
                <span className="text-slate-900 font-mono">HTML5 RDP</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span>Active users:</span>
                <span className="text-slate-900">{company.users?.length || 0} Accounts</span>
              </div>
            </div>
          </div>

        </div>

        {/* Mapped Users section */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2">
            <Users className="w-4.5 h-4.5 text-brand-blue" />
            <span>Company User Accounts ({company.users?.length || 0})</span>
          </h2>
          {company.users?.length === 0 ? (
            <div className="text-xs text-slate-450 italic text-center py-4">No portal users provisioned under this company yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="p-3">User</th>
                    <th className="p-3">Email Username</th>
                    <th className="p-3">Portal Role</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {company.users?.map((usr: any) => (
                    <tr key={usr.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{usr.name}</td>
                      <td className="p-3 font-mono text-slate-500">{usr.email}</td>
                      <td className="p-3 text-[10px] uppercase font-bold text-slate-600">{usr.role}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${usr.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {usr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Assigned application profiles */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-2">
            <Monitor className="w-4.5 h-4.5 text-brand-blue" />
            <span>Assigned Workspace Applications ({company.applications?.length || 0})</span>
          </h2>
          {company.applications?.length === 0 ? (
            <div className="text-xs text-slate-450 italic text-center py-4">No applications assigned.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {company.applications?.map((app: any) => (
                <div key={app.id} className="p-3 border border-slate-200 rounded-xl flex items-center gap-3 bg-slate-50/50">
                  <div className="p-2 rounded bg-brand-blue/10 text-brand-blue">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{app.name}</div>
                    <div className="text-[10px] text-slate-450 font-mono mt-0.5 truncate max-w-[280px]">{app.executable}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
