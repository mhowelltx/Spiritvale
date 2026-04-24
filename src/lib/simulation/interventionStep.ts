import { clamp } from '@/lib/utils/math';
import type { SimulationTickContext } from './tickContext';

// Applies active interventions injected by the experimenter.
// Interventions affect environmental stress, group composition, or culture.

export function stepApplyInterventions(ctx: SimulationTickContext): void {
  const { activeInterventions, agents, groups, culture, tick } = ctx;
  const expired: string[] = [];

  for (const intervention of activeInterventions) {
    const { type, magnitude, targetGroupId, targetAgentId } = intervention;

    switch (type) {
      case 'introduce_stressor':
        ctx.environmentalStress = clamp(ctx.environmentalStress + magnitude * 0.3, 0, 1);
        break;

      case 'introduce_resource':
        ctx.environmentalStress = clamp(ctx.environmentalStress - magnitude * 0.3, 0, 1);
        // Resource injection boosts physiological needs
        for (const agent of agents.filter((a) => !ctx.exitedAgentIds.includes(a.id))) {
          if (targetGroupId && agent.groupId !== targetGroupId) continue;
          agent.needs.physiological = clamp(agent.needs.physiological + magnitude * 0.2, 0, 1);
        }
        break;

      case 'introduce_outsider': {
        // Increases inter-group tension by raising uncertainty avoidance pressure
        culture.uncertaintyAvoidance = clamp(culture.uncertaintyAvoidance + magnitude * 0.05, 0, 1);
        ctx.emittedEvents.push({
          experimentId: ctx.experimentId, tick,
          type: 'intervention_outsider',
          title: 'An unfamiliar person enters the group, creating uncertainty.',
          facts: { magnitude, targetGroupId },
        });
        break;
      }

      case 'shift_culture': {
        // Directly nudges a Hofstede dimension
        const params = intervention as unknown as Record<string, unknown>;
        const dimension = params['dimension'] as keyof typeof culture | undefined;
        if (dimension && dimension in culture) {
          (culture as unknown as Record<string, number>)[dimension as string] = clamp(
            ((culture as unknown as Record<string, number>)[dimension as string] ?? 0.5) + magnitude * 0.1,
            0, 1
          );
        }
        break;
      }

      case 'split_group':
      case 'merge_groups':
      case 'remove_agent':
        // These require structural changes handled at service layer before tick
        break;
    }

    intervention.remainingTicks--;
    if (intervention.remainingTicks <= 0) {
      expired.push(intervention.id);
    }
  }

  // Remove expired interventions
  ctx.activeInterventions = activeInterventions.filter((i) => !expired.includes(i.id));
}
