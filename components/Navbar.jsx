import Link from 'next/link';
import { ChefHat, Sparkles, Database } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0b0f19]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Pantry<span className="text-emerald-400">Path</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Graph Engine
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800/60 border border-slate-700/60 rounded-lg">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>CognoDB Graph DB</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo: "Demo Pantry"</span>
          </div>
        </div>
      </div>
    </header>
  );
}
