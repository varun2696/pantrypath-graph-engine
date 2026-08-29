import { Database, AlertTriangle, Terminal, Key } from 'lucide-react';

export default function ErrorBanner({ message = 'Unable to connect to CognoDB graph database.', details = null }) {
  return (
    <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-slate-200 shadow-xl">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex-shrink-0">
          <Database className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-amber-300">
              CognoDB Graph Database Connection Needed
            </h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold uppercase rounded bg-amber-500/20 text-amber-300">
              Setup Required
            </span>
          </div>

          <p className="text-sm text-slate-300 mt-1">
            {message}
          </p>

          {details && (
            <p className="text-xs font-mono text-amber-200/70 mt-1 bg-amber-950/60 p-2 rounded-lg border border-amber-500/20">
              {details}
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-200 mb-1">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Configure .env.local</span>
              </div>
              <p className="text-slate-400">
                Add your instance credentials to <code className="text-emerald-300 font-mono">.env.local</code>:
              </p>
              <pre className="mt-1 text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2 rounded">
                COGNODB_URI=bolt+s://...<br/>
                COGNODB_USER=cognodb<br/>
                COGNODB_PASSWORD=...
              </pre>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-slate-200 mb-1">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>2. Seed Graph Data</span>
              </div>
              <p className="text-slate-400">
                Run the parameterized seed script in your terminal:
              </p>
              <pre className="mt-1 text-[11px] font-mono text-emerald-400 bg-slate-900/80 p-2 rounded">
                node scripts/seed.js
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
