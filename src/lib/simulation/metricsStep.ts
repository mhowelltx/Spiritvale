import { clamp, giniCoefficient } from '@/lib/utils/math';
import * as C from './coefficients';
import type { SimulationTickContext, MutableAgent } from './tickContext';
import type { MetricSnapshot } from '@/lib/domain/types';

// Computes and stores a MetricSnapshot for this tick.
// All metrics are derived from the current state of the simulation context.
// Stored to DB at tick end via tickEngine batch persist.

export function stepComputeMetrics(ctx: SimulationTickContext): void {
  const live = ctx.agents.filter((a) => !ctx.exitedAgentIds.includes(a.id));
  const n = live.length;
  if (n === 0) {
    ctx.snapshotMetrics = null;
    return;
  }

  // Group cohesion index (populated by identityStep)
  const groupCohesion: Record<string, number> = {};
  for (const group of ctx.groups) {
    groupCohesion[group.id] = group.cohesionIndex;
  }

  // Inter-group tension: 1 - mean cross-group trust
  const interGroupTension: Record<string, number> = {};
  const edgeTrustByPair = new Map<string, number[]>();
  const agentGroupMap = new Map<string, string>();
  for (const a of live) {
    if (a.groupId) agentGroupMap.set(a.id, a.groupId);
  }
  for (const e of ctx.relationships) {
    const gFrom = agentGroupMap.get(e.fromAgentId);
    const gTo = agentGroupMap.get(e.toAgentId);
    if (!gFrom || !gTo || gFrom === gTo) continue;
    const key = [gFrom, gTo].sort().join('::');
    if (!edgeTrustByPair.has(key)) edgeTrustByPair.set(key, []);
    edgeTrustByPair.get(key)!.push(e.trust);
  }
  for (const [key, trusts] of edgeTrustByPair) {
    const meanTrust = trusts.reduce((s, v) => s + v, 0) / trusts.length;
    interGroupTension[key] = clamp(1 - meanTrust, 0, 1);
  }

  // Hierarchy steepness: Gini of status scores across all live agents
  const hierarchySteepness = giniCoefficient(live.map((a) => a.statusScore));

  // Conformity pressure (stored by identityStep)
  const conformityPressure = clamp(
    ((ctx as unknown as Record<string, unknown>).__conformityPressure as number) ?? 0,
    0, 1
  );

  // Conflict and cooperation rates (normalized by agent count)
  const conflictRate = clamp(ctx.metrics.conflictCount / n, 0, 1);
  const cooperationRate = clamp(ctx.metrics.cooperationCount / n, 0, 1);

  // Average wellbeing: mean (belonging + safety) / 2
  const averageWellbeing = live.reduce((s, a) => s + (a.needs.belonging + a.needs.safety) / 2, 0) / n;

  // Groupthink risk per group
  const groupthinkRisk: Record<string, number> = {};
  for (const group of ctx.groups) {
    const members = (ctx.groupMemberIds.get(group.id) ?? [])
      .map((id) => ctx.agents.find((a) => a.id === id))
      .filter((a): a is MutableAgent => !!a && !ctx.exitedAgentIds.includes(a.id));
    if (members.length === 0) { groupthinkRisk[group.id] = 0; continue; }
    const meanOpenness = members.reduce((s, a) => s + a.personality.openness, 0) / members.length;
    groupthinkRisk[group.id] = group.cohesionIndex > C.GROUPTHINK_COHESION_THRESHOLD && meanOpenness < C.GROUPTHINK_OPENNESS_CEILING
      ? clamp(group.cohesionIndex * (1 - meanOpenness) * ctx.culture.uncertaintyAvoidance, 0, 1)
      : 0;
  }

  // Social loafing index: proportion of agents in large groups (proxy)
  const agentsInLargeGroups = live.filter((a) => {
    const groupSize = a.groupId ? (ctx.groupMemberIds.get(a.groupId) ?? []).length : 0;
    return groupSize > C.LOAFING_GROUP_SIZE_THRESHOLD;
  }).length;
  const socialLoafingIndex = clamp(agentsInLargeGroups / n, 0, 1);

  // Group polarization index: 1 - (within-group PA variance / total PA variance)
  const allPA = live.map((a) => a.affect.positiveAffect);
  const totalVariance = variance(allPA);
  let withinGroupVariance = 0;
  for (const group of ctx.groups) {
    const members = (ctx.groupMemberIds.get(group.id) ?? [])
      .map((id) => live.find((a) => a.id === id))
      .filter((a): a is MutableAgent => !!a);
    if (members.length > 1) {
      withinGroupVariance += variance(members.map((a) => a.affect.positiveAffect)) * members.length;
    }
  }
  withinGroupVariance /= n;
  const groupPolarizationIndex = totalVariance > 0
    ? clamp(1 - withinGroupVariance / totalVariance, 0, 1)
    : 0;

  // Bystander effect rate
  const bystanderEffectRate = ctx.metrics.distressCount > 0
    ? clamp(ctx.metrics.bystanderNoActionCount / ctx.metrics.distressCount, 0, 1)
    : 0;

  // Norm enforcement rate
  const normEnforcementRate = clamp(ctx.metrics.normEnforcementCount / n, 0, 1);

  // Attachment distribution
  const attachmentCounts = { secure: 0, anxious: 0, avoidant: 0, disorganized: 0 };
  for (const a of live) attachmentCounts[a.attachmentStyle]++;
  const attachmentSecureRatio = attachmentCounts.secure / n;
  const attachmentAnxiousRatio = attachmentCounts.anxious / n;
  const attachmentAvoidantRatio = attachmentCounts.avoidant / n;
  const attachmentDisorganizedRatio = attachmentCounts.disorganized / n;

  const snapshot: MetricSnapshot = {
    tick: ctx.tick,
    groupCohesion,
    interGroupTension,
    hierarchySteepness,
    conformityPressure,
    conflictRate,
    cooperationRate,
    averageWellbeing,
    groupthinkRisk,
    socialLoafingIndex,
    groupPolarizationIndex,
    bystanderEffectRate,
    normEnforcementRate,
    attachmentSecureRatio,
    attachmentAnxiousRatio,
    attachmentAvoidantRatio,
    attachmentDisorganizedRatio,
  };

  ctx.snapshotMetrics = snapshot;
}

function variance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}
