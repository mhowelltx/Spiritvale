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

const WEATHER_SEASONAL_TARGETS: Record<string, number> = {
  spring: 0.25,
  summer: 0.15,
  autumn: 0.35,
  winter: 0.75,
};

// Pure computation — exported for testing
export function computeFoodProduction(
  hunters: number,
  gatherers: number,
  elders: number,
  season: string,
  varianceFactor: number,
  blessingMultiplier = 1.0,
  weatherPenalty = 0
): number {
  const seasonMult = SEASON_MULTIPLIERS[season] ?? 1.0;
  const activeProducers = (hunters + gatherers) * BASE_PRODUCTION_PER_PRODUCER;
  const elderContribution = elders * BASE_PRODUCTION_PER_PRODUCER * ELDER_PRODUCTION_FRACTION;
  return (activeProducers + elderContribution) * seasonMult * blessingMultiplier * varianceFactor * (1 - weatherPenalty * 0.35);
}

// Pure computation — exported for testing
export function computeWeatherEvolution(
  current: number,
  season: string,
  stormDays: number,
  rng: () => number
): number {
  if (stormDays > 0) {
    return clamp(current + 0.30, 0, 1);
  }
  const target = WEATHER_SEASONAL_TARGETS[season] ?? 0.4;
  const drift = (target - current) * 0.01 + (rng() - 0.5) * 0.04;
  return clamp(current + drift, 0, 1);
}

// Pure computation — exported for testing
export function computeDiseaseEvolution(
  current: number,
  weatherHarsh: number,
  season: string,
  healthBlessingDays: number,
  rng: () => number
): number {
  let delta = weatherHarsh * 0.003;
  if (season === 'spring' || season === 'summer') delta -= 0.002;
  if (healthBlessingDays > 0) delta -= 0.015;
  delta += (rng() - 0.5) * 0.01;
  return clamp(current + delta, 0, 1);
}

export function stepUpdateVillageResources(ctx: TickContext): void {
  const deadSet = new Set(ctx.deadIds);
  const living = ctx.villagers.filter((v) => !deadSet.has(v.id));

  const hunters = living.filter((v) => v.role === 'hunter').length;
  const gatherers = living.filter((v) => v.role === 'gatherer').length;
  const elders = living.filter((v) => v.role === 'elder').length;
  const pop = living.length;

  // Evolve weather and disease
  const prevWeather = ctx.weatherHarsh;
  ctx.weatherHarsh = computeWeatherEvolution(ctx.weatherHarsh, ctx.season, ctx.stormDaysRemaining, ctx.rng);
  if (ctx.stormDaysRemaining > 0) ctx.stormDaysRemaining -= 1;

  const prevDiseaseRisk = ctx.diseaseRisk;
  ctx.diseaseRisk = computeDiseaseEvolution(ctx.diseaseRisk, ctx.weatherHarsh, ctx.season, ctx.healthBlessingDaysRemaining, ctx.rng);
  if (ctx.healthBlessingDaysRemaining > 0) ctx.healthBlessingDaysRemaining -= 1;

  // Emit disease outbreak event when risk crosses 0.7 upward
  if (prevDiseaseRisk < 0.7 && ctx.diseaseRisk >= 0.7) {
    ctx.emittedEvents.push({
      villageId: ctx.villageId,
      day: ctx.day,
      type: 'disease_outbreak',
      title: 'A sickness spreads through Spiritvale.',
      facts: { diseaseRisk: ctx.diseaseRisk, severity: 'crisis' },
    });
  }

  // Weather penalty applies only when conditions are harsh (> 0.4)
  const weatherPenalty = Math.max(0, ctx.weatherHarsh - 0.4);

  // Per-tick deterministic variance: 0.85–1.15
  const varianceFactor = 0.85 + ctx.rng() * 0.30;
  const blessingMultiplier = ctx.blessingDaysRemaining > 0 ? 1.5 : 1.0;

  // High sharing norm reduces consumption slightly (communal rationing)
  const sharingNorm = ctx.cultureState?.sharingNorm ?? 0.5;
  const sharingReduction = Math.max(0, sharingNorm - 0.6) * 0.125;

  const dailyProduction = computeFoodProduction(hunters, gatherers, elders, ctx.season, varianceFactor, blessingMultiplier, weatherPenalty);
  ctx.dailyConsumption = Math.max(1, Math.ceil(pop * 0.65 * (1 - sharingReduction)));
  ctx.foodAfter = clamp(ctx.foodBefore + dailyProduction - ctx.dailyConsumption, 0, FOOD_CAP);
  ctx.starving = ctx.foodAfter <= 0;

  // Decrement blessing counter after applying it
  if (ctx.blessingDaysRemaining > 0) {
    ctx.blessingDaysRemaining -= 1;
  }

  if (ctx.starving) {
    ctx.emittedEvents.push({
      villageId: ctx.villageId,
      day: ctx.day,
      type: 'resource_shortage',
      title: 'Food stores are exhausted.',
      facts: { severity: 'critical' },
    });
  }

  // Emit storm event on first storm tick
  if (prevWeather < 0.7 && ctx.weatherHarsh >= 0.7 && ctx.stormDaysRemaining >= 0) {
    ctx.emittedEvents.push({
      villageId: ctx.villageId,
      day: ctx.day,
      type: 'storm',
      title: 'A fierce storm batters Spiritvale.',
      facts: { weatherHarsh: ctx.weatherHarsh, severity: 'crisis' },
    });
  }
}
