import { clamp } from '@/lib/utils/math';
import * as C from './coefficients';
import type { SimulationTickContext, MutableAgent, MutableRelationshipEdge } from './tickContext';

// Social dynamics step:
// 1. Interaction sampling (proximity + similarity-attraction weighted)
// 2. Relationship strength/trust update (agreeableness + LTO modulated)
// 3. In-group/out-group trust floors (Social Identity Theory)
// 4. Passive decay for non-interacting pairs
// 5. Social loafing detection (Ringelmann / Latané)
// 6. Bystander effect evaluation (Darley & Latané)

export function stepResolveSocialDynamics(ctx: SimulationTickContext): void {
  const { agents, relationships, culture, tick, rng, metrics } = ctx;
  const live = agents.filter((a) => !ctx.exitedAgentIds.includes(a.id));

  const agentMap = new Map<string, MutableAgent>(live.map((a) => [a.id, a]));
  const edgeMap = new Map<string, MutableRelationshipEdge>();
  for (const e of relationships) {
    edgeMap.set(`${e.fromAgentId}:${e.toAgentId}`, e);
  }

  const interactedPairs = new Set<string>();

  // 1. Interaction sampling — each agent may initiate up to MAX_INTERACTIONS_PER_TICK
  for (const agent of live) {
    const initiateProb = C.BASE_INTERACTION_PROBABILITY * (0.5 + agent.personality.extraversion * 0.5);
    if (rng() > initiateProb) continue;

    const interactionCount = Math.max(1, Math.ceil(agent.personality.extraversion * C.MAX_INTERACTIONS_PER_TICK));

    const candidates = live
      .filter((a) => a.id !== agent.id)
      .map((other) => {
        const sameGroup = other.groupId === agent.groupId && agent.groupId !== null;
        const sim = oceanSimilarity(agent.personality, other.personality);
        return { agent: other, weight: (sameGroup ? C.INGROUP_INTERACTION_WEIGHT : 1) * (0.5 + sim * 0.5) };
      });

    const selected = weightedSample(candidates, interactionCount, rng);

    for (const partner of selected) {
      const pairKey = [agent.id, partner.id].sort().join(':');
      if (interactedPairs.has(pairKey)) continue;
      interactedPairs.add(pairKey);
      resolveInteraction(agent, partner, edgeMap, culture, tick, rng, metrics);
    }
  }

  // 2. Passive decay for all non-interacted edges
  for (const edge of relationships) {
    const pairKey = [edge.fromAgentId, edge.toAgentId].sort().join(':');
    if (interactedPairs.has(pairKey)) continue;
    const decayRate = C.PASSIVE_DECAY_RATE * (1 - culture.longTermOrientation * C.LTO_TRUST_DECAY_MODIFIER);
    edge.strength = clamp(edge.strength - decayRate, 0, 1);
    edge.trust = clamp(edge.trust - decayRate * 0.5, 0, 1);
  }

  // 3. Enforce SIT in-group trust floors & out-group trust ceilings
  // Ref: Tajfel & Turner (1979); Brewer (1979); Hofstede (2001)
  for (const edge of relationships) {
    const fromAgent = agentMap.get(edge.fromAgentId);
    const toAgent = agentMap.get(edge.toAgentId);
    if (!fromAgent || !toAgent) continue;
    const sameGroup = fromAgent.groupId === toAgent.groupId && fromAgent.groupId !== null;
    if (sameGroup) {
      if (edge.trust < C.INGROUP_TRUST_FLOOR) edge.trust = C.INGROUP_TRUST_FLOOR;
    } else {
      const ceiling = clamp(C.OUT_GROUP_TRUST_CEILING_BASE - culture.uncertaintyAvoidance * 0.3, 0, 1);
      if (edge.trust > ceiling) edge.trust = ceiling;
    }
  }

  // 4. Social loafing (Ringelmann 1913; Latané et al. 1979)
  for (const group of ctx.groups) {
    const members = (ctx.groupMemberIds.get(group.id) ?? [])
      .map((id) => agentMap.get(id))
      .filter((a): a is MutableAgent => !!a);
    if (members.length <= C.LOAFING_GROUP_SIZE_THRESHOLD) continue;
    for (const agent of members) {
      const loafingFactor =
        (members.length / (members.length + C.LOAFING_GROUP_SIZE_THRESHOLD)) *
        (1 - agent.personality.conscientiousness * C.CONSCIENTIOUSNESS_LOAFING_REDUCTION);
      agent.needs.esteem = clamp(agent.needs.esteem - loafingFactor * 0.02, 0, 1);
    }
  }

  // 5. Bystander effect (Darley & Latané 1968, 1970)
  const distressedAgents = live.filter((a) => a.affect.negativeAffect > C.BREAKDOWN_NEGATIVE_AFFECT_THRESHOLD);
  for (const distressed of distressedAgents) {
    metrics.distressCount++;
    const peers = (ctx.groupMemberIds.get(distressed.groupId ?? '') ?? [])
      .map((id) => agentMap.get(id))
      .filter((a): a is MutableAgent => !!a && a.id !== distressed.id);
    if (peers.length === 0) continue;
    const diffusedProb = 1 / Math.pow(peers.length, C.BYSTANDER_EXPONENT);
    let helped = false;
    for (const witness of peers) {
      if (helped) break;
      const helpProb = clamp(
        C.BASE_HELP_PROBABILITY * diffusedProb * (0.6 + witness.personality.agreeableness * C.AGREEABLENESS_HELP_WEIGHT),
        0, 1
      );
      if (rng() < helpProb) {
        metrics.bystanderHelpCount++;
        distressed.needs.belonging = clamp(distressed.needs.belonging + 0.05, 0, 1);
        distressed.affect.negativeAffect = clamp(distressed.affect.negativeAffect - 0.05, 0, 1);
        ctx.emittedEvents.push({
          experimentId: ctx.experimentId,
          tick: ctx.tick,
          type: 'bystander_help',
          title: `${witness.name} stepped in to support ${distressed.name}.`,
          facts: { helperId: witness.id, distressedId: distressed.id, witnessCount: peers.length },
        });
        helped = true;
      } else {
        metrics.bystanderNoActionCount++;
      }
    }
  }

  ctx.updatedRelationships = relationships.map((e) => ({
    id: e.id,
    strength: e.strength,
    trust: e.trust,
    lastInteractionTick: e.lastInteractionTick,
  }));
}

