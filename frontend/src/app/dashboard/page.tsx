'use client';
import { useState } from 'react';
import { QrCode, Play, Pause, Power, MessageSquare, Zap } from 'lucide-react';

export default function DashboardOverview() {
  const [status, setStatus] = useState('DISCONNECTED'); // CONNECTED, CONNECTING, PAUSED
  const [pairingCode, setPairingCode] = useState('');

  const generateConnection = () => {
    setStatus('CONNECTING');
    // Simulate API call to POST /api/sessions/initiate
    setTimeout(() => setPairingCode('A1B2-C3D4'), 1500);
  };

  return (
    <div className="p-8 h-full">
      <h1 className="text-3xl font-bold mb-2">Welcome back, Acme Corp</h1>
      <p className="text-white/50 mb-8">Manage your WhatsApp bot instance and performance.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Status Card */}
        <div className="glass-panel p-6 lg:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-110" />
          
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Connection Status
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-3 h-3 rounded-full ${status === 'CONNECTED' ? 'bg-accent shadow-[0_0_12px_#10b981]' : status === 'CONNECTING' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-2xl font-bold tracking-wide">{status}</span>
              </div>
              <p className="text-white/50 text-sm">Number: {status === 'CONNECTED' ? '+1 (555) 123-4567' : 'None linked'}</p>
            </div>

            <div className="flex gap-3 z-10">
              {status === 'DISCONNECTED' ? (
                <button 
                  onClick={generateConnection}
                  className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer">
                  <QrCode className="w-5 h-5" />
                  Link WhatsApp
                </button>
              ) : (
                <>
                  <button className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all cursor-pointer">
                    {status === 'PAUSED' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setStatus('DISCONNECTED')} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 p-3 rounded-xl transition-all cursor-pointer">
                    <Power className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Pairing Code UI */}
          {status === 'CONNECTING' && pairingCode && (
            <div className="mt-6 p-4 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
              <div>
                <p className="text-sm text-white/60 mb-1">Enter code in WhatsApp Linked Devices</p>
                <p className="text-2xl font-mono tracking-widest text-primary font-bold">{pairingCode}</p>
              </div>
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Analytics Card */}
        <div className="glass-panel p-6 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4 text-secondary">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-white/60 text-sm font-medium mb-1">Messages Processed</p>
          <h3 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">12,492</h3>
        </div>

      </div>
    </div>
  );
}
