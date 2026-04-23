import { describe, it, expect } from 'vitest';
import { computeCultureDrift } from '@/lib/simulation/cultureStep';
import type { CultureState } from '@/lib/domain/types';

const baseline: CultureState = {
  sharingNorm:        0.6,
  punishmentSeverity: 0.4,
  outsiderTolerance:  0.3,
  prestigeByAge:      0.7,
  prestigeBySkill:    0.5,
  ritualIntensity:    0.4,
  spiritualFear:      0.5,
  kinLoyaltyNorm:     0.8,
};

describe('computeCultureDrift', () => {
  it('deaths increase spiritualFear and kinLoyaltyNorm', () => {
    const next = computeCultureDrift(baseline, 2, 0, false, false);
    expect(next.spiritualFear).toBeGreaterThan(baseline.spiritualFear);
    expect(next.kinLoyaltyNorm).toBeGreaterThan(baseline.kinLoyaltyNorm);
  });

  it('births increase outsiderTolerance and sharingNorm', () => {
    const next = computeCultureDrift(baseline, 0, 3, false, false);
    expect(next.outsiderTolerance).toBeGreaterThan(baseline.outsiderTolerance);
    expect(next.sharingNorm).toBeGreaterThan(baseline.sharingNorm);
  });

  it('starvation increases kinLoyaltyNorm and punishmentSeverity', () => {
    const next = computeCultureDrift(baseline, 0, 0, true, false);
    expect(next.kinLoyaltyNorm).toBeGreaterThan(baseline.kinLoyaltyNorm);
    expect(next.punishmentSeverity).toBeGreaterThan(baseline.punishmentSeverity);
  });

  it('spirit intervention increases ritualIntensity and spiritualFear', () => {
    const next = computeCultureDrift(baseline, 0, 0, false, true);
    expect(next.ritualIntensity).toBeGreaterThan(baseline.ritualIntensity);
    expect(next.spiritualFear).toBeGreaterThan(baseline.spiritualFear);
  });

  it('mean-reversion pulls a high value toward 0.5 over many ticks', () => {
    const high: CultureState = { ...baseline, outsiderTolerance: 0.9 };
    let state = high;
    for (let i = 0; i < 500; i++) {
      state = computeCultureDrift(state, 0, 0, false, false);
    }
    expect(state.outsiderTolerance).toBeLessThan(0.9);
    expect(state.outsiderTolerance).toBeGreaterThan(0.5);
  });

  it('mean-reversion pulls a low value toward 0.5 over many ticks', () => {
    const low: CultureState = { ...baseline, sharingNorm: 0.1 };
    let state = low;
    for (let i = 0; i < 500; i++) {
      state = computeCultureDrift(state, 0, 0, false, false);
    }
    expect(state.sharingNorm).toBeGreaterThan(0.1);
    expect(state.sharingNorm).toBeLessThan(0.5);
  });

  it('values are always clamped to [0, 1]', () => {
    const extreme: CultureState = { ...baseline, spiritualFear: 0.99, kinLoyaltyNorm: 0.99 };
    const next = computeCultureDrift(extreme, 10, 0, true, true);
    for (const key of Object.keys(next) as Array<keyof CultureState>) {
      expect(next[key]).toBeGreaterThanOrEqual(0);
      expect(next[key]).toBeLessThanOrEqual(1);
    }
  });

  it('does not mutate the input culture object', () => {
    const original = { ...baseline };
    computeCultureDrift(baseline, 2, 1, true, true);
    expect(baseline).toEqual(original);
  });
});
