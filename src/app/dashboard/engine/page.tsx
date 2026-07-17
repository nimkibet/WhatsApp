'use client';
import { useState, useEffect } from 'react';
import { Save, Sparkles, Server, Building2 } from 'lucide-react';

const TENANTS = [
  { id: 'tenant_001', name: 'Portal 1' },
  { id: 'tenant_002', name: 'Portal 2' },
  { id: 'tenant_003', name: 'Portal 3' },
  { id: 'tenant_004', name: 'Portal 4' }
];

export default function AIEngineConfig() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';
  
  const [selectedTenantId, setSelectedTenantId] = useState('tenant_001');
  const [engine, setEngine] = useState('ai');
  const [prompt, setPrompt] = useState('You are a helpful AI assistant. Answer queries concisely and kindly.');
  const [fallback, setFallback] = useState('We are currently away. We will respond shortly.');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tenantNames, setTenantNames] = useState<{ [key: string]: string }>({
    tenant_001: 'Portal 1',
    tenant_002: 'Portal 2',
    tenant_003: 'Portal 3',
    tenant_004: 'Portal 4'
  });

  // Load tenant business names on mount
  useEffect(() => {
    async function loadTenantNames() {
      const names = { ...tenantNames };
      let changed = false;
      await Promise.all(
        TENANTS.map(async (tenant) => {
          try {
            const res = await fetch(`${API_BASE}/api/sessions/status/${tenant.id}`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.config?.businessName) {
                if (names[tenant.id] !== data.config.businessName) {
                  names[tenant.id] = data.config.businessName;
                  changed = true;
                }
              }
            }
          } catch (e) {
            console.error(e);
          }
        })
      );
      if (changed) {
        setTenantNames(names);
      }
    }
    loadTenantNames();
  }, [API_BASE]);

  // Load config whenever selectedTenantId changes
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`${API_BASE}/api/sessions/status/${selectedTenantId}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.config) {
            setEngine(data.config.engineMode || 'ai');
            setPrompt(data.config.aiPrompt || '');
            setFallback(data.config.fallbackMessage || '');
          }
        }
      } catch (err) {
        console.error("Failed to load config", err);
      }
    }
    loadConfig();
  }, [selectedTenantId, API_BASE]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/config/update-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          engineMode: engine,
          aiPrompt: prompt,
          fallbackMessage: fallback
        })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Refresh the current tenant name in layout just in case
        try {
          const statusRes = await fetch(`${API_BASE}/api/sessions/status/${selectedTenantId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData && statusData.config?.businessName) {
              setTenantNames(prev => ({
                ...prev,
                [selectedTenantId]: statusData.config.businessName
              }));
            }
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 h-full max-w-4xl flex flex-col space-y-6 md:space-y-8 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/70">
          AI Engine Workspace
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Customize how your bot instances think, reply, and handle fallbacks.
        </p>
      </div>

      {/* Tenant Selector for configuration */}
      <div className="glass-panel p-4 flex flex-wrap items-center gap-2 border border-white/10">
        <span className="text-white/40 text-xs font-semibold uppercase tracking-wider px-3">
          Configure Tenant:
        </span>
        {TENANTS.map((tenant) => (
          <button
            key={tenant.id}
            onClick={() => setSelectedTenantId(tenant.id)}
            className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${selectedTenantId === tenant.id ? 'bg-primary border-primary text-white shadow-md' : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            {tenantNames[tenant.id] || tenant.name}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        
        {/* Engine Toggle */}
        <div className="glass-panel p-6 border border-white/10">
          <label className="block text-sm font-semibold text-white/70 mb-4">Response Engine</label>
          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => setEngine('ai')}
              className={`cursor-pointer flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${engine === 'ai' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(99,102,241,0.25)]' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
              <Sparkles className={`w-5 h-5 ${engine === 'ai' ? 'text-primary animate-pulse' : 'text-white/40'}`} />
              <span className={engine === 'ai' ? 'text-white font-bold text-sm' : 'text-white/50 text-sm'}>AI Cognitive (Gemini/Groq)</span>
            </button>
            <button 
              onClick={() => setEngine('deterministic')}
              className={`cursor-pointer flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${engine === 'deterministic' ? 'border-secondary bg-secondary/10 shadow-[0_0_15px_rgba(168,85,247,0.25)]' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
              <Server className={`w-5 h-5 ${engine === 'deterministic' ? 'text-secondary' : 'text-white/40'}`} />
              <span className={engine === 'deterministic' ? 'text-white font-bold text-sm' : 'text-white/50 text-sm'}>Deterministic (Rules)</span>
            </button>
          </div>
        </div>

        {/* System Prompt */}
        <div className="glass-panel p-6 border border-white/10 transition-all duration-500" style={{ opacity: engine === 'ai' ? 1 : 0.4, pointerEvents: engine === 'ai' ? 'auto' : 'none' }}>
          <label className="block text-sm font-semibold text-white/70 mb-1">System Instructions (Prompt)</label>
          <p className="text-xs text-white/45 mb-4">Define the personality, constraints, and business knowledge of your AI.</p>
          <textarea 
            rows={7}
            className="input-field font-mono text-sm leading-relaxed"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* Fallback Message */}
        <div className="glass-panel p-6 border border-white/10">
          <label className="block text-sm font-semibold text-white/70 mb-1">Fallback / Offline Message</label>
          <p className="text-xs text-white/45 mb-4">Sent if the AI fails or if the bot is in rule-based mode without a matching keyword.</p>
          <input 
            type="text"
            className="input-field"
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-4 items-center gap-4">
          {saveSuccess && <span className="text-accent text-sm font-bold animate-in fade-in">Saved successfully!</span>}
          <button onClick={handleSave} disabled={loading} className="cursor-pointer bg-gradient-to-r from-primary to-secondary text-white px-8 py-3.5 rounded-xl font-bold shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

      </div>
    </div>
  );
}
