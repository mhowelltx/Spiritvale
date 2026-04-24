import { clamp, giniCoefficient } from '@/lib/utils/math';
import * as C from './coefficients';
import type { SimulationTickContext, MutableAgent } from './tickContext';

// Social Identity Theory mechanics:
// - Compute per-group cohesion index (mean intra-group relationship strength)
// - Compute inter-group tension (cross-group trust deficit)
// - Hierarchy formation (status score Gini coefficient per group)
// - Leadership emergence
// - Groupthink detection and conformity pressure
// Ref: Tajfel & Turner (1979, 1986); Janis (1972); Ridgeway (1991)

export function stepResolveGroupIdentityDynamics(ctx: SimulationTickContext): void {
  const { agents, groups, relationships, culture, rng, tick } = ctx;
  const live = agents.filter((a) => !ctx.exitedAgentIds.includes(a.id));
  const agentMap = new Map<string, MutableAgent>(live.map((a) => [a.id, a]));

  // Build fast edge lookup
  const edgeMap = new Map<string, number>(); // "from:to" → trust
  for (const e of relationships) {
    edgeMap.set(`${e.fromAgentId}:${e.toAgentId}`, e.trust);
  }

  let totalConformityPressure = 0;
  let agentCount = 0;

  for (const group of groups) {
    const memberIds = ctx.groupMemberIds.get(group.id) ?? [];
    const members = memberIds.map((id) => agentMap.get(id)).filter((a): a is MutableAgent => !!a);
    if (members.length === 0) continue;

    // 1. Group cohesion index — mean intra-group relationship trust
    const intraTrusts: number[] = [];
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const trust = edgeMap.get(`${members[i]!.id}:${members[j]!.id}`) ?? 0;
        intraTrusts.push(trust);
      }
    }
    const cohesion = intraTrusts.length > 0
      ? intraTrusts.reduce((s, v) => s + v, 0) / intraTrusts.length
      : 0;
    group.cohesionIndex = clamp(cohesion, 0, 1);

    // 2. Hierarchy steepness — Gini coefficient of status scores
    const statusScores = members.map((a) => a.statusScore);
    const steepness = giniCoefficient(statusScores);

    // High power distance cultures allow hierarchy gaps to widen faster
    if (culture.powerDistance > 0.6) {
      for (const agent of members) {
        // Top-status agents gain; bottom-status agents lose — amplified by power distance
        const deviation = agent.statusScore - (statusScores.reduce((s, v) => s + v, 0) / statusScores.length);
        agent.statusScore = clamp(
          agent.statusScore + deviation * culture.powerDistance * C.POWER_DISTANCE_HIERARCHY_AMPLIFIER * 0.01,
          0, 1
        );
      }
    }

    // Status decay toward mean (prevents runaway extremes)
    const meanStatus = statusScores.reduce((s, v) => s + v, 0) / statusScores.length;
    for (const agent of members) {
      agent.statusScore = clamp(
        agent.statusScore - (agent.statusScore - meanStatus) * C.STATUS_DECAY_RATE,
        0, 1
      );
    }

    // 3. Leadership emergence
    // Ref: Judge et al. (2002) — extraversion is the strongest Big Five predictor of leadership emergence
    const topAgent = members.reduce((best, a) => a.statusScore > best.statusScore ? a : best, members[0]!);
    if (
      topAgent.statusScore > 0.7 &&
      topAgent.personality.extraversion > 0.6 + C.EXTRAVERSION_LEADERSHIP_BONUS * 0.3 &&
      steepness > 0.3
    ) {
      ctx.emittedEvents.push({
        experimentId: ctx.experimentId,
        tick,
        type: 'leadership_emerged',
        title: `${topAgent.name} has emerged as the informal leader of ${group.label}.`,
        facts: {
          agentId: topAgent.id,
          groupId: group.id,
          statusScore: topAgent.statusScore,
          extraversion: topAgent.personality.extraversion,
          hierarchySteepness: steepness,
        },
      });
    }

    // 4. Groupthink detection
    // Conditions: high cohesion + low mean openness + high UA (Janis 1972)
    const meanOpenness = members.reduce((s, a) => s + a.personality.openness, 0) / members.length;
    const groupthinRisk = cohesion > C.GROUPTHINK_COHESION_THRESHOLD && meanOpenness < C.GROUPTHINK_OPENNESS_CEILING
      ? clamp(cohesion * (1 - meanOpenness) * culture.uncertaintyAvoidance, 0, 1)
      : 0;

    if (groupthinRisk > 0.5) {
      ctx.emittedEvents.push({
        experimentId: ctx.experimentId,
        tick,
        type: 'groupthink_risk',
        title: `${group.label} shows signs of groupthink — dissent is being suppressed.`,
        facts: { groupId: group.id, groupthinRisk, cohesion, meanOpenness },
      });
    }

    // 5. Conformity pressure per agent
    // Ref: Asch (1951); Hofstede (2001) — UA amplifies conformity norm enforcement
    for (const agent of members) {
      const baseConformity = C.BASE_CONFORMITY_PROBABILITY;
      const agentPressure = clamp(
        baseConformity +
          agent.personality.agreeableness * C.AGREEABLENESS_CONFORMITY_WEIGHT -
          agent.personality.openness * C.OPENNESS_CONFORMITY_REDUCTION +
          culture.uncertaintyAvoidance * C.UA_CONFORMITY_AMPLIFIER +
          (groupthinRisk > 0.5 ? C.GROUPTHINK_CONFORMITY_BONUS : 0),
        0, 1
      );
      totalConformityPressure += agentPressure;
      agentCount++;

      // If agent deviates from conformity (openness-driven dissent probability)
      const dissentProb = agent.personality.openness * (1 - culture.uncertaintyAvoidance) * 0.15;
      if (rng() < dissentProb && agentPressure > 0.6) {
        // Agent "resists" conformity but pays a small social cost in high-UA cultures
        agent.needs.belonging = clamp(agent.needs.belonging - culture.uncertaintyAvoidance * 0.03, 0, 1);
      }
    }

    ctx.updatedGroups.push({
      id: group.id,
      cohesionIndex: group.cohesionIndex,
      statusRank: group.statusRank,
    });
  }

  // 6. Inter-group tension — compute as cross-group trust deficit
  const groupIds = groups.map((g) => g.id);
  for (let gi = 0; gi < groupIds.length; gi++) {
    for (let gj = gi + 1; gj < groupIds.length; gj++) {
      const aGroup = ctx.groupMemberIds.get(groupIds[gi]!) ?? [];
      const bGroup = ctx.groupMemberIds.get(groupIds[gj]!) ?? [];

      const crossTrusts: number[] = [];
      for (const aId of aGroup) {
        for (const bId of bGroup) {
          const trust = edgeMap.get(`${aId}:${bId}`) ?? 0;
          crossTrusts.push(trust);
        }
      }
      // Tension = 1 - mean cross-group trust
      // High individualism + high UA → greater in/out-group distinction
    }
  }

  // Store mean conformity pressure in context for metricsStep
  (ctx as unknown as Record<string, unknown>).__conformityPressure =
    agentCount > 0 ? totalConformityPressure / agentCount : 0;
}
