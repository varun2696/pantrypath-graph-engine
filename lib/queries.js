/**
 * PantryPath Cypher Queries Repository
 * 
 * Each query in this file is written using openCypher and parameterized for security and performance.
 * Detailed comments explain what each query accomplishes and why graph traversal is superior
 * to relational SQL joins for each specific task.
 */

export const DEMO_USER = 'Demo Pantry';

/**
 * QUERY 1: Fetch All Ingredients & User Pantry State
 * 
 * WHAT IT DOES:
 * Retrieves the full master list of ingredients, ordered by category and name.
 * For each ingredient, it performs a 1-hop pattern match to check whether the demo user
 * has a (:User)-[:HAS]->(:Ingredient) relationship.
 * 
 * WHY A GRAPH:
 * A simple 1-hop edge traversal directly tests user ownership without requiring
 * secondary index scans over large user-item junction tables.
 */
export const GET_PANTRY_INGREDIENTS_CYPHER = `
  /*
   * Matches all ingredient nodes in the graph and evaluates whether the specified
   * User has an outgoing HAS relationship to each ingredient.
   */
  MATCH (i:Ingredient)
  OPTIONAL MATCH (u:User {name: $userName})-[h:HAS]->(i)
  RETURN 
    i.name AS name,
    i.category AS category,
    (h IS NOT NULL) AS inPantry
  ORDER BY i.category ASC, i.name ASC
`;

/**
 * QUERY 2: Add Ingredient to User's Pantry
 * 
 * WHAT IT DOES:
 * Ensures the demo User exists and creates a :HAS relationship between the User
 * and the target Ingredient using MERGE (idempotent addition).
 * 
 * WHY A GRAPH:
 * Creating a graph edge is an atomic, constant-time pointer insertion.
 */
export const ADD_PANTRY_ITEM_CYPHER = `
  /*
   * Idempotently connects the user node to the ingredient node via a HAS edge.
   */
  MERGE (u:User {name: $userName})
  WITH u
  MATCH (i:Ingredient {name: $ingredientName})
  MERGE (u)-[r:HAS]->(i)
  RETURN i.name AS name, true AS inPantry
`;

/**
 * QUERY 3: Remove Ingredient from User's Pantry
 * 
 * WHAT IT DOES:
 * Matches the :HAS relationship between the User and the target Ingredient and deletes the edge.
 * 
 * WHY A GRAPH:
 * Edge deletion removes the pointer without mutating the underlying Ingredient node or
 * leaving orphaned foreign key rows.
 */
export const REMOVE_PANTRY_ITEM_CYPHER = `
  /*
   * Finds and deletes the specific HAS edge connecting the user to the ingredient.
   */
  MATCH (u:User {name: $userName})-[r:HAS]->(i:Ingredient {name: $ingredientName})
  DELETE r
  RETURN $ingredientName AS name, false AS inPantry
`;

/**
 * QUERY 4: "What Can I Cook Right Now?" (Multi-Hop Readiness Computation)
 * 
 * WHAT IT DOES:
 * For every recipe in the database, it evaluates each required ingredient against the user's pantry.
 * If the user does NOT have the exact ingredient, it traverses up to 2 hops along outgoing
 * (:Ingredient)-[:SUBSTITUTE_FOR*1..2]->(:Ingredient) relationships to see if the user possesses
 * an acceptable direct or transitive substitute.
 * 
 * It then aggregates the recipe readiness:
 * - Direct matches: User has exact ingredient.
 * - Substitute matches: User has a 1-hop or 2-hop substitute.
 * - Missing: No exact item and no known substitute in the user's pantry.
 * 
 * WHY A GRAPH:
 * In a relational database, checking variable-length substitution chains (e.g. Greek Yogurt -> Plain Yogurt -> Buttermilk)
 * requires recursive Common Table Expressions (WITH RECURSIVE) or repeated costly self-joins on a
 * substitutions table, joined against a user_inventory table, joined against a recipe_ingredients table.
 * In a graph database, variable-length path traversal \`[:SUBSTITUTE_FOR*1..2]\` is a native, index-free
 * adjacency walk that executes in microseconds regardless of database size.
 */
