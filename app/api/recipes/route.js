import { NextResponse } from 'next/server';
import { runCypher, isConfigured } from '@/lib/db';
import { DEMO_USER, GET_RECIPES_WITH_READINESS_CYPHER } from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/recipes
 * 
 * Computes graph-native readiness for all recipes against the demo user's pantry.
 * Evaluates direct :HAS edges as well as [:SUBSTITUTE_FOR*1..2] multi-hop chains.
 */
export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error: 'CognoDB credentials are not configured.',
        configured: false,
        recipes: [],
      },
      { status: 503 }
    );
  }

  try {
    const recipes = await runCypher(GET_RECIPES_WITH_READINESS_CYPHER, {
      userName: DEMO_USER,
    });

    return NextResponse.json({
      success: true,
      configured: true,
      recipes,
    });
  } catch (error) {
    console.error('Error computing recipe readiness:', error);
    return NextResponse.json(
      {
        error: 'Failed to compute recipe readiness from CognoDB.',
        details: error.message,
        configured: true,
        recipes: [],
      },
      { status: 500 }
    );
  }
}
