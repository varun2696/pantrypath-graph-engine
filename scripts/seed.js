/**
 * PantryPath CognoDB Graph Database Seed Script
 * 
 * Run with: node scripts/seed.js
 * 
 * Populates CognoDB with:
 * - 24 Realistic Ingredients across 5 categories
 * - 12 Delicious Recipes with USES relationships and realistic quantities
 * - 10 SUBSTITUTE_FOR relationships (featuring 2-hop transitive substitution chains)
 * - 1 Demo User ("Demo Pantry") with a realistic starter pantry
 * 
 * All queries are strictly parameterized using openCypher via the official neo4j-driver.
 */

const neo4j = require('neo4j-driver');
const fs = require('fs');
const path = require('path');

// Simple .env.local / .env file loader for standalone Node execution
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      });
      console.log(`Loaded environment from ${file}`);
      return;
    }
  }
}

loadEnv();

const uri = process.env.COGNODB_URI;
const user = process.env.COGNODB_USER || 'cognodb';
const password = process.env.COGNODB_PASSWORD;

if (!uri || !password) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: Missing database configuration.');
  console.error('Please configure COGNODB_URI and COGNODB_PASSWORD in .env.local before running the seed script.');
  console.error('Example:');
  console.error('  COGNODB_URI=bolt+s://<instance-id>.databases.cognodb.cloud');
  console.error('  COGNODB_USER=cognodb');
  console.error('  COGNODB_PASSWORD=your_password');
  process.exit(1);
}

// -------------------------------------------------------------
// DATA DEFINITIONS
// -------------------------------------------------------------

const INGREDIENTS = [
  // Dairy & Alternatives
  { name: 'Buttermilk', category: 'Dairy' },
  { name: 'Plain Yogurt', category: 'Dairy' },
  { name: 'Greek Yogurt', category: 'Dairy' },
  { name: 'Heavy Cream', category: 'Dairy' },
  { name: 'Butter', category: 'Dairy' },
  { name: 'Parmesan Cheese', category: 'Dairy' },
  { name: 'Mozzarella Cheese', category: 'Dairy' },

  // Pantry & Baking
  { name: 'All-Purpose Flour', category: 'Pantry' },
  { name: 'Baking Powder', category: 'Pantry' },
  { name: 'Brown Sugar', category: 'Pantry' },
  { name: 'Maple Syrup', category: 'Pantry' },
  { name: 'Honey', category: 'Pantry' },
  { name: 'Olive Oil', category: 'Pantry' },
  { name: 'Pasta', category: 'Pantry' },
  { name: 'Rice', category: 'Pantry' },
  { name: 'Soy Sauce', category: 'Pantry' },
  { name: 'Tamari', category: 'Pantry' },
  { name: 'Dijon Mustard', category: 'Pantry' },
  { name: 'Mashed Banana', category: 'Pantry' },
  { name: 'Applesauce', category: 'Pantry' },

  // Produce
  { name: 'Garlic', category: 'Produce' },
  { name: 'Onion', category: 'Produce' },
  { name: 'Tomatoes', category: 'Produce' },
  { name: 'Lemon', category: 'Produce' },
  { name: 'Basil', category: 'Produce' },
  { name: 'Spinach', category: 'Produce' },
  { name: 'Mushrooms', category: 'Produce' },

  // Proteins
  { name: 'Eggs', category: 'Protein' },
  { name: 'Chicken Breast', category: 'Protein' },
];

