import { prisma } from '@/lib/server/prisma';
import { generateVillage, mapVillager } from '@/lib/simulation/worldGenerator';
import { runTick } from '@/lib/simulation/tickEngine';
import type { CreateGameInput, Season, VillageView, HouseholdSummary, CultureState } from '@/lib/domain/types';

export async function createGame(input: CreateGameInput): Promise<VillageView> {
  return generateVillage(input);
}

export async function getGame(villageId: string): Promise<VillageView | null> {
  const village = await prisma.village.findUnique({
    where: { id: villageId },
    include: {
      resources: true,
      cultureState: true,
      events: { orderBy: [{ day: 'desc' }, { createdAt: 'desc' }], take: 20 },
      villagers: {
        orderBy: { ageInDays: 'desc' },
        include: { household: true },
      },
      households: {
        include: { villagers: { select: { id: true } } },
      },
    },
  });

  if (!village) return null;

  const households: HouseholdSummary[] = village.households.map((h) => ({
    id: h.id,
    name: h.name,
    memberIds: h.villagers.map((v) => v.id),
  }));

  const culture: CultureState | null = village.cultureState
    ? {
        sharingNorm:        village.cultureState.sharingNorm,
        punishmentSeverity: village.cultureState.punishmentSeverity,
        outsiderTolerance:  village.cultureState.outsiderTolerance,
        prestigeByAge:      village.cultureState.prestigeByAge,
        prestigeBySkill:    village.cultureState.prestigeBySkill,
        ritualIntensity:    village.cultureState.ritualIntensity,
        spiritualFear:      village.cultureState.spiritualFear,
        kinLoyaltyNorm:     village.cultureState.kinLoyaltyNorm,
      }
    : null;

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
    culture,
    households,
    villagers: village.villagers.map((v) =>
      mapVillager({
        ...v,
        household: v.household ?? null,
      })
    ),
    events: village.events
      .slice()
      .reverse()
      .map((evt) => ({
        id: evt.id,
        day: evt.day,
        type: evt.type,
        title: evt.title,
        facts: evt.facts as Record<string, unknown>,
      })),
  };
}

export async function tickGame(villageId: string): Promise<VillageView | null> {
  return runTick(villageId);
}
