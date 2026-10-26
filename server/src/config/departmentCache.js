/**
 * src/config/departmentCache.js
 *
 * In-memory cache for active department names.
 * 
 * Pattern: Write-through cache with TTL + event-driven invalidation.
 * 
 * - On boot: loads departments from DB into memory
 * - On AI call: reads from memory (O(1), zero DB queries)
 * - On department CRUD (create/delete): cache is invalidated
 * - TTL (5 min): auto-refreshes even without explicit invalidation (safety net)
 *
 * This eliminates a DB query on every citizen's image analysis request
 * while keeping the AI prompt in sync with dynamic department changes.
 *
 * System design pattern: same as DNS TTL, CDN cache invalidation,
 * feature flag services (LaunchDarkly), and config reloaders.
 */
const pool = require('./db');

let cachedDepartments = [];  // Array of department name strings
let lastFetchTime = 0;
const TTL_MS = 5 * 60 * 1000;  // 5 minutes

/**
 * Load active departments from the database.
 * Called on boot and when cache is stale/invalidated.
 */
async function loadDepartments() {
  try {
    const result = await pool.query(
      "SELECT name FROM departments WHERE deleted_at IS NULL ORDER BY name"
    );
    cachedDepartments = result.rows.map(r => r.name);
    lastFetchTime = Date.now();
    console.log(`[deptCache] Loaded ${cachedDepartments.length} departments`);
  } catch (err) {
    console.error('[deptCache] Failed to load departments:', err.message);
    // Keep stale cache if DB is temporarily unavailable
  }
}

/**
 * Get the current list of active department names.
 * Returns from memory (O(1)) — refreshes if TTL expired.
 */
async function getDepartmentNames() {
  if (cachedDepartments.length === 0 || Date.now() - lastFetchTime > TTL_MS) {
    await loadDepartments();
  }
  return cachedDepartments;
}

/**
 * Invalidate the cache.
 * Called by department CRUD controllers after create/delete operations.
 * Next getDepartmentNames() call will reload from DB.
 */
function invalidateCache() {
  lastFetchTime = 0;  // Forces reload on next access
  console.log('[deptCache] Cache invalidated');
}

// Load on module import (server boot)
loadDepartments();

module.exports = { getDepartmentNames, invalidateCache };
