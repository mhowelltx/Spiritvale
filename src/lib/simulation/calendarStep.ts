import { resolveSeason } from './worldGenerator';
import type { TickContext } from './tickContext';

const DAYS_PER_YEAR = 360;

export function stepAdvanceCalendar(ctx: TickContext): void {
  ctx.day = ctx.prevDay + 1;
  const prevSeason = resolveSeason(ctx.prevDay);
  ctx.season = resolveSeason(ctx.day);
  ctx.year = Math.floor(ctx.day / DAYS_PER_YEAR);

  if (ctx.season !== prevSeason) {
    ctx.emittedEvents.push({
      villageId: ctx.villageId,
      day: ctx.day,
      type: 'season_change',
      title: `The ${ctx.season} begins.`,
      facts: { season: ctx.season, year: ctx.year },
    });
  }
}