function resolveInteraction(
  a: MutableAgent,
  b: MutableAgent,
  edgeMap: Map<string, MutableRelationshipEdge>,
  culture: { longTermOrientation: number; powerDistance: number },
  tick: number,
  rng: () => number,
  metrics: { conflictCount: number; cooperationCount: number }
): void {
  const edgeAB = edgeMap.get(`${a.id}:${b.id}`);
  const edgeBA = edgeMap.get(`${b.id}:${a.id}`);

  const conflictProb =
    (1 - (a.personality.agreeableness + b.personality.agreeableness) / 2) * 0.3 +
    (a.affect.stress + b.affect.stress) / 2 * 0.2;
  const isConflict = rng() < conflictProb;

  const ltoMod = 1 - culture.longTermOrientation * (1 - C.LTO_TRUST_GROWTH_MODIFIER);
  const agreeMod = (a.personality.agreeableness + b.personality.agreeableness) / 2;
  const trustGrowth = C.BASE_TRUST_GROWTH * ltoMod * (0.5 + agreeMod * 0.5);

  if (isConflict) {
    metrics.conflictCount++;
    const damage = C.CONFLICT_TRUST_DAMAGE * (0.5 + culture.powerDistance * 0.5);
    if (edgeAB) { edgeAB.trust = clamp(edgeAB.trust - damage, 0, 1); edgeAB.strength = clamp(edgeAB.strength - 0.02, 0, 1); edgeAB.lastInteractionTick = tick; }
    if (edgeBA) { edgeBA.trust = clamp(edgeBA.trust - damage, 0, 1); edgeBA.strength = clamp(edgeBA.strength - 0.02, 0, 1); edgeBA.lastInteractionTick = tick; }
  } else {
    metrics.cooperationCount++;
    if (edgeAB) { edgeAB.trust = clamp(edgeAB.trust + trustGrowth, 0, 1); edgeAB.strength = clamp(edgeAB.strength + trustGrowth * 0.6, 0, 1); edgeAB.lastInteractionTick = tick; }
    if (edgeBA) { edgeBA.trust = clamp(edgeBA.trust + trustGrowth, 0, 1); edgeBA.strength = clamp(edgeBA.strength + trustGrowth * 0.6, 0, 1); edgeBA.lastInteractionTick = tick; }
    a.affect.positiveAffect = clamp(a.affect.positiveAffect + 0.01, 0, 1);
    b.affect.positiveAffect = clamp(b.affect.positiveAffect + 0.01, 0, 1);
  }
}

function oceanSimilarity(
  a: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number },
  b: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number }
): number {
  const diff =
    Math.abs(a.openness - b.openness) +
    Math.abs(a.conscientiousness - b.conscientiousness) +
    Math.abs(a.extraversion - b.extraversion) +
    Math.abs(a.agreeableness - b.agreeableness) +
    Math.abs(a.neuroticism - b.neuroticism);
  return 1 - diff / 5;
}

function weightedSample<T>(items: Array<{ agent: T; weight: number }>, count: number, rng: () => number): T[] {
  const result: T[] = [];
  const pool = [...items];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = pool.reduce((s, x) => s + x.weight, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx]!.weight;
      if (r <= 0) break;
    }
    result.push(pool[idx]!.agent);
    pool.splice(idx, 1);
  }
  return result;
}
