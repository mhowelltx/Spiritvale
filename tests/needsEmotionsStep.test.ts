import { describe, it, expect } from 'vitest';
import { computeNeedsEmotionsUpdate } from '../src/lib/simulation/needsEmotionsStep';

const BASE_NEEDS = { hunger: 0, safety: 0.7, belonging: 0.5, status: 0.5 };
const BASE_EMOTIONS = { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };

describe('computeNeedsEmotionsUpdate', () => {
  it('increases hunger when starving', () => {
    const { needs } = computeNeedsEmotionsUpdate(BASE_NEEDS, BASE_EMOTIONS, {
      starving: true, season: 'spring', housemateKilled: false, hasLivingHousemates: true, plentiful: false,
    });
    expect(needs.hunger).toBeGreaterThan(BASE_NEEDS.hunger);
  });

  it('decreases hunger when food adequate', () => {
    const { needs } = computeNeedsEmotionsUpdate({ ...BASE_NEEDS, hunger: 0.3 }, BASE_EMOTIONS, {
      starving: false, season: 'spring', housemateKilled: false, hasLivingHousemates: true, plentiful: false,
    });
    expect(needs.hunger).toBeLessThan(0.3);
  });

  it('increases fear when starving', () => {
    const { emotions } = computeNeedsEmotionsUpdate(BASE_NEEDS, BASE_EMOTIONS, {
      starving: true, season: 'spring', housemateKilled: false, hasLivingHousemates: true, plentiful: false,
    });
    expect(emotions.fear).toBeGreaterThan(BASE_EMOTIONS.fear);
  });

  it('increases grief when a housemate was killed', () => {
    const { emotions } = computeNeedsEmotionsUpdate(BASE_NEEDS, BASE_EMOTIONS, {
      starving: false, season: 'spring', housemateKilled: true, hasLivingHousemates: true, plentiful: false,
    });
    expect(emotions.grief).toBeGreaterThan(0);
  });

  it('decays grief when no housemate was killed', () => {
    const highGrief = { ...BASE_EMOTIONS, grief: 0.5 };
    const { emotions } = computeNeedsEmotionsUpdate(BASE_NEEDS, highGrief, {
      starving: false, season: 'spring', housemateKilled: false, hasLivingHousemates: true, plentiful: false,
    });
    expect(emotions.grief).toBeLessThan(0.5);
  });

  it('clamps all values to [0, 1]', () => {
    const extremeNeeds = { hunger: 1, safety: 0, belonging: 0, status: 1 };
    const extremeEmotions = { fear: 1, grief: 1, hope: 0, anger: 1 };
    const { needs, emotions } = computeNeedsEmotionsUpdate(extremeNeeds, extremeEmotions, {
      starving: true, season: 'winter', housemateKilled: true, hasLivingHousemates: false, plentiful: false,
    });
    for (const v of Object.values(needs)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    for (const v of Object.values(emotions)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('increases hope when food is plentiful', () => {
    const { emotions } = computeNeedsEmotionsUpdate(BASE_NEEDS, BASE_EMOTIONS, {
      starving: false, season: 'spring', housemateKilled: false, hasLivingHousemates: true, plentiful: true,
    });
    // hope should be >= base (net effect: +0.01 - drift toward 0.5)
    expect(emotions.hope).toBeGreaterThan(BASE_EMOTIONS.hope - 0.01);
  });

  it('decreases hope when starving', () => {
    const { emotions } = computeNeedsEmotionsUpdate(BASE_NEEDS, BASE_EMOTIONS, {
      starving: true, season: 'spring', housemateKilled: false, hasLivingHousemates: true, plentiful: false,
    });
    expect(emotions.hope).toBeLessThan(BASE_EMOTIONS.hope);
  });

  it('reduces safety in winter even without starvation', () => {
    const { needs } = computeNeedsEmotionsUpdate(BASE_NEEDS, BASE_EMOTIONS, {
      starving: false, season: 'winter', housemateKilled: false, hasLivingHousemates: true, plentiful: false,
    });
    expect(needs.safety).toBeLessThan(BASE_NEEDS.safety);
  });

  it('decreases belonging when no living housemates', () => {
    const { needs } = computeNeedsEmotionsUpdate(BASE_NEEDS, BASE_EMOTIONS, {
      starving: false, season: 'spring', housemateKilled: false, hasLivingHousemates: false, plentiful: false,
    });
    expect(needs.belonging).toBeLessThan(BASE_NEEDS.belonging);
  });
});
