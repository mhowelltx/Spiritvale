import { prisma } from '@/lib/server/prisma';
import { createSeededRng } from '@/lib/rng/seededRng';
import { resolveSeason } from './worldGenerator';
import { stepAdvanceCalendar } from './calendarStep';
import { stepUpdateVillageResources } from './resourceStep';
import { stepAgeAndLifeStage } from './agingStep';
import { stepUpdateNeedsAndEmotions } from './needsEmotionsStep';
import { stepFinalizeDeathsBirthsHouseholds } from './birthDeathStep';
import { stepResolveSocialInteractions } from './socialStep';
import type { TickContext, MutableVillager, MutableRelationshipEdge } from './tickContext';
import type { VillagerNeeds, VillagerEmotions, VillageView } from '@/lib/domain/types';

export async function runTick(villageId: string): Promise<VillageView | null> {
  // 1. Load current state
  const current = await prisma.village.findUnique({
    where: { id: villageId },
    include: {
      resources: true,
      villagers: true,
      kinshipLinks: { select: { fromVillagerId: true, toVillagerId: true } },
      relationshipEdges: true,
    },
  });

  if (!current || !current.resources) return null;

  // 2. Build household member map: villagerId → [other member ids in same household]
  //    We use the villager.householdId to group them (simpler than kinship traversal)
  const householdMembersById = new Map<string, string[]>();
  const byHousehold = new Map<string, string[]>();
  for (const v of current.villagers) {
    if (v.householdId) {
      if (!byHousehold.has(v.householdId)) byHousehold.set(v.householdId, []);
      byHousehold.get(v.householdId)!.push(v.id);
    }
  }
  for (const v of current.villagers) {
    if (v.householdId) {
      const members = byHousehold.get(v.householdId) ?? [];
      // Others in the same household (excluding self)
      householdMembersById.set(v.id, members.filter((id) => id !== v.id));
    } else {
      householdMembersById.set(v.id, []);
    }
  }

  // 3. Build mutable villager list
  const mutableVillagers: MutableVillager[] = current.villagers.map((v) => ({
    id: v.id,
    name: v.name,
    sex: v.sex,
    ageInDays: v.ageInDays,
    lifeStage: v.lifeStage,
    role: v.role,
    traits: v.traits as string[],
    householdId: v.householdId,
    needs: (v.needs as unknown as VillagerNeeds) ?? { hunger: 0, safety: 0.7, belonging: 0.5, status: 0.5 },
    emotions: (v.emotions as unknown as VillagerEmotions) ?? { fear: 0.1, grief: 0, hope: 0.5, anger: 0 },
  }));

  // 4. Build mutable relationship edge list
  const mutableRelationshipEdges: MutableRelationshipEdge[] = current.relationshipEdges.map((e) => ({
    id: e.id,
    fromVillagerId: e.fromVillagerId,
    toVillagerId: e.toVillagerId,
    type: e.type,
    strength: e.strength,
    trust: e.trust,
    lastInteractionDay: e.lastInteractionDay,
  }));

  // 5. Build tick context
  const ctx: TickContext = {
    villageId,
    seed: current.seed,
    rng: createSeededRng(`${current.seed}:tick:${current.day + 1}`),
    prevDay: current.day,
    day: current.day, // will be incremented by stepAdvanceCalendar
    season: resolveSeason(current.day),
    year: current.year,
    foodBefore: current.resources.food,
    foodAfter: current.resources.food,
    dailyConsumption: 0,
    starving: false,
    villagers: mutableVillagers,
    householdMembersById,
    relationshipEdges: mutableRelationshipEdges,
    deadIds: [],
    newborns: [],
    updatedVillagers: [],
    updatedRelationships: [],
    emittedEvents: [],
  };

  // 6. Run steps in order
  stepAdvanceCalendar(ctx);
  stepUpdateVillageResources(ctx);
  stepAgeAndLifeStage(ctx);
  stepUpdateNeedsAndEmotions(ctx);
  stepFinalizeDeathsBirthsHouseholds(ctx);
  stepResolveSocialInteractions(ctx);

  // 6. Emit daily summary event
  const deadCount = ctx.deadIds.length;
  const birthCount = ctx.newborns.length;
  ctx.emittedEvents.unshift({
    villageId,
    day: ctx.day,
    type: 'daily_tick',
    title: 'Another day passes in Spiritvale.',
    facts: {
      dailyProduction: Number((ctx.foodAfter - ctx.foodBefore + ctx.dailyConsumption).toFixed(1)),
      dailyConsumption: ctx.dailyConsumption,
      foodBefore: ctx.foodBefore,
      foodAfter: ctx.foodAfter,
      deaths: deadCount,
      births: birthCount,
    },
  });

  const survivingCount = ctx.villagers.filter((v) => !ctx.deadIds.includes(v.id)).length + birthCount;

  // 7. Persist all changes in a single transaction
  await prisma.$transaction([
    prisma.resourceState.update({ where: { villageId }, data: { food: ctx.foodAfter } }),
    prisma.village.update({
      where: { id: villageId },
      data: { day: ctx.day, season: ctx.season, year: ctx.year, population: survivingCount },
    }),
    // Delete dead villagers (cascade removes their kinship/relationship rows)
    ...ctx.deadIds.map((id) => prisma.villager.delete({ where: { id } })),
    // Update surviving villagers (age, lifeStage, needs, emotions)
    ...ctx.villagers
      .filter((v) => !ctx.deadIds.includes(v.id))
      .map((v) =>
        prisma.villager.update({
          where: { id: v.id },
          data: {
            ageInDays: v.ageInDays,
            lifeStage: v.lifeStage,
            needs: v.needs as object,
            emotions: v.emotions as object,
          },
        })
      ),
    // Create newborns
    ...ctx.newborns.map((baby) =>
      prisma.villager.create({
        data: {
          villageId,
          householdId: baby.householdId,
          name: baby.name,
          sex: baby.sex,
          ageInDays: 0,
          lifeStage: 'child',
          role: 'child',
          traits: baby.traits,
          needs: baby.needs as object,
          emotions: baby.emotions as object,
        },
      })
    ),
    // Persist relationship edge changes
    ...ctx.updatedRelationships.map((r) =>
      prisma.relationshipEdge.update({
        where: { id: r.id },
        data: { strength: r.strength, trust: r.trust, lastInteractionDay: r.lastInteractionDay },
      })
    ),
    // Persist events
    ...ctx.emittedEvents.map((e) => prisma.eventRecord.create({ data: e })),
  ]);

  // 8. Return the updated view
  const { getGame } = await import('@/lib/server/gameService');
  return getGame(villageId);
}
