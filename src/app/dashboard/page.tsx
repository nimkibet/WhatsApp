'use client';
import { useState, useEffect } from 'react';
import { QrCode, Play, Pause, Power, MessageSquare, Zap } from 'lucide-react';

export default function DashboardOverview({ tenantId = "tenant_001" }) {
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesProcessed, setMessagesProcessed] = useState(12492);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://whatsapp.seek-on.app';

  // Live counter for messages processed
  useEffect(() => {
    const counterInterval = setInterval(() => {
      if (status === 'connected') {
        setMessagesProcessed(prev => prev + Math.floor(Math.random() * 5) + 1);
      }
    }, 3000);
    return () => clearInterval(counterInterval);
  }, [status]);

  // Poll server state on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${API_BASE}/api/sessions/status/${tenantId}`);
        const data = await res.json();
        if (data) {
          setStatus(data.liveStatus || 'disconnected');
          setQrCode(data.qr || '');
        }
      } catch (err) {
        console.error("Failed to fetch status", err);
      }
    }
    fetchStatus();
    // Setting up a polling interval every 5 seconds to catch live pairing updates
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [tenantId, API_BASE]);

  // Trigger Baileys generation loop
  const handleLinkWhatsApp = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/sessions/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      // the polling interval will catch the state update
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleStopSession = async () => {
    try {
      await fetch(`${API_BASE}/api/sessions/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      setStatus('disconnected');
    } catch (err) {
      console.error(err);
    }
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
                <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-accent shadow-[0_0_12px_#10b981]' : status === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-2xl font-bold tracking-wide capitalize">{status}</span>
              </div>
              <p className="text-white/50 text-sm">Number: {status === 'connected' ? '+1 (555) 123-4567' : 'None linked'}</p>
            </div>

            <div className="flex gap-3 z-10">
              {status === 'disconnected' ? (
                <button 
                  onClick={handleLinkWhatsApp}
                  disabled={loading}
                  className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-white/90 transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer disabled:opacity-50">
                  <QrCode className="w-5 h-5" />
                  {loading ? 'Initializing...' : 'Link WhatsApp'}
                </button>
              ) : (
                <>
                  <button className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all cursor-pointer">
                    {status === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                  </button>
                  <button onClick={handleStopSession} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 p-3 rounded-xl transition-all cursor-pointer">
                    <Power className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* QR Code UI */}
          {status === 'connecting' && qrCode && (
            <div className="mt-6 p-4 bg-black/40 rounded-xl border border-white/5 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-4">
              <p className="text-sm text-white/60 mb-4">Scan the QR code in WhatsApp Linked Devices</p>
              <div className="bg-white p-4 rounded-xl shadow-lg">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`} 
                  alt="WhatsApp QR Code" 
                  className="w-48 h-48 object-contain"
                />
              </div>
              <div className="mt-4 flex items-center gap-2 text-primary">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Awaiting scan...</span>
              </div>
            </div>
          )}
        </div>

        {/* Analytics Card */}
        <div className="glass-panel p-6 flex flex-col justify-center">
          <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4 text-secondary">
            <MessageSquare className="w-6 h-6" />
          </div>
          <p className="text-white/60 text-sm font-medium mb-1">Messages Processed</p>
          <h3 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
            {messagesProcessed.toLocaleString()}
          </h3>
        </div>

      </div>
    </div>
  );
}
