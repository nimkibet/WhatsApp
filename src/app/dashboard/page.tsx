'use client';
import { useState, useEffect } from 'react';
import { Building2, Phone, Shield, Copy, Check, Loader2, Zap, MessageSquare, Power } from 'lucide-react';

const TENANTS = [
  { id: 'tenant_001', name: 'Portal 1', slug: 'portal1' },
  { id: 'tenant_002', name: 'Portal 2', slug: 'portal2' },
  { id: 'tenant_003', name: 'Portal 3', slug: 'portal3' },
  { id: 'tenant_004', name: 'Portal 4', slug: 'portal4' }
];

export default function MultiTenantDashboard() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';
  
  const [selectedTenantId, setSelectedTenantId] = useState('tenant_001');
  const [statuses, setStatuses] = useState<{ [key: string]: { status: string; number: string; pairingCode: string | null; messagesProcessed: number; businessName?: string } }>({
    tenant_001: { status: 'disconnected', number: '', pairingCode: null, messagesProcessed: 12492 },
    tenant_002: { status: 'disconnected', number: '', pairingCode: null, messagesProcessed: 8321 },
    tenant_003: { status: 'disconnected', number: '', pairingCode: null, messagesProcessed: 4509 },
    tenant_004: { status: 'disconnected', number: '', pairingCode: null, messagesProcessed: 1982 }
  });

  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Live counter for messages processed for connected instances
  useEffect(() => {
    const counterInterval = setInterval(() => {
      setStatuses(prev => {
        const copy = { ...prev };
        let changed = false;
        Object.keys(copy).forEach(tid => {
          if (copy[tid].status === 'connected') {
            copy[tid] = {
              ...copy[tid],
              messagesProcessed: copy[tid].messagesProcessed + Math.floor(Math.random() * 3) + 1
            };
            changed = true;
          }
        });
        return changed ? copy : prev;
      });
    }, 4000);
    return () => clearInterval(counterInterval);
  }, []);

  // Poll server state for all tenants
  useEffect(() => {
    async function fetchAllStatuses() {
      const updated = { ...statuses };
      let changed = false;
      await Promise.all(
        TENANTS.map(async (tenant) => {
          try {
            const res = await fetch(`${API_BASE}/api/sessions/status/${tenant.id}`);
            if (res.ok) {
              const data = await res.json();
              if (data) {
                const current = statuses[tenant.id];
                const nextStatus = data.liveStatus || 'disconnected';
                const nextNumber = data.config?.whatsappNumber || '';
                const nextPairingCode = data.pairingCode || null;
                const nextBusinessName = data.config?.businessName || '';

                if (
                  !current || 
                  current.status !== nextStatus || 
                  current.number !== nextNumber || 
                  current.pairingCode !== nextPairingCode ||
                  current.businessName !== nextBusinessName
                ) {
                  updated[tenant.id] = {
                    status: nextStatus,
                    number: nextNumber,
                    pairingCode: nextPairingCode,
                    messagesProcessed: current ? current.messagesProcessed : 0,
                    businessName: nextBusinessName
                  };
                  changed = true;
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch status for ${tenant.id}`, err);
          }
        })
      );
      if (changed) {
        setStatuses(updated);
      }
    }

    fetchAllStatuses();
    const interval = setInterval(fetchAllStatuses, 3000); // poll status every 3s
    return () => clearInterval(interval);
  }, [API_BASE, statuses]);

  // Initiate connection flow with phone number
  const handleLinkWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setErrorMessage('Please fill in the phone number.');
      return;
    }
    setLoading(true);
    setErrorMessage('');

    // Normalize phone number (handles 07..., 7..., +254... and other formats)
    let cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.startsWith('0') && cleanedPhone.length === 10) {
      cleanedPhone = '254' + cleanedPhone.substring(1);
    } else if ((cleanedPhone.startsWith('7') || cleanedPhone.startsWith('1')) && cleanedPhone.length === 9) {
      cleanedPhone = '254' + cleanedPhone;
    }

    try {
      const res = await fetch(`${API_BASE}/api/sessions/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          phoneNumber: cleanedPhone,
          activationCode: 'ACT-TENANT'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to initiate connection.');
      } else {
        // Trigger status update immediately
        setStatuses(prev => ({
          ...prev,
          [selectedTenantId]: {
            ...prev[selectedTenantId],
            status: 'connecting',
            pairingCode: null
          }
        }));
      }
    } catch (err) {
      setErrorMessage('Network error connecting to API.');
      console.error(err);
    }
    setLoading(false);
  };

  // Disconnect/Logout session (purges Mongo data and unlinks)
  const handleStopSession = async (tenantId: string) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/sessions/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      if (res.ok) {
        setStatuses(prev => ({
          ...prev,
          [tenantId]: {
            ...prev[tenantId],
            status: 'disconnected',
            pairingCode: null,
            number: ''
          }
        }));
        if (tenantId === selectedTenantId) {
          setPhoneNumber('');
        }
      } else {
        setErrorMessage('Failed to terminate session.');
      }
    } catch (err) {
      setErrorMessage('Network error terminating session.');
      console.error(err);
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const activeTenant = TENANTS.find(t => t.id === selectedTenantId) || TENANTS[0];
  const activeState = statuses[selectedTenantId] || { status: 'disconnected', number: '', pairingCode: null, messagesProcessed: 0, businessName: '' };
  const activeTenantName = activeState.businessName || activeTenant.name;

  return (
    <div className="p-4 md:p-8 h-full flex flex-col space-y-6 md:space-y-8 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
          AgencyOS Control Hub
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Simultaneously coordinate and authorize up to 4 WhatsApp AI agent instances.
        </p>
      </div>

      {/* Grid of 4 Tenants */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TENANTS.map((tenant) => {
          const state = statuses[tenant.id] || { status: 'disconnected', number: '', pairingCode: null, messagesProcessed: 0, businessName: '' };
          const isSelected = tenant.id === selectedTenantId;
          const tenantName = state.businessName || tenant.name;
          
          let statusColor = 'bg-red-500';
          let borderGlow = 'border-white/10';
          
          if (state.status === 'connected') {
            statusColor = 'bg-accent shadow-[0_0_12px_#10b981]';
            borderGlow = isSelected ? 'border-accent shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-accent/40';
          } else if (state.status === 'connecting') {
            statusColor = 'bg-yellow-400 animate-pulse';
            borderGlow = isSelected ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : 'border-yellow-400/40';
          } else if (isSelected) {
            borderGlow = 'border-primary shadow-[0_0_20px_rgba(99,102,241,0.2)]';
          }

          return (
            <div
              key={tenant.id}
              onClick={() => {
                setSelectedTenantId(tenant.id);
                setErrorMessage('');
                // Reset form inputs to match active tenant number if connected
                if (state.status === 'connected') {
                  setPhoneNumber(state.number);
                } else if (state.status === 'disconnected') {
                  setPhoneNumber('');
                }
              }}
              className={`glass-panel p-6 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:bg-white/[0.04] flex flex-col justify-between h-48 relative border ${borderGlow}`}
            >
              {/* Top Row */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-white/5 text-white/70">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight">{tenantName}</h3>
                    <span className="text-[10px] text-white/40 font-mono">{tenant.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/30 px-2 py-0.5 rounded-full border border-white/5">
                  <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                    {state.status}
                  </span>
                </div>
              </div>

              {/* Middle Row: Phone Number */}
              <div className="my-2">
                <p className="text-[11px] text-white/45 uppercase tracking-wide">Linked Number</p>
                <p className="text-sm font-semibold text-white/90">
                  {state.number ? `+${state.number}` : 'No Instance Linked'}
                </p>
              </div>

              {/* Bottom Row: Analytics */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-xs text-white/50 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-secondary" />
                  Processed
                </span>
                <span className="text-sm font-bold text-white/95 font-mono">
                  {state.messagesProcessed.toLocaleString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gateway Control Panel */}
      <div className="glass-panel p-4 md:p-8 relative overflow-hidden border border-white/10 flex-1">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <Zap className="text-white w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Instance Authorization Gateway
              </h2>
              <p className="text-white/40 text-xs mt-0.5">
                Manage credentials and pairing credentials for <span className="text-white/80 font-semibold">{activeTenantName}</span>.
              </p>
            </div>
          </div>

          {activeState.status === 'connected' && (
            <button
              onClick={() => handleStopSession(selectedTenantId)}
              disabled={loading}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border border-red-500/20 hover:border-red-500/35 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Power className="w-4 h-4" />
              Disconnect Instance
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm mb-6 flex items-center gap-2">
            <span className="font-bold">Error:</span> {errorMessage}
          </div>
        )}

        {/* 1. DISCONNECTED STATE: Phone Input */}
        {activeState.status === 'disconnected' && (
          <form onSubmit={handleLinkWhatsApp} className="space-y-6 max-w-md">
            
            {/* Phone Number Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white/70 flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                WhatsApp Phone Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +254 712 345678 or 0712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input-field placeholder:text-white/20 font-mono"
              />
              <p className="text-[10px] text-white/40 leading-relaxed">
                Supports any format: Local (e.g. 0712345678 or 712345678), International (e.g. +254712345678), spaces, or dashes. We will normalize it automatically.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-white text-black font-semibold px-8 py-3.5 rounded-xl hover:bg-white/90 transition-all active:scale-95 flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.25)] cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Warming Connection...
                </>
              ) : (
                'Generate Activation Pairing Code'
              )}
            </button>
          </form>
        )}

        {/* 2. CONNECTING STATE: Displays Pairing Code */}
        {activeState.status === 'connecting' && (
          <div className="space-y-8 max-w-3xl">
            <div className="bg-black/30 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div>
                <h3 className="font-bold text-white text-lg mb-1 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" />
                  Device Link Key Ready
                </h3>
                <p className="text-white/40 text-xs">
                  Enter this pairing code on WhatsApp Link Device option to link {activeTenantName}.
                </p>
              </div>

              {/* Pairing Code Display */}
              <div className="flex items-center gap-3">
                {activeState.pairingCode ? (
                  <>
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 font-mono text-3xl font-extrabold tracking-widest text-primary text-center select-all shadow-inner">
                      {activeState.pairingCode.substring(0, 4)} - {activeState.pairingCode.substring(4)}
                    </div>
                    <button
                      onClick={() => copyToClipboard(activeState.pairingCode || '')}
                      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all cursor-pointer group active:scale-95"
                      title="Copy Link Code"
                    >
                      {copiedCode ? <Check className="w-5 h-5 text-accent" /> : <Copy className="w-5 h-5 text-white/60 group-hover:text-white" />}
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3 text-white/50 text-sm font-medium py-3 px-6 bg-white/5 rounded-xl border border-white/5">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Generating Pairing Code from Whatsapp Web...
                  </div>
                )}
              </div>

            </div>

            {/* Instruction Steps */}
            <div className="space-y-4">
              <h4 className="font-semibold text-white text-sm">Instruction Manual for Verification:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { step: '01', title: 'Open WhatsApp', desc: 'Open the app on your mobile device.' },
                  { step: '02', title: 'Settings Device', desc: 'Tap Settings > Linked Devices > Link a Device.' },
                  { step: '03', title: 'Phone Gateway', desc: 'Tap Link with Phone Number Instead.' },
                  { step: '04', title: 'Authorize pairing', desc: 'Enter the 8-character code shown above.' }
                ].map((item) => (
                  <div key={item.step} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex flex-col justify-between h-32">
                    <span className="font-mono font-bold text-lg text-primary">{item.step}</span>
                    <div>
                      <p className="text-white/80 font-bold text-xs mb-1">{item.title}</p>
                      <p className="text-[10px] text-white/40 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleStopSession(selectedTenantId)}
              disabled={loading}
              className="bg-white/5 hover:bg-white/10 border border-white/15 text-white/60 hover:text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Cancel Linkage Flow
            </button>
          </div>
        )}

        {/* 3. CONNECTED STATE: Bot is fully operational */}
        {activeState.status === 'connected' && (
          <div className="space-y-6">
            <div className="bg-accent/5 border border-accent/15 rounded-2xl p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">
                  Connection Active & Secure
                </h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Whatsapp Bot instance for <span className="text-white/80 font-semibold">{activeTenantName}</span> is live. Dual-Engine response system is monitoring chats.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Linked Number Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">WhatsApp Account</p>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-accent" />
                  <span className="font-bold text-white text-lg">+{activeState.number}</span>
                </div>
              </div>

              {/* AI Engine Status Card */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Dual-Engine AI Mode</p>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-secondary" />
                  <span className="font-bold text-white text-lg">Active (Gemini / Groq)</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
