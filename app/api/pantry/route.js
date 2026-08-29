import { NextResponse } from 'next/server';
import { runCypher, isConfigured } from '@/lib/db';
import {
  DEMO_USER,
  GET_PANTRY_INGREDIENTS_CYPHER,
  ADD_PANTRY_ITEM_CYPHER,
  REMOVE_PANTRY_ITEM_CYPHER,
} from '@/lib/queries';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pantry
 * Returns all available ingredients categorized, along with a boolean flag
 * indicating whether the demo user currently has each ingredient.
 */
export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error: 'CognoDB credentials are not configured.',
        configured: false,
        ingredients: [],
      },
      { status: 503 }
    );
  }

  try {
    const rows = await runCypher(GET_PANTRY_INGREDIENTS_CYPHER, {
      userName: DEMO_USER,
    });

    return NextResponse.json({
      success: true,
      configured: true,
      ingredients: rows,
    });
  } catch (error) {
    console.error('Error fetching pantry items:', error);
    return NextResponse.json(
      {
        error: 'Unable to connect to CognoDB graph database.',
        details: error.message,
        configured: true,
        ingredients: [],
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pantry
 * Body: { ingredientName: string, inPantry: boolean }
 * 
 * Toggles an ingredient in the demo user's pantry.
 * If inPantry is true, runs a Cypher MERGE to create (:User)-[:HAS]->(:Ingredient).
 * If inPantry is false, runs a Cypher DELETE to remove the :HAS edge.
 */
export async function POST(request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'CognoDB credentials are not configured.', configured: false },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { ingredientName, inPantry } = body;

    if (!ingredientName) {
      return NextResponse.json(
        { error: 'Missing required field "ingredientName".' },
        { status: 400 }
      );
    }

    if (inPantry) {
      await runCypher(ADD_PANTRY_ITEM_CYPHER, {
        userName: DEMO_USER,
        ingredientName,
      });
    } else {
      await runCypher(REMOVE_PANTRY_ITEM_CYPHER, {
        userName: DEMO_USER,
        ingredientName,
      });
    }

    return NextResponse.json({
      success: true,
      ingredientName,
      inPantry: Boolean(inPantry),
    });
  } catch (error) {
    console.error('Error toggling pantry item:', error);
    return NextResponse.json(
      {
        error: 'Database operation failed while updating pantry.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