/**
 * Substitution Graph with Multi-Hop Chains:
 * 
 * 1. 2-Hop Dairy Chain:
 *    (Greek Yogurt) -[:SUBSTITUTE_FOR]-> (Plain Yogurt) -[:SUBSTITUTE_FOR]-> (Buttermilk)
 * 
 * 2. 2-Hop Baking Egg Chain:
 *    (Applesauce) -[:SUBSTITUTE_FOR]-> (Mashed Banana) -[:SUBSTITUTE_FOR]-> (Eggs)
 * 
 * 3. 2-Hop Sweetener Chain:
 *    (Honey) -[:SUBSTITUTE_FOR]-> (Maple Syrup) -[:SUBSTITUTE_FOR]-> (Brown Sugar)
 * 
 * 4. 1-Hop Soy Sauce alternative:
 *    (Tamari) -[:SUBSTITUTE_FOR]-> (Soy Sauce)
 * 
 * 5. 1-Hop Dairy / Fat alternative:
 *    (Olive Oil) -[:SUBSTITUTE_FOR]-> (Butter)
 */
const SUBSTITUTIONS = [
  // Chain 1: Greek Yogurt -> Plain Yogurt -> Buttermilk
  { from: 'Greek Yogurt', to: 'Plain Yogurt' },
  { from: 'Plain Yogurt', to: 'Buttermilk' },

  // Chain 2: Applesauce -> Mashed Banana -> Eggs
  { from: 'Applesauce', to: 'Mashed Banana' },
  { from: 'Mashed Banana', to: 'Eggs' },

  // Chain 3: Honey -> Maple Syrup -> Brown Sugar
  { from: 'Honey', to: 'Maple Syrup' },
  { from: 'Maple Syrup', to: 'Brown Sugar' },

  // Single hops
  { from: 'Tamari', to: 'Soy Sauce' },
  { from: 'Olive Oil', to: 'Butter' },
  { from: 'Mozzarella Cheese', to: 'Parmesan Cheese' },
  { from: 'Spinach', to: 'Basil' },
];

