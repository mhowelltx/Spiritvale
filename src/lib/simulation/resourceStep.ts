import { clamp } from './worldGenerator';
import type { TickContext } from './tickContext';

export const FOOD_CAP = 800;

const BASE_PRODUCTION_PER_PRODUCER = 1.9;
const ELDER_PRODUCTION_FRACTION = 0.5;

const SEASON_MULTIPLIERS: Record<string, number> = {
  spring: 1.0,
  summer: 1.4,
  autumn: 1.1,
  winter: 0.35,
};

// Pure computation — exported for testing
export function computeFoodProduction(
  hunters: number,
  gatherers: number,
  elders: number,
  season: string,
  varianceFactor: number
): number {
  const seasonMult = SEASON_MULTIPLIERS[season] ?? 1.0;
  const activeProducers = (hunters + gatherers) * BASE_PRODUCTION_PER_PRODUCER;
  const elderContribution = elders * BASE_PRODUCTION_PER_PRODUCER * ELDER_PRODUCTION_FRACTION;
  return (activeProducers + elderContribution) * seasonMult * varianceFactor;
}

export function stepUpdateVillageResources(ctx: TickContext): void {
  const deadSet = new Set(ctx.deadIds);
  const living = ctx.villagers.filter((v) => !deadSet.has(v.id));

  const hunters = living.filter((v) => v.role === 'hunter').length;
  const gatherers = living.filter((v) => v.role === 'gatherer').length;
  const elders = living.filter((v) => v.role === 'elder').length;
  const pop = living.length;

  // Per-tick deterministic variance: 0.85–1.15
  const varianceFactor = 0.85 + ctx.rng() * 0.30;

  const dailyProduction = computeFoodProduction(hunters, gatherers, elders, ctx.season, varianceFactor);
  ctx.dailyConsumption = Math.max(1, Math.ceil(pop * 0.65));
  ctx.foodAfter = clamp(ctx.foodBefore + dailyProduction - ctx.dailyConsumption, 0, FOOD_CAP);
  ctx.starving = ctx.foodAfter <= 0;

  if (ctx.starving) {
    ctx.emittedEvents.push({
      villageId: ctx.villageId,
      day: ctx.day,
      type: 'resource_shortage',
      title: 'Food stores are exhausted.',
      facts: { severity: 'critical' },
    });
  }
}
