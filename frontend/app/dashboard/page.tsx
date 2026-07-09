'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, Briefcase, Globe, FileSpreadsheet, AppWindow, 
  Shield, Users, Layers, LayoutDashboard, Settings, LogOut, 
  Play, User, Plus, Trash2, Edit2, ShieldAlert, Check, X, 
  RefreshCw, Activity, Database, Clock, ChevronRight, Moon, Sun, Monitor, Loader2
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
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Modal/Overlay state
  const [modalType, setModalType] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Forms inputs
  const [companyForm, setCompanyForm] = useState({ name: '', slug: '', storageLimit: '10737418240' });
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

  const fetchDashboardData = async (authToken: string, currentUser: any) => {
    setLoadingData(true);
    try {
      const headers = { 'Authorization': `Bearer ${authToken}` };

      // 1. Fetch allowed applications
      const appsRes = await fetch('http://localhost:5000/api/apps', { headers });
      const appsData = await appsRes.json();
      if (appsRes.ok) setAllowedApps(appsData);

      // 2. Fetch recent session logs
      const sessionsRes = await fetch('http://localhost:5000/api/sessions', { headers });
      const sessionsData = await sessionsRes.json();
      if (sessionsRes.ok) setRecentSessions(sessionsData);

      // 3. Fetch admin-level information if allowed
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



  // Sign out handler
  const handleSignOut = () => {
    localStorage.removeItem('chanakya_token');
    localStorage.removeItem('chanakya_user');
    router.push('/login');
  };

  // Launch App Handler
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
      
      setActiveSessionId(data.sessionId);
      setActiveApp(app);
      setActiveView('workspace');
    } catch (error: any) {
      alert(error.message || 'Server error launching application.');
    }
  };

  // Disconnect App Handler
  const handleDisconnectApp = async () => {
    if (!activeSessionId) {
      setActiveApp(null);
      setActiveView('home');
      return;
    }

    try {
      await fetch('http://localhost:5000/api/sessions/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: activeSessionId })
      });
      
      // Refresh session history logs
      const sessionsRes = await fetch('http://localhost:5000/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sessionsData = await sessionsRes.json();
      if (sessionsRes.ok) setRecentSessions(sessionsData);
    } catch (error) {
      console.error('Error terminating session:', error);
    } finally {
      setActiveSessionId(null);
      setActiveApp(null);
      setActiveView('home');
    }
  };

  // Admin CRUD Forms Submit handlers
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
        setCompanyForm({ name: '', slug: '', storageLimit: '10737418240' });
        // Refresh company records
        const companiesRes = await fetch('http://localhost:5000/api/companies', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const companiesData = await companiesRes.json();
        if (companiesRes.ok) setCompanies(companiesData);
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
        // Refresh users record
        const usersRes = await fetch('http://localhost:5000/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        if (usersRes.ok) setUsersList(usersData);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create user');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedConfig = {};
      try {
        parsedConfig = JSON.parse(appForm.guacamoleConfig);
      } catch (err) {
        alert('Invalid JSON config format.');
        return;
      }

      const response = await fetch('http://localhost:5000/api/apps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...appForm,
          guacamoleConfig: parsedConfig
        })
      });
      if (response.ok) {
        setModalType(null);
        setAppForm({ name: '', icon: 'AppWindow', description: '', executable: '', guacamoleConnectionId: '', guacamoleConfig: '{}', status: 'ACTIVE' });
        // Refresh apps list
        const appsRes = await fetch('http://localhost:5000/api/apps', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const appsData = await appsRes.json();
        if (appsRes.ok) {
          setGlobalApps(appsData);
          setAllowedApps(appsData);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to create application');
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
        body: JSON.stringify(passwordResetForm)
      });
      if (response.ok) {
        setModalType(null);
        setPasswordResetForm({ newPassword: '' });
        alert('User password has been reset successfully.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleAssignApplicationsSubmit = async (e: React.FormEvent) => {
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
        // Refresh users list
        const usersRes = await fetch('http://localhost:5000/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const usersData = await usersRes.json();
        if (usersRes.ok) setUsersList(usersData);
        alert('User application access rights updated.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to assign applications');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUsersList(usersList.filter(u => u.id !== userId));
      }
    } catch (error) {
      console.error(error);
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
      </div>
    );
  }

  const isSystemAdmin = user.role === 'SUPER_ADMIN';
  const isCompanyAdmin = user.role === 'COMPANY_ADMIN';
  const isAnyAdmin = isSystemAdmin || isCompanyAdmin;

  return (
    <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark font-sans select-none">
      
      {/* 1. SIDEBAR (ALWAYS ON THE LEFT) */}
      <aside className="w-[260px] bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="relative w-40 h-10 flex items-center">
            <Image
              src="/chanakya-logo.png"
              alt="Chanakya Logo"
              fill
              priority
              className="object-contain dark:brightness-100 brightness-110"
            />
          </div>

        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          
          {/* Main Action Links */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted-light dark:text-text-muted-dark px-2.5 mb-2">
              Workspace Overview
            </div>
            
            <button 
              onClick={() => setActiveView('home')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeView === 'home' ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10' : 'text-text-muted-light dark:text-text-muted-dark hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard View</span>
            </button>

            {isAnyAdmin && (
              <button 
                onClick={() => setActiveView('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition ${activeView === 'admin' ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/10' : 'text-text-muted-light dark:text-text-muted-dark hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-900'}`}
              >
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </button>
            )}
          </div>

          {/* Applications list shortcut */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold tracking-widest text-text-muted-light dark:text-text-muted-dark px-2.5 mb-2">
              My Virtual Applications
            </div>
            {loadingData ? (
              <div className="px-3 text-xs text-text-muted-light dark:text-text-muted-dark flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading list...
              </div>
            ) : allowedApps.length === 0 ? (
              <div className="px-3 text-xs text-text-muted-light dark:text-text-muted-dark italic">
                No apps assigned.
              </div>
            ) : (
              <div className="space-y-1">
                {allowedApps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => router.push('/workspace/' + app.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition text-left group ${activeApp?.id === app.id ? 'bg-slate-200 dark:bg-slate-900 text-brand-blue font-bold' : 'text-text-muted-light dark:text-text-muted-dark hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-foreground'}`}
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

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue font-bold text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate text-foreground">{user.name}</div>
              <div className="text-[10px] font-semibold text-brand-orange mt-0.5 tracking-wider uppercase">
                {user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role === 'COMPANY_ADMIN' ? 'Company Admin' : 'User'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => setActiveView('settings')}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-900 text-[10px] font-semibold text-text-muted-light dark:text-text-muted-dark transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
            <button 
              onClick={handleSignOut}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-[10px] font-bold text-rose-500 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT CONTAINER */}
      <main className="flex-1 h-full overflow-y-auto flex flex-col relative z-10 bg-background-light dark:bg-background-dark">
        <div className="p-6 md:p-8 flex-1 flex flex-col max-w-7xl mx-auto w-full">
          
          <AnimatePresence mode="wait">
            
            {/* VIEW: HOME DASHBOARD */}
            {activeView === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 flex-1 flex flex-col"
              >
                {/* Welcome Tenant Header Banner */}
                <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="absolute top-[-10%] right-[-10%] w-[200px] h-[200px] rounded-full bg-brand-blue/10 dark:bg-brand-blue/5 blur-[50px] pointer-events-none" />
                  <div>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                      Welcome back, {user.name} 👋
                    </h1>
                    <p className="text-sm mt-1.5 text-text-muted-light dark:text-text-muted-dark max-w-xl leading-relaxed">
                      You are connected to the <strong className="text-foreground">{user.company?.name || 'Global Cloud Admin'}</strong> secure application gateway. Launch any virtualized workspace application below.
                    </p>
                  </div>
                  <div className="shrink-0 flex flex-col text-xs font-semibold p-3.5 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 min-w-[200px]">
                    <div className="text-[10px] text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">WORKSPACE METADATA</div>
                    <div className="flex justify-between items-center mt-2.5">
                      <span>Status:</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/10">Active</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span>Gateway Domain:</span>
                      <span className="text-slate-400 font-mono select-all">{user.company?.slug || 'global'}.chanakya.cloud</span>
                    </div>
                  </div>
                </div>

                {/* SaaS Metrics Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  
                  {/* Metric 1 */}
                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue">
                      <Monitor className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted-light dark:text-text-muted-dark uppercase font-bold tracking-wider">Active Apps</div>
                      <div className="text-xl font-bold mt-0.5 text-foreground">{allowedApps.length} Assigned</div>
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-brand-orange/10 dark:bg-brand-orange/20 text-brand-orange">
                      <Activity className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted-light dark:text-text-muted-dark uppercase font-bold tracking-wider">Server Telemetry</div>
                      <div className="text-xl font-bold mt-0.5 text-foreground">99.98% SLA</div>
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="glass-panel p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-500">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted-light dark:text-text-muted-dark uppercase font-bold tracking-wider">Active Users</div>
                      <div className="text-xl font-bold mt-0.5 text-foreground">1 Session</div>
                    </div>
                  </div>

                  {/* Metric 4 (Storage Progress Bar) */}
                  <div className="glass-panel p-4 rounded-xl flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider">
                      <span>Cloud Storage Used</span>
                      <span className="text-foreground">4.2 GB of 10 GB</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-300 dark:border-slate-700">
                      <div className="bg-brand-blue h-2 rounded-full w-[42%] transition-all duration-500" />
                    </div>
                  </div>

                </div>

                {/* Section header: Application Grid */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                      <Layers className="w-4.5 h-4.5 text-brand-blue" />
                      <span>Available Workspace Applications</span>
                    </h2>
                    <span className="text-xs text-text-muted-light dark:text-text-muted-dark">Click launch to connect in stealth iframe.</span>
                  </div>

                  {loadingData ? (
                    <div className="py-12 flex flex-col items-center justify-center text-text-muted-light dark:text-text-muted-dark">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-blue mb-3" />
                      <span className="text-sm font-semibold">Querying virtual cluster profiles...</span>
                    </div>
                  ) : allowedApps.length === 0 ? (
                    <div className="glass-panel p-10 rounded-xl text-center space-y-3">
                      <ShieldAlert className="w-10 h-10 text-brand-orange mx-auto" />
                      <h3 className="text-sm font-bold text-foreground">No Applications Assigned</h3>
                      <p className="text-xs text-text-muted-light dark:text-text-muted-dark max-w-sm mx-auto">
                        Your account hasn&apos;t been assigned any applications. Please contact your company admin to provision access key credentials.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {allowedApps.map((app) => (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          key={app.id}
                          className="glass-panel p-5 rounded-xl flex flex-col justify-between group transition hover:border-brand-blue/30 dark:hover:border-brand-blue/40 cursor-pointer"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:bg-brand-blue/5 group-hover:border-brand-blue/20 transition">
                                {getAppIcon(app.icon)}
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">Active</span>
                            </div>
                            <h3 className="text-sm font-black text-foreground mt-4 group-hover:text-brand-blue transition">{app.name}</h3>
                            <p className="text-xs mt-2 text-text-muted-light dark:text-text-muted-dark leading-relaxed">
                              {app.description || 'No description available for this application profile.'}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => router.push('/workspace/' + app.id)}
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
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                      <Clock className="w-4.5 h-4.5 text-brand-blue" />
                      <span>Recent Access Sessions</span>
                    </h2>
                  </div>

                  <div className="glass-panel rounded-xl overflow-hidden">
                    {loadingData ? (
                      <div className="py-8 text-center text-xs text-text-muted-light dark:text-text-muted-dark">
                        Loading access logs...
                      </div>
                    ) : recentSessions.length === 0 ? (
                      <div className="p-8 text-center text-xs text-text-muted-light dark:text-text-muted-dark italic">
                        No recent active logs.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-text-muted-light dark:text-text-muted-dark font-bold border-b border-slate-200 dark:border-slate-800">
                              <th className="p-3.5">User</th>
                              <th className="p-3.5">Application</th>
                              <th className="p-3.5">Connection Time</th>
                              <th className="p-3.5">End Time</th>
                              <th className="p-3.5">Session Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentSessions.map((sess) => (
                              <tr key={sess.id} className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/30 dark:hover:bg-slate-900/30">
                                <td className="p-3.5 font-semibold text-foreground">{sess.user?.name || 'Local System'}</td>
                                <td className="p-3.5">{sess.applicationName}</td>
                                <td className="p-3.5 font-mono">{new Date(sess.launchedAt).toLocaleString()}</td>
                                <td className="p-3.5 font-mono">{sess.endedAt ? new Date(sess.endedAt).toLocaleString() : '-'}</td>
                                <td className="p-3.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sess.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/10 animate-pulse' : 'bg-slate-500/10 text-text-muted dark:text-text-muted border border-slate-500/10'}`}>
                                    {sess.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}



            {/* VIEW: ADMIN CONSOLE */}
            {activeView === 'admin' && isAnyAdmin && (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 flex-1 flex flex-col"
              >
                
                {/* Admin Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <h1 className="text-xl md:text-2xl font-black text-foreground">Admin Command Console</h1>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">Configure company profiles, invite cloud users, and assign workspace application profiles.</p>
                  </div>
                  
                  {/* Create Buttons dropdown style */}
                  <div className="flex gap-2 shrink-0">
                    {isSystemAdmin && (
                      <button 
                        onClick={() => setModalType('create-company')}
                        className="flex items-center gap-1 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer transition shadow shadow-brand-blue/10"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Company</span>
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        // Preset fields based on admin company
                        setUserForm(prev => ({
                          ...prev,
                          companyId: isCompanyAdmin ? (user.companyId || '') : ''
                        }));
                        setModalType('create-user');
                      }}
                      className="flex items-center gap-1 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-800 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create User</span>
                    </button>
                    {isSystemAdmin && (
                      <button 
                        onClick={() => setModalType('create-app')}
                        className="flex items-center gap-1 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold py-2 px-3.5 rounded-lg cursor-pointer transition shadow"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create App</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub Tab selection panels */}
                <div className="grid grid-cols-1 gap-6">
                  
                  {/* Companies section (Super Admin only) */}
                  {isSystemAdmin && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Layers className="w-4 h-4 text-brand-blue" />
                        <span>Company Workspace Tenants</span>
                      </h2>
                      <div className="glass-panel rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-text-muted-light dark:text-text-muted-dark font-bold border-b border-slate-200 dark:border-slate-800">
                              <th className="p-3">Company</th>
                              <th className="p-3">Slug / Endpoint</th>
                              <th className="p-3">User Count</th>
                              <th className="p-3">Storage Limit</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {companies.map((c) => (
                              <tr key={c.id} className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/20 dark:hover:bg-slate-900/20">
                                <td className="p-3 font-semibold text-foreground">{c.name}</td>
                                <td className="p-3 font-mono">{c.slug}.chanakya.cloud</td>
                                <td className="p-3 font-bold text-brand-blue">{c.userCount || 0} Accounts</td>
                                <td className="p-3">{(Number(c.storageLimit) / (1024*1024*1024)).toFixed(0)} GB</td>
                                <td className="p-3">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {c.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right space-x-2">
                                  <button 
                                    onClick={() => handleToggleCompanyStatus(c)}
                                    className="text-[10px] font-bold border border-slate-200 dark:border-slate-800 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                                  >
                                    Toggle State
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteCompany(c.id)}
                                    className="text-rose-500 hover:text-rose-600 transition"
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

                  {/* Users section */}
                  <div className="space-y-3">
                    <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Users className="w-4 h-4 text-brand-blue" />
                      <span>Workspace User Accounts</span>
                    </h2>
                    <div className="glass-panel rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-text-muted-light dark:text-text-muted-dark font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3">User</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Workspace Tenant</th>
                            <th className="p-3">System Role</th>
                            <th className="p-3">App Assignments</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map((u) => (
                            <tr key={u.id} className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/20 dark:hover:bg-slate-900/20">
                              <td className="p-3 font-semibold text-foreground">{u.name}</td>
                              <td className="p-3 font-mono">{u.email}</td>
                              <td className="p-3">{u.company?.name || 'Global Admin'}</td>
                              <td className="p-3 font-semibold text-brand-orange">{u.role}</td>
                              <td className="p-3 font-bold text-brand-blue">
                                {u.allowedApplications?.length || 0} Apps Assigned
                              </td>
                              <td className="p-3">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                  {u.status}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2 flex items-center justify-end">
                                <button 
                                  onClick={() => handleToggleUserStatus(u)}
                                  className="text-[10px] font-bold border border-slate-200 dark:border-slate-800 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                                >
                                  Toggle Status
                                </button>
                                <button 
                                  onClick={() => openAssignApplicationsModal(u)}
                                  className="text-[10px] font-bold bg-brand-blue/10 text-brand-blue border border-brand-blue/10 px-2 py-1 rounded hover:bg-brand-blue/15 transition"
                                >
                                  Assign Apps
                                </button>
                                <button 
                                  onClick={() => { setSelectedItem(u); setModalType('reset-password'); }}
                                  className="text-[10px] font-bold border border-slate-200 dark:border-slate-800 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                                >
                                  Reset PWD
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="text-rose-500 hover:text-rose-600 transition"
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

                  {/* Application profiles list (Super Admin only view) */}
                  {isSystemAdmin && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-brand-blue" />
                        <span>System Application Catalogue</span>
                      </h2>
                      <div className="glass-panel rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-text-muted-light dark:text-text-muted-dark font-bold border-b border-slate-200 dark:border-slate-800">
                              <th className="p-3">App Profile</th>
                              <th className="p-3">Executable Path</th>
                              <th className="p-3">Guacamole Connection ID</th>
                              <th className="p-3">State</th>
                              <th className="p-3 text-right">Delete</th>
                            </tr>
                          </thead>
                          <tbody>
                            {globalApps.map((a) => (
                              <tr key={a.id} className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100/20 dark:hover:bg-slate-900/20">
                                <td className="p-3 flex items-center gap-2.5">
                                  <span className="shrink-0">{getAppIcon(a.icon)}</span>
                                  <div>
                                    <div className="font-bold text-foreground">{a.name}</div>
                                    <div className="text-[10px] text-text-muted">{a.description}</div>
                                  </div>
                                </td>
                                <td className="p-3 font-mono text-slate-400">{a.executable}</td>
                                <td className="p-3 font-mono">{a.guacamoleConnectionId || 'Simulated Sandbox fallback'}</td>
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
                                    className="text-rose-500 hover:text-rose-600 transition"
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

                </div>
              </motion.div>
            )}

            {/* VIEW: SETTINGS */}
            {activeView === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel p-6 rounded-2xl max-w-xl mx-auto space-y-6"
              >
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2 text-foreground font-bold">
                  <Settings className="w-5 h-5 text-brand-blue" />
                  <span>Workspace Settings</span>
                </div>
                
                <div className="space-y-4">


                  <div className="border-t border-slate-200 dark:border-slate-850 pt-4 space-y-2.5">
                    <h3 className="text-xs font-bold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wider mb-1">RDP streaming profiles</h3>
                    <div className="flex justify-between items-center text-xs">
                      <span>HTML5 Canvas Accelerator:</span>
                      <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">WebGL 2.0 Enabled</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Default Resolution:</span>
                      <span className="text-slate-400 font-semibold">Match Browser Window</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Clipboard Sync:</span>
                      <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10">Bidirectional</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-850">
                  <button 
                    onClick={() => setActiveView('home')}
                    className="bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition shadow"
                  >
                    Close Settings
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </main>

      {/* ==========================================
         MODALS & OVERLAYS (GLASSMUSE STYLE)
         ========================================== */}
      
      <AnimatePresence>
        {modalType && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-[480px] rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6"
            >
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-base font-black text-foreground">
                  {modalType === 'create-company' && 'Create Company Workspace Tenant'}
                  {modalType === 'create-user' && 'Provision User Account'}
                  {modalType === 'create-app' && 'Add Application Catalogue Profile'}
                  {modalType === 'reset-password' && `Reset Password for ${selectedItem?.name}`}
                  {modalType === 'assign-apps' && `Configure App Access for ${selectedItem?.name}`}
                </h3>
                <button 
                  onClick={() => setModalType(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-text-muted hover:text-foreground transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Modal Forms */}
              
              {/* Form 1: Create Company */}
              {modalType === 'create-company' && (
                <form onSubmit={handleCreateCompany} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Company Name</label>
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
                    <label className="text-xs font-bold text-foreground">Unique Slug ID (Vanity domain endpoint)</label>
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
                    <label className="text-xs font-bold text-foreground">Storage Provision Limit (Bytes)</label>
                    <select 
                      value={companyForm.storageLimit}
                      onChange={(e) => setCompanyForm({ ...companyForm, storageLimit: e.target.value })}
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground focus:ring-1"
                    >
                      <option value="5368709120">5 GB (Standard)</option>
                      <option value="10737418240">10 GB (Premium)</option>
                      <option value="21474836480">20 GB (Enterprise)</option>
                      <option value="53687091200">50 GB (Scale)</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition"
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
                    <label className="text-xs font-bold text-foreground">User Display Name</label>
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
                    <label className="text-xs font-bold text-foreground">Email Address (Username)</label>
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
                    <label className="text-xs font-bold text-foreground">Initial Security Password</label>
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
                      <label className="text-xs font-bold text-foreground">System Role</label>
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
                        <label className="text-xs font-bold text-foreground">Assign Company</label>
                        <select 
                          required
                          value={userForm.companyId}
                          onChange={(e) => setUserForm({ ...userForm, companyId: e.target.value })}
                          className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground"
                        >
                          <option value="">Select Tenant...</option>
                          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Create User
                    </button>
                  </div>
                </form>
              )}

              {/* Form 3: Create Application */}
              {modalType === 'create-app' && (
                <form onSubmit={handleCreateApplication} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Application Name</label>
                      <input 
                        type="text" 
                        required 
                        value={appForm.name}
                        onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                        placeholder="Tally Prime" 
                        className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Visual Icon Theme</label>
                      <select 
                        value={appForm.icon}
                        onChange={(e) => setAppForm({ ...appForm, icon: e.target.value })}
                        className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground"
                      >
                        <option value="Calculator">Calculator (Tally Accounting)</option>
                        <option value="Briefcase">Briefcase (Busy Suite)</option>
                        <option value="Globe">Globe (Chrome Webapp)</option>
                        <option value="FileSpreadsheet">FileSpreadsheet (Excel Data)</option>
                        <option value="AppWindow">AppWindow (Standard Executable)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Description</label>
                    <input 
                      type="text" 
                      value={appForm.description}
                      onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                      placeholder="Financial accounting and books auditor." 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Windows Executable Binary Path</label>
                    <input 
                      type="text" 
                      required 
                      value={appForm.executable}
                      onChange={(e) => setAppForm({ ...appForm, executable: e.target.value })}
                      placeholder="C:\Program Files\TallyPrime\tally.exe" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs font-mono text-foreground" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Guacamole Connection ID</label>
                      <input 
                        type="text" 
                        value={appForm.guacamoleConnectionId}
                        onChange={(e) => setAppForm({ ...appForm, guacamoleConnectionId: e.target.value })}
                        placeholder="tally-rdp-c102" 
                        className="glass-input w-full p-2.5 rounded-lg text-xs font-mono text-foreground" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Guacamole Config (JSON)</label>
                      <input 
                        type="text" 
                        value={appForm.guacamoleConfig}
                        onChange={(e) => setAppForm({ ...appForm, guacamoleConfig: e.target.value })}
                        placeholder='{"protocol": "rdp", "port": 3389}' 
                        className="glass-input w-full p-2.5 rounded-lg text-xs font-mono text-foreground" 
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Register App
                    </button>
                  </div>
                </form>
              )}

              {/* Form 4: Reset Password */}
              {modalType === 'reset-password' && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">New Security Password</label>
                    <input 
                      type="password" 
                      required 
                      value={passwordResetForm.newPassword}
                      onChange={(e) => setPasswordResetForm({ newPassword: e.target.value })}
                      placeholder="••••••••" 
                      className="glass-input w-full p-2.5 rounded-lg text-xs text-foreground" 
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Reset Password
                    </button>
                  </div>
                </form>
              )}

              {/* Form 5: Assign Applications */}
              {modalType === 'assign-apps' && (
                <form onSubmit={handleAssignApplicationsSubmit} className="space-y-5">
                  <div className="text-xs text-text-muted mb-2">Check the applications this user is authorized to launch:</div>
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-2">
                    {globalApps.map(app => (
                      <label key={app.id} className="flex items-center justify-between p-2.5 rounded-lg border border-card-border hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer select-none">
                        <div className="flex items-center gap-2.5">
                          {getAppIcon(app.icon)}
                          <div>
                            <div className="text-xs font-bold text-foreground">{app.name}</div>
                            <div className="text-[9px] text-text-muted">{app.executable}</div>
                          </div>
                        </div>
                        <input 
                          type="checkbox"
                          checked={userAppAssignments.includes(app.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserAppAssignments([...userAppAssignments, app.id]);
                            } else {
                              setUserAppAssignments(userAppAssignments.filter(id => id !== app.id));
                            }
                          }}
                          className="h-4.5 w-4.5 text-brand-blue border-card-border rounded focus:ring-brand-blue"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button 
                      type="button" 
                      onClick={() => setModalType(null)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      Save Changes
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
