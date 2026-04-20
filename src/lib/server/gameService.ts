import { randomUUID } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { createSeededRng } from '@/lib/rng/seededRng';
import { generateName } from '@/lib/rng/nameGen';
import type { CreateGameInput, LifeStage, Role, Season, Sex, VillagerView, VillageView } from '@/lib/domain/types';

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const DAYS_PER_YEAR = 360;
const DAYS_PER_SEASON = 90;

// Personality traits pool
const TRAITS = ['brave', 'cautious', 'generous', 'stubborn', 'curious', 'loyal', 'proud', 'gentle', 'fierce', 'wise'];

function resolveSeason(day: number): Season {
  const idx = Math.floor(day / DAYS_PER_SEASON) % SEASONS.length;
  return SEASONS[idx] ?? 'spring';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveLifeStage(ageInDays: number): LifeStage {
  const years = ageInDays / DAYS_PER_YEAR;
  if (years < 15) return 'child';
  if (years < 50) return 'adult';
  return 'elder';
}

function resolveRole(lifeStage: LifeStage, sex: Sex, rng: () => number): Role {
  if (lifeStage === 'child') return 'child';
  if (lifeStage === 'elder') return 'elder';
  // adults: healer is rare (10% chance), else split by sex with some variance
  if (rng() < 0.1) return 'healer';
  return sex === 'male' ? (rng() < 0.75 ? 'hunter' : 'gatherer') : (rng() < 0.65 ? 'gatherer' : 'hunter');
}

function pickTraits(rng: () => number): string[] {
  const count = 1 + Math.floor(rng() * 2); // 1 or 2 traits
  const shuffled = [...TRAITS].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

function buildVillagerData(rng: () => number, villageId: string) {
  const sex: Sex = rng() < 0.5 ? 'male' : 'female';

  // Distribute ages: ~40% children, ~45% adults, ~15% elders
  let ageInDays: number;
  const roll = rng();
  if (roll < 0.4) {
    ageInDays = Math.floor(rng() * 14 * DAYS_PER_YEAR); // 0–13 years
  } else if (roll < 0.85) {
    ageInDays = Math.floor((15 + rng() * 34) * DAYS_PER_YEAR); // 15–48 years
  } else {
    ageInDays = Math.floor((50 + rng() * 20) * DAYS_PER_YEAR); // 50–69 years
  }

  const lifeStage = resolveLifeStage(ageInDays);
  const role = resolveRole(lifeStage, sex, rng);
  const name = generateName(sex, rng);
  const traits = pickTraits(rng);

  return { villageId, name, sex, ageInDays, lifeStage, role, traits };
}

function mapVillager(v: { id: string; name: string; sex: string; ageInDays: number; lifeStage: string; role: string; traits: unknown }): VillagerView {
  return {
    id: v.id,
    name: v.name,
    sex: v.sex as Sex,
    ageInDays: v.ageInDays,
    lifeStage: v.lifeStage as LifeStage,
    role: v.role as Role,
    traits: v.traits as string[],
  };
}

export async function createGame(input: CreateGameInput): Promise<VillageView> {
  const seed = input.seed ?? randomUUID();
  const rng = createSeededRng(seed);

  const population = input.startingPopulation ?? 16;
  const startingFood = input.startingFood ?? Math.round(110 + rng() * 40);
  const weatherHarsh = Number((0.2 + rng() * 0.5).toFixed(3));
  const diseaseRisk = Number((0.1 + rng() * 0.4).toFixed(3));

  const villagerData = Array.from({ length: population }, () => buildVillagerData(rng, ''));

  const village = await prisma.village.create({
    data: {
      seed,
      name: input.name ?? 'Spiritvale',
      population,
      resources: {
        create: { food: startingFood, weatherHarsh, diseaseRisk },
      },
      events: {
        create: {
          day: 0,
          type: 'world_created',
          title: 'A new village takes root.',
          facts: { seed, population, startingFood },
        },
      },
      villagers: {
        create: villagerData.map((v) => ({
          name: v.name,
          sex: v.sex,
          ageInDays: v.ageInDays,
          lifeStage: v.lifeStage,
          role: v.role,
          traits: v.traits,
        })),
      },
    },
    include: { resources: true, events: true, villagers: true },
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
    villagers: village.villagers.map(mapVillager),
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
    include: {
      resources: true,
      events: { orderBy: [{ day: 'desc' }, { createdAt: 'desc' }], take: 20 },
      villagers: { orderBy: { ageInDays: 'desc' } },
    },
  });

  if (!village) return null;

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
    villagers: village.villagers.map(mapVillager),
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
    include: { resources: true, villagers: true },
  });

  if (!current || !current.resources) return null;

  const nextDay = current.day + 1;
  const season = resolveSeason(nextDay);
  const year = Math.floor(nextDay / DAYS_PER_YEAR);

  // Use a per-tick seeded RNG so results are deterministic per (seed, day)
  const rng = createSeededRng(`${current.seed}:tick:${nextDay}`);

  // --- Food ---
  const dailyConsumption = Math.max(1, Math.ceil(current.population * 0.65));
  const foodBefore = current.resources.food;
  const foodAfter = clamp(foodBefore - dailyConsumption, 0, 100000);
  const starving = foodAfter <= 0;

  // --- Age all villagers; compute births and deaths ---
  const newEvents: Array<{ villageId: string; day: number; type: string; title: string; facts: object }> = [];
  const deadIds: string[] = [];
  const updatedVillagers: Array<{ id: string; ageInDays: number; lifeStage: LifeStage }> = [];

  for (const v of current.villagers) {
    const newAge = v.ageInDays + 1;
    const lifeStage = resolveLifeStage(newAge);
    const ageYears = newAge / DAYS_PER_YEAR;

    // Death by old age: probability rises steeply after 65
    let deathChance = 0;
    if (ageYears >= 65) deathChance = 0.008 + (ageYears - 65) * 0.012;
    if (starving) deathChance += 0.03;

    if (rng() < deathChance) {
      deadIds.push(v.id);
      newEvents.push({
        villageId,
        day: nextDay,
        type: 'villager_death',
        title: `${v.name} has died.`,
        facts: { villagerId: v.id, name: v.name, cause: starving && rng() < 0.5 ? 'starvation' : 'old age', ageYears: Math.floor(ageYears) },
      });
    } else {
      updatedVillagers.push({ id: v.id, ageInDays: newAge, lifeStage });
    }
  }

  // --- Births ---
  // Count adult females who survived
  const adultFemales = updatedVillagers.filter((uv) => {
    const original = current.villagers.find((v) => v.id === uv.id);
    return original && original.sex === 'female' && uv.lifeStage === 'adult';
  });

  const birthChance = starving ? 0.001 : 0.004; // ~1.4 births/year per adult female at baseline
  const newbornData: Array<ReturnType<typeof buildVillagerData>> = [];

  for (const _ of adultFemales) {
    if (rng() < birthChance) {
      const baby = buildVillagerData(rng, villageId);
      baby.ageInDays = 0;
      baby.lifeStage = 'child';
      baby.role = 'child';
      newbornData.push(baby);
      newEvents.push({
        villageId,
        day: nextDay,
        type: 'villager_birth',
        title: `${baby.name} was born.`,
        facts: { name: baby.name, sex: baby.sex },
      });
    }
  }

  const survivingCount = updatedVillagers.length + newbornData.length;

  // Base daily_tick event
  newEvents.unshift({
    villageId,
    day: nextDay,
    type: 'daily_tick',
    title: 'Another day passes in Spiritvale.',
    facts: { dailyConsumption, foodBefore, foodAfter, deaths: deadIds.length, births: newbornData.length },
  });

  if (starving) {
    newEvents.push({
      villageId,
      day: nextDay,
      type: 'resource_shortage',
      title: 'Food stores are exhausted.',
      facts: { severity: 'critical' },
    });
  }

  await prisma.$transaction([
    prisma.resourceState.update({ where: { villageId }, data: { food: foodAfter } }),
    prisma.village.update({ where: { id: villageId }, data: { day: nextDay, season, year, population: survivingCount } }),
    ...deadIds.map((id) => prisma.villager.delete({ where: { id } })),
    ...updatedVillagers.map(({ id, ageInDays, lifeStage }) =>
      prisma.villager.update({ where: { id }, data: { ageInDays, lifeStage } })
    ),
    ...newbornData.map((baby) =>
      prisma.villager.create({
        data: {
          villageId,
          name: baby.name,
          sex: baby.sex,
          ageInDays: 0,
          lifeStage: 'child',
          role: 'child',
          traits: baby.traits,
        },
      })
    ),
    ...newEvents.map((e) => prisma.eventRecord.create({ data: e })),
  ]);

  return getGame(villageId);
}