const RECIPES = [
  {
    id: 'fluffy-buttermilk-pancakes',
    name: 'Fluffy Golden Buttermilk Pancakes',
    cuisine: 'American',
    prepTime: '10 mins',
    cookTime: '15 mins',
    servings: 4,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'In a large bowl, whisk together flour, brown sugar, and baking powder.',
      'In a separate bowl, combine buttermilk, eggs, and melted butter.',
      'Gently fold wet ingredients into dry until just combined (lumps are fine).',
      'Heat a lightly oiled griddle over medium-high heat. Pour 1/4 cup batter for each pancake.',
      'Brown on both sides and serve warm with syrup or honey.'
    ],
    ingredients: [
      { name: 'All-Purpose Flour', quantity: '2 cups' },
      { name: 'Baking Powder', quantity: '2 tsp' },
      { name: 'Brown Sugar', quantity: '2 tbsp' },
      { name: 'Buttermilk', quantity: '1.5 cups' },
      { name: 'Eggs', quantity: '2 large' },
      { name: 'Butter', quantity: '3 tbsp melted' },
    ]
  },
  {
    id: 'classic-garlic-tomato-pasta',
    name: 'Classic Garlic & Tomato Basil Pasta',
    cuisine: 'Italian',
    prepTime: '10 mins',
    cookTime: '15 mins',
    servings: 2,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Bring a large pot of salted water to boil. Cook pasta until al dente.',
      'In a skillet, heat olive oil over medium heat. Sauté sliced garlic until fragrant and golden.',
      'Add diced tomatoes and simmer for 8 minutes until a rich sauce forms.',
      'Toss drained pasta in the sauce. Fold in fresh basil and top with parmesan cheese.'
    ],
    ingredients: [
      { name: 'Pasta', quantity: '250g' },
      { name: 'Olive Oil', quantity: '3 tbsp' },
      { name: 'Garlic', quantity: '4 cloves minced' },
      { name: 'Tomatoes', quantity: '3 ripe diced' },
      { name: 'Basil', quantity: '1/4 cup fresh' },
      { name: 'Parmesan Cheese', quantity: '1/3 cup grated' }
    ]
  },
  {
    id: 'creamy-tuscan-garlic-chicken',
    name: 'Creamy Tuscan Garlic Chicken',
    cuisine: 'Italian',
    prepTime: '15 mins',
    cookTime: '20 mins',
    servings: 4,
    difficulty: 'Medium',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Season chicken breasts with salt and pepper. Sear in olive oil until golden on both sides.',
      'Remove chicken. In the same pan, melt butter and sauté garlic and onions for 2 minutes.',
      'Add tomatoes, mushrooms, and spinach. Cook until spinach is wilted.',
      'Pour in heavy cream and parmesan cheese; simmer until sauce thickens.',
      'Return chicken to skillet and coat with the luscious creamy sauce.'
    ],
    ingredients: [
      { name: 'Chicken Breast', quantity: '500g' },
      { name: 'Olive Oil', quantity: '2 tbsp' },
      { name: 'Butter', quantity: '1 tbsp' },
      { name: 'Garlic', quantity: '4 cloves' },
      { name: 'Onion', quantity: '1 small diced' },
      { name: 'Tomatoes', quantity: '2 diced' },
      { name: 'Spinach', quantity: '2 cups' },
      { name: 'Mushrooms', quantity: '150g sliced' },
      { name: 'Heavy Cream', quantity: '1 cup' },
      { name: 'Parmesan Cheese', quantity: '1/2 cup grated' }
    ]
  },
  {
    id: 'garlic-butter-pan-mushrooms',
    name: 'Garlic Butter Sautéed Mushrooms',
    cuisine: 'French',
    prepTime: '5 mins',
    cookTime: '10 mins',
    servings: 2,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Wipe mushrooms clean and slice them in halves or thick wedges.',
      'Melt butter with olive oil in a wide skillet over high heat.',
      'Add mushrooms in a single layer without stirring for 3 minutes to achieve deep caramelization.',
      'Toss in minced garlic, a squeeze of fresh lemon juice, and chopped basil. Sauté 2 more minutes.'
    ],
    ingredients: [
      { name: 'Mushrooms', quantity: '300g' },
      { name: 'Butter', quantity: '2 tbsp' },
      { name: 'Olive Oil', quantity: '1 tbsp' },
      { name: 'Garlic', quantity: '3 cloves minced' },
      { name: 'Lemon', quantity: '1/2 juiced' },
      { name: 'Basil', quantity: '2 tbsp' }
    ]
  },
  {
    id: 'honey-soy-glazed-chicken',
    name: 'Honey-Soy Glazed Chicken Rice Bowl',
    cuisine: 'Asian Fusion',
    prepTime: '10 mins',
    cookTime: '20 mins',
    servings: 3,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Cook rice according to package directions.',
      'In a small bowl, whisk soy sauce, honey, brown sugar, minced garlic, and lemon juice.',
      'Sear diced chicken breast in olive oil until fully cooked and lightly browned.',
      'Pour glaze over chicken and simmer on medium-low until it reduces into a sticky coat.',
      'Serve chicken over warm rice topped with sautéed spinach or mushrooms.'
    ],
    ingredients: [
      { name: 'Chicken Breast', quantity: '450g diced' },
      { name: 'Rice', quantity: '1.5 cups' },
      { name: 'Soy Sauce', quantity: '3 tbsp' },
      { name: 'Honey', quantity: '2 tbsp' },
      { name: 'Brown Sugar', quantity: '1 tbsp' },
      { name: 'Garlic', quantity: '2 cloves' },
      { name: 'Lemon', quantity: '1 tsp juice' },
      { name: 'Olive Oil', quantity: '1 tbsp' }
    ]
  },
  {
    id: 'spinach-parmesan-omelette',
    name: 'Spinach & Herb French Omelette',
    cuisine: 'French',
    prepTime: '5 mins',
    cookTime: '5 mins',
    servings: 1,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Vigorously whisk eggs with a pinch of salt until completely smooth.',
      'Melt butter in a non-stick pan over medium-low heat.',
      'Pour eggs into pan. Sauté spinach and garlic lightly, then fold into eggs with parmesan cheese.',
      'Gently roll the omelette into a cylinder and slide onto a warm plate.'
    ],
    ingredients: [
      { name: 'Eggs', quantity: '3 large' },
      { name: 'Butter', quantity: '1.5 tbsp' },
      { name: 'Spinach', quantity: '1 cup baby spinach' },
      { name: 'Garlic', quantity: '1 clove grated' },
      { name: 'Parmesan Cheese', quantity: '2 tbsp' }
    ]
  },
  {
    id: 'creamy-parmesan-mushroom-risotto',
    name: 'Creamy Garlic Mushroom Risotto',
    cuisine: 'Italian',
    prepTime: '10 mins',
    cookTime: '30 mins',
    servings: 3,
    difficulty: 'Medium',
    imageUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'In a heavy-bottom pot, sauté diced onions and garlic in olive oil and butter.',
      'Add sliced mushrooms and cook until browned. Stir in rice and toast for 2 minutes.',
      'Gradually ladle warm water or stock one cup at a time, stirring continuously until absorbed.',
      'Once rice is creamy and tender, remove from heat and vigorously stir in heavy cream and parmesan cheese.'
    ],
    ingredients: [
      { name: 'Rice', quantity: '1.5 cups arborio/white' },
      { name: 'Mushrooms', quantity: '250g' },
      { name: 'Onion', quantity: '1 medium' },
      { name: 'Garlic', quantity: '3 cloves' },
      { name: 'Butter', quantity: '2 tbsp' },
      { name: 'Olive Oil', quantity: '1 tbsp' },
      { name: 'Heavy Cream', quantity: '1/3 cup' },
      { name: 'Parmesan Cheese', quantity: '1/2 cup grated' }
    ]
  },
  {
    id: 'rustic-garlic-herb-mushroom-pasta',
    name: 'Rustic Garlic & Herb Mushroom Pasta',
    cuisine: 'Italian',
    prepTime: '10 mins',
    cookTime: '20 mins',
    servings: 3,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Boil pasta in salted water until al dente.',
      'In a deep pan, sauté sliced mushrooms and onions in olive oil and butter until deeply caramelized.',
      'Add minced garlic and crushed tomatoes; simmer for 10 minutes until a fragrant sauce forms.',
      'Toss drained pasta directly into the sauce, folding in fresh basil and parmesan cheese.'
    ],
    ingredients: [
      { name: 'Pasta', quantity: '300g' },
      { name: 'Mushrooms', quantity: '250g sliced' },
      { name: 'Tomatoes', quantity: '3 ripe pureed' },
      { name: 'Onion', quantity: '1 medium' },
      { name: 'Garlic', quantity: '4 cloves' },
      { name: 'Olive Oil', quantity: '2 tbsp' },
      { name: 'Butter', quantity: '1 tbsp' },
      { name: 'Basil', quantity: '2 tbsp' },
      { name: 'Parmesan Cheese', quantity: '1/3 cup' }
    ]
  },
  {
    id: 'lemon-garlic-buttermilk-marinade-chicken',
    name: 'Crispy Lemon Garlic Skillet Chicken',
    cuisine: 'Mediterranean',
    prepTime: '15 mins',
    cookTime: '20 mins',
    servings: 3,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Tenderize chicken breast in a marinade of buttermilk, minced garlic, lemon juice, and olive oil for 20 mins.',
      'Lightly dust chicken in flour.',
      'Heat butter and olive oil in a skillet. Sear chicken until deeply golden brown and cooked through (6-7 mins per side).',
      'Deglaze pan with extra lemon juice and drizzle pan juices over chicken.'
    ],
    ingredients: [
      { name: 'Chicken Breast', quantity: '500g' },
      { name: 'Buttermilk', quantity: '1/2 cup' },
      { name: 'Garlic', quantity: '3 cloves' },
      { name: 'Lemon', quantity: '1 whole' },
      { name: 'Olive Oil', quantity: '2 tbsp' },
      { name: 'Butter', quantity: '1 tbsp' },
      { name: 'All-Purpose Flour', quantity: '3 tbsp' }
    ]
  },
  {
    id: 'homemade-margherita-flatbread',
    name: 'Crispy Garlic Margherita Flatbread',
    cuisine: 'Italian',
    prepTime: '15 mins',
    cookTime: '12 mins',
    servings: 2,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Mix flour, baking powder, olive oil, and warm water to form a quick flatbread dough.',
      'Roll out dough thin onto a baking sheet. Brush with garlic-infused olive oil.',
      'Spread crushed tomatoes, fresh basil leaves, and torn mozzarella cheese evenly.',
      'Bake at 220°C (430°F) for 10-12 minutes until crust is crispy and cheese is bubbling.'
    ],
    ingredients: [
      { name: 'All-Purpose Flour', quantity: '1.5 cups' },
      { name: 'Baking Powder', quantity: '1 tsp' },
      { name: 'Olive Oil', quantity: '2 tbsp' },
      { name: 'Garlic', quantity: '2 cloves' },
      { name: 'Tomatoes', quantity: '2 ripe crushed' },
      { name: 'Mozzarella Cheese', quantity: '150g' },
      { name: 'Basil', quantity: '1/4 cup' }
    ]
  },
  {
    id: 'garlic-egg-fried-rice',
    name: 'Quick Golden Garlic Egg Fried Rice',
    cuisine: 'Asian',
    prepTime: '5 mins',
    cookTime: '10 mins',
    servings: 2,
    difficulty: 'Easy',
    imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'Heat olive oil in a wok or large pan. Sauté sliced garlic and onions until crispy.',
      'Push aromatics to the side, crack eggs in the center and scramble until soft curds form.',
      'Add cooked chilled rice and break up clumps over high heat.',
      'Drizzle soy sauce and a touch of butter, tossing rapidly until every grain is savory and aromatic.'
    ],
    ingredients: [
      { name: 'Rice', quantity: '2 cups cooked' },
      { name: 'Eggs', quantity: '3 large' },
      { name: 'Garlic', quantity: '4 cloves' },
      { name: 'Onion', quantity: '1 small diced' },
      { name: 'Soy Sauce', quantity: '2 tbsp' },
      { name: 'Butter', quantity: '1 tbsp' },
      { name: 'Olive Oil', quantity: '1 tbsp' }
    ]
  },
  {
    id: 'sweet-creamy-banana-bread',
    name: 'Golden Sweet Skillet Banana Loaf',
    cuisine: 'Bakery',
    prepTime: '15 mins',
    cookTime: '35 mins',
    servings: 6,
    difficulty: 'Medium',
    imageUrl: 'https://images.unsplash.com/photo-1605698802004-949e370a2414?auto=format&fit=crop&w=600&q=80',
    instructions: [
      'In a bowl, combine mashed banana with brown sugar, melted butter, and eggs.',
      'Gently stir in all-purpose flour and baking powder until just combined.',
      'Pour batter into a greased baking pan or cast iron skillet.',
      'Bake at 175°C (350°F) for 35 minutes until a toothpick inserted in the center comes out clean.'
    ],
    ingredients: [
      { name: 'Mashed Banana', quantity: '3 ripe bananas' },
      { name: 'All-Purpose Flour', quantity: '1.5 cups' },
      { name: 'Baking Powder', quantity: '1.5 tsp' },
      { name: 'Brown Sugar', quantity: '1/2 cup' },
      { name: 'Butter', quantity: '1/3 cup melted' },
      { name: 'Eggs', quantity: '2 large' }
    ]
  }
];

