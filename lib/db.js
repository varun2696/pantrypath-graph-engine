import neo4j from 'neo4j-driver';

/**
 * CognoDB / Neo4j Driver Singleton
 * 
 * In serverless environments (like Vercel) and Next.js hot-reloading in dev,
 * modules can be re-evaluated frequently. Creating a new driver instance per request
 * or per module import will quickly exhaust CognoDB's free-tier connection limit (max 200).
 * 
 * We attach the single driver instance to `globalThis` so it persists across invocations.
 */

const COGNODB_URI = process.env.COGNODB_URI;
const COGNODB_USER = process.env.COGNODB_USER || 'cognodb';
const COGNODB_PASSWORD = process.env.COGNODB_PASSWORD;

function createDriver() {
  if (!COGNODB_URI || !COGNODB_PASSWORD) {
    return null;
  }

  return neo4j.driver(
    COGNODB_URI,
    neo4j.auth.basic(COGNODB_USER, COGNODB_PASSWORD),
    {
      maxConnectionPoolSize: 50,
      connectionTimeout: 10000, // 10 seconds
      maxTransactionRetryTime: 15000,
    }
  );
}

// Global cache on globalThis
if (!globalThis.__cognodb_driver) {
  globalThis.__cognodb_driver = createDriver();
}

/**
 * Returns the cached singleton driver instance.
 * If credentials became available at runtime, lazily creates it.
 */
export function getDriver() {
  if (!globalThis.__cognodb_driver) {
    globalThis.__cognodb_driver = createDriver();
  }
  return globalThis.__cognodb_driver;
}

/**
 * Helper to check whether database environment variables are configured.
 */
export function isConfigured() {
  return Boolean(process.env.COGNODB_URI && process.env.COGNODB_PASSWORD);
}

/**
 * Recursively converts Neo4j driver types (Integer, Node, Relationship) into plain JS types.
 */
export function toPlainObject(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }
  if (Array.isArray(value)) {
    return value.map(toPlainObject);
  }
  if (typeof value === 'object') {
    // If it's a Neo4j Node or Relationship object with properties
    if (value.properties) {
      return toPlainObject(value.properties);
    }
    const plain = {};
    for (const key of Object.keys(value)) {
      plain[key] = toPlainObject(value[key]);
    }
    return plain;
  }
  return value;
}

/**
 * Executes a parameterized Cypher query using a managed session.
 * Automatically closes the session and converts results into plain JS objects.
 *
 * @param {string} cypher - The Cypher query string.
 * @param {object} params - Query parameters.
 * @returns {Promise<Array<object>>}
 */
export async function runCypher(cypher, params = {}) {
  const driver = getDriver();
  if (!driver) {
    throw new Error('CognoDB credentials are not configured. Please set COGNODB_URI and COGNODB_PASSWORD in .env.local.');
  }

  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => {
      const row = {};
      record.keys.forEach((key) => {
        row[key] = toPlainObject(record.get(key));
      });
      return row;
    });
  } finally {
    await session.close();
  }
}
