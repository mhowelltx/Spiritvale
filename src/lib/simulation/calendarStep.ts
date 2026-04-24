import type { SimulationTickContext } from './tickContext';

export function stepAdvanceTick(ctx: SimulationTickContext): void {
  ctx.tick = ctx.prevTick + 1;
}
