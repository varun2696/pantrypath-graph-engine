import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'PantryPath — Graph-Powered Smart Recipe & Substitution Engine',
  description: 'Find what you can cook from your pantry using multi-hop graph substitutions and index-free graph recommendations.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="flex flex-col min-h-screen bg-[#0b0f19] text-slate-100">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>PantryPath • Built by <strong className="text-slate-400 font-semibold">Varun</strong> for <strong className="text-emerald-400 font-semibold">Wexa AI</strong></p>
            <p className="flex items-center gap-1.5">
              <span>Backed by CognoDB openCypher Graph Engine</span>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
