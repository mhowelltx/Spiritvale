import { describe, it, expect } from 'vitest';
import { stepAdvanceCalendar } from '@/lib/simulation/calendarStep';
import type { TickContext } from '@/lib/simulation/tickContext';

function makeCtx(prevDay: number): TickContext {
  return {
    villageId: 'v1',
    seed: 'test',
    rng: Math.random,
    prevDay,
    day: prevDay,
    season: 'spring',
    year: 0,
    foodBefore: 500,
    foodAfter: 500,
    dailyConsumption: 10,
    starving: false,
    blessingDaysRemaining: 0,
    weatherHarsh: 0,
    diseaseRisk: 0,
    stormDaysRemaining: 0,
    healthBlessingDaysRemaining: 0,
    villagers: [],
    householdMembersById: new Map(),
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

describe('stepAdvanceCalendar', () => {
  it('increments day by 1', () => {
    const ctx = makeCtx(0);
    stepAdvanceCalendar(ctx);
    expect(ctx.day).toBe(1);
  });

  it('does not emit season_change event mid-season', () => {
    const ctx = makeCtx(5); // day 5 → 6, both spring
    stepAdvanceCalendar(ctx);
    expect(ctx.emittedEvents.some((e) => e.type === 'season_change')).toBe(false);
  });

  it('spring starts at day 0', () => {
    const ctx = makeCtx(0);
    stepAdvanceCalendar(ctx);
    expect(ctx.season).toBe('spring');
  });

  it('transitions spring → summer at day 90', () => {
    const ctx = makeCtx(89); // day 89 → 90
    stepAdvanceCalendar(ctx);
    expect(ctx.season).toBe('summer');
    expect(ctx.emittedEvents.some((e) => e.type === 'season_change')).toBe(true);
  });

  it('transitions summer → autumn at day 180', () => {
    const ctx = makeCtx(179);
    stepAdvanceCalendar(ctx);
    expect(ctx.season).toBe('autumn');
    expect(ctx.emittedEvents.some((e) => e.type === 'season_change')).toBe(true);
  });

  it('transitions autumn → winter at day 270', () => {
    const ctx = makeCtx(269);
    stepAdvanceCalendar(ctx);
    expect(ctx.season).toBe('winter');
    expect(ctx.emittedEvents.some((e) => e.type === 'season_change')).toBe(true);
  });

  it('transitions winter → spring at day 360', () => {
    const ctx = makeCtx(359);
    stepAdvanceCalendar(ctx);
    expect(ctx.season).toBe('spring');
    expect(ctx.emittedEvents.some((e) => e.type === 'season_change')).toBe(true);
  });

  it('increments year at 360-day boundary', () => {
    const ctx = makeCtx(359);
    stepAdvanceCalendar(ctx);
    expect(ctx.year).toBe(1);
  });

  it('does not increment year mid-year', () => {
    const ctx = makeCtx(180);
    stepAdvanceCalendar(ctx);
    expect(ctx.year).toBe(0);
  });

  it('season_change event includes season and year in facts', () => {
    const ctx = makeCtx(89);
    stepAdvanceCalendar(ctx);
    const event = ctx.emittedEvents.find((e) => e.type === 'season_change');
    expect(event).toBeDefined();
    expect((event!.facts as Record<string, unknown>).season).toBe('summer');
    expect((event!.facts as Record<string, unknown>).year).toBe(0);
  });

  it('all four transitions emit exactly one season_change each', () => {
    const transitionDays = [89, 179, 269, 359];
    const expectedSeasons = ['summer', 'autumn', 'winter', 'spring'];
    for (let i = 0; i < transitionDays.length; i++) {
      const ctx = makeCtx(transitionDays[i]!);
      stepAdvanceCalendar(ctx);
      const changes = ctx.emittedEvents.filter((e) => e.type === 'season_change');
      expect(changes).toHaveLength(1);
      expect(ctx.season).toBe(expectedSeasons[i]);
    }
  });
});
