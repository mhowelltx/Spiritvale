import { clamp } from './worldGenerator';
import type { TickContext } from './tickContext';

const DAYS_PER_YEAR = 360;
// Food is considered plentiful when stores exceed 2 days of consumption
const PLENTIFUL_MULTIPLIER = 2;

export function stepUpdateNeedsAndEmotions(ctx: TickContext): void {
  const deadSet = new Set(ctx.deadIds);
  const plentiful = ctx.foodAfter > ctx.dailyConsumption * PLENTIFUL_MULTIPLIER;

  for (const v of ctx.villagers) {
    if (deadSet.has(v.id)) continue;

    const n = { ...v.needs };
    const e = { ...v.emotions };

    // Hunger
    if (ctx.starving) {
      n.hunger = clamp(n.hunger + 0.08, 0, 1);
    } else {
      n.hunger = clamp(n.hunger - 0.03, 0, 1);
    }

    // Safety
    if (ctx.starving) {
      n.safety = clamp(n.safety - 0.05, 0, 1);
    } else if (ctx.season === 'winter') {
      n.safety = clamp(n.safety - 0.02, 0, 1);
    } else {
      n.safety = clamp(n.safety + 0.01, 0, 1);
    }

    // Belonging — decreases if sole survivor in household
    const housemates = ctx.householdMembersById.get(v.id) ?? [];
    const livingHousemates = housemates.filter((id) => !deadSet.has(id));
    if (livingHousemates.length === 0) {
      n.belonging = clamp(n.belonging - 0.03, 0, 1);
    }

    // --- Emotions ---

    // Check if a household member died today
    const housemateKilled = housemates.some((id) => ctx.deadIds.includes(id));

    // Fear
    if (ctx.starving) {
      e.fear = clamp(e.fear + 0.06, 0, 1);
    }
    if (housemateKilled) {
      e.fear = clamp(e.fear + 0.10, 0, 1);
    }
    if (!ctx.starving && !housemateKilled) {
      e.fear = clamp(e.fear - 0.02, 0, 1);
    }

    // Grief
    if (housemateKilled) {
      e.grief = clamp(e.grief + 0.30, 0, 1);

      // Emit household grief event once per villager who grieves
      const deadHousemate = ctx.deadIds.find((id) => housemates.includes(id));
      const deceasedVillager = ctx.villagers.find((dv) => dv.id === deadHousemate);
      if (deceasedVillager) {
        ctx.emittedEvents.push({
          villageId: ctx.villageId,
          day: ctx.day,
          type: 'household_grief',
          title: `${v.name} mourns ${deceasedVillager.name}.`,
          facts: { villagerId: v.id, deceasedId: deceasedVillager.id, householdId: v.householdId },
        });
      }
    } else {
      e.grief = clamp(e.grief - 0.01, 0, 1);
    }

    // Hope
    if (plentiful) {
      e.hope = clamp(e.hope + 0.01, 0, 1);
    } else if (ctx.starving) {
      e.hope = clamp(e.hope - 0.03, 0, 1);
    }
    // Drift toward 0.5
    e.hope = clamp(e.hope + (0.5 - e.hope) * 0.005, 0, 1);

    // Anger
    if (ctx.starving && e.fear > 0.6) {
      e.anger = clamp(e.anger + 0.03, 0, 1);
    } else {
      e.anger = clamp(e.anger - 0.015, 0, 1);
    }

    v.needs = n;
    v.emotions = e;
  }
}

// Pure function exported for testing
export function computeNeedsEmotionsUpdate(
  needs: { hunger: number; safety: number; belonging: number; status: number },
  emotions: { fear: number; grief: number; hope: number; anger: number },
  opts: {
    starving: boolean;
    season: string;
    housemateKilled: boolean;
    hasLivingHousemates: boolean;
    plentiful: boolean;
  }
) {
  const n = { ...needs };
  const e = { ...emotions };

  if (opts.starving) {
    n.hunger = clamp(n.hunger + 0.08, 0, 1);
    n.safety = clamp(n.safety - 0.05, 0, 1);
  } else {
    n.hunger = clamp(n.hunger - 0.03, 0, 1);
    if (opts.season === 'winter') {
      n.safety = clamp(n.safety - 0.02, 0, 1);
    } else {
      n.safety = clamp(n.safety + 0.01, 0, 1);
    }
  }

  if (!opts.hasLivingHousemates) {
    n.belonging = clamp(n.belonging - 0.03, 0, 1);
  }

  if (opts.starving) e.fear = clamp(e.fear + 0.06, 0, 1);
  if (opts.housemateKilled) e.fear = clamp(e.fear + 0.10, 0, 1);
  if (!opts.starving && !opts.housemateKilled) e.fear = clamp(e.fear - 0.02, 0, 1);

  if (opts.housemateKilled) {
    e.grief = clamp(e.grief + 0.30, 0, 1);
  } else {
    e.grief = clamp(e.grief - 0.01, 0, 1);
  }

  if (opts.plentiful) {
    e.hope = clamp(e.hope + 0.01, 0, 1);
  } else if (opts.starving) {
    e.hope = clamp(e.hope - 0.03, 0, 1);
  }
  e.hope = clamp(e.hope + (0.5 - e.hope) * 0.005, 0, 1);

  if (opts.starving && e.fear > 0.6) {
    e.anger = clamp(e.anger + 0.03, 0, 1);
  } else {
    e.anger = clamp(e.anger - 0.015, 0, 1);
  }

  return { needs: n, emotions: e };
}
