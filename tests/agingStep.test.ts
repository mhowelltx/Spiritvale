import { describe, it, expect } from 'vitest';
import { stepAgeAndLifeStage } from '@/lib/simulation/agingStep';
import type { TickContext, MutableVillager } from '@/lib/simulation/tickContext';
import type { VillagerNeeds, VillagerEmotions } from '@/lib/domain/types';

const DAYS_PER_YEAR = 360;

const defaultNeeds: VillagerNeeds = { hunger: 0, safety: 0.7, belonging: 0.5, status: 0.5 };
const defaultEmotions: VillagerEmotions = { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };

function makeVillager(overrides: Partial<MutableVillager> & { id: string }): MutableVillager {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Tala',
    sex: 'female',
    ageInDays: overrides.ageInDays ?? 20 * DAYS_PER_YEAR,
    lifeStage: overrides.lifeStage ?? 'adult',
    role: overrides.role ?? 'gatherer',
    traits: overrides.traits ?? [],
    householdId: overrides.householdId ?? 'h1',
    needs: overrides.needs ?? defaultNeeds,
    emotions: overrides.emotions ?? defaultEmotions,
    motives: overrides.motives ?? [],
  };
}

function makeCtx(
  villagers: MutableVillager[],
  opts: { starving?: boolean; diseaseRisk?: number } = {}
): TickContext {
  return {
    villageId: 'v1',
    seed: 'test-seed',
    rng: Math.random,
    prevDay: 0,
    day: 1,
    season: 'spring',
    year: 0,
    foodBefore: 500,
    foodAfter: 500,
    dailyConsumption: 10,
    starving: opts.starving ?? false,
    blessingDaysRemaining: 0,
    weatherHarsh: 0,
    diseaseRisk: opts.diseaseRisk ?? 0,
    stormDaysRemaining: 0,
    healthBlessingDaysRemaining: 0,
    villagers,
    householdMembersById: new Map(villagers.map((v) => [v.id, []])),
    relationshipEdges: [],
    cultureState: null,
    deadIds: [],
    newborns: [],
    updatedVillagers: [],
    updatedRelationships: [],
    updatedCulture: null,
    emittedEvents: [],
  };
}

