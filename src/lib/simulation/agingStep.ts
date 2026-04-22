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

    if (ctx.rng() < deathChance) {
      ctx.deadIds.push(v.id);
      ctx.emittedEvents.push({
        villageId: ctx.villageId,
        day: ctx.day,
        type: 'villager_death',
        title: `${v.name} has died.`,
        facts: {
          villagerId: v.id,
          name: v.name,
          cause: ctx.starving && ctx.rng() < 0.5 ? 'starvation' : 'old age',
          ageYears: Math.floor(ageYears),
        },
      });
    } else {
      v.ageInDays = newAge;
      v.lifeStage = lifeStage;
    }
  }
}
