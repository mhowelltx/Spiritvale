import { randomUUID } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { createSeededRng } from '@/lib/rng/seededRng';
import { clamp } from './worldGenerator';
import type { FamineSeverity, SpiritActionInput, SpiritActionResult, VillagerEmotions, VillagerMotive } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Send Dream
// ---------------------------------------------------------------------------

export type DreamIntent = 'hope' | 'warning' | 'revelation' | 'fear';

export interface SendDreamEffect {
  emotionChanges: Partial<VillagerEmotions>;
}

export function computeSendDreamEffect(
  emotions: VillagerEmotions,
  intent: DreamIntent,
  spiritualFearAmplifier = 1.0
): SendDreamEffect {
  const amp = spiritualFearAmplifier;
  let changes: Partial<VillagerEmotions>;
  switch (intent) {
    case 'hope':
      changes = {
        hope:  clamp(emotions.hope  + 0.25 * amp, 0, 1) - emotions.hope,
        fear:  clamp(emotions.fear  - 0.10 * amp, 0, 1) - emotions.fear,
        grief: clamp(emotions.grief - 0.05 * amp, 0, 1) - emotions.grief,
      };
      break;
    case 'warning':
      changes = {
        fear: clamp(emotions.fear + 0.20 * amp, 0, 1) - emotions.fear,
        hope: clamp(emotions.hope - 0.10 * amp, 0, 1) - emotions.hope,
      };
      break;
    case 'revelation':
      changes = {
        hope: clamp(emotions.hope + 0.10 * amp, 0, 1) - emotions.hope,
        fear: clamp(emotions.fear - 0.05 * amp, 0, 1) - emotions.fear,
      };
      break;
    case 'fear':
      changes = {
        fear:  clamp(emotions.fear  + 0.30 * amp, 0, 1) - emotions.fear,
        anger: clamp(emotions.anger + 0.10 * amp, 0, 1) - emotions.anger,
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

  const culture = await prisma.cultureState.findUnique({ where: { villageId } });
  const spiritualFearAmplifier = 1 + (culture?.spiritualFear ?? 0.5) * 0.6;

  const emotions = (villager.emotions as unknown as VillagerEmotions) ?? { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };
  const { emotionChanges } = computeSendDreamEffect(emotions, intent, spiritualFearAmplifier);

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
// Cause Famine
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

async function resolveCauseFamine(
  villageId: string,
  severity: FamineSeverity,
  currentDay: number
): Promise<SpiritActionResult> {
  const resources = await prisma.resourceState.findUnique({ where: { villageId } });
  if (!resources) throw new Error(`Village ${villageId} not found`);

  const villagers = await prisma.villager.findMany({ where: { villageId } });
  const rng = createSeededRng(`${villageId}:spirit:cause_famine:${currentDay}`);
  const effect = computeCauseFamineEffect(resources.food, severity, rng);

  const eventId = randomUUID();
  const title =
    severity === 'severe'
      ? 'A terrible famine grips the village.'
      : 'Hunger gnaws at the village.';

  await prisma.$transaction([
    prisma.resourceState.update({ where: { villageId }, data: { food: effect.foodAfter } }),
    ...villagers.map((v) => {
      const emotions = (v.emotions as unknown as VillagerEmotions) ?? { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };
      const updated: VillagerEmotions = {
        ...emotions,
        fear: clamp(emotions.fear + effect.fearIncrease, 0, 1),
        anger: clamp(emotions.anger + effect.angerIncrease, 0, 1),
      };
      return prisma.villager.update({ where: { id: v.id }, data: { emotions: updated as object } });
    }),
    prisma.eventRecord.create({
      data: {
        id: eventId,
        villageId,
        day: currentDay,
        type: 'spirit_intervention',
        title,
        facts: {
          spiritAction: 'cause_famine',
          severity,
          foodBefore: resources.food,
          foodAfter: effect.foodAfter,
          reductionFactor: Number(effect.reductionFactor.toFixed(3)),
          fearIncrease: effect.fearIncrease,
          villagerCount: villagers.length,
        },
      },
    }),
  ]);

  return { success: true, eventId, foodAfter: effect.foodAfter, affectedVillagerCount: villagers.length };
}

// ---------------------------------------------------------------------------
// Bless Health
// ---------------------------------------------------------------------------

export function computeBlessHealthEffect(
  safety: number,
  isTargeted: boolean
): number {
  return clamp(safety + (isTargeted ? 0.25 : 0.10), 0, 1);
}

export async function resolveBlessHealth(
  villageId: string,
  targetVillagerId: string | null,
  currentDay: number
): Promise<SpiritActionResult> {
  const villagers = targetVillagerId
    ? await prisma.villager.findMany({ where: { id: targetVillagerId, villageId } })
    : await prisma.villager.findMany({ where: { villageId } });

  if (villagers.length === 0) throw new Error('No villagers found for bless_health');

  const isTargeted = targetVillagerId !== null;
  const eventId = randomUUID();

  await prisma.$transaction([
    ...villagers.map((v) => {
      const needs = v.needs as Record<string, number>;
      const updatedSafety = computeBlessHealthEffect(needs.safety ?? 0.7, isTargeted);
      return prisma.villager.update({
        where: { id: v.id },
        data: { needs: { ...needs, safety: updatedSafety } as object },
      });
    }),
    prisma.resourceState.update({
      where: { villageId },
      data: { healthBlessingDaysRemaining: 14 },
    }),
    prisma.eventRecord.create({
      data: {
        id: eventId,
        villageId,
        day: currentDay,
        type: 'spirit_intervention',
        title: isTargeted
          ? `The spirit lays healing hands upon ${villagers[0]!.name}.`
          : 'A spirit ward descends over the village, easing sickness.',
        facts: {
          spiritAction: 'bless_health',
          targetVillagerId: targetVillagerId ?? null,
          healthBlessingDays: 14,
          affectedCount: villagers.length,
        },
      },
    }),
  ]);

  return { success: true, eventId, foodAfter: 0, affectedVillagerCount: villagers.length };
}

// ---------------------------------------------------------------------------
// Cause Storm
// ---------------------------------------------------------------------------

export function computeCauseStormEffect(foodBefore: number): number {
  return Math.max(0, Math.round(foodBefore * 0.80));
}

export async function resolveCauseStorm(
  villageId: string,
  currentDay: number
): Promise<SpiritActionResult> {
  const resources = await prisma.resourceState.findUnique({ where: { villageId } });
  if (!resources) throw new Error(`Village ${villageId} not found`);

  const foodAfter = computeCauseStormEffect(resources.food);
  const eventId = randomUUID();

  await prisma.$transaction([
    prisma.resourceState.update({
      where: { villageId },
      data: { stormDaysRemaining: 5, food: foodAfter },
    }),
    prisma.eventRecord.create({
      data: {
        id: eventId,
        villageId,
        day: currentDay,
        type: 'spirit_intervention',
        title: 'The spirit unleashes a devastating storm upon Spiritvale.',
        facts: {
          spiritAction: 'cause_storm',
          foodBefore: resources.food,
          foodAfter,
          stormDays: 5,
          severity: 'crisis',
        },
      },
    }),
  ]);

  return { success: true, eventId, foodAfter, affectedVillagerCount: 0 };
}

// ---------------------------------------------------------------------------
// Plant Idea
// ---------------------------------------------------------------------------

const PLANT_IDEA_CULTURE_NUDGE: Partial<Record<string, string>> = {
  tradition: 'ritualIntensity',
  reform: 'outsiderTolerance',
  kin_protection: 'kinLoyaltyNorm',
};

export async function resolvePlantIdea(
  villageId: string,
  targetVillagerId: string,
  motiveType: string,
  currentDay: number
): Promise<SpiritActionResult> {
  const villager = await prisma.villager.findFirst({ where: { id: targetVillagerId, villageId } });
  if (!villager) throw new Error(`Villager ${targetVillagerId} not found`);

  const motives = (villager.motives as unknown as VillagerMotive[]) ?? [];

  const motiveLabels: Record<string, string> = {
    tradition: 'Preserve the old ways',
    reform: 'Change how things are done',
    belonging: 'Find closeness with others',
    survival: 'Keep the family fed',
    kin_protection: 'Protect family at all costs',
  };

  // Upsert: bump existing motive to urgency 0.9, or add new (max 2, displace lowest)
  const existing = motives.find((m) => m.type === motiveType);
  let updatedMotives: VillagerMotive[];
  if (existing) {
    updatedMotives = motives.map((m) =>
      m.type === motiveType ? { ...m, urgency: 0.9 } : m
    );
  } else if (motives.length < 2) {
    updatedMotives = [...motives, { type: motiveType, label: motiveLabels[motiveType] ?? motiveType, urgency: 0.9 }];
  } else {
    const lowestIdx = motives.reduce((li, m, i) => (m.urgency < motives[li]!.urgency ? i : li), 0);
    updatedMotives = motives.map((m, i) =>
      i === lowestIdx ? { type: motiveType, label: motiveLabels[motiveType] ?? motiveType, urgency: 0.9 } : m
    );
  }

  const cultureField = PLANT_IDEA_CULTURE_NUDGE[motiveType];
  const eventId = randomUUID();

  await prisma.$transaction([
    prisma.villager.update({ where: { id: targetVillagerId }, data: { motives: updatedMotives as object[] } }),
    ...(cultureField
      ? [prisma.$executeRawUnsafe(
          `UPDATE "CultureState" SET "${cultureField}" = LEAST(1.0, "${cultureField}" + 0.01) WHERE "villageId" = $1`,
          villageId
        )]
      : []),
    prisma.eventRecord.create({
      data: {
        id: eventId,
        villageId,
        day: currentDay,
        type: 'spirit_intervention',
        title: `The spirit plants a seed of ${motiveType} in ${villager.name}'s mind.`,
        facts: { spiritAction: 'plant_idea', targetVillagerId, motiveType, urgency: 0.9 },
      },
    }),
  ]);

  return { success: true, eventId, foodAfter: 0, affectedVillagerCount: 1 };
}

// ---------------------------------------------------------------------------
// Effectful resolver — main dispatch
// ---------------------------------------------------------------------------

export async function resolveSpiritAction(
  villageId: string,
  input: SpiritActionInput,
  currentDay: number
): Promise<SpiritActionResult> {
  switch (input.type) {
    case 'send_dream':
      return resolveSendDream(villageId, input.targetVillagerId, input.intent, currentDay);
    case 'bless_harvest':
      return resolveBlessHarvest(villageId, currentDay);
    case 'cause_famine':
      return resolveCauseFamine(villageId, input.severity, currentDay);
    case 'bless_health':
      return resolveBlessHealth(villageId, input.targetVillagerId ?? null, currentDay);
    case 'cause_storm':
      return resolveCauseStorm(villageId, currentDay);
    case 'plant_idea':
      return resolvePlantIdea(villageId, input.targetVillagerId, input.motiveType, currentDay);
    default:
      throw new Error(`Unknown spirit action: ${(input as SpiritActionInput).type}`);
  }
}
