import { randomUUID } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { createSeededRng } from '@/lib/rng/seededRng';
import { clamp } from './worldGenerator';
import type { FamineSeverity, SpiritActionInput, SpiritActionResult, VillagerEmotions } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Send Dream
// ---------------------------------------------------------------------------

export type DreamIntent = 'hope' | 'warning' | 'revelation' | 'fear';

export interface SendDreamEffect {
  emotionChanges: Partial<VillagerEmotions>;
}

export function computeSendDreamEffect(
  emotions: VillagerEmotions,
  intent: DreamIntent
): SendDreamEffect {
  let changes: Partial<VillagerEmotions>;
  switch (intent) {
    case 'hope':
      changes = {
        hope:  clamp(emotions.hope  + 0.25, 0, 1) - emotions.hope,
        fear:  clamp(emotions.fear  - 0.10, 0, 1) - emotions.fear,
        grief: clamp(emotions.grief - 0.05, 0, 1) - emotions.grief,
      };
      break;
    case 'warning':
      changes = {
        fear: clamp(emotions.fear + 0.20, 0, 1) - emotions.fear,
        hope: clamp(emotions.hope - 0.10, 0, 1) - emotions.hope,
      };
      break;
    case 'revelation':
      changes = {
        hope: clamp(emotions.hope + 0.10, 0, 1) - emotions.hope,
        fear: clamp(emotions.fear - 0.05, 0, 1) - emotions.fear,
      };
      break;
    case 'fear':
      changes = {
        fear:  clamp(emotions.fear  + 0.30, 0, 1) - emotions.fear,
        anger: clamp(emotions.anger + 0.10, 0, 1) - emotions.anger,
      };
      break;
  }
  return { emotionChanges: changes };
}

export async function resolveSendDream(
  villageId: string,
  targetVillagerId: string,
  intent: DreamIntent,
  currentDay: number
): Promise<SpiritActionResult> {
  const villager = await prisma.villager.findFirst({ where: { id: targetVillagerId, villageId } });
  if (!villager) throw new Error(`Villager ${targetVillagerId} not found in village ${villageId}`);

  const emotions = (villager.emotions as unknown as VillagerEmotions) ?? { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };
  const { emotionChanges } = computeSendDreamEffect(emotions, intent);

  const updatedEmotions: VillagerEmotions = {
    fear:  clamp(emotions.fear  + (emotionChanges.fear  ?? 0), 0, 1),
    grief: clamp(emotions.grief + (emotionChanges.grief ?? 0), 0, 1),
    hope:  clamp(emotions.hope  + (emotionChanges.hope  ?? 0), 0, 1),
    anger: clamp(emotions.anger + (emotionChanges.anger ?? 0), 0, 1),
  };

  const dreamTitles: Record<DreamIntent, string> = {
    hope:       `${villager.name} wakes with unexpected warmth in their heart.`,
    warning:    `${villager.name} wakes trembling from a dark vision.`,
    revelation: `${villager.name} is shaken by a dream of unseen purpose.`,
    fear:       `${villager.name} screams in the night, gripped by terrible visions.`,
  };

  const eventId = randomUUID();
  await prisma.$transaction([
    prisma.villager.update({ where: { id: targetVillagerId }, data: { emotions: updatedEmotions as object } }),
    prisma.eventRecord.create({
      data: {
        id: eventId,
        villageId,
        day: currentDay,
        type: 'spirit_intervention',
        title: dreamTitles[intent],
        facts: { spiritAction: 'send_dream', targetVillagerId, intent, emotionChanges },
      },
    }),
  ]);

  return { success: true, eventId, foodAfter: 0, affectedVillagerCount: 1 };
}

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
// Bless Harvest
// ---------------------------------------------------------------------------

export async function resolveBlessHarvest(
  villageId: string,
  currentDay: number
): Promise<SpiritActionResult> {
  const resources = await prisma.resourceState.findUnique({ where: { villageId } });
  if (!resources) throw new Error(`Village ${villageId} not found`);

  const eventId = randomUUID();
  await prisma.$transaction([
    prisma.resourceState.update({ where: { villageId }, data: { blessingDaysRemaining: 7 } }),
    prisma.eventRecord.create({
      data: {
        id: eventId,
        villageId,
        day: currentDay,
        type: 'spirit_intervention',
        title: 'The spirit breathes life into the soil. Abundance follows for seven days.',
        facts: { spiritAction: 'bless_harvest', blessingDays: 7 },
      },
    }),
  ]);

  return { success: true, eventId, foodAfter: resources.food, affectedVillagerCount: 0 };
}

// ---------------------------------------------------------------------------
// Effectful resolver
// ---------------------------------------------------------------------------

export async function resolveSpiritAction(
  villageId: string,
  input: SpiritActionInput,
  currentDay: number
): Promise<SpiritActionResult> {
  if (input.type === 'send_dream') {
    return resolveSendDream(villageId, input.targetVillagerId, input.intent, currentDay);
  }

  if (input.type === 'bless_harvest') {
    return resolveBlessHarvest(villageId, currentDay);
  }

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