export const GET_RECIPES_WITH_READINESS_CYPHER = `
  /*
   * Traverses all recipes and their required ingredients.
   * For each ingredient:
   * 1. Checks direct HAS edge from User.
   * 2. Checks transitive SUBSTITUTE_FOR path (1 to 2 hops) from any ingredient the User HAS.
   * Pattern comprehension ensures each required ingredient is evaluated exactly once without row multiplication.
   */
  MATCH (r:Recipe)
  OPTIONAL MATCH (u:User {name: $userName})
  
  // Find all ingredients required by this recipe (exactly 1 row per ingredient)
  MATCH (r)-[uses:USES]->(required:Ingredient)
  
  // Direct match & substitute check using pattern comprehension
  WITH r, uses, required, u,
       (size([(u)-[:HAS]->(required) | 1]) > 0) AS isDirect,
       [(u)-[:HAS]->(sub:Ingredient)-[:SUBSTITUTE_FOR*1..2]->(required) | sub.name] AS availableSubs
       
  WITH r, uses, required,
       isDirect,
       availableSubs,
       (NOT isDirect AND size(availableSubs) > 0) AS isSubstituted,
       head(availableSubs) AS substituteFound
       
  WITH r,
       count(required) AS totalCount,
       sum(CASE WHEN isDirect THEN 1 ELSE 0 END) AS directCount,
       sum(CASE WHEN isSubstituted THEN 1 ELSE 0 END) AS substitutedCount,
       sum(CASE WHEN NOT isDirect AND NOT isSubstituted THEN 1 ELSE 0 END) AS missingCount,
       collect({
         name: required.name,
         category: required.category,
         quantity: uses.quantity,
         status: CASE 
                   WHEN isDirect THEN 'HAVE'
                   WHEN isSubstituted THEN 'SUBSTITUTE'
                   ELSE 'MISSING'
                 END,
         substituteUsed: substituteFound
       }) AS ingredients
       
  RETURN 
    r.id AS id,
    r.name AS name,
    r.cuisine AS cuisine,
    r.prepTime AS prepTime,
    r.cookTime AS cookTime,
    r.servings AS servings,
    r.difficulty AS difficulty,
    r.imageUrl AS imageUrl,
    totalCount,
    directCount,
    substitutedCount,
    missingCount,
    CASE 
      WHEN missingCount = 0 AND substitutedCount = 0 THEN 'READY'
      WHEN missingCount = 0 AND substitutedCount > 0 THEN 'ALMOST'
      WHEN missingCount <= 2 THEN 'ALMOST'
      ELSE 'MISSING'
    END AS readinessStatus,
    ingredients
  ORDER BY 
    CASE 
      WHEN missingCount = 0 AND substitutedCount = 0 THEN 1
      WHEN missingCount = 0 THEN 2
      WHEN missingCount <= 2 THEN 3
      ELSE 4
    END ASC,
    (directCount + substitutedCount) DESC,
    r.name ASC
`;

/**
 * QUERY 5: Recipe Detail & Substitution Chain Path Tracing
 * 
 * WHAT IT DOES:
 * Retrieves full details for a single recipe, including step-by-step instructions.
 * For every required ingredient, it determines whether the user HAS it directly, or finds the
 * shortest path along (:Ingredient)-[:SUBSTITUTE_FOR*1..2]->(required) to an ingredient the user DOES have.
 * It returns the explicit chain of substitution nodes (e.g. ["Greek Yogurt", "Plain Yogurt", "Buttermilk"]).
 * 
 * WHY A GRAPH:
 * The shortestPath() graph algorithm natively finds the minimal hops through the substitution network
 * and extracts the ordered node sequence. In SQL, reconstructing the ordered chain of transitive substitutions
 * requires complex recursive graph simulation queries with string aggregations or window functions.
 */
