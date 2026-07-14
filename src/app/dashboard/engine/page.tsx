'use client';
import { useState, useEffect } from 'react';
import { Save, Sparkles, Server } from 'lucide-react';

export default function AIEngineConfig({ tenantId = "tenant_001" }) {
  const [engine, setEngine] = useState('ai');
  const [prompt, setPrompt] = useState('You are a helpful AI assistant for Acme Corp. Answer queries concisely and kindly.');
  const [fallback, setFallback] = useState('We are currently away. We will respond shortly.');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';

  // Load config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`${API_BASE}/api/sessions/status/${tenantId}`);
        const data = await res.json();
        if (data && data.config) {
          setEngine(data.config.engineMode || 'ai');
          setPrompt(data.config.aiPrompt || '');
          setFallback(data.config.fallbackMessage || '');
        }
      } catch (err) {
        console.error("Failed to load config", err);
      }
    }
    loadConfig();
  }, [tenantId, API_BASE]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/config/update-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          engineMode: engine,
          aiPrompt: prompt,
          fallbackMessage: fallback
        })
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 h-full max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">AI Engine Workspace</h1>
      <p className="text-white/50 mb-8">Customize how your bot thinks and responds.</p>

      <div className="space-y-6">
        
        {/* Engine Toggle */}
        <div className="glass-panel p-6">
          <label className="block text-sm font-medium text-white/70 mb-4">Response Engine</label>
          <div className="flex gap-4">
            <button 
              onClick={() => setEngine('ai')}
              className={`cursor-pointer flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${engine === 'ai' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <Sparkles className={`w-5 h-5 ${engine === 'ai' ? 'text-primary' : 'text-white/50'}`} />
              <span className={engine === 'ai' ? 'text-white font-semibold' : 'text-white/50'}>AI Cognitive (Gemini/Groq)</span>
            </button>
            <button 
              onClick={() => setEngine('deterministic')}
              className={`cursor-pointer flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${engine === 'deterministic' ? 'border-secondary bg-secondary/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <Server className={`w-5 h-5 ${engine === 'deterministic' ? 'text-secondary' : 'text-white/50'}`} />
              <span className={engine === 'deterministic' ? 'text-white font-semibold' : 'text-white/50'}>Deterministic (Rules)</span>
            </button>
          </div>
        </div>

        {/* System Prompt */}
        <div className="glass-panel p-6 transition-all duration-500" style={{ opacity: engine === 'ai' ? 1 : 0.4, pointerEvents: engine === 'ai' ? 'auto' : 'none' }}>
          <label className="block text-sm font-medium text-white/70 mb-2">System Instructions (Prompt)</label>
          <p className="text-xs text-white/40 mb-4">Define the personality, constraints, and business knowledge of your AI.</p>
          <textarea 
            rows={8}
            className="input-field font-mono text-sm leading-relaxed"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        {/* Fallback Message */}
        <div className="glass-panel p-6">
          <label className="block text-sm font-medium text-white/70 mb-2">Fallback / Offline Message</label>
          <p className="text-xs text-white/40 mb-4">Sent if the AI fails or if the bot is in rule-based mode without a matching keyword.</p>
          <input 
            type="text"
            className="input-field"
            value={fallback}
            onChange={(e) => setFallback(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-4 items-center gap-4">
          {saveSuccess && <span className="text-accent font-medium animate-in fade-in">Saved successfully!</span>}
          <button onClick={handleSave} disabled={loading} className="cursor-pointer bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-xl font-semibold shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50">
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

      </div>
    </div>
  );
}
