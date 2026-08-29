import Link from 'next/link';
import Image from 'next/image';
import { Clock, Users, ArrowRight, Sparkles } from 'lucide-react';
import ReadinessBadge from './ReadinessBadge';

export default function RecipeCard({ recipe }) {
  const {
    id,
    name,
    cuisine,
    prepTime,
    cookTime,
    servings,
    difficulty,
    imageUrl,
    totalCount = 0,
    directCount = 0,
    substitutedCount = 0,
    missingCount = 0,
    readinessStatus = 'MISSING',
    ingredients = [],
  } = recipe;

  const totalAvailable = directCount + substitutedCount;
  const matchPercent = totalCount > 0 ? Math.round((totalAvailable / totalCount) * 100) : 0;

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col group border border-slate-800/80 bg-slate-900/60 hover:border-emerald-500/40 transition-all duration-300 shadow-lg hover:shadow-emerald-500/5">
      {/* Recipe Image & Top Tags */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
            No Image
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900/80 backdrop-blur-md text-emerald-300 border border-slate-700/60">
            {cuisine}
          </span>
          <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-900/80 backdrop-blur-md text-slate-300 border border-slate-700/60">
            {difficulty}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <ReadinessBadge
            status={readinessStatus}
            directCount={directCount}
            substitutedCount={substitutedCount}
            totalCount={totalCount}
            compact
          />
          <span className="text-xs font-bold text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-md">
            {matchPercent}% Match
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-lg text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
            {name}
          </h3>

          <div className="flex items-center gap-4 text-xs text-slate-400 mt-2.5">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{prepTime} prep • {cookTime} cook</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{servings} servings</span>
            </div>
          </div>

          {/* Ingredient Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Ingredients available</span>
              <span className="font-medium text-slate-300">
                {directCount} direct
                {substitutedCount > 0 && ` + ${substitutedCount} sub`}
                {' '}/ {totalCount}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
              <div
                style={{ width: `${(directCount / Math.max(totalCount, 1)) * 100}%` }}
                className="bg-emerald-500 h-full transition-all"
                title={`${directCount} directly in pantry`}
              />
              <div
                style={{ width: `${(substitutedCount / Math.max(totalCount, 1)) * 100}%` }}
                className="bg-amber-400 h-full transition-all"
                title={`${substitutedCount} via substitution`}
              />
            </div>
          </div>

          {/* Mini Substitutions callout if any */}
          {substitutedCount > 0 && (
            <div className="mt-2 text-[11px] text-amber-300/90 flex items-center gap-1">
              <Sparkles className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                Uses graph substitute: {ingredients.find(i => i.status === 'SUBSTITUTE')?.substituteUsed || 'available'}
              </span>
            </div>
          )}
        </div>

        <Link
          href={`/recipes/${id}`}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600/20 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-sm font-medium transition-all group/btn"
        >
          <span>View Recipe & Graph Path</span>
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
