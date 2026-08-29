'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  GitGraph,
  Share2,
} from 'lucide-react';
import SubstituteChain from '@/components/SubstituteChain';
import RelatedRecipes from '@/components/RelatedRecipes';
import ErrorBanner from '@/components/ErrorBanner';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const [recipe, setRecipe] = useState(null);
  const [relatedRecipes, setRelatedRecipes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRecipeDetail() {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/recipes/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to load recipe details.');
        } else {
          setRecipe(data.recipe);
          setRelatedRecipes(data.relatedRecipes || []);
        }
      } catch (err) {
        console.error('Error fetching recipe detail:', err);
        setError(err.message || 'Error communicating with server.');
      } finally {
        setIsLoading(false);
      }
    }

    loadRecipeDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded-lg" />
        <div className="h-72 bg-slate-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-800 rounded-2xl" />
          <div className="h-64 bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pantry & Recipes</span>
        </Link>
        <ErrorBanner
          message={error || `Recipe "${id}" could not be found.`}
          details="Please verify the database connection and ensure the seed script has been run."
        />
      </div>
    );
  }

  const {
    name,
    cuisine,
    prepTime,
    cookTime,
    servings,
    difficulty,
    imageUrl,
    instructions = [],
    ingredients = [],
  } = recipe;

  const haveCount = ingredients.filter((i) => i.status === 'HAVE').length;
  const subCount = ingredients.filter((i) => i.status === 'SUBSTITUTE').length;
  const missingCount = ingredients.filter((i) => i.status === 'MISSING').length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Pantry Dashboard</span>
        </Link>
      </div>

      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-800">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Top Tags */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-900/85 backdrop-blur-md text-emerald-300 border border-slate-700">
              {cuisine}
            </span>
            <span className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-900/85 backdrop-blur-md text-slate-200 border border-slate-700">
              {difficulty}
            </span>
          </div>

          {/* Bottom Title & Stats */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
              {name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300 mt-3">
              <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Prep: {prepTime} • Cook: {cookTime}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{servings} servings</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pantry Readiness Summary Bar */}
        <div className="p-4 sm:p-5 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Pantry Readiness:</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {haveCount} In Pantry
              </span>
              {subCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  {subCount} Substituted
                </span>
              )}
              {missingCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {missingCount} Missing
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Ingredients & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Ingredients Column (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 bg-slate-900/60">
            <h2 className="font-bold text-slate-100 text-base mb-4 flex items-center justify-between">
              <span>Required Ingredients</span>
              <span className="text-xs font-normal text-slate-400">
                {ingredients.length} items
              </span>
            </h2>

            <div className="space-y-3">
              {ingredients.map((ing) => {
                const { name: ingName, quantity, status, substituteChain } = ing;

                return (
                  <div
                    key={ingName}
                    className={`p-3 rounded-xl border text-xs transition-all ${
                      status === 'HAVE'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                        : status === 'SUBSTITUTE'
                        ? 'bg-amber-950/20 border-amber-500/30 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {status === 'HAVE' && (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {status === 'SUBSTITUTE' && (
                          <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {status === 'MISSING' && (
                          <div className="w-4 h-4 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="font-semibold text-slate-100">{ingName}</span>
                      </div>

                      <span className="text-slate-400 font-mono text-[11px]">
                        {quantity}
                      </span>
                    </div>

                    {/* Multi-Hop Substitution Chain Visualizer */}
                    {status === 'SUBSTITUTE' && substituteChain && substituteChain.length > 0 && (
                      <SubstituteChain
                        chain={substituteChain}
                        requiredName={ingName}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Instructions Column (7 cols) */}
        <div className="md:col-span-7 space-y-4">
          <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 bg-slate-900/60">
            <h2 className="font-bold text-slate-100 text-base mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Step-by-Step Instructions</span>
            </h2>

            <div className="space-y-4">
              {Array.isArray(instructions) && instructions.map((step, index) => (
                <div key={index} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <p className="flex-1 pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Graph Explanation Note */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900/60 border border-emerald-500/20 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <GitGraph className="w-4 h-4" />
              <span>Graph Architecture Behind This Recipe</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              CognoDB evaluated this recipe by walking the direct <code className="text-emerald-400 font-mono">(:User)-[:HAS]-&gt;(:Ingredient)</code> edges
              and recursive <code className="text-amber-300 font-mono">[:SUBSTITUTE_FOR*1..2]</code> graph paths.
              In SQL, calculating multi-step culinary substitutions requires multi-level recursive Common Table Expressions (CTEs),
              whereas openCypher accomplishes this via index-free pointer navigation.
            </p>
          </div>
        </div>
      </div>

      {/* "Recipes Like This" Section (2-hop graph traversal recommendation) */}
      <div className="pt-6 border-t border-slate-800">
        <RelatedRecipes
          relatedRecipes={relatedRecipes}
          currentRecipeName={name}
        />
      </div>
    </div>
  );
}