/**
 * Demo User Starter Pantry Items:
 * - Notice Greek Yogurt is included (which tests the 2-hop Greek Yogurt -> Plain Yogurt -> Buttermilk chain for Pancakes/Chicken!)
 * - Notice Olive Oil, Garlic, Pasta, Tomatoes, Salt/Sugar are included
 */
const DEMO_USER_PANTRY = [
  'Greek Yogurt',
  'Olive Oil',
  'Garlic',
  'Pasta',
  'Tomatoes',
  'All-Purpose Flour',
  'Baking Powder',
  'Honey',
  'Soy Sauce',
  'Onion'
];

// -------------------------------------------------------------
// SEED EXECUTION
// -------------------------------------------------------------

async function seed() {
  console.log(`\nConnecting to CognoDB at: ${uri}...`);
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

  const session = driver.session();
  try {
    console.log('Cleaning existing graph data...');
    await session.run('MATCH (n) DETACH DELETE n');

    console.log(`Seeding ${INGREDIENTS.length} Ingredients...`);
    await session.run(
      `
      UNWIND $ingredients AS ing
      MERGE (i:Ingredient {name: ing.name})
      SET i.category = ing.category
      `,
      { ingredients: INGREDIENTS }
    );

    console.log(`Seeding ${SUBSTITUTIONS.length} Substitution relationships...`);
    await session.run(
      `
      UNWIND $substitutions AS sub
      MATCH (from:Ingredient {name: sub.from})
      MATCH (to:Ingredient {name: sub.to})
      MERGE (from)-[:SUBSTITUTE_FOR]->(to)
      `,
      { substitutions: SUBSTITUTIONS }
    );

    console.log(`Seeding ${RECIPES.length} Recipes with USES relationships...`);
    for (const recipe of RECIPES) {
      await session.run(
        `
        MERGE (r:Recipe {id: $id})
        SET r.name = $name,
            r.cuisine = $cuisine,
            r.prepTime = $prepTime,
            r.cookTime = $cookTime,
            r.servings = $servings,
            r.difficulty = $difficulty,
            r.imageUrl = $imageUrl,
            r.instructions = $instructions
        WITH r
        UNWIND $ingredients AS ing
        MATCH (i:Ingredient {name: ing.name})
        MERGE (r)-[:USES {quantity: ing.quantity}]->(i)
        `,
        {
          id: recipe.id,
          name: recipe.name,
          cuisine: recipe.cuisine,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          imageUrl: recipe.imageUrl,
          instructions: recipe.instructions,
          ingredients: recipe.ingredients
        }
      );
    }

    console.log(`Seeding Demo User "Demo Pantry" with ${DEMO_USER_PANTRY.length} starter ingredients...`);
    await session.run(
      `
      MERGE (u:User {name: $userName})
      WITH u
      UNWIND $items AS itemName
      MATCH (i:Ingredient {name: itemName})
      MERGE (u)-[:HAS]->(i)
      `,
      {
        userName: 'Demo Pantry',
        items: DEMO_USER_PANTRY
      }
    );

    // Verify and print statistics
    const statsResult = await session.run(`
      MATCH (i:Ingredient) WITH count(i) AS ingredientCount
      MATCH (r:Recipe) WITH ingredientCount, count(r) AS recipeCount
      MATCH ()-[s:SUBSTITUTE_FOR]->() WITH ingredientCount, recipeCount, count(s) AS subCount
      MATCH ()-[u:USES]->() WITH ingredientCount, recipeCount, subCount, count(u) AS usesCount
      MATCH (:User)-[h:HAS]->() WITH ingredientCount, recipeCount, subCount, usesCount, count(h) AS pantryCount
      RETURN ingredientCount, recipeCount, subCount, usesCount, pantryCount
    `);

    const stats = statsResult.records[0];
    console.log('\n\x1b[32m%s\x1b[0m', 'CognoDB Graph successfully seeded!');
    console.log('--------------------------------------------------');
    console.log(`Ingredients:          ${stats.get('ingredientCount')}`);
    console.log(`Recipes:              ${stats.get('recipeCount')}`);
    console.log(`SUBSTITUTE_FOR Edges: ${stats.get('subCount')}`);
    console.log(`USES Edges:           ${stats.get('usesCount')}`);
    console.log(`Demo User HAS Edges:  ${stats.get('pantryCount')}`);
    console.log('--------------------------------------------------\n');

  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Seeding failed with error:');
    console.error(err);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

seed();
