// server/src/config/dedup.js
const DEFAULT_RADIUS = 50;
const DEFAULT_BOOST = 1.0;

function parsePositiveNum(val, fallback, name) {
  const num = Number(val);
  if (!val || isNaN(num) || num <= 0) {
    if (val) console.warn(`[dedup] Invalid ${name}="${val}", using default ${fallback}`);
    return fallback;
  }
  return num;
}

const DEDUP_RADIUS_METRES = parsePositiveNum(
  process.env.DEDUP_RADIUS_METRES, DEFAULT_RADIUS, 'DEDUP_RADIUS_METRES'
);
const DEDUP_PRIORITY_BOOST = parsePositiveNum(
  process.env.DEDUP_PRIORITY_BOOST, DEFAULT_BOOST, 'DEDUP_PRIORITY_BOOST'
);

module.exports = { DEDUP_RADIUS_METRES, DEDUP_PRIORITY_BOOST };
