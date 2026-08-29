import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

export default function SubstituteChain({ chain = [], requiredName = '' }) {
  if (!chain || chain.length === 0) {
    return null;
  }

  const hops = chain.length - 1;

  return (
    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs mt-2">
      <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>
          Graph Substitution Match ({hops}-hop{hops > 1 ? 's' : ''} traversal):
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {chain.map((nodeName, index) => {
          const isPantrySource = index === 0;
          const isTarget = index === chain.length - 1;

          return (
            <div key={index} className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 ${
                  isPantrySource
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : isTarget
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {isPantrySource && <CheckCircle className="w-3 h-3 text-emerald-400" />}
                <span>{nodeName}</span>
                {isPantrySource && (
                  <span className="text-[10px] text-emerald-400/80 font-normal">
                    (In Pantry)
                  </span>
                )}
                {isTarget && (
                  <span className="text-[10px] text-amber-400/80 font-normal">
                    (Target)
                  </span>
                )}
              </span>

              {index < chain.length - 1 && (
                <div className="flex items-center gap-1 text-[10px] text-amber-400/70 font-mono">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">substitute</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <p className="mt-2 text-[11px] text-slate-400">
        You don't have <strong className="text-slate-200">{requiredName}</strong>, but you have <strong className="text-emerald-300">{chain[0]}</strong> which substitutes through the graph.
      </p>
    </div>
  );
}
