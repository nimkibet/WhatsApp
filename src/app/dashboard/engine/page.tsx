'use client';
import { useState } from 'react';
import { Save, Sparkles, Server } from 'lucide-react';

export default function AIEngineConfig() {
  const [engine, setEngine] = useState('AI_COGNITIVE');
  const [prompt, setPrompt] = useState('You are a helpful AI assistant for Acme Corp. Answer queries concisely and kindly.');
  const [fallback, setFallback] = useState('We are currently away. We will respond shortly.');

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
              onClick={() => setEngine('AI_COGNITIVE')}
              className={`cursor-pointer flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${engine === 'AI_COGNITIVE' ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <Sparkles className={`w-5 h-5 ${engine === 'AI_COGNITIVE' ? 'text-primary' : 'text-white/50'}`} />
              <span className={engine === 'AI_COGNITIVE' ? 'text-white font-semibold' : 'text-white/50'}>AI Cognitive (Gemini/Groq)</span>
            </button>
            <button 
              onClick={() => setEngine('RULE_BASED')}
              className={`cursor-pointer flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${engine === 'RULE_BASED' ? 'border-secondary bg-secondary/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <Server className={`w-5 h-5 ${engine === 'RULE_BASED' ? 'text-secondary' : 'text-white/50'}`} />
              <span className={engine === 'RULE_BASED' ? 'text-white font-semibold' : 'text-white/50'}>Deterministic (Rules)</span>
            </button>
          </div>
        </div>

        {/* System Prompt */}
        <div className="glass-panel p-6 transition-all duration-500" style={{ opacity: engine === 'AI_COGNITIVE' ? 1 : 0.4, pointerEvents: engine === 'AI_COGNITIVE' ? 'auto' : 'none' }}>
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

        <div className="flex justify-end pt-4">
          <button className="cursor-pointer bg-gradient-to-r from-primary to-secondary text-white px-8 py-3 rounded-xl font-semibold shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all active:scale-95 flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
}
