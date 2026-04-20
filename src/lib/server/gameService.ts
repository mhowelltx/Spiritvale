import { randomUUID } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { createSeededRng } from '@/lib/rng/seededRng';
import type { CreateGameInput, Season, VillageView } from '@/lib/domain/types';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

function resolveSeason(day: number): Season {
  const idx = Math.floor(day / 90) % SEASONS.length;
  return SEASONS[idx] ?? 'spring';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function createGame(input: CreateGameInput): Promise<VillageView> {
  const seed = input.seed ?? randomUUID();
  const rng = createSeededRng(seed);

  const population = input.startingPopulation ?? 16;
  const startingFood = input.startingFood ?? Math.round(110 + rng() * 40);
  const weatherHarsh = Number((0.2 + rng() * 0.5).toFixed(3));
  const diseaseRisk = Number((0.1 + rng() * 0.4).toFixed(3));

  const village = await prisma.village.create({
    data: {
      seed,
      name: input.name ?? 'Spiritvale',
      population,
      resources: {
        create: {
          food: startingFood,
          weatherHarsh,
          diseaseRisk,
        },
      },
      events: {
        create: {
          day: 0,
          type: 'world_created',
          title: 'A new village takes root.',
          facts: { seed, population, startingFood },
        },
      },
    },
    include: { resources: true, events: true },
  });

  return {
    id: village.id,
    seed: village.seed,
    name: village.name,
    day: village.day,
    year: village.year,
    season: village.season as Season,
    population: village.population,
    resources: {
      food: village.resources?.food ?? 0,
      weatherHarsh: village.resources?.weatherHarsh ?? 0,
      diseaseRisk: village.resources?.diseaseRisk ?? 0,
    },
    events: village.events
      .sort((a, b) => a.day - b.day)
      .map((evt) => ({
        id: evt.id,
        day: evt.day,
        type: evt.type,
        title: evt.title,
        facts: evt.facts as Record<string, unknown>,
      })),
  };
}

export async function getGame(villageId: string): Promise<VillageView | null> {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    include: { resources: true, events: { orderBy: [{ day: 'desc' }, { createdAt: 'desc' }], take: 20 } },
  });

  if (!village) {
    return null;
  }

  return {
    id: village.id,
    seed: village.seed,
    name: village.name,
    day: village.day,
    year: village.year,
    season: village.season as Season,
    population: village.population,
    resources: {
      food: village.resources?.food ?? 0,
      weatherHarsh: village.resources?.weatherHarsh ?? 0,
      diseaseRisk: village.resources?.diseaseRisk ?? 0,
    },
    events: village.events.reverse().map((evt) => ({
      id: evt.id,
      day: evt.day,
      type: evt.type,
      title: evt.title,
      facts: evt.facts as Record<string, unknown>,
    })),
  };
}

export async function tickGame(villageId: string): Promise<VillageView | null> {
  const current = await prisma.village.findUnique({
    where: { id: villageId },
    include: { resources: true },
  });

  if (!current || !current.resources) {
    return null;
  }

  const nextDay = current.day + 1;
  const season = resolveSeason(nextDay);
  const year = Math.floor(nextDay / 360);

  const dailyConsumption = Math.max(1, Math.ceil(current.population * 0.65));
  const foodBefore = current.resources.food;
  const foodAfter = clamp(foodBefore - dailyConsumption, 0, 100000);

  await prisma.$transaction([
    prisma.resourceState.update({
      where: { villageId },
      data: { food: foodAfter },
    }),
    prisma.village.update({
      where: { id: villageId },
      data: {
        day: nextDay,
        season,
        year,
      },
    }),
    prisma.eventRecord.create({
      data: {
        villageId,
        day: nextDay,
        type: 'daily_tick',
        title: 'Another day passes in Spiritvale.',
        facts: { dailyConsumption, foodBefore, foodAfter },
      },
    }),
    ...(foodAfter <= 0
      ? [
          prisma.eventRecord.create({
            data: {
              villageId,
              day: nextDay,
              type: 'resource_shortage',
              title: 'Food stores are exhausted.',
              facts: { severity: 'critical' },
            },
          }),
        ]
      : []),
  ]);

  return getGame(villageId);
}
