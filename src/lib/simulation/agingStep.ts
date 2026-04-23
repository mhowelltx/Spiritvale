import { resolveLifeStage } from './worldGenerator';
import type { TickContext } from './tickContext';

const DAYS_PER_YEAR = 360;

export function stepAgeAndLifeStage(ctx: TickContext): void {
  for (const v of ctx.villagers) {
    const newAge = v.ageInDays + 1;
    const lifeStage = resolveLifeStage(newAge);
    const ageYears = newAge / DAYS_PER_YEAR;

    let deathChance = 0;
    if (ageYears >= 65) deathChance = 0.008 + (ageYears - 65) * 0.012;
    if (ctx.starving) deathChance += 0.03;

    // Disease mortality — cautious trait halves the contribution
    const isCautious = v.traits.includes('cautious');
    const diseaseContribution = ctx.diseaseRisk * 0.0005;
    deathChance += isCautious ? diseaseContribution * 0.5 : diseaseContribution;

    if (ctx.rng() < deathChance) {
      ctx.deadIds.push(v.id);
      let cause: string;
      if (ctx.starving && ctx.rng() < 0.4) {
        cause = 'starvation';
      } else if (ctx.diseaseRisk > 0.5 && ctx.rng() < ctx.diseaseRisk * 0.5) {
        cause = 'disease';
      } else {
        cause = 'old age';
      }
      ctx.emittedEvents.push({
        villageId: ctx.villageId,
        day: ctx.day,
        type: 'villager_death',
        title: `${v.name} has died.`,
        facts: {
          villagerId: v.id,
          name: v.name,
          cause,
          ageYears: Math.floor(ageYears),
        },
      });
    } else {
      v.ageInDays = newAge;
      v.lifeStage = lifeStage;
    }
  }
}
