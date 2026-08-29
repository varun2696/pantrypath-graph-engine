import Link from 'next/link';
import { GitFork, ArrowUpRight, ChefHat, Sparkles } from 'lucide-react';

export default function RelatedRecipes({ relatedRecipes = [], currentRecipeName = '' }) {
  if (!relatedRecipes || relatedRecipes.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
        No other recipes share ingredients with this dish yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header and Graph Pattern Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">Recipes Like This</h3>
            <p className="text-xs text-slate-400">
              Discovered via 2-hop shared-ingredient graph traversal
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-[11px] text-slate-400 border border-slate-700">
          <code className="text-emerald-400 font-mono text-[10px]">
            (:Recipe)-[:USES]-&gt;(:Ingredient)&lt;-[:USES]-(:Recipe)
          </code>
        </div>
      </div>

      {/* Grid of related recipes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {relatedRecipes.map((item) => {
          const {
            id,
            name,
            cuisine,
            difficulty,
            prepTime,
            cookTime,
            sharedIngredientCount,
            sharedIngredients = [],
            imageUrl,
          } = item;

          return (
            <Link
              key={id}
              href={`/recipes/${id}`}
              className="glass-card rounded-xl p-4 flex flex-col justify-between border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-800 text-emerald-300 border border-slate-700">
                      {cuisine}
                    </span>
                    <span className="text-xs text-slate-400">
                      {cookTime}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    {sharedIngredientCount} shared ingredient{sharedIngredientCount > 1 ? 's' : ''}
                  </span>
                </div>

                <h4 className="font-bold text-sm text-slate-200 mt-2.5 group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {name}
                </h4>

                {/* Shared ingredients pill list */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {sharedIngredients.slice(0, 4).map((ingName) => (
                    <span
                      key={ingName}
                      className="px-2 py-0.5 rounded-md bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300"
                    >
                      {ingName}
                    </span>
                  ))}
                  {sharedIngredients.length > 4 && (
                    <span className="px-1.5 py-0.5 text-[10px] text-slate-500">
                      +{sharedIngredients.length - 4} more
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-emerald-300">
                <span>View recipe comparison</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