describe('stepAgeAndLifeStage', () => {
  it('increments ageInDays by 1 for a surviving villager', () => {
    const v = makeVillager({ id: 'v1', ageInDays: 10 * DAYS_PER_YEAR });
    const ctx = makeCtx([v]);
    // Override rng to never kill (always return 1.0 > any death chance)
    ctx.rng = () => 1.0;
    stepAgeAndLifeStage(ctx);
    expect(v.ageInDays).toBe(10 * DAYS_PER_YEAR + 1);
  });

  it('young adult remains adult, does not die from age', () => {
    const v = makeVillager({ id: 'v1', ageInDays: 30 * DAYS_PER_YEAR, lifeStage: 'adult' });
    const ctx = makeCtx([v]);
    ctx.rng = () => 1.0; // never dies
    stepAgeAndLifeStage(ctx);
    expect(ctx.deadIds).toHaveLength(0);
    expect(v.lifeStage).toBe('adult');
  });

  it('child transitions to adult at 15 years', () => {
    const ageAtBoundary = 15 * DAYS_PER_YEAR;
    const v = makeVillager({ id: 'v1', ageInDays: ageAtBoundary - 1, lifeStage: 'child' });
    const ctx = makeCtx([v]);
    ctx.rng = () => 1.0;
    stepAgeAndLifeStage(ctx);
    expect(v.lifeStage).toBe('adult');
  });

  it('adult transitions to elder at 50 years', () => {
    const ageAtBoundary = 50 * DAYS_PER_YEAR;
    const v = makeVillager({ id: 'v1', ageInDays: ageAtBoundary - 1, lifeStage: 'adult' });
    const ctx = makeCtx([v]);
    ctx.rng = () => 1.0;
    stepAgeAndLifeStage(ctx);
    expect(v.lifeStage).toBe('elder');
  });

  it('villager under 65 has zero base death chance (excluding disease/starvation)', () => {
    // With no starvation and no disease, a 40-year-old cannot die
    const v = makeVillager({ id: 'v1', ageInDays: 40 * DAYS_PER_YEAR });
    const ctx = makeCtx([v], { starving: false, diseaseRisk: 0 });
    // Even with rng() returning 0, should not die (deathChance = 0)
    ctx.rng = () => 0;
    stepAgeAndLifeStage(ctx);
    expect(ctx.deadIds).toHaveLength(0);
  });

  it('villager over 65 can die from old age', () => {
    // 70-year-old with rng() = 0 (certain death if deathChance > 0)
    const v = makeVillager({ id: 'v1', ageInDays: 70 * DAYS_PER_YEAR, lifeStage: 'elder' });
    const ctx = makeCtx([v], { starving: false, diseaseRisk: 0 });
    ctx.rng = () => 0;
    stepAgeAndLifeStage(ctx);
    expect(ctx.deadIds).toContain('v1');
  });

  it('death chance increases with age above 65', () => {
    let rollsAt70 = 0;
    let rollsAt80 = 0;
    const SAMPLES = 200;
    for (let i = 0; i < SAMPLES; i++) {
      const v70 = makeVillager({ id: 'a', ageInDays: 70 * DAYS_PER_YEAR, lifeStage: 'elder' });
      const ctx70 = makeCtx([v70]);
      stepAgeAndLifeStage(ctx70);
      if (ctx70.deadIds.includes('a')) rollsAt70++;

      const v80 = makeVillager({ id: 'b', ageInDays: 80 * DAYS_PER_YEAR, lifeStage: 'elder' });
      const ctx80 = makeCtx([v80]);
      stepAgeAndLifeStage(ctx80);
      if (ctx80.deadIds.includes('b')) rollsAt80++;
    }
    // 80-year-olds should die more often than 70-year-olds
    expect(rollsAt80).toBeGreaterThan(rollsAt70);
  });

  it('starvation increases death chance', () => {
    let deathsStarving = 0;
    let deathsNormal = 0;
    const SAMPLES = 200;
    for (let i = 0; i < SAMPLES; i++) {
      const v1 = makeVillager({ id: 'a', ageInDays: 66 * DAYS_PER_YEAR, lifeStage: 'elder' });
      const ctx1 = makeCtx([v1], { starving: true });
      stepAgeAndLifeStage(ctx1);
      if (ctx1.deadIds.includes('a')) deathsStarving++;

      const v2 = makeVillager({ id: 'b', ageInDays: 66 * DAYS_PER_YEAR, lifeStage: 'elder' });
      const ctx2 = makeCtx([v2], { starving: false });
      stepAgeAndLifeStage(ctx2);
      if (ctx2.deadIds.includes('b')) deathsNormal++;
    }
    expect(deathsStarving).toBeGreaterThan(deathsNormal);
  });

  it('dead villager has id in ctx.deadIds and emits villager_death event', () => {
    const v = makeVillager({ id: 'v1', name: 'Oren', ageInDays: 70 * DAYS_PER_YEAR, lifeStage: 'elder' });
    const ctx = makeCtx([v]);
    ctx.rng = () => 0; // certain death
    stepAgeAndLifeStage(ctx);
    expect(ctx.deadIds).toContain('v1');
    const event = ctx.emittedEvents.find((e) => e.type === 'villager_death');
    expect(event).toBeDefined();
    const facts = event!.facts as Record<string, unknown>;
    expect(facts.villagerId).toBe('v1');
    expect(facts.name).toBe('Oren');
    expect(typeof facts.ageYears).toBe('number');
  });

  it('newborn (ageInDays = 0) has zero age-based death chance', () => {
    const v = makeVillager({ id: 'v1', ageInDays: 0, lifeStage: 'child' });
    const ctx = makeCtx([v], { starving: false, diseaseRisk: 0 });
    ctx.rng = () => 0; // would trigger any non-zero death chance
    stepAgeAndLifeStage(ctx);
    expect(ctx.deadIds).toHaveLength(0);
  });

  it('cautious trait reduces disease death contribution', () => {
    // With high diseaseRisk, cautious villager should die less often than non-cautious
    let deathsCautious = 0;
    let deathsNormal = 0;
    const SAMPLES = 500;
    const highRisk = 1.0;
    for (let i = 0; i < SAMPLES; i++) {
      const vc = makeVillager({ id: 'a', ageInDays: 66 * DAYS_PER_YEAR, lifeStage: 'elder', traits: ['cautious'] });
      const ctxC = makeCtx([vc], { starving: false, diseaseRisk: highRisk });
      stepAgeAndLifeStage(ctxC);
      if (ctxC.deadIds.includes('a')) deathsCautious++;

      const vn = makeVillager({ id: 'b', ageInDays: 66 * DAYS_PER_YEAR, lifeStage: 'elder', traits: [] });
      const ctxN = makeCtx([vn], { starving: false, diseaseRisk: highRisk });
      stepAgeAndLifeStage(ctxN);
      if (ctxN.deadIds.includes('b')) deathsNormal++;
    }
    // Cautious villagers should die at a lower rate (disease contribution halved)
    expect(deathsCautious).toBeLessThanOrEqual(deathsNormal);
  });
});
