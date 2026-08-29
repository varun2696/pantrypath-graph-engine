'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import PantryChecklist from '@/components/PantryChecklist';
import RecipeCard from '@/components/RecipeCard';
import ErrorBanner from '@/components/ErrorBanner';
import { ChefHat, Sparkles, Filter, Search, CheckCircle2, AlertCircle, ShoppingBag, Utensils } from 'lucide-react';

export default function HomePage() {
  const [ingredients, setIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | READY | ALMOST | MISSING
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPantryUpdating, setIsPantryUpdating] = useState(false);
  const [dbError, setDbError] = useState(null);

  // Fetch both pantry and recipes
  const fetchData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const [pantryRes, recipesRes] = await Promise.all([
        fetch('/api/pantry'),
        fetch('/api/recipes'),
      ]);

      const pantryData = await pantryRes.json();
      const recipesData = await recipesRes.json();

      if (!pantryRes.ok || !recipesRes.ok) {
        setDbError(
          pantryData.error || recipesData.error || 'Failed to connect to CognoDB.'
        );
      } else {
        setDbError(null);
        setIngredients(pantryData.ingredients || []);
        setRecipes(recipesData.recipes || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setDbError(err.message || 'Unable to communicate with the server.');
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimistic pantry item toggle
  const handleTogglePantryItem = async (ingredientName, nextState) => {
    // 1. Optimistically update local ingredients state
    const previousIngredients = [...ingredients];
    setIngredients((prev) =>
      prev.map((item) =>
        item.name === ingredientName ? { ...item, inPantry: nextState } : item
      )
    );

    setIsPantryUpdating(true);
    try {
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientName,
          inPantry: nextState,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update pantry in CognoDB');
      }

      // 2. Refresh recipe readiness calculations smoothly
      const recipesRes = await fetch('/api/recipes');
      if (recipesRes.ok) {
        const recipesData = await recipesRes.json();
        setRecipes(recipesData.recipes || []);
      }
    } catch (err) {
      console.error('Toggle error, rolling back:', err);
      // Rollback to previous state on failure
      setIngredients(previousIngredients);
      alert(`Could not update ${ingredientName}. ${err.message}`);
    } finally {
      setIsPantryUpdating(false);
    }
  };

  // Filtered recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Filter by status
      if (activeFilter !== 'ALL' && recipe.readinessStatus !== activeFilter) {
        return false;
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = recipe.name.toLowerCase().includes(q);
        const matchCuisine = recipe.cuisine.toLowerCase().includes(q);
        const matchIngredient = recipe.ingredients?.some((ing) =>
          ing.name.toLowerCase().includes(q)
        );
        return matchName || matchCuisine || matchIngredient;
      }
      return true;
    });
  }, [recipes, activeFilter, searchQuery]);

  // Count summaries
  const readyCount = recipes.filter((r) => r.readinessStatus === 'READY').length;
  const almostCount = recipes.filter((r) => r.readinessStatus === 'ALMOST').length;
  const missingCount = recipes.filter((r) => r.readinessStatus === 'MISSING').length;
  const pantryTotalItems = ingredients.filter((i) => i.inPantry).length;

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800 shadow-2xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>openCypher Multi-Hop Substitution Engine</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Cook with What You Have, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Powered by Graph Intelligence
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Check off ingredients in your pantry. PantryPath traverses up to 2 hops across culinary substitution
            chains (e.g. <span className="text-emerald-300">Greek Yogurt &rarr; Plain Yogurt &rarr; Buttermilk</span>)
            and discovers related recipes via shared-ingredient graph traversal.
          </p>
        </div>
      </div>

      {/* Database Error Banner if any */}
      {dbError && (
        <ErrorBanner
          message="Could not connect to CognoDB or credentials are missing."
          details={dbError}
        />
      )}

      {/* Main Grid: Left = Pantry, Right = Recipe Discovery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Pantry Checklist (4 cols on desktop) */}
        <div className="lg:col-span-4 sticky top-20">
          <PantryChecklist
            ingredients={ingredients}
            onToggleItem={handleTogglePantryItem}
            isLoading={isPantryUpdating}
            error={dbError}
          />
        </div>

        {/* Right Column: Recipe Discovery & Readiness (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                All Recipes ({recipes.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('READY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeFilter === 'READY'
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-emerald-300 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ready ({readyCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('ALMOST')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeFilter === 'ALMOST'
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Almost Ready ({almostCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('MISSING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeFilter === 'MISSING'
                    ? 'bg-slate-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <span>Missing ({missingCount})</span>
              </button>
            </div>

            {/* Recipe Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipes or cuisine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950/60 border border-slate-700/60 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          {/* Empty Pantry Callout (If pantry has 0 items) */}
          {pantryTotalItems === 0 && !isLoading && !dbError && (
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-dashed border-slate-700 text-center space-y-2">
              <ShoppingBag className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="font-semibold text-slate-200 text-sm">
                Your pantry is currently empty!
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Check off a few ingredients in the <strong>Demo Pantry</strong> on the left to see real-time
                readiness scores and graph substitution paths appear.
              </p>
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-80 rounded-2xl bg-slate-900/40 border border-slate-800 animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Recipe Grid */}
          {!isLoading && filteredRecipes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}

          {/* No search results empty state */}
          {!isLoading && filteredRecipes.length === 0 && (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
              <Utensils className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="font-semibold text-slate-300 text-base">
                No recipes found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try selecting a different filter or search term, or check off more ingredients in your pantry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
