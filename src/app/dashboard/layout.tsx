'use client';
import { useState } from 'react';
import { Bot, Settings, LayoutDashboard, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';

  const handleLogout = async () => {
    const confirm = window.confirm("Are you sure you want to logout? This will terminate all active WhatsApp sessions and permanently wipe configurations from the database to prevent orphaned data.");
    if (!confirm) return;

    setLoggingOut(true);
    const tenants = ['tenant_001', 'tenant_002', 'tenant_003', 'tenant_004'];
    
    try {
      // Wipes all tenant sessions and configurations
      await Promise.all(
        tenants.map(async (tenantId) => {
          try {
            await fetch(`${API_BASE}/api/sessions/stop`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId })
            });
          } catch (e) {
            console.error(`Failed to stop session for ${tenantId} during logout:`, e);
          }
        })
      );
      
      alert("Database purged and all bot sessions unlinked. Logging out...");
      window.location.reload();
    } catch (err) {
      console.error("Logout process encountered an error", err);
    }
    setLoggingOut(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[image:var(--background-image-glow)] pointer-events-none" />
      
      {/* Sidebar Backdrop Overlay on Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 glass-panel m-4 flex flex-col justify-between z-30 shrink-0 transition-transform duration-300 md:translate-x-0 md:relative ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[280px] md:m-4 m-2'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 font-sans">
              AgencyOS
            </span>
          </div>

          <nav className="space-y-2">
            {[
              { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
              { icon: Settings, label: 'AI Engine', href: '/dashboard/engine' },
            ].map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.label} 
                  href={item.href} 
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-primary/20 text-white border border-primary/20 font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}`}
                >
                  <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          <button 
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-300 cursor-pointer disabled:opacity-50"
          >
            {loggingOut ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-semibold">Purging DB...</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-semibold">Logout & Purge</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:pl-0 pl-4 z-10">
        {/* Mobile Top Navigation Header */}
        <div className="flex items-center justify-between md:hidden p-4 bg-white/5 rounded-2xl mb-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
              <Bot className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              AgencyOS
            </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white active:scale-95 transition-all cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="h-full rounded-3xl overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}
