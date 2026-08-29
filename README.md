# PantryPath — Graph-Powered Smart Recipe & Substitution Engine

> **Wexa AI — Take-Home Assignment Submission**  
> **Candidate**: Varun  
> **Submission Email**: hr@wexa.ai  
> **Subject**: `CognoDB Assignment 2 – Varun`  

[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com)
[![Database](https://img.shields.io/badge/Database-CognoDB%20(openCypher)-emerald)](https://console.cognodb.com)
[![Framework](https://img.shields.io/badge/Framework-Next.js%2014-black?logo=next.js)](https://nextjs.org)

---

## 1. Use Case & Problem Overview

**PantryPath** is an intelligent recipe discovery engine that answers the real-world question: *"What can I cook right now with what is currently in my pantry?"*

Traditional recipe apps perform naive text matching or simple database queries. PantryPath models culinary knowledge natively as a **directed graph**:
1. **Multi-Hop Ingredient Substitutions**: If a recipe requires *Buttermilk* and the user doesn't have it, PantryPath traverses the graph to discover that the user has *Greek Yogurt*, which substitutes for *Plain Yogurt*, which in turn substitutes for *Buttermilk* (a 2-hop transitive substitution chain).
2. **Real-Time Dynamic Readiness**: Evaluates recipes on the fly into **Ready to Cook** (100% direct match), **Almost Ready** (covered via 1-hop or 2-hop substitutes, or 1–2 missing items), or **Missing Ingredients**.
3. **Graph-Native Recommendations ("Recipes Like This")**: Discovers and ranks related recipes using a 2-hop shared-ingredient traversal: `(:Recipe)-[:USES]->(:Ingredient)<-[:USES]-(:Recipe)`.

---

## 2. Why a Graph Database? (Graph vs. Relational SQL)

In a relational database (RDBMS), data is stored in normalized tables linked by foreign keys. While simple queries (e.g. *"Find recipes with Garlic"*) work with basic joins, culinary knowledge graphs require **relationship-first traversals**, where relational SQL struggles:

### 1. Multi-Hop Transitive Substitutions (Graph Traversal vs. Recursive CTEs)
Culinary substitutions form variable-length directed networks ($A \to B \to C$). In SQL, determining whether a user's inventory can fulfill a recipe through 1, 2, or $N$ hops requires recursive Common Table Expressions (`WITH RECURSIVE`) or repeated self-joins across `substitutions`, `recipe_ingredients`, and `user_pantry` tables. These queries are notoriously expensive, complex to maintain, and degrade as the dataset expands.  
In openCypher on CognoDB, variable-length path traversal is an intuitive single-expression pattern:
```cypher
MATCH (u:User)-[:HAS]->(sub:Ingredient)-[:SUBSTITUTE_FOR*1..2]->(target:Ingredient)
```
CognoDB resolves multi-hop paths in constant time per hop using **index-free adjacency** (pointer navigation in memory) without scanning foreign key indexes.

### 2. "Recipes Like This" (Index-Free Adjacency vs. Cartesian Self-Joins)
Recommending recipes based on shared ingredients in SQL requires self-joining the `recipe_ingredients` junction table (`FROM recipe_ingredients r1 JOIN recipe_ingredients r2 ON r1.ingredient_id = r2.ingredient_id WHERE r1.recipe_id != r2.recipe_id GROUP BY r2.recipe_id`). As the catalog scales, this creates massive Cartesian product intermediate sets.  
In a graph database, finding related recipes is a natural 2-hop pointer walk: follow outgoing `[:USES]` edges to Ingredients, then follow incoming `[:USES]` edges back to related Recipes. The query touches only connected nodes in memory.

---

## 3. Graph Data Model

### ASCII Diagram

```
                    ┌─────────────────────────┐
                    │          :User          │
                    │   name: 'Demo Pantry'   │
                    └────────────┬────────────┘
                                 │
                                 │ [:HAS]  (Real-time MERGE / DELETE)
                                 ▼
┌────────────────────────┐  [:USES {quantity}]  ┌────────────────────────┐
│        :Recipe         │ ───────────────────> │      :Ingredient       │
│  id, name, cuisine,    │                      │     name, category     │
│  instructions, times   │                      └───────────┬────────────┘
└────────────────────────┘                                  │
                                                            │ [:SUBSTITUTE_FOR]
                                                            │ (1 to 2 hops)
                                                            ▼
                                                ┌────────────────────────┐
                                                │      :Ingredient       │
                                                │     name, category     │
                                                └────────────────────────┘
```

### Mermaid Diagram

```mermaid
graph LR
    User[":User {name: 'Demo Pantry'}"] -->|:HAS| Ing1[":Ingredient (Greek Yogurt)"]
    Ing1 -->|:SUBSTITUTE_FOR| Ing2[":Ingredient (Plain Yogurt)"]
    Ing2 -->|:SUBSTITUTE_FOR| Ing3[":Ingredient (Buttermilk)"]
    Recipe[":Recipe (Buttermilk Pancakes)"] -->|:USES {quantity: '1.5 cups'}| Ing3
    Recipe -->|:USES| Ing4[":Ingredient (All-Purpose Flour)"]
    OtherRecipe[":Recipe (Skillet Chicken)"] -->|:USES| Ing3
```

### Entities & Relationships
- **`(:User)`**: Demo user node (`name: 'Demo Pantry'`).
- **`(:Ingredient)`**: Properties: `name` (unique), `category` (`Dairy`, `Produce`, `Pantry`, `Protein`).
- **`(:Recipe)`**: Properties: `id`, `name`, `cuisine`, `prepTime`, `cookTime`, `servings`, `difficulty`, `instructions`, `imageUrl`.
- **`[:USES {quantity}]`**: Connects a Recipe to required Ingredients with quantity measurements.
- **`[:SUBSTITUTE_FOR]`**: Directed edge indicating that source ingredient can substitute for target ingredient.
- **`[:HAS]`**: Connects a User to currently available Pantry items.

---

## 4. Main Cypher Queries Explained

All queries are parameterized via the official `neo4j-driver` in [`lib/queries.js`](file:///c:/Users/Bhavam/Projects/project/lib/queries.js).

### 1. Pantry Item Toggle (MERGE / DELETE)
```cypher
// Add ingredient to pantry
MERGE (u:User {name: $userName})
WITH u
MATCH (i:Ingredient {name: $ingredientName})
MERGE (u)-[r:HAS]->(i)
RETURN i.name AS name, true AS inPantry

// Remove ingredient from pantry
MATCH (u:User {name: $userName})-[r:HAS]->(i:Ingredient {name: $ingredientName})
DELETE r
RETURN $ingredientName AS name, false AS inPantry
```

### 2. Multi-Hop Recipe Readiness Computation
Evaluates direct `:HAS` relationships and up to 2-hop `[:SUBSTITUTE_FOR*1..2]` chains per ingredient:
```cypher
MATCH (r:Recipe)
OPTIONAL MATCH (u:User {name: $userName})
MATCH (r)-[uses:USES]->(required:Ingredient)

WITH r, uses, required, u,
     (size([(u)-[:HAS]->(required) | 1]) > 0) AS isDirect,
     [(u)-[:HAS]->(sub:Ingredient)-[:SUBSTITUTE_FOR*1..2]->(required) | sub.name] AS availableSubs

WITH r, uses, required, isDirect, availableSubs,
     (NOT isDirect AND size(availableSubs) > 0) AS isSubstituted,
     head(availableSubs) AS substituteFound

WITH r,
     count(required) AS totalCount,
     sum(CASE WHEN isDirect THEN 1 ELSE 0 END) AS directCount,
     sum(CASE WHEN isSubstituted THEN 1 ELSE 0 END) AS substitutedCount,
     sum(CASE WHEN NOT isDirect AND NOT isSubstituted THEN 1 ELSE 0 END) AS missingCount
RETURN r.id AS id, r.name AS name, totalCount, directCount, substitutedCount, missingCount,
       CASE 
         WHEN missingCount = 0 AND substitutedCount = 0 THEN 'READY'
         WHEN missingCount = 0 AND substitutedCount > 0 THEN 'ALMOST'
         WHEN missingCount <= 2 THEN 'ALMOST'
         ELSE 'MISSING'
       END AS readinessStatus
```

### 3. "Recipes Like This" (2-Hop Shared-Ingredient Traversal)
```cypher
MATCH (thisRecipe:Recipe {id: $recipeId})-[:USES]->(i:Ingredient)<-[:USES]-(otherRecipe:Recipe)
WHERE otherRecipe.id <> $recipeId
WITH otherRecipe, count(i) AS sharedIngredientCount, collect(i.name) AS sharedIngredients
RETURN otherRecipe.id AS id, otherRecipe.name AS name, otherRecipe.cuisine AS cuisine,
       sharedIngredientCount, sharedIngredients
ORDER BY sharedIngredientCount DESC
LIMIT $limit
```

---

## 5. Setup & Running Instructions

### Step 1: Create a CognoDB Cloud Instance
1. Sign up at [https://console.cognodb.com/signup](https://console.cognodb.com/signup) (free tier, no credit card required).
2. Click **Create Instance**, choose the free `c0` tier, and select a region.
3. Save your connection details:
   - **Connection URI**: `bolt+s://<instance-id>.databases.cognodb.com`
   - **User**: `cognodb`
   - **Password**: *(your generated password)*

### Step 2: Clone and Install Dependencies
```bash
git clone <your-repo-url>
cd project
npm install
```

### Step 3: Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
COGNODB_URI=bolt+s://<instance-id>.databases.cognodb.com
COGNODB_USER=cognodb
COGNODB_PASSWORD=your_password_here
```

### Step 4: Seed the Graph Database
Run the parameterized seed script:
```bash
npm run seed
```
*(This automatically wipes previous data and seeds 29 ingredients, 12 recipes, 10 substitution relationships with 2-hop chains, and the demo pantry).*

### Step 5: Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Screenshots & Demo Video

> **Hosted Application Demo**: `[Insert Hosted URL Here]`  
> **Screen Recording Walkthrough**: `[Insert Loom / Video Link Here]`

### UI Showcase

| Dashboard & Real-Time Pantry Readiness | Multi-Hop Substitution Path & Graph Recommendations |
| :---: | :---: |
| ![PantryPath Dashboard Screenshot](https://placehold.co/600x400/0f172a/34d399?text=Dashboard+&+Live+Pantry+Checklist) | ![Recipe Detail Screenshot](https://placehold.co/600x400/0f172a/34d399?text=Multi-Hop+Substitution+Chain) |

---

## 7. Deployment to Vercel

1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Under **Project Settings &rarr; Environment Variables**, add:
   - `COGNODB_URI`
   - `COGNODB_USER`
   - `COGNODB_PASSWORD`
4. Click **Deploy**.
