import { clamp } from './worldGenerator';
import type { TickContext } from './tickContext';
import type { CultureState } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Threshold event definitions — fired once when a boundary is newly crossed
// ---------------------------------------------------------------------------

interface ThresholdEvent {
  field: keyof CultureState;
  threshold: number;
  direction: 'up' | 'down';
  title: string;
}

const THRESHOLD_EVENTS: ThresholdEvent[] = [
  { field: 'spiritualFear',      threshold: 0.8, direction: 'up',   title: 'A deep fear of the spirit world grips every hearth.' },
  { field: 'spiritualFear',      threshold: 0.2, direction: 'down', title: 'The old terrors have faded. The village grows bold.' },
  { field: 'kinLoyaltyNorm',     threshold: 0.8, direction: 'up',   title: 'The village draws tightly inward — family above all else.' },
  { field: 'sharingNorm',        threshold: 0.2, direction: 'down', title: 'Hoarding has taken hold. Trust in the commons erodes.' },
  { field: 'ritualIntensity',    threshold: 0.8, direction: 'up',   title: 'Ritual fills every waking hour. The old ways dominate.' },
  { field: 'outsiderTolerance',  threshold: 0.5, direction: 'up',   title: 'The village opens its gates more readily to those from afar.' },
  { field: 'punishmentSeverity', threshold: 0.8, direction: 'up',   title: 'Those who transgress are now dealt with without mercy.' },
];

function checkThresholds(
  old: CultureState,
  next: CultureState
): Array<{ field: string; title: string }> {
  const crossed: Array<{ field: string; title: string }> = [];
  for (const te of THRESHOLD_EVENTS) {
    const oldVal = old[te.field];
    const newVal = next[te.field];
    const crosses =
      te.direction === 'up'
        ? oldVal < te.threshold && newVal >= te.threshold
        : oldVal > te.threshold && newVal <= te.threshold;
    if (crosses) crossed.push({ field: te.field, title: te.title });
  }
  return crossed;
}

// ---------------------------------------------------------------------------
// Pure computation — exported for testing
// ---------------------------------------------------------------------------

export function computeCultureDrift(
  culture: CultureState,
  deathCount: number,
  birthCount: number,
  starving: boolean,
  hadSpiritIntervention: boolean
): CultureState {
  const c = { ...culture };

  // Event-driven drift
  if (deathCount > 0) {
    c.spiritualFear  += deathCount * 0.003;
    c.kinLoyaltyNorm += deathCount * 0.002;
  }
  if (birthCount > 0) {
    c.outsiderTolerance += birthCount * 0.001;
    c.sharingNorm       += birthCount * 0.001;
  }
  if (starving) {
    c.kinLoyaltyNorm     += 0.004;
    c.punishmentSeverity += 0.002;
  }
  if (hadSpiritIntervention) {
    c.ritualIntensity += 0.005;
    c.spiritualFear   += 0.003;
  }

  // Mean-reversion toward 0.5 at 0.0002/tick
  const MEAN_REVERSION = 0.0002;
  for (const key of Object.keys(c) as Array<keyof CultureState>) {
    c[key] += (0.5 - c[key]) * MEAN_REVERSION;
    c[key] = clamp(c[key], 0, 1);
  }

  return c;
}

// ---------------------------------------------------------------------------
// Effectful step
// ---------------------------------------------------------------------------

export function stepDriftCulture(ctx: TickContext): void {
  if (!ctx.cultureState) return;

  const deathCount = ctx.deadIds.length;
  const birthCount = ctx.newborns.length;
  const hadSpiritIntervention = ctx.emittedEvents.some((e) => e.type === 'spirit_intervention');

  const nextCulture = computeCultureDrift(
    ctx.cultureState,
    deathCount,
    birthCount,
    ctx.starving,
    hadSpiritIntervention
  );

  // Detect threshold crossings and emit events
  const crossed = checkThresholds(ctx.cultureState, nextCulture);
  for (const { field, title } of crossed) {
    ctx.emittedEvents.push({
      villageId: ctx.villageId,
      day: ctx.day,
      type: 'culture_shift',
      title,
      facts: { field },
    });
  }

  ctx.cultureState = nextCulture;
  ctx.updatedCulture = nextCulture;
}