export const GET_RECIPE_DETAIL_CYPHER = `
  /*
   * Retrieves single recipe details and computes shortest substitution paths for missing ingredients.
   * Pattern comprehension ensures each required ingredient is evaluated exactly once with its true quantity.
   */
  MATCH (r:Recipe {id: $recipeId})
  OPTIONAL MATCH (u:User {name: $userName})
  
  MATCH (r)-[uses:USES]->(required:Ingredient)
  
  WITH r, uses, required, u,
       (size([(u)-[:HAS]->(required) | 1]) > 0) AS isDirect,
       [(u)-[:HAS]->(sub:Ingredient)-[path:SUBSTITUTE_FOR*1..2]->(required) | [node IN nodes(path) | node.name]] AS allPaths
       
  WITH r, uses, required, isDirect,
       head(allPaths) AS subPathNames
       
  WITH r, collect({
    name: required.name,
    category: required.category,
    quantity: uses.quantity,
    status: CASE 
      WHEN isDirect THEN 'HAVE'
      WHEN subPathNames IS NOT NULL AND size(subPathNames) > 0 THEN 'SUBSTITUTE'
      ELSE 'MISSING'
    END,
    substituteChain: subPathNames
  }) AS ingredients
  
  RETURN 
    r.id AS id,
    r.name AS name,
    r.instructions AS instructions,
    r.cuisine AS cuisine,
    r.prepTime AS prepTime,
    r.cookTime AS cookTime,
    r.servings AS servings,
    r.difficulty AS difficulty,
    r.imageUrl AS imageUrl,
    ingredients
`;

/**
 * QUERY 6: "Recipes Like This" (Native 2-Hop Shared Ingredient Graph Recommendation)
 * 
 * WHAT IT DOES:
 * Traverses from the current recipe through all of its required ingredients and hops back
 * to other recipes that use those same ingredients:
 * (currentRecipe)-[:USES]->(:Ingredient)<-[:USES]-(otherRecipe)
 * 
 * It groups by otherRecipe, counts how many shared ingredients they have in common,
 * collects the shared ingredient names, and returns the top 3-4 recommendations.
 * 
 * WHY A GRAPH (STANDOUT GRAPH PATTERN):
 * In a relational database, this recommendation requires a self-join on a \`recipe_ingredients\`
 * junction table (\`FROM recipe_ingredients r1 JOIN recipe_ingredients r2 ON r1.ingredient_id = r2.ingredient_id\`),
 * followed by a filter \`WHERE r1.recipe_id != r2.recipe_id\` and an aggregation \`GROUP BY r2.recipe_id\`.
 * As the recipe catalog and ingredient count grow, this self-join creates massive Cartesian intermediate
 * result sets that degrade quickly.
 * 
 * In a graph database, this is an intuitive 2-hop pointer traversal: follow outgoing :USES edges
 * to Ingredient nodes, then follow incoming :USES edges back to related Recipe nodes. The traversal
 * explores ONLY connected neighbors (index-free adjacency) without scanning unrelated tables.
 */
export const GET_RELATED_RECIPES_CYPHER = `
  /*
   * 2-Hop Shared Ingredient Recommendation Pattern:
   * (r:Recipe)-[:USES]->(i:Ingredient)<-[:USES]-(rec:Recipe)
   */
  MATCH (thisRecipe:Recipe {id: $recipeId})-[:USES]->(i:Ingredient)<-[:USES]-(otherRecipe:Recipe)
  WHERE otherRecipe.id <> $recipeId
  
  WITH otherRecipe, 
       count(i) AS sharedIngredientCount, 
       collect(i.name) AS sharedIngredients
       
  RETURN 
    otherRecipe.id AS id,
    otherRecipe.name AS name,
    otherRecipe.cuisine AS cuisine,
    otherRecipe.prepTime AS prepTime,
    otherRecipe.cookTime AS cookTime,
    otherRecipe.difficulty AS difficulty,
    otherRecipe.imageUrl AS imageUrl,
    sharedIngredientCount,
    sharedIngredients
  ORDER BY sharedIngredientCount DESC, otherRecipe.name ASC
  LIMIT $limit
`;
