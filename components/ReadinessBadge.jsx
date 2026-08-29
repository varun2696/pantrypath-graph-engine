import { CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';

export default function ReadinessBadge({ status, directCount, substitutedCount, totalCount, compact = false }) {
  if (status === 'READY') {
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 ${
        compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}>
        <CheckCircle2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>Ready to Cook</span>
      </div>
    );
  }

  if (status === 'ALMOST') {
    const subText = substitutedCount > 0 ? `${substitutedCount} Sub${substitutedCount > 1 ? 's' : ''}` : 'Almost Ready';
    return (
      <div className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 ${
        compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}>
        <Sparkles className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4 text-amber-400'} />
        <span>{compact ? `Almost (${subText})` : 'Almost Ready (With Substitutes)'}</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50 ${
      compact ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    }`}>
      <AlertCircle className={compact ? 'w-3.5 h-3.5 text-slate-400' : 'w-4 h-4 text-slate-400'} />
      <span>{compact ? 'Missing Items' : 'Missing Ingredients'}</span>
    </div>
  );
}
