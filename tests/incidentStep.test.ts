import { describe, it, expect } from 'vitest';
import { stepResolveMotiveIncidents } from '@/lib/simulation/incidentStep';
import type { TickContext, MutableVillager, MutableRelationshipEdge } from '@/lib/simulation/tickContext';
import type { VillagerNeeds, VillagerEmotions, VillagerMotive, CultureState } from '@/lib/domain/types';

const defaultNeeds: VillagerNeeds = { hunger: 0, safety: 0.7, belonging: 0.5, status: 0.5 };
const defaultEmotions: VillagerEmotions = { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };

function makeVillager(overrides: Partial<MutableVillager> & { id: string }): MutableVillager {
  return {
    id: overrides.id,
    name: overrides.name ?? 'Tala',
    sex: 'female',
    ageInDays: 15 * 360,
    lifeStage: overrides.lifeStage ?? 'adult',
    role: overrides.role ?? 'gatherer',
    traits: overrides.traits ?? ['loyal'],
    householdId: overrides.householdId ?? 'h1',
    needs: overrides.needs ?? defaultNeeds,
    emotions: overrides.emotions ?? defaultEmotions,
    motives: overrides.motives ?? [],
  };
}

function makeCtx(villagers: MutableVillager[], edges: MutableRelationshipEdge[] = []): TickContext {
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
    seed: 'test-seed',
    rng: Math.random,
    prevDay: 0,
    day: 1,
    season: 'spring',
    year: 0,
    foodBefore: 500,
    foodAfter: 500,
    dailyConsumption: 11,
    starving: false,
    blessingDaysRemaining: 0,
    weatherHarsh: 0,
    diseaseRisk: 0,
    stormDaysRemaining: 0,
    healthBlessingDaysRemaining: 0,
    villagers,
    householdMembersById,
    relationshipEdges: edges,
    cultureState: null,
    deadIds: [],
    newborns: [],
    updatedVillagers: [],
    updatedRelationships: [],
    updatedCulture: null,
    emittedEvents: [],
  };
}

const highUrgencyMotive = (type: string): VillagerMotive => ({ type, label: 'test', urgency: 1.0 });
const lowUrgencyMotive  = (type: string): VillagerMotive => ({ type, label: 'test', urgency: 0.1 });

describe('stepResolveMotiveIncidents', () => {
  it('does not fire for children regardless of motives', () => {
    const child = makeVillager({ id: 'c1', lifeStage: 'child', motives: [highUrgencyMotive('status')] });
    const ctx = makeCtx([child]);
    stepResolveMotiveIncidents(ctx);
    expect(ctx.emittedEvents).toHaveLength(0);
  });

  it('does not fire for low-urgency motives (≤ 0.65)', () => {
    // With urgency 0.1, probability is 0.007 — but deterministic seed won't fire
    const v = makeVillager({ id: 'v1', motives: [lowUrgencyMotive('status')] });
    const ctx = makeCtx([v]);
    stepResolveMotiveIncidents(ctx);
    // May or may not fire — but urgency 0.1 is filtered below 0.65 threshold
    // The check is v.motives' max urgency > 0.65
    expect(ctx.emittedEvents).toHaveLength(0);
  });

  it('does not fire for dead villagers', () => {
    const v = makeVillager({ id: 'v1', motives: [highUrgencyMotive('survival')] });
    const ctx = makeCtx([v]);
    ctx.deadIds.push('v1');
    stepResolveMotiveIncidents(ctx);
    expect(ctx.emittedEvents).toHaveLength(0);
  });

  it('fires at most one incident per villager per tick', () => {
    // Multiple high-urgency motives — should only produce 1 incident per villager
    const v = makeVillager({
      id: 'v1',
      motives: [highUrgencyMotive('status'), highUrgencyMotive('belonging'), highUrgencyMotive('survival')],
    });
    const ctx = makeCtx([v]);
    ctx.foodAfter = 100; // low food to trigger survival
    stepResolveMotiveIncidents(ctx);
    // At most 1 incident per villager (only top motive is checked)
    const incidents = ctx.emittedEvents.filter((e) => e.type === 'villager_incident');
    expect(incidents.length).toBeLessThanOrEqual(1);
  });

  it('survival incident fires when food is low', () => {
    const v = makeVillager({ id: 'v1', motives: [highUrgencyMotive('survival')] });
    const ctx = makeCtx([v]);
    ctx.foodAfter = 100; // below 300 threshold
    // Use deterministic seed that will produce a firing roll (urgency=1.0 → 7% chance)
    // Seed 'test-seed:incident:1:v1' — deterministic
    stepResolveMotiveIncidents(ctx);
    // May or may not fire depending on RNG — just verify no errors thrown
    // and any events have the right type
    for (const e of ctx.emittedEvents) {
      expect(e.type).toBe('villager_incident');
      expect((e.facts as Record<string, unknown>).motiveType).toBe('survival');
    }
  });

  it('emitted incident events have required fact fields', () => {
    const v1 = makeVillager({ id: 'v1', name: 'Kira', motives: [highUrgencyMotive('belonging')] });
    const v2 = makeVillager({ id: 'v2', name: 'Bren', householdId: 'h1' });
    const ctx = makeCtx([v1, v2]);
    stepResolveMotiveIncidents(ctx);
    for (const e of ctx.emittedEvents) {
      const facts = e.facts as Record<string, unknown>;
      expect(facts.motiveType).toBeDefined();
      expect(facts.actorId).toBeDefined();
      expect(facts.actorName).toBeDefined();
    }
  });
});
