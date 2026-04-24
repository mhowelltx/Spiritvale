import { clamp } from '@/lib/utils/math';
import * as C from './coefficients';
import type { SimulationTickContext } from './tickContext';

// Hofstede cultural dimension drift step.
// Culture shifts in response to accumulated tick incidents, then
// mean-reverts toward the experimenter-configured setpoint.
// Ref: Hofstede (1980, 2001) — Culture's Consequences.

export function stepDriftHofstedeCulture(ctx: SimulationTickContext): void {
  const { culture, cultureSetpoint, metrics } = ctx;
  const totalAgents = ctx.agents.filter((a) => !ctx.exitedAgentIds.includes(a.id)).length;
  if (totalAgents === 0) return;

  const conflictRate = metrics.conflictCount / totalAgents;
  const cooperationRate = metrics.cooperationCount / totalAgents;
  const enforcementRate = metrics.normEnforcementCount / totalAgents;

  // Power Distance: rises with enforcement (authority asserts itself); falls when cooperation dominates
  culture.powerDistance = clamp(
    culture.powerDistance + (enforcementRate * 0.4 - cooperationRate * 0.2) * C.CULTURE_DRIFT_RATE,
    0, 1
  );

  // Individualism: rises under conflict (competition over cooperation); falls under external stress / group solidarity
  culture.individualism = clamp(
    culture.individualism + (conflictRate * 0.3 - cooperationRate * 0.3) * C.CULTURE_DRIFT_RATE,
    0, 1
  );

  // Masculinity: rises when conflict and enforcement dominate; falls when care and cooperation prevail
  culture.masculinity = clamp(
    culture.masculinity + ((conflictRate + enforcementRate) * 0.2 - cooperationRate * 0.3) * C.CULTURE_DRIFT_RATE,
    0, 1
  );

  // Uncertainty Avoidance: rises after high-conflict ticks, falls in stable low-conflict periods
  culture.uncertaintyAvoidance = clamp(
    culture.uncertaintyAvoidance + (conflictRate * 0.4 - (1 - conflictRate) * 0.1) * C.CULTURE_DRIFT_RATE,
    0, 1
  );

  // Long-term Orientation: rises when cooperation builds social capital; falls under panic-driven conflict
  culture.longTermOrientation = clamp(
    culture.longTermOrientation + (cooperationRate * 0.3 - conflictRate * 0.4) * C.CULTURE_DRIFT_RATE,
    0, 1
  );

  // Mean-revert toward experimenter-configured setpoint (culture is "sticky")
  culture.powerDistance       = meanRevert(culture.powerDistance, cultureSetpoint.powerDistance);
  culture.individualism       = meanRevert(culture.individualism, cultureSetpoint.individualism);
  culture.masculinity         = meanRevert(culture.masculinity, cultureSetpoint.masculinity);
  culture.uncertaintyAvoidance = meanRevert(culture.uncertaintyAvoidance, cultureSetpoint.uncertaintyAvoidance);
  culture.longTermOrientation = meanRevert(culture.longTermOrientation, cultureSetpoint.longTermOrientation);

  emitCulturalThresholds(ctx);

  ctx.updatedCulture = { ...culture };
}

function meanRevert(current: number, setpoint: number): number {
  return clamp(current + (setpoint - current) * C.CULTURE_MEAN_REVERSION, 0, 1);
}

function emitCulturalThresholds(ctx: SimulationTickContext): void {
  const c = ctx.culture;
  if (c.powerDistance >= 0.85) {
    ctx.emittedEvents.push({ experimentId: ctx.experimentId, tick: ctx.tick, type: 'culture_threshold',
      title: 'Rigid hierarchy dominates — questioning authority has become taboo.',
      facts: { dimension: 'powerDistance', value: c.powerDistance } });
  }
  if (c.individualism >= 0.85) {
    ctx.emittedEvents.push({ experimentId: ctx.experimentId, tick: ctx.tick, type: 'culture_threshold',
      title: 'Every person for themselves — collective solidarity has collapsed.',
      facts: { dimension: 'individualism', value: c.individualism } });
  }
  if (c.individualism <= 0.15) {
    ctx.emittedEvents.push({ experimentId: ctx.experimentId, tick: ctx.tick, type: 'culture_threshold',
      title: 'The group has become paramount — individual interests are suppressed.',
      facts: { dimension: 'individualism', value: c.individualism } });
  }
  if (c.uncertaintyAvoidance >= 0.85) {
    ctx.emittedEvents.push({ experimentId: ctx.experimentId, tick: ctx.tick, type: 'culture_threshold',
      title: 'Strict conformity grips the group — deviation is punished harshly.',
      facts: { dimension: 'uncertaintyAvoidance', value: c.uncertaintyAvoidance } });
  }
}
