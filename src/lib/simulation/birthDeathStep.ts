import { buildVillagerData } from './worldGenerator';
import type { TickContext, NewbornData } from './tickContext';
import type { VillagerNeeds, VillagerEmotions } from '@/lib/domain/types';

const DEFAULT_NEEDS: VillagerNeeds = { hunger: 0, safety: 0.7, belonging: 0.7, status: 0.3 };
const DEFAULT_EMOTIONS: VillagerEmotions = { fear: 0.05, grief: 0, hope: 0.7, anger: 0 };

export function stepFinalizeDeathsBirthsHouseholds(ctx: TickContext): void {
  const deadSet = new Set(ctx.deadIds);

  // Birth: adult females who survived
  const adultFemales = ctx.villagers.filter(
    (v) => !deadSet.has(v.id) && v.sex === 'female' && v.lifeStage === 'adult'
  );

  const birthChance = ctx.starving ? 0.001 : 0.004;

  for (const mother of adultFemales) {
    if (ctx.rng() < birthChance) {
      const babyData = buildVillagerData(ctx.rng);
      const newborn: NewbornData = {
        name: babyData.name,
        sex: babyData.sex,
        ageInDays: 0,
        lifeStage: 'child',
        role: 'child',
        traits: babyData.traits,
        householdId: mother.householdId,
        needs: { ...DEFAULT_NEEDS },
        emotions: { ...DEFAULT_EMOTIONS },
      };
      ctx.newborns.push(newborn);
      ctx.emittedEvents.push({
        villageId: ctx.villageId,
        day: ctx.day,
        type: 'villager_birth',
        title: `${newborn.name} was born.`,
        facts: { name: newborn.name, sex: newborn.sex, motherId: mother.id, householdId: mother.householdId },
      });
    }
  }
}
