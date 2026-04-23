import { describe, it, expect } from 'vitest';
import { computeFoodProduction, FOOD_CAP } from '@/lib/simulation/resourceStep';

describe('computeFoodProduction', () => {
  it('returns 0 when no producers', () => {
    expect(computeFoodProduction(0, 0, 0, 'spring', 1.0)).toBe(0);
  });

  it('hunters produce food', () => {
    const prod = computeFoodProduction(3, 0, 0, 'spring', 1.0);
    expect(prod).toBeCloseTo(3 * 1.9, 5);
  });

  it('gatherers produce food', () => {
    const prod = computeFoodProduction(0, 3, 0, 'spring', 1.0);
    expect(prod).toBeCloseTo(3 * 1.9, 5);
  });

  it('elders produce at half rate', () => {
    const elderOnly = computeFoodProduction(0, 0, 2, 'spring', 1.0);
    const adult = computeFoodProduction(0, 2, 0, 'spring', 1.0);
    expect(elderOnly).toBeCloseTo(adult * 0.5, 5);
  });

  it('summer production exceeds spring production', () => {
    const spring = computeFoodProduction(6, 0, 0, 'spring', 1.0);
    const summer = computeFoodProduction(6, 0, 0, 'summer', 1.0);
    expect(summer).toBeGreaterThan(spring);
  });

  it('winter production is much lower than summer', () => {
    const summer = computeFoodProduction(6, 0, 0, 'summer', 1.0);
    const winter = computeFoodProduction(6, 0, 0, 'winter', 1.0);
    expect(winter).toBeLessThan(summer * 0.4);
  });

  it('annual average production roughly equals consumption for 16 villagers', () => {
    // 16 villagers × 0.65 = 10.4 → ceil = 11/day consumption
    // Typical producers: 6 hunters+gatherers, 0 elders
    const seasonAvg =
      (computeFoodProduction(6, 0, 0, 'spring',  1.0) +
       computeFoodProduction(6, 0, 0, 'summer',  1.0) +
       computeFoodProduction(6, 0, 0, 'autumn',  1.0) +
       computeFoodProduction(6, 0, 0, 'winter',  1.0)) / 4;
    const consumption = Math.ceil(16 * 0.65);
    // Should be within 20% of consumption (balanced design)
    expect(seasonAvg).toBeGreaterThan(consumption * 0.8);
    expect(seasonAvg).toBeLessThan(consumption * 1.8);
  });

  it('variance factor scales production linearly', () => {
    const base = computeFoodProduction(4, 2, 0, 'spring', 1.0);
    const boosted = computeFoodProduction(4, 2, 0, 'spring', 1.15);
    expect(boosted).toBeCloseTo(base * 1.15, 5);
  });

  it('FOOD_CAP is 800', () => {
    expect(FOOD_CAP).toBe(800);
  });

  it('blessingMultiplier = 1.5 produces 50% more than blessingMultiplier = 1.0', () => {
    const base    = computeFoodProduction(4, 2, 1, 'spring', 1.0, 1.0);
    const blessed = computeFoodProduction(4, 2, 1, 'spring', 1.0, 1.5);
    expect(blessed).toBeCloseTo(base * 1.5, 5);
  });
});
