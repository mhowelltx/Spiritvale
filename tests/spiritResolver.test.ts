import { describe, it, expect } from 'vitest';
import { computeCauseFamineEffect } from '../src/lib/simulation/spiritResolver';
import { createSeededRng } from '../src/lib/rng/seededRng';

describe('computeCauseFamineEffect', () => {
  it('reduces food by 30–50% for mild severity', () => {
    for (let i = 0; i < 20; i++) {
      const rng = createSeededRng(`mild-test-${i}`);
      const effect = computeCauseFamineEffect(1000, 'mild', rng);
      expect(effect.foodAfter).toBeGreaterThanOrEqual(500);  // at most 50% reduction
      expect(effect.foodAfter).toBeLessThanOrEqual(700);     // at least 30% reduction
    }
  });

  it('reduces food by 50–70% for severe severity', () => {
    for (let i = 0; i < 20; i++) {
      const rng = createSeededRng(`severe-test-${i}`);
      const effect = computeCauseFamineEffect(1000, 'severe', rng);
      expect(effect.foodAfter).toBeGreaterThanOrEqual(300);  // at most 70% reduction
      expect(effect.foodAfter).toBeLessThanOrEqual(500);     // at least 50% reduction
    }
  });

  it('sets correct fearIncrease for mild', () => {
    const rng = createSeededRng('fear-mild');
    const effect = computeCauseFamineEffect(500, 'mild', rng);
    expect(effect.fearIncrease).toBe(0.15);
  });

  it('sets correct fearIncrease for severe', () => {
    const rng = createSeededRng('fear-severe');
    const effect = computeCauseFamineEffect(500, 'severe', rng);
    expect(effect.fearIncrease).toBe(0.3);
  });

  it('sets correct angerIncrease for mild', () => {
    const rng = createSeededRng('anger-mild');
    const effect = computeCauseFamineEffect(500, 'mild', rng);
    expect(effect.angerIncrease).toBe(0.05);
  });

  it('sets correct angerIncrease for severe', () => {
    const rng = createSeededRng('anger-severe');
    const effect = computeCauseFamineEffect(500, 'severe', rng);
    expect(effect.angerIncrease).toBe(0.15);
  });

  it('never produces negative food', () => {
    const rng = createSeededRng('zero-food');
    const effect = computeCauseFamineEffect(0, 'severe', rng);
    expect(effect.foodAfter).toBe(0);
  });

  it('is deterministic with same seed', () => {
    const rng1 = createSeededRng('det-seed');
    const rng2 = createSeededRng('det-seed');
    const a = computeCauseFamineEffect(800, 'mild', rng1);
    const b = computeCauseFamineEffect(800, 'mild', rng2);
    expect(a.foodAfter).toBe(b.foodAfter);
    expect(a.reductionFactor).toBe(b.reductionFactor);
  });
});
