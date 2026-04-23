import { clamp } from './worldGenerator';
import type { TickContext } from './tickContext';

export function stepUpdateVillageResources(ctx: TickContext): void {
  const pop = ctx.villagers.length;
  ctx.dailyConsumption = Math.max(1, Math.ceil(pop * 0.65));
  ctx.foodAfter = clamp(ctx.foodBefore - ctx.dailyConsumption, 0, 100000);
  ctx.starving = ctx.foodAfter <= 0;

  if (ctx.starving) {
    ctx.emittedEvents.push({
      villageId: ctx.villageId,
      day: ctx.day,
      type: 'resource_shortage',
      title: 'Food stores are exhausted.',
      facts: { severity: 'critical' },
    });
  }
}
