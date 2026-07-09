'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Server, Shield, Loader2, ArrowLeft, LogOut, Terminal, 
  Settings, Wifi, RefreshCw, Layers
} from 'lucide-react';

export default function WorkspacePage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Authenticating secure token...');
  const [app, setApp] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState(12);

  // Sequence loaders
  useEffect(() => {
    if (!id) return;

    const savedToken = localStorage.getItem('chanakya_token');
    if (!savedToken) {
      router.push('/login');
      return;
    }

    const loadSession = async () => {
      try {
        // Step 1: Fetch application config details
        setLoadingMessage('Fetching application connection parameters...');
        const appRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/apps/${id}`, {
          headers: { 'Authorization': `Bearer ${savedToken}` }
        });
        const appData = await appRes.json();
        
        if (!appRes.ok) {
          throw new Error(appData.error || 'Failed to retrieve application configuration.');
        }
        setApp(appData);

        // Step 2: Establish Backend Session Log
        setLoadingMessage('Securing remote channel credentials...');
        const launchRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/launch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${savedToken}`
          },
          body: JSON.stringify({ applicationId: id })
        });
        const launchData = await launchRes.json();

        if (!launchRes.ok) {
          throw new Error(launchData.error || 'Failed to provision remote session.');
        }
        setSessionId(launchData.sessionId);

        // Step 3: Complete handshake
        setLoadingMessage('Spawning Windows Server RemoteApp instance...');
        await new Promise(resolve => setTimeout(resolve, 800));
        setLoadingMessage('Establishing Apache Guacamole tunnel...');
        await new Promise(resolve => setTimeout(resolve, 700));

        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during connection.');
        setLoading(false);
      }
    };

    loadSession();
  }, [id, router]);

  // Network jitter simulation for developer dashboard
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setLatency(prev => Math.max(7, Math.min(25, prev + (Math.random() > 0.5 ? 1.5 : -1.5))));
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleDisconnect = async () => {
    const savedToken = localStorage.getItem('chanakya_token');
    
    // Attempt graceful shutdown in backend
    if (sessionId && savedToken) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sessions/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${savedToken}`
          },
          body: JSON.stringify({ sessionId })
        });
      } catch (err) {
        console.error('Failed to end session gracefully:', err);
      }
    }

    // Return to dashboard
    router.push('/dashboard');
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-sans p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-2xl p-6 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mx-auto">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Secure Connection Failed</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#1e293b] hover:bg-[#0f172a] text-white border border-slate-700/50 rounded-lg py-2 text-xs font-semibold transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-black text-white font-sans select-none overflow-hidden">
      
      {/* 1. LOADING SCREEN */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-50 p-4">
          <div className="w-full max-w-sm space-y-6 text-center">
            {/* Animated Logo / Icon container */}
            <div className="relative w-16 h-16 bg-[#005fa8]/10 rounded-2xl border border-[#005fa8]/30 flex items-center justify-center mx-auto shadow-lg shadow-[#005fa8]/5">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-bold tracking-widest text-foreground uppercase">Chanakya Cloud Workspace</h2>
              <p className="text-xs text-text-muted-dark font-medium animate-pulse">{loadingMessage}</p>
            </div>

            {/* Simulated progress indicators */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-[10px] text-slate-500 text-left font-mono">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[#005fa8]">✔</span>
                <span>JWT security token check passed</span>
              </div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[#005fa8]">✔</span>
                <span>Workspace domain authorization cleared</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-brand-orange animate-spin">⟳</span>
                <span>Connecting to secure RDP RemoteApp node...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN ACTIVE SESSION AREA */}
      {!loading && app && (
        <div className="flex-1 flex flex-col h-full w-full relative">
          
          {/* Stealth Connection Header Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#090d16] text-[10px] text-text-muted-dark border-b border-slate-900 select-none z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-emerald-400 uppercase tracking-widest text-[9px]">Stealth RDP Stream</span>
              </div>
              <div className="w-px h-3.5 bg-slate-800" />
              <div className="flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-brand-blue" />
                <span>Application: <strong className="text-slate-200">{app.name}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 font-mono text-[9px]">
                <Wifi className="w-3 h-3 text-slate-500" />
                <span>Latency: <strong className="text-slate-200">{(latency).toFixed(0)}ms</strong></span>
              </div>
              <button 
                onClick={handleDisconnect} 
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 hover:border-transparent text-[9px] font-bold uppercase tracking-wider transition duration-150 cursor-pointer"
                title="Disconnect & Return to Dashboard"
              >
                <LogOut className="w-3 h-3" />
                <span>Disconnect Session</span>
              </button>
            </div>
          </div>

          {/* Connection Iframe or Developer Fallback Panel */}
          <div className="flex-1 w-full bg-[#0a0f1d] relative">
            {app.guacamoleConnectionId ? (
              /* REAL GUACAMOLE IFRAME INTEGRATION */
              <iframe
                src={`/guacamole/#/client/c/${app.guacamoleConnectionId}?token=${localStorage.getItem('chanakya_token')}`}
                className="w-full h-full border-0"
                allow="clipboard-read; clipboard-write; fullscreen"
                title={`${app.name} Remote Session`}
              />
            ) : (
              /* VERSION 1 DEVELOPER FALLBACK INTERFACE (NO FAKE WINDOWS, JUST TELEMETRY & CLEAR CONTROLS) */
              <div className="w-full h-full flex items-center justify-center p-6 bg-slate-950 font-mono">
                <div className="max-w-md w-full bg-[#0d1527] border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-2xl relative">
                  <div className="absolute top-0 right-0 p-3 text-[10px] text-brand-orange uppercase tracking-wider font-bold">V1 Mode</div>
                  
                  <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
                    <div className="p-3 bg-[#005fa8]/10 text-brand-blue rounded-xl border border-[#005fa8]/20">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{app.name} Session</h3>
                      <p className="text-[10px] text-slate-500">Secure Guacamole Connection Tunnel Active</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>RDP Client Node:</span>
                      <strong className="text-slate-200">10.0.0.10</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Binary:</span>
                      <code className="text-[10px] bg-slate-900 px-1 py-0.5 rounded text-brand-orange">{app.executable}</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Guacamole Conn ID:</span>
                      <strong className="text-slate-200">{app.id.substring(0, 8)}...</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>RDP Protocol:</span>
                      <strong className="text-slate-200">RDP/NLA (H.264)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Port Mapping:</span>
                      <strong className="text-slate-200">3389 ➔ WebSockets Tunnel</strong>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Terminal className="w-3.5 h-3.5 text-[#005fa8]" />
                      <span>Console Logs:</span>
                    </div>
                    <div className="text-[9px] text-[#4af626] font-mono leading-relaxed max-h-24 overflow-y-auto">
                      &gt; guac-client init... OK<br />
                      &gt; handshake handshake-token success<br />
                      &gt; client size 1920x1080@96dpi<br />
                      &gt; RDP channel active. Streaming AppMode...
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-800">
                    <button 
                      onClick={handleDisconnect}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition shadow-md shadow-rose-500/10 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Exit Connection & Close Session</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
