'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, Briefcase, Globe, FileSpreadsheet, AppWindow, 
  Shield, Users, Layers, LayoutDashboard, Settings, LogOut, 
  Play, User, Plus, Trash2, Edit2, ShieldAlert, Check, X, 
  RefreshCw, Activity, Database, Clock, ChevronRight, Moon, Sun, Monitor, Loader2,
  Server, Terminal, Wifi, Key, Cpu, HardDrive
} from 'lucide-react';

// Mapping helper for App Icons
const getAppIcon = (iconName: string) => {
  switch (iconName) {
    case 'Calculator': return <Calculator className="w-6 h-6 text-brand-orange" />;
    case 'Briefcase': return <Briefcase className="w-6 h-6 text-brand-blue" />;
    case 'Globe': return <Globe className="w-6 h-6 text-amber-500" />;
    case 'FileSpreadsheet': return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
    default: return <AppWindow className="w-6 h-6 text-slate-400" />;
  }
};

export default function Dashboard() {
  const router = useRouter();
  
  // Views
  const [activeView, setActiveView] = useState<'home' | 'workspace' | 'admin' | 'settings'>('home');
  const [activeAdminTab, setActiveAdminTab] = useState<'companies' | 'users' | 'apps' | 'servers' | 'logs'>('companies');
  const [activeApp, setActiveApp] = useState<any>(null);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');

  // Loaded DB data states
  const [allowedApps, setAllowedApps] = useState<any[]>([]);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [globalApps, setGlobalApps] = useState<any[]>([]);
  const [serversList, setServersList] = useState<any[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Settings configs
  const [settings, setSettings] = useState({
    webglAccelerated: true,
    clipboardSync: true,
    audioRedirection: true,
    printerRedirection: false
  });

  // Modal control states
  const [modalType, setModalType] = useState<'create-company' | 'create-user' | 'create-app' | 'assign-apps' | 'reset-password' | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Forms inputs
  const [companyForm, setCompanyForm] = useState({ name: '', slug: '', windowsServerId: '' });
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'USER', companyId: '', allowedApplications: [] as string[] });
  const [appForm, setAppForm] = useState({ name: '', icon: 'AppWindow', description: '', executable: '', guacamoleConnectionId: '', guacamoleConfig: '{}', status: 'ACTIVE' });
  const [passwordResetForm, setPasswordResetForm] = useState({ newPassword: '' });
  const [userAppAssignments, setUserAppAssignments] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Initialize and check credentials
  useEffect(() => {
    const savedToken = localStorage.getItem('chanakya_token');
    const savedUser = localStorage.getItem('chanakya_user');

    if (!savedToken || !savedUser) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);
    setToken(savedToken);

    // Fetch workspace information
    fetchDashboardData(savedToken, parsedUser);
  }, [router]);

  async function fetchDashboardData(authToken: string, currentUser: any) {
    setLoadingData(true);
    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };

      // Get allowed apps
      const appsRes = await fetch('http://localhost:5000/api/apps', { headers });
      const appsData = await appsRes.json();
      if (appsRes.ok) setAllowedApps(appsData);

      // Get recent sessions
      const sessionsRes = await fetch('http://localhost:5000/api/sessions', { headers });
      const sessionsData = await sessionsRes.json();
      if (sessionsRes.ok) setRecentSessions(sessionsData);

      // Get Servers
      const serversRes = await fetch('http://localhost:5000/api/servers', { headers });
      const serversData = await serversRes.json();
      if (serversRes.ok) setServersList(serversData);

      // Get Audit Logs
      const logsRes = await fetch('http://localhost:5000/api/audit-logs', { headers });
      const logsData = await logsRes.json();
      if (logsRes.ok) setAuditLogsList(logsData);

      // Admin specific calls
      if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'COMPANY_ADMIN') {
        const usersRes = await fetch('http://localhost:5000/api/users', { headers });
        const usersData = await usersRes.json();
        if (usersRes.ok) setUsersList(usersData);

        const globalAppsRes = await fetch('http://localhost:5000/api/apps', { headers });
        const globalAppsData = await globalAppsRes.json();
        if (globalAppsRes.ok) setGlobalApps(globalAppsData);
      }

      if (currentUser.role === 'SUPER_ADMIN') {
        const companiesRes = await fetch('http://localhost:5000/api/companies', { headers });
        const companiesData = await companiesRes.json();
        if (companiesRes.ok) setCompanies(companiesData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLaunchApp = async (app: any) => {
    try {
      const response = await fetch('http://localhost:5000/api/sessions/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ applicationId: app.id })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to start session');
      
      // Open direct Guacamole connection client URL in a new window/tab
      if (data.launchUrl) {
        window.open(data.launchUrl, '_blank');
        // Refresh sessions to show the active connection log
        const sessionsRes = await fetch('http://localhost:5000/api/sessions', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const sessionsData = await sessionsRes.json();
        if (sessionsRes.ok) setRecentSessions(sessionsData);
      } else {
        throw new Error('Launch URL not returned by server.');
      }
    } catch (error: any) {
      alert(error.message || 'Server error launching application.');
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(companyForm)
      });
      if (response.ok) {
        setModalType(null);
        setCompanyForm({ name: '', slug: '', windowsServerId: '' });
        // Refresh company records, servers, and logs
        fetchDashboardData(token, user);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create company');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userForm)
      });
      if (response.ok) {
        setModalType(null);
        setUserForm({ name: '', email: '', password: '', role: 'USER', companyId: '', allowedApplications: [] });
        // Refresh user records, servers, and logs
        fetchDashboardData(token, user);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create user');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appForm)
      });
      if (response.ok) {
        setModalType(null);
        setAppForm({ name: '', icon: 'AppWindow', description: '', executable: '', guacamoleConnectionId: '', guacamoleConfig: '{}', status: 'ACTIVE' });
        fetchDashboardData(token, user);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create application profile');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssignApplications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/users/${selectedItem.id}/assign-apps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ applicationIds: userAppAssignments })
      });
      if (response.ok) {
        setModalType(null);
        fetchDashboardData(token, user);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to assign application permissions');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/users/${selectedItem.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: passwordResetForm.newPassword })
      });
      if (response.ok) {
        setModalType(null);
        setPasswordResetForm({ newPassword: '' });
        alert('User Portal security password reset successfully.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Password reset failed');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRebootServer = async (serverId: string) => {
    if (!confirm('Are you sure you want to reboot this Windows Server RDP host? This will terminate all active connection logs.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/servers/${serverId}/reboot`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Server remote power cycle initiated.');
        // Refresh servers and log panel
        const serversRes = await fetch('http://localhost:5000/api/servers', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const serversData = await serversRes.json();
        if (serversRes.ok) setServersList(serversData);

        const logsRes = await fetch('http://localhost:5000/api/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const logsData = await logsRes.json();
        if (logsRes.ok) setAuditLogsList(logsData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePingServer = async (serverId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/servers/${serverId}/ping`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Server Status: ONLINE.\nLatency response: ${data.latency}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAuditLogs = async () => {
    if (!confirm('Are you sure you want to clear all provisioning history?')) return;
    try {
      const res = await fetch('http://localhost:5000/api/audit-logs/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const logsRes = await fetch('http://localhost:5000/api/audit-logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const logsData = await logsRes.json();
        if (logsRes.ok) setAuditLogsList(logsData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company? All associated users will be deleted.')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setCompanies(companies.filter(c => c.id !== companyId));
        fetchDashboardData(token, user);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user mapping?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUsersList(usersList.filter(u => u.id !== userId));
        fetchDashboardData(token, user);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleUserStatus = async (userItem: any) => {
    const newStatus = userItem.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setUsersList(usersList.map(u => u.id === userItem.id ? { ...u, status: newStatus } : u));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleCompanyStatus = async (companyItem: any) => {
    const newStatus = companyItem.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const response = await fetch(`http://localhost:5000/api/companies/${companyItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setCompanies(companies.map(c => c.id === companyItem.id ? { ...c, status: newStatus } : c));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openAssignApplicationsModal = (userItem: any) => {
    setSelectedItem(userItem);
    setUserAppAssignments(userItem.allowedApplications || []);
    setModalType('assign-apps');
  };

  const openResetPasswordModal = (userItem: any) => {
    setSelectedItem(userItem);
    setPasswordResetForm({ newPassword: '' });
    setModalType('reset-password');
  };

  const handleSignOut = () => {
    localStorage.removeItem('chanakya_token');
    localStorage.removeItem('chanakya_user');
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-150 text-slate-700 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  const isSystemAdmin = user.role === 'SUPER_ADMIN';
  const isCompanyAdmin = user.role === 'COMPANY_ADMIN';
  const isAnyAdmin = isSystemAdmin || isCompanyAdmin;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] font-sans select-none">
      
      {/* 1. SIDEBAR */}
      <aside className="w-[260px] bg-slate-50 border-r border-slate-200 flex flex-col z-20 shrink-0">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-40 h-10 flex items-center">
            <Image
              src="/chanakya-logo.png"
              alt="Chanakya Logo"
              fill
              priority
              className="object-contain brightness-110"
            />
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 px-2.5 mb-2">
              Workspace Overview
            </div>
            
            <button 
              onClick={() => setActiveView('home')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition ${activeView === 'home' ? 'bg-[#005fa8] text-white shadow-md shadow-brand-blue/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard View</span>
            </button>

            <button 
              onClick={() => setActiveView('workspace')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition ${activeView === 'workspace' ? 'bg-[#005fa8] text-white shadow-md shadow-brand-blue/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <Server className="w-4 h-4" />
              <span>Workspace Node</span>
            </button>

            <button 
              onClick={() => setActiveView('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition ${activeView === 'settings' ? 'bg-[#005fa8] text-white shadow-md shadow-brand-blue/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <Settings className="w-4 h-4" />
              <span>Connection Profile</span>
            </button>

            {isAnyAdmin && (
              <button 
                onClick={() => setActiveView('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition ${activeView === 'admin' ? 'bg-[#005fa8] text-white shadow-md shadow-brand-blue/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            )}
          </div>

          {/* Quick List applications */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 px-2.5 mb-2">
              My Virtual Applications
            </div>
            {loadingData ? (
              <div className="px-3 text-xs text-slate-400 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-brand-blue" /> Mappings sync...
              </div>
            ) : allowedApps.length === 0 ? (
              <div className="px-3 text-xs text-slate-400 italic">
                No apps assigned.
              </div>
            ) : (
              <div className="space-y-1">
                {allowedApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => handleLaunchApp(app)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-left group text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="shrink-0">{getAppIcon(app.icon)}</span>
                      <span className="truncate">{app.name}</span>
                    </div>
                    <Play className="w-3 h-3 opacity-0 group-hover:opacity-100 text-brand-blue transition" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer User controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
              <User className="w-4 h-4 text-[#005fa8]" />
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-bold text-slate-950 truncate">{user.name}</span>
              <span className="text-[9px] text-slate-400 font-semibold truncate capitalize">{user.role.replace('_', ' ')}</span>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer"
            title="Logout Portal"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE VIEWPORT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Main Scrolling Viewport Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-6xl w-full mx-auto">
          
          <AnimatePresence mode="wait">
            
            {/* VIEW: HOME DASHBOARD */}
            {activeView === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex-1 flex flex-col"
              >
                {/* Banner Profile Welcome Card */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-200 p-6 md:p-8 rounded-2xl shadow-sm relative overflow-hidden">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#005fa8]/10 border border-[#005fa8]/10 text-xs font-bold text-[#005fa8]">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Enterprise Security Active</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">
                      Welcome Back, <span className="text-brand-blue">{user.name}</span>
                    </h1>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                      Chanakya Cloud secures your virtual applications. Select an assigned application to initiate a direct connection session with the RDP gateway.
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col text-xs font-semibold p-3.5 rounded-xl bg-slate-50 border border-slate-200 min-w-[220px]">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">WORKSPACE METADATA</div>
                    <div className="flex justify-between items-center mt-2.5">
                      <span>Status:</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/10">Active</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span>Gateway Host:</span>
                      <span className="text-slate-600 font-mono select-all">{user.company?.slug || 'global'}.chanakya.cloud</span>
                    </div>
                  </div>
                </div>

                {/* SaaS Metrics Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Metric 1 */}
                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Active Apps</div>
                      <div className="text-xl font-bold mt-0.5 text-slate-900">{allowedApps.length} Assigned</div>
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
                      <Activity className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Server Telemetry</div>
                      <div className="text-xl font-bold mt-0.5 text-slate-900">99.98% SLA</div>
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Active Users</div>
                      <div className="text-xl font-bold mt-0.5 text-slate-900">1 Session</div>
                    </div>
                  </div>

                </div>

                {/* Section header: Application Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h2 className="text-base font-bold text-slate-950 tracking-tight flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-brand-blue" />
                      <span>Available Workspace Applications</span>
                    </h2>
                    <span className="text-xs text-slate-455">Click launch to connect in stealth tab.</span>
                  </div>

                  {loadingData ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-450">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-blue mb-3" />
                      <span className="text-sm font-semibold">Querying virtual cluster profiles...</span>
                    </div>
                  ) : allowedApps.length === 0 ? (
                    <div className="glass-panel p-10 rounded-xl text-center space-y-3">
                      <ShieldAlert className="w-10 h-10 text-brand-orange mx-auto" />
                      <h3 className="text-sm font-bold text-slate-900">No Applications Assigned</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Your account hasn&apos;t been assigned any applications. Please contact your company admin to provision access key credentials.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {allowedApps.map((app) => (
                        <motion.div
                          key={app.id}
                          whileHover={{ y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="glass-panel p-5 rounded-2xl flex flex-col justify-between group cursor-pointer"
                          onClick={() => handleLaunchApp(app)}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 group-hover:bg-brand-blue/5 group-hover:border-brand-blue/20 transition">
                                {getAppIcon(app.icon)}
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#005fa8]/10 text-brand-blue">Active</span>
                            </div>
                            <h3 className="text-sm font-black text-slate-950 mt-4 group-hover:text-brand-blue transition">{app.name}</h3>
                            <p className="text-xs mt-2 text-slate-500 leading-relaxed">
                              {app.description || 'No description available for this application profile.'}
                            </p>
                          </div>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLaunchApp(app); }}
                            className="mt-5 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold transition shadow-sm hover:shadow shadow-brand-blue/10 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Launch Application</span>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Session log table */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h2 className="text-base font-bold text-slate-950 tracking-tight flex items-center gap-2">
                      <Clock className="w-4.5 h-4.5 text-brand-blue" />
                      <span>Recent Access Sessions</span>
                    </h2>
                  </div>

                  <div className="glass-panel rounded-xl overflow-hidden">
                    {loadingData ? (
                      <div className="py-8 text-center text-xs text-slate-455 animate-pulse">
                        Synchronizing session logs...
                      </div>
                    ) : recentSessions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 italic">
                        No recent connection logs mapped.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <th className="p-3">Application</th>
                            <th className="p-3">Connected At</th>
                            <th className="p-3">State</th>
                            <th className="p-3 text-right">Session Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentSessions.map((session) => (
                            <tr key={session.id} className="border-b border-slate-200/50 hover:bg-slate-50/50">
                              <td className="p-3 font-semibold text-slate-950">{session.applicationName}</td>
                              <td className="p-3 text-slate-500">{new Date(session.launchedAt).toLocaleString()}</td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${session.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200/50 text-slate-500'}`}>
                                  {session.status}
                                </span>
                              </td>
                              <td className="p-3 text-right font-mono text-[10px] text-slate-400">c-{session.id.substring(0, 8)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* VIEW: WORKSPACE NODE DETAILS */}
            {activeView === 'workspace' && (
              <motion.div
                key="workspace"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-3xl mx-auto"
              >
                <div className="border-b border-slate-200 pb-3 flex items-center gap-2 text-slate-950 font-bold text-lg">
                  <Server className="w-5 h-5 text-brand-blue" />
                  <span>My Workspace Node</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left block: Host parameters */}
                  <div className="glass-panel p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-105 pb-2">Active Server Allocation</h3>
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Node Name:</span>
                        <strong className="text-slate-900">Primary RDP Node</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Domain Gateway:</span>
                        <code className="text-brand-orange font-bold text-[10px] bg-slate-50 px-1 py-0.5 rounded">{user.company?.slug || 'global'}.chanakya.cloud</code>
                      </div>
                      <div className="flex justify-between">
                        <span>Windows Username:</span>
                        <strong className="text-slate-900">{user.windowsUsername || 'not-assigned'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Provision Status:</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px] border border-emerald-500/10">Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Right block: Host Telemetry metrics */}
                  <div className="glass-panel p-5 rounded-2xl space-y-4">
                    <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-105 pb-2">RDP Host Specs</h3>
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>OS Architecture:</span>
                        <strong className="text-slate-900">Windows Server 2022</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>CPU Allocation:</span>
                        <strong className="text-slate-900">8 vCPU Core</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Allocated Memory:</span>
                        <strong className="text-slate-900">32 GB RAM</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Storage Mapping:</span>
                        <strong className="text-slate-900">500 GB NVMe SSD</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Provisioning verify steps */}
                <div className="glass-panel p-5 rounded-2xl space-y-4">
                  <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider border-b border-slate-105 pb-2 flex items-center justify-between">
                    <span>Stealth Provision Health checks</span>
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 animate-pulse" /> Ping Latency: 12ms
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 font-semibold">
                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Windows Server AD account mapped</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>User workspace home folder created</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Guacamole database mapping active</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>NTFS user security ACLs validated</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW: SETTINGS & RDP CLIENT TUNING */}
            {activeView === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel p-6 rounded-2xl max-w-xl mx-auto space-y-6"
              >
                <div className="border-b border-slate-200 pb-3 flex items-center gap-2 text-slate-950 font-bold text-lg">
                  <Settings className="w-5 h-5 text-brand-blue" />
                  <span>RDP Connection Settings</span>
                </div>
                
                <div className="space-y-4">
                  {/* Graphics WebGL Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Monitor className="w-4 h-4 text-brand-blue" />
                        <span>WebGL 2.0 Acceleration</span>
                      </div>
                      <p className="text-[10px] text-slate-450">Accelerate remote canvas rendering via browser GPU.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.webglAccelerated} 
                      onChange={(e) => setSettings({ ...settings, webglAccelerated: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-blue"
                    />
                  </div>

                  {/* Clipboard Sync Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-brand-blue" />
                        <span>Bi-directional Clipboard Sync</span>
                      </div>
                      <p className="text-[10px] text-slate-450">Synchronize text/copy data between local client and workspace.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.clipboardSync} 
                      onChange={(e) => setSettings({ ...settings, clipboardSync: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-blue"
                    />
                  </div>

                  {/* Audio redirection */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-brand-blue" />
                        <span>RDP Audio Redirection</span>
                      </div>
                      <p className="text-[10px] text-slate-450">Stream Windows system audio directly through HTML5 channels.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.audioRedirection} 
                      onChange={(e) => setSettings({ ...settings, audioRedirection: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-blue"
                    />
                  </div>

                  {/* Printer redirection */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-brand-blue" />
                        <span>Redirect Local Printers</span>
                      </div>
                      <p className="text-[10px] text-slate-450">Pass client system printers directly into your RemoteApp session.</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={settings.printerRedirection} 
                      onChange={(e) => setSettings({ ...settings, printerRedirection: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-blue"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW: ADMIN COMMAND CONSOLE */}
            {activeView === 'admin' && isAnyAdmin && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex-1 flex flex-col"
              >
                
                {/* Admin Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-950">Admin Command Console</h1>
                    <p className="text-xs text-slate-500 mt-1">Configure company profiles, invite cloud users, manage Windows RDP servers, and track provisioning audit logs.</p>
                  </div>
                  
                  {/* Create Buttons based on tab */}
                  <div className="flex gap-2 shrink-0">
                    {isSystemAdmin && activeAdminTab === 'companies' && (
                      <button 
                        onClick={() => {
                          setCompanyForm({ name: '', slug: '', windowsServerId: '' });
                          setModalType('create-company');
                        }}
                        className="flex items-center gap-1 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Workspace</span>
                      </button>
                    )}
                    {activeAdminTab === 'users' && (
                      <button 
                        onClick={() => {
                          setUserForm({ name: '', email: '', password: '', role: 'USER', companyId: isSystemAdmin ? '' : (user.companyId || ''), allowedApplications: [] });
                          setModalType('create-user');
                        }}
                        className="flex items-center gap-1 bg-[#005fa8] hover:bg-[#004c86] text-white text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create User</span>
                      </button>
                    )}
                    {isSystemAdmin && activeAdminTab === 'apps' && (
                      <button 
                        onClick={() => setModalType('create-app')}
                        className="flex items-center gap-1 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create App</span>
                      </button>
                    )}
                    {activeAdminTab === 'logs' && (
                      <button 
                        onClick={handleClearAuditLogs}
                        className="flex items-center gap-1 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear History</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* TAB SELECTORS */}
                <div className="flex gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
                  <button 
                    onClick={() => setActiveAdminTab('companies')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${activeAdminTab === 'companies' ? 'bg-[#005fa8] text-white border-transparent' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent'}`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Companies</span>
                  </button>

                  <button 
                    onClick={() => setActiveAdminTab('users')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${activeAdminTab === 'users' ? 'bg-[#005fa8] text-white border-transparent' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent'}`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Users</span>
                  </button>

                  {isSystemAdmin && (
                    <>
                      <button 
                        onClick={() => setActiveAdminTab('apps')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${activeAdminTab === 'apps' ? 'bg-[#005fa8] text-white border-transparent' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent'}`}
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Apps Catalogue</span>
                      </button>

                      <button 
                        onClick={() => setActiveAdminTab('servers')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${activeAdminTab === 'servers' ? 'bg-[#005fa8] text-white border-transparent' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent'}`}
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>Windows Servers</span>
                      </button>
                    </>
                  )}

                  <button 
                    onClick={() => setActiveAdminTab('logs')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${activeAdminTab === 'logs' ? 'bg-[#005fa8] text-white border-transparent' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border-transparent'}`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Provisioning logs</span>
                  </button>
                </div>

                {/* Sub Tab selection panels */}
                <div className="grid grid-cols-1 gap-6">
                  
                  {/* TAB 1: Companies (Super Admin only) */}
                  {activeAdminTab === 'companies' && isSystemAdmin && (
                    <div className="space-y-3">
                      <div className="glass-panel rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-55 text-slate-500 font-bold border-b border-slate-200">
                              <th className="p-3">Company</th>
                              <th className="p-3">Slug / Endpoint</th>
                              <th className="p-3">RDP Server Host</th>
                              <th className="p-3">User Count</th>
                              <th className="p-3">State</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companies.map((c) => (
                              <tr key={c.id} className="border-b border-slate-200/50 hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-950">
                                  <div 
                                    onClick={() => router.push(`/dashboard/companies/${c.id}`)}
                                    className="hover:underline hover:text-brand-blue cursor-pointer transition"
                                  >
                                    {c.name}
                                  </div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">ID: {c.id.substring(0, 8)}...</div>
                                </td>
                                <td className="p-3 font-mono">{c.slug}.chanakya.cloud</td>
                                <td className="p-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                                    <Server className="w-3 h-3 text-[#005fa8]" />
                                    <span>{serversList.find(s => s.id === c.windowsServerId)?.name || 'Default RDP Server'}</span>
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-brand-blue">{c.userCount || 0} Accounts</td>
                                <td className="p-3">
                                  <div className="flex items-center gap-1">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                      {c.status}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600">
                                      {c.provisionStatus || 'PROVISIONED'}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-right space-x-2">
                                  <button 
                                    onClick={() => handleToggleCompanyStatus(c)}
                                    className="text-[10px] font-bold border border-slate-200 px-2 py-1 rounded hover:bg-slate-100 transition cursor-pointer"
                                  >
                                    Toggle State
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCompany(c.id)}
                                    className="text-rose-500 hover:text-rose-600 transition cursor-pointer"
                                    title="Delete Company"
                                  >
                                    <Trash2 className="w-4 h-4 inline" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Users (Admin & Super Admin) */}
                  {activeAdminTab === 'users' && (
                    <div className="space-y-3">
                      <div className="glass-panel rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-55 text-slate-500 font-bold border-b border-slate-200">
                              <th className="p-3">User Account</th>
                              <th className="p-3">Mapped Windows User</th>
                              <th className="p-3">Role</th>
                              <th className="p-3">Company Workspace</th>
                              <th className="p-3">Assigned Apps</th>
                              <th className="p-3">Provision</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {usersList.map((u) => (
                              <tr key={u.id} className="border-b border-slate-200/50 hover:bg-slate-50/50">
                                <td className="p-3">
                                  <div 
                                    onClick={() => router.push(`/dashboard/users/${u.id}`)}
                                    className="font-semibold text-slate-950 hover:underline hover:text-brand-blue cursor-pointer transition"
                                  >
                                    {u.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                                </td>
                                <td className="p-3">
                                  <code className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono border border-slate-200">{u.windowsUsername || 'not-provisioned'}</code>
                                </td>
                                <td className="p-3 font-semibold capitalize text-slate-600 text-[10px]">
                                  {u.role.toLowerCase().replace('_', ' ')}
                                </td>
                                <td className="p-3 text-slate-500 font-medium">
                                  {u.company?.name || <span className="text-[10px] text-slate-400 italic">Global Super Admin</span>}
                                </td>
                                <td className="p-3 font-bold text-brand-blue">
                                  {u.allowedApplications?.length || 0} applications
                                </td>
                                <td className="p-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${u.provisionStatus === 'PROVISIONED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-600'}`}>
                                    {u.provisionStatus || 'PROVISIONED'}
                                  </span>
                                </td>
                                <td className="p-3 text-right space-x-2.5">
                                  <button
                                    onClick={() => openAssignApplicationsModal(u)}
                                    className="text-[10px] text-[#005fa8] hover:underline font-bold transition cursor-pointer"
                                  >
                                    Assign Apps
                                  </button>
                                  <button
                                    onClick={() => openResetPasswordModal(u)}
                                    className="text-[10px] text-slate-500 hover:text-slate-900 font-bold transition cursor-pointer border border-slate-200 px-2 py-0.5 rounded hover:bg-slate-100"
                                  >
                                    Reset Password
                                  </button>
                                  <button 
                                    onClick={() => handleToggleUserStatus(u)}
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded border transition cursor-pointer ${u.status === 'ACTIVE' ? 'border-amber-200 text-amber-600 hover:bg-amber-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                                  >
                                    {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="text-rose-500 hover:text-rose-600 transition cursor-pointer"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4 inline" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Global applications catalogue (Super Admin only) */}
                  {activeAdminTab === 'apps' && isSystemAdmin && (
                    <div className="space-y-3">
                      <div className="glass-panel rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-55 text-slate-500 font-bold border-b border-slate-200">
                              <th className="p-3">App Profile</th>
                              <th className="p-3">Executable Path</th>
                              <th className="p-3">Guacamole Connection ID</th>
                              <th className="p-3">State</th>
                              <th className="p-3 text-right">Delete</th>
                            </tr>
                          </thead>
                          <tbody>
                            {globalApps.map((a) => (
                              <tr key={a.id} className="border-b border-slate-200/50 hover:bg-slate-50/50">
                                <td className="p-3 flex items-center gap-2.5">
                                  <span className="shrink-0">{getAppIcon(a.icon)}</span>
                                  <div>
                                    <div className="font-bold text-slate-900">{a.name}</div>
                                    <div className="text-[10px] text-slate-450">{a.description}</div>
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-slate-400">{a.executable}</td>
                                <td className="p-3 font-mono">{a.guacamoleConnectionId || '1'}</td>
                                <td className="p-3">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold text-[10px]">
                                    {a.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right">
                                  <button 
                                    onClick={async () => {
                                      if (!confirm('Are you sure you want to delete this application?')) return;
                                      try {
                                        const response = await fetch(`http://localhost:5000/api/apps/${a.id}`, {
                                          method: 'DELETE',
                                          headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        if (response.ok) {
                                          setGlobalApps(globalApps.filter(app => app.id !== a.id));
                                          setAllowedApps(allowedApps.filter(app => app.id !== a.id));
                                        }
                                      } catch (error) {
                                        console.error(error);
                                      }
                                    }}
                                    className="text-rose-500 hover:text-rose-600 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4 inline" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Windows RDP Servers (Super Admin only) */}
                  {activeAdminTab === 'servers' && isSystemAdmin && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {serversList.map((srv) => (
                          <div key={srv.id} className="glass-panel p-5 rounded-2xl space-y-4 relative overflow-hidden">
                            <div className="flex justify-between items-start border-b border-slate-105 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-brand-blue/15 text-brand-blue border border-brand-blue/10">
                                  <Server className="w-5 h-5" />
                                </div>
                                <div>
                                  <h3 className="text-sm font-black text-slate-900">{srv.name}</h3>
                                  <div className="text-[10px] text-slate-400 mt-0.5">{srv.os}</div>
                                </div>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${srv.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10' : 'bg-amber-500/10 text-amber-600 border-amber-500/10 animate-pulse'}`}>
                                {srv.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 font-semibold">
                              <div className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-slate-450" />
                                <span>Health: <strong className="text-slate-900">{srv.health}</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Monitor className="w-3.5 h-3.5 text-slate-455" />
                                <span>Active Apps: <strong className="text-slate-900">{srv.runningApps} Profiles</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-slate-455" />
                                <span>Users connected: <strong className="text-slate-900">{srv.connectedUsers} RDP</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-slate-455" />
                                <span>IP: <strong className="text-slate-900 font-mono">{srv.publicIp}</strong></span>
                              </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center text-[10px] border border-slate-200">
                              <div>
                                <div className="text-slate-400 font-bold">CPU</div>
                                <div className="text-slate-800 font-extrabold mt-0.5 flex items-center justify-center gap-0.5"><Cpu className="w-3 h-3 text-[#005fa8]" />{srv.cpu}</div>
                              </div>
                              <div>
                                <div className="text-slate-400 font-bold">RAM</div>
                                <div className="text-slate-800 font-extrabold mt-0.5">{srv.ram}</div>
                              </div>
                              <div>
                                <div className="text-slate-400 font-bold">NVMe</div>
                                <div className="text-slate-800 font-extrabold mt-0.5 flex items-center justify-center gap-0.5"><HardDrive className="w-3 h-3 text-[#005fa8]" />{srv.storage}</div>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-105">
                              <button 
                                onClick={() => handlePingServer(srv.id)}
                                className="flex items-center gap-1 text-[10px] font-bold border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                              >
                                <Wifi className="w-3.5 h-3.5" />
                                <span>Ping latency</span>
                              </button>
                              <button 
                                onClick={() => handleRebootServer(srv.id)}
                                className="flex items-center gap-1 text-[10px] font-bold border border-amber-200 bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-500 hover:text-white transition cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Reboot Server</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 5: Provisioning Logs Terminal Console */}
                  {activeAdminTab === 'logs' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-slate-500 font-semibold">
                          <Activity className="w-4 h-4 text-brand-orange animate-pulse" />
                          <span>Streaming RDP user/tenant provisioning events (latest 100)</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 shadow-inner">
                        <div className="font-mono text-[10px] leading-relaxed overflow-y-auto max-h-[450px] space-y-1.5 pr-2 select-text">
                          {auditLogsList.length === 0 ? (
                            <div className="text-slate-500 italic py-6 text-center">No syslog events recorded.</div>
                          ) : (
                            auditLogsList.map((log) => (
                              <div key={log.id} className="flex flex-col sm:flex-row gap-2 border-b border-slate-800/40 pb-1.5">
                                <span className="text-slate-550 font-semibold select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                <span className={`font-bold select-none ${log.status === 'SUCCESS' ? 'text-emerald-400' : log.status === 'WARNING' ? 'text-amber-400' : log.status === 'FAILED' ? 'text-red-400' : 'text-sky-400'}`}>
                                  {log.status}
                                </span>
                                <span className="text-slate-400 font-bold select-none">[{log.module}]</span>
                                <span className="text-slate-100 flex-1">{log.message}</span>
                                <span className="text-slate-500 font-bold select-none italic text-[9px] shrink-0">op: {log.operator}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </main>

      {/* 3. POPUP DIALOGS & MODAL FORMS */}
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-filter backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 w-full max-w-[460px] rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-955 uppercase tracking-wider">
                  {modalType === 'create-company' && 'Add Workspace Tenant'}
                  {modalType === 'create-user' && 'Provision User'}
                  {modalType === 'create-app' && 'Add Application Profile'}
                  {modalType === 'assign-apps' && 'Assign Application Permissions'}
                  {modalType === 'reset-password' && 'Reset Security Credentials'}
                </h3>
                <button 
                  onClick={() => setModalType(null)}
                  className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-950 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form 1: Create Company */}
              {modalType === 'create-company' && (
                <form onSubmit={handleCreateCompany} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Company Name</label>
                    <input 
                      type="text" 
                      required 
                      value={companyForm.name}
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      placeholder="Acme International" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground focus:ring-1" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Unique Slug ID (Vanity domain endpoint)</label>
                    <input 
                      type="text" 
                      required 
                      value={companyForm.slug}
                      onChange={(e) => setCompanyForm({ ...companyForm, slug: e.target.value })}
                      placeholder="acme" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs font-mono text-foreground focus:ring-1" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Windows Server Node Host</label>
                    <select 
                      value={companyForm.windowsServerId}
                      onChange={(e) => setCompanyForm({ ...companyForm, windowsServerId: e.target.value })}
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-slate-900 focus:ring-1"
                    >
                      <option value="">-- Auto Assign Default Host --</option>
                      {serversList.map((srv) => (
                        <option key={srv.id} value={srv.id}>{srv.name} ({srv.publicIp})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Add Workspace
                    </button>
                  </div>
                </form>
              )}

              {/* Form 2: Create User */}
              {modalType === 'create-user' && (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">User Display Name</label>
                    <input 
                      type="text" 
                      required 
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="Jane Doe" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Email Address (Username)</label>
                    <input 
                      type="email" 
                      required 
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="jane@company.com" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Initial Security Password</label>
                    <input 
                      type="password" 
                      required 
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="••••••••" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">System Role</label>
                      <select 
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground"
                      >
                        <option value="USER">Standard User</option>
                        <option value="COMPANY_ADMIN">Company Admin</option>
                        {isSystemAdmin && <option value="SUPER_ADMIN">System Super Admin</option>}
                      </select>
                    </div>
                    {isSystemAdmin && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Assign Company</label>
                        <select 
                          required
                          value={userForm.companyId}
                          onChange={(e) => setUserForm({ ...userForm, companyId: e.target.value })}
                          className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground"
                        >
                          <option value="">-- Choose Tenant --</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Provision user
                    </button>
                  </div>
                </form>
              )}

              {/* Form 3: Create App */}
              {modalType === 'create-app' && (
                <form onSubmit={handleCreateApp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Application Name</label>
                    <input 
                      type="text" 
                      required 
                      value={appForm.name}
                      onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                      placeholder="e.g. Tally Prime" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">App Icon representation</label>
                      <select 
                        value={appForm.icon}
                        onChange={(e) => setAppForm({ ...appForm, icon: e.target.value })}
                        className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground"
                      >
                        <option value="Calculator">Accounting Calculator</option>
                        <option value="Briefcase">SaaS Briefcase</option>
                        <option value="Globe">Web Browser Globe</option>
                        <option value="FileSpreadsheet">Excel Spreadsheet</option>
                        <option value="AppWindow">Standard App Window</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Guacamole Connection ID</label>
                      <input 
                        type="text" 
                        value={appForm.guacamoleConnectionId}
                        onChange={(e) => setAppForm({ ...appForm, guacamoleConnectionId: e.target.value })}
                        placeholder="e.g. 1" 
                        className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Target Executable Path</label>
                    <input 
                      type="text" 
                      required 
                      value={appForm.executable}
                      onChange={(e) => setAppForm({ ...appForm, executable: e.target.value })}
                      placeholder="C:\Program Files\TallyPrime\tally.exe" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs font-mono text-foreground" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Short Description</label>
                    <textarea 
                      value={appForm.description}
                      onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                      placeholder="Describe target user profile permissions..." 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground h-16 resize-none" 
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Create App Profile
                    </button>
                  </div>
                </form>
              )}

              {/* Form 4: Assign applications checkbox grid */}
              {modalType === 'assign-apps' && selectedItem && (
                <form onSubmit={handleAssignApplications} className="space-y-4">
                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="text-xs font-bold text-slate-900">{selectedItem.name}</div>
                    <div className="text-[10px] text-slate-505">{selectedItem.email}</div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {globalApps.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">No applications seeded in dashboard.</div>
                    ) : (
                      globalApps.map((app) => {
                        const checked = userAppAssignments.includes(app.id);
                        return (
                          <div key={app.id} className="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              id={`assign-${app.id}`} 
                              checked={checked} 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setUserAppAssignments([...userAppAssignments, app.id]);
                                } else {
                                  setUserAppAssignments(userAppAssignments.filter(id => id !== app.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-brand-blue"
                            />
                            <label htmlFor={`assign-${app.id}`} className="text-xs text-slate-700 cursor-pointer select-none">
                              {app.name} <span className="text-[9px] text-slate-400 font-mono">({app.executable.substring(0, 20)}...)</span>
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-150">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-[#005fa8] hover:bg-[#004c86] text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Save Assignments
                    </button>
                  </div>
                </form>
              )}

              {/* Form 5: Reset user password */}
              {modalType === 'reset-password' && selectedItem && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">New Portal Security Password</label>
                    <input 
                      type="password" 
                      required 
                      value={passwordResetForm.newPassword}
                      onChange={(e) => setPasswordResetForm({ newPassword: e.target.value })}
                      placeholder="••••••••" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-slate-900" 
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Reset Credentials
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
