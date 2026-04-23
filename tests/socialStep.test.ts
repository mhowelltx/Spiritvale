import { describe, it, expect } from 'vitest';
import { stepResolveSocialInteractions } from '@/lib/simulation/socialStep';
import type { TickContext, MutableVillager, MutableRelationshipEdge } from '@/lib/simulation/tickContext';
import type { VillagerNeeds, VillagerEmotions, CultureState } from '@/lib/domain/types';

const defaultNeeds: VillagerNeeds = { hunger: 0, safety: 0.7, belonging: 0.5, status: 0.5 };
const defaultEmotions: VillagerEmotions = { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };

function makeVillager(id: string, householdId: string, overrides: Partial<MutableVillager> = {}): MutableVillager {
  return {
    id,
    name: id,
    sex: 'female',
    ageInDays: 20 * 360,
    lifeStage: 'adult',
    role: 'gatherer',
    traits: [],
    householdId,
    needs: defaultNeeds,
    emotions: defaultEmotions,
    motives: [],
    ...overrides,
  };
}

function makeEdge(fromId: string, toId: string, type = 'kin', strength = 0.8, trust = 0.8): MutableRelationshipEdge {
  return { id: `${fromId}-${toId}`, fromVillagerId: fromId, toVillagerId: toId, type, strength, trust, lastInteractionDay: 0 };
}

function makeCtx(
  villagers: MutableVillager[],
  edges: MutableRelationshipEdge[],
  opts: { starving?: boolean; cultureState?: CultureState | null } = {}
): TickContext {
  const householdMembersById = new Map<string, string[]>();
  const byHousehold = new Map<string, string[]>();
  for (const v of villagers) {
    if (v.householdId) {
      if (!byHousehold.has(v.householdId)) byHousehold.set(v.householdId, []);
      byHousehold.get(v.householdId)!.push(v.id);
    }
  }
  for (const v of villagers) {
    const members = byHousehold.get(v.householdId ?? '') ?? [];
    householdMembersById.set(v.id, members.filter((id) => id !== v.id));
  }

  return {
    villageId: 'v1',
    seed: 'test',
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
    diseaseRisk: 0,
    stormDaysRemaining: 0,
    healthBlessingDaysRemaining: 0,
    villagers,
    householdMembersById,
    relationshipEdges: edges,
    cultureState: opts.cultureState !== undefined ? opts.cultureState : null,
    deadIds: [],
    newborns: [],
    updatedVillagers: [],
    updatedRelationships: [],
    updatedCulture: null,
    emittedEvents: [],
  };
}

const defaultCulture: CultureState = {
  sharingNorm: 0.5,
  punishmentSeverity: 0.4,
  outsiderTolerance: 0.3,
  prestigeByAge: 0.7,
  prestigeBySkill: 0.5,
  ritualIntensity: 0.4,
  spiritualFear: 0.5,
  kinLoyaltyNorm: 0.8,
};

