import { NextResponse } from 'next/server';
import { runCypher, isConfigured } from '@/lib/db';
import {
  DEMO_USER,
  GET_RECIPE_DETAIL_CYPHER,
  GET_RELATED_RECIPES_CYPHER,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recipes/[id]
 * 
 * Returns:
 * 1. Recipe metadata & instructions.
 * 2. Ingredient list with exact substitution chains (shortest path in graph).
 * 3. "Recipes like this" 2-hop shared-ingredient recommendations.
 */
export async function GET(request, { params }) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'CognoDB credentials are not configured.', configured: false },
      { status: 503 }
    );
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json(
      { error: 'Recipe ID parameter is required.' },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch recipe detail & substitution paths
    const recipeRows = await runCypher(GET_RECIPE_DETAIL_CYPHER, {
      recipeId: id,
      userName: DEMO_USER,
    });

    if (!recipeRows || recipeRows.length === 0) {
      return NextResponse.json(
        { error: `Recipe "${id}" not found in graph database.` },
        { status: 404 }
      );
    }

    const recipe = recipeRows[0];

    // 2. Fetch "Recipes Like This" recommendations (2-hop shared-ingredient traversal)
    const relatedRecipes = await runCypher(GET_RELATED_RECIPES_CYPHER, {
      recipeId: id,
      limit: 4,
    });

    return NextResponse.json({
      success: true,
      recipe,
      relatedRecipes: relatedRecipes || [],
    });
  } catch (error) {
    console.error(`Error fetching recipe detail for ${id}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve recipe details from CognoDB.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
