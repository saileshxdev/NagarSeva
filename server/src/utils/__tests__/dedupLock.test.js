const { computeLockKey } = require('../dedupLock');

describe('computeLockKey', () => {
  // Validates: Requirements 10.1, 10.3, 10.4

  describe('determinism', () => {
    it('returns the same key for identical inputs', () => {
      const key1 = computeLockKey('POTHOLE', 28.6139, 77.2090);
      const key2 = computeLockKey('POTHOLE', 28.6139, 77.2090);
      expect(key1).toBe(key2);
    });
  });

  describe('different inputs produce different keys', () => {
    it('returns different keys for different categories at the same location', () => {
      const keyPothole = computeLockKey('POTHOLE', 28.6139, 77.2090);
      const keyGarbage = computeLockKey('GARBAGE', 28.6139, 77.2090);
      expect(keyPothole).not.toBe(keyGarbage);
    });

    it('returns different keys for the same category at different locations', () => {
      const keyDelhi = computeLockKey('POTHOLE', 28.6139, 77.2090);
      const keyMumbai = computeLockKey('POTHOLE', 19.0760, 72.8777);
      expect(keyDelhi).not.toBe(keyMumbai);
    });
  });

  describe('same grid cell produces same key', () => {
    it('returns the same key for coordinates that differ only in the 5th+ decimal place', () => {
      // Both round to 28.6139, 77.2090 via toFixed(4)
      // 28.61391 → "28.6139", 28.61394 → "28.6139"
      // 77.20901 → "77.2090", 77.20904 → "77.2090"
      const key1 = computeLockKey('POTHOLE', 28.61391, 77.20901);
      const key2 = computeLockKey('POTHOLE', 28.61394, 77.20904);
      expect(key1).toBe(key2);
    });
  });

  describe('return type', () => {
    it('returns a 32-bit signed integer', () => {
      const key = computeLockKey('POTHOLE', 28.6139, 77.2090);
      expect(Number.isInteger(key)).toBe(true);
      expect(key).toBeGreaterThanOrEqual(-2147483648);
      expect(key).toBeLessThanOrEqual(2147483647);
    });
  });
});