describe('stepResolveSocialInteractions', () => {
  it('cohabiting kinship edge gains strength each tick', () => {
    const v1 = makeVillager('v1', 'h1');
    const v2 = makeVillager('v2', 'h1');
    const edge = makeEdge('v1', 'v2', 'kin', 0.7, 0.8);
    const ctx = makeCtx([v1, v2], [edge]);
    stepResolveSocialInteractions(ctx);
    expect(edge.strength).toBeGreaterThan(0.7);
  });

  it('non-cohabiting kinship edge does not gain cohabitation bonus', () => {
    const v1 = makeVillager('v1', 'h1');
    const v2 = makeVillager('v2', 'h2'); // different household
    const edge = makeEdge('v1', 'v2', 'kin', 0.9, 0.8);
    const ctx = makeCtx([v1, v2], [edge], { cultureState: defaultCulture });
    const strengthBefore = edge.strength;
    stepResolveSocialInteractions(ctx);
    // Should drift toward floor (kinLoyaltyNorm raises floor), not gain cohabitation bonus
    // At 0.9, the kin floor (0.7 + 0.8*0.15 = 0.82) is below current, so it drifts down slightly
    expect(edge.strength).toBeLessThanOrEqual(strengthBefore + 0.001);
  });

  it('edges involving dead villagers are skipped', () => {
    const v1 = makeVillager('v1', 'h1');
    const v2 = makeVillager('v2', 'h1');
    const edge = makeEdge('v1', 'v2', 'kin', 0.8, 0.8);
    const ctx = makeCtx([v1, v2], [edge]);
    ctx.deadIds.push('v1');
    const strengthBefore = edge.strength;
    stepResolveSocialInteractions(ctx);
    // Edge should not be updated
    expect(edge.strength).toBe(strengthBefore);
    expect(ctx.updatedRelationships.find((r) => r.id === edge.id)).toBeUndefined();
  });

  it('starvation + high fear reduces cohabitant trust', () => {
    const v1 = makeVillager('v1', 'h1', { emotions: { fear: 0.8, grief: 0, hope: 0.5, anger: 0 } });
    const v2 = makeVillager('v2', 'h1');
    const edge = makeEdge('v1', 'v2', 'kin', 0.8, 0.8);
    const ctx = makeCtx([v1, v2], [edge], { starving: true, cultureState: { ...defaultCulture, sharingNorm: 0 } });
    const trustBefore = edge.trust;
    stepResolveSocialInteractions(ctx);
    expect(edge.trust).toBeLessThan(trustBefore);
  });

  it('household member death increases bond strength between survivors', () => {
    const v1 = makeVillager('v1', 'h1');
    const v2 = makeVillager('v2', 'h1');
    const v3 = makeVillager('v3', 'h1'); // will die
    const edge = makeEdge('v1', 'v2', 'kin', 0.8, 0.8);
    const ctx = makeCtx([v1, v2, v3], [edge]);
    ctx.deadIds.push('v3');
    const strengthBefore = edge.strength;
    stepResolveSocialInteractions(ctx);
    // v1→v2 edge: v3 died in same household as v1 → strength bonus
    expect(edge.strength).toBeGreaterThan(strengthBefore);
  });

  it('high kinLoyaltyNorm raises kin decay floor', () => {
    const highLoyalty: CultureState = { ...defaultCulture, kinLoyaltyNorm: 1.0 };
    const lowLoyalty: CultureState = { ...defaultCulture, kinLoyaltyNorm: 0.0 };

    // Edge above floor in different households — should drift down toward floor
    const v1a = makeVillager('v1', 'h1');
    const v2a = makeVillager('v2', 'h2');
    const edgeHigh = makeEdge('v1', 'v2', 'kin', 0.99, 0.8);
    const ctxHigh = makeCtx([v1a, v2a], [edgeHigh], { cultureState: highLoyalty });
    stepResolveSocialInteractions(ctxHigh);

    const v1b = makeVillager('v1', 'h1');
    const v2b = makeVillager('v2', 'h2');
    const edgeLow = makeEdge('v1', 'v2', 'kin', 0.99, 0.8);
    const ctxLow = makeCtx([v1b, v2b], [edgeLow], { cultureState: lowLoyalty });
    stepResolveSocialInteractions(ctxLow);

    // Both drift down from 0.99, but high loyalty drifts more slowly (higher floor target)
    expect(edgeHigh.strength).toBeGreaterThanOrEqual(edgeLow.strength);
  });

  it('high sharingNorm reduces starvation trust penalty', () => {
    const highSharing: CultureState = { ...defaultCulture, sharingNorm: 1.0 };
    const noSharing: CultureState = { ...defaultCulture, sharingNorm: 0.0 };

    const v1a = makeVillager('va1', 'h1', { emotions: { fear: 0.8, grief: 0, hope: 0.5, anger: 0 } });
    const v2a = makeVillager('va2', 'h1');
    const edgeHigh = makeEdge('va1', 'va2', 'kin', 0.8, 0.8);
    const ctxHigh = makeCtx([v1a, v2a], [edgeHigh], { starving: true, cultureState: highSharing });
    stepResolveSocialInteractions(ctxHigh);
    const trustWithSharing = edgeHigh.trust;

    const v1b = makeVillager('vb1', 'h1', { emotions: { fear: 0.8, grief: 0, hope: 0.5, anger: 0 } });
    const v2b = makeVillager('vb2', 'h1');
    const edgeLow = makeEdge('vb1', 'vb2', 'kin', 0.8, 0.8);
    const ctxLow = makeCtx([v1b, v2b], [edgeLow], { starving: true, cultureState: noSharing });
    stepResolveSocialInteractions(ctxLow);
    const trustWithoutSharing = edgeLow.trust;

    // High sharing norm buffers trust loss from starvation
    expect(trustWithSharing).toBeGreaterThanOrEqual(trustWithoutSharing);
  });

  it('changed edges are recorded in updatedRelationships', () => {
    const v1 = makeVillager('v1', 'h1');
    const v2 = makeVillager('v2', 'h1');
    const edge = makeEdge('v1', 'v2', 'kin', 0.5, 0.5); // far from floor — will change
    const ctx = makeCtx([v1, v2], [edge]);
    stepResolveSocialInteractions(ctx);
    expect(ctx.updatedRelationships.length).toBeGreaterThan(0);
    expect(ctx.updatedRelationships[0]!.id).toBe(edge.id);
  });
});
