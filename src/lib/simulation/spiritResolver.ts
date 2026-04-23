import { randomUUID } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { createSeededRng } from '@/lib/rng/seededRng';
import { clamp } from './worldGenerator';
import type { FamineSeverity, SpiritActionInput, SpiritActionResult, VillagerEmotions } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Pure computation (testable without DB)
// ---------------------------------------------------------------------------

export interface FamineEffect {
  foodAfter: number;
  reductionFactor: number;
  fearIncrease: number;
  angerIncrease: number;
}

export function computeCauseFamineEffect(
  foodBefore: number,
  severity: FamineSeverity,
  rng: () => number
): FamineEffect {
  const reductionFactor =
    severity === 'severe'
      ? clamp(0.5 + rng() * 0.2, 0.5, 0.7)
      : clamp(0.3 + rng() * 0.2, 0.3, 0.5);

  const foodAfter = Math.max(0, Math.round(foodBefore * (1 - reductionFactor)));
  const fearIncrease = severity === 'severe' ? 0.3 : 0.15;
  const angerIncrease = severity === 'severe' ? 0.15 : 0.05;

  return { foodAfter, reductionFactor, fearIncrease, angerIncrease };
}

// ---------------------------------------------------------------------------
// Effectful resolver
// ---------------------------------------------------------------------------

export async function resolveSpiritAction(
  villageId: string,
  input: SpiritActionInput,
  currentDay: number
): Promise<SpiritActionResult> {
  const resources = await prisma.resourceState.findUnique({ where: { villageId } });
  if (!resources) throw new Error(`Village ${villageId} not found`);

  const villagers = await prisma.villager.findMany({ where: { villageId } });

  const rng = createSeededRng(`${villageId}:spirit:${input.type}:${currentDay}`);
  const effect = computeCauseFamineEffect(resources.food, input.severity, rng);

  const eventId = randomUUID();
  const title =
    input.severity === 'severe'
      ? 'A terrible famine grips the village.'
      : 'Hunger gnaws at the village.';

  await prisma.$transaction([
    prisma.resourceState.update({
      where: { villageId },
      data: { food: effect.foodAfter },
    }),
    // Update each villager's fear and anger emotions
    ...villagers.map((v) => {
      const emotions = (v.emotions as unknown as VillagerEmotions) ?? { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };
      const updated: VillagerEmotions = {
        ...emotions,
        fear: clamp(emotions.fear + effect.fearIncrease, 0, 1),
        anger: clamp(emotions.anger + effect.angerIncrease, 0, 1),
      };
      return prisma.villager.update({
        where: { id: v.id },
        data: { emotions: updated as object },
      });
    }),
    prisma.eventRecord.create({
      data: {
        id: eventId,
        villageId,
        day: currentDay,
        type: 'spirit_intervention',
        title,
        facts: {
          spiritAction: input.type,
          severity: input.severity,
          foodBefore: resources.food,
          foodAfter: effect.foodAfter,
          reductionFactor: Number(effect.reductionFactor.toFixed(3)),
          fearIncrease: effect.fearIncrease,
          villagerCount: villagers.length,
        },
      },
    }),
  ]);

  return {
    success: true,
    eventId,
    foodAfter: effect.foodAfter,
    affectedVillagerCount: villagers.length,
  };
}
