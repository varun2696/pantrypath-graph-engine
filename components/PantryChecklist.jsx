'use client';

import { useState, useMemo } from 'react';
import { Check, Search, Sparkles, Refrigerator, RefreshCw } from 'lucide-react';

export default function PantryChecklist({
  ingredients = [],
  onToggleItem,
  isLoading = false,
  error = null,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [togglingMap, setTogglingMap] = useState({});

  // Group ingredients by category
  const grouped = useMemo(() => {
    const map = {};
    const filtered = ingredients.filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.forEach((item) => {
      if (!map[item.category]) {
        map[item.category] = [];
      }
      map[item.category].push(item);
    });
    return map;
  }, [ingredients, searchTerm]);

  const pantryCount = ingredients.filter((i) => i.inPantry).length;

  const handleToggle = async (item) => {
    const nextState = !item.inPantry;
    setTogglingMap((prev) => ({ ...prev, [item.name]: true }));
    try {
      await onToggleItem(item.name, nextState);
    } finally {
      setTogglingMap((prev) => ({ ...prev, [item.name]: false }));
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-full border border-slate-800 bg-slate-900/70">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Refrigerator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-100 text-base">Demo Pantry</h2>
            <p className="text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{pantryCount}</span> of {ingredients.length} items stocked
            </p>
          </div>
        </div>

        {isLoading && (
          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
        )}
      </div>

      {/* Search Input */}
      <div className="mt-4 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter ingredients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
        />
      </div>

      {/* Tip Callout */}
      <div className="mt-3 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
        <span>
          Toggle items below. Cypher queries dynamically re-evaluate graph substitutions in real-time.
        </span>
      </div>

      {/* Categorized Checklist */}
      <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4 max-h-[580px]">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No ingredients match your filter.
          </div>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                <span>{category}</span>
                <span className="text-slate-500">
                  {items.filter((i) => i.inPantry).length}/{items.length}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1">
                {items.map((item) => {
                  const isChecked = Boolean(item.inPantry);
                  const isBusy = Boolean(togglingMap[item.name]);

                  return (
                    <button
                      key={item.name}
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggle(item)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-all ${
                        isChecked
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 font-medium'
                          : 'bg-slate-950/30 border border-slate-800/60 text-slate-300 hover:bg-slate-800/40'
                      } ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className="truncate">{item.name}</span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                          isChecked
                            ? 'bg-emerald-500 text-slate-950'
                            : 'border border-slate-600 bg-slate-900'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
