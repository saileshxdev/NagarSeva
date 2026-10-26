const crypto = require('crypto');

/**
 * Generate a PostgreSQL advisory lock key from category + grid cell.
 * Grid cell: truncate lat/lng to 4 decimal places (~11m precision).
 * Returns a 32-bit integer suitable for pg_advisory_xact_lock.
 */
function computeLockKey(category, lat, lng) {
  const gridLat = lat.toFixed(4);
  const gridLng = lng.toFixed(4);
  const input = `${category}:${gridLat}:${gridLng}`;
  const hash = crypto.createHash('md5').update(input).digest();
  // Use first 4 bytes as a signed 32-bit integer
  return hash.readInt32BE(0);
}

module.exports = { computeLockKey };
