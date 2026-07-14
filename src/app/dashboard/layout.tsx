import { Bot, Settings, LayoutDashboard, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background relative">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[image:var(--background-image-glow)] pointer-events-none" />
      
      {/* Sidebar */}
      <aside className="w-64 glass-panel m-4 flex flex-col justify-between z-10 shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              AgencyOS
            </span>
          </div>

          <nav className="space-y-2">
            {[
              { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
              { icon: Settings, label: 'AI Engine', href: '/dashboard/engine' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 group">
                <item.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-6">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-300">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pl-0 z-10">
        <div className="h-full rounded-3xl overflow-hidden relative">
          {children}
        </div>
      </main>
    </div>
  );
}
