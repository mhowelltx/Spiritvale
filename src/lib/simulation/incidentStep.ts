import { clamp } from '@/lib/utils/math';
import * as C from './coefficients';
import type { SimulationTickContext, MutableAgent } from './tickContext';

// OCEAN-driven narrative incidents.
// Each eligible agent may trigger one incident per tick.
// Ref: McCrae & Costa (1999) — Five-Factor Theory; Hofstede (2001)

export function stepResolveBehaviorIncidents(ctx: SimulationTickContext): void {
  const { agents, culture, rng, metrics } = ctx;
  const live = agents.filter((a) => !ctx.exitedAgentIds.includes(a.id) && a.lifeStage !== 'child');

  for (const agent of live) {
    const maxUrgency = agent.motives.reduce((m, mv) => Math.max(m, mv.urgency), 0);
    if (rng() > C.INCIDENT_BASE_PROBABILITY * (0.5 + maxUrgency * 0.5)) continue;

    const roll = rng();
    const p = agent.personality;

    if (agent.affect.stress > C.BREAKDOWN_NEGATIVE_AFFECT_THRESHOLD && p.neuroticism > 0.6) {
      emitBreakdown(agent, ctx);
      metrics.conflictCount++;
    } else if (p.openness > 0.65 && culture.uncertaintyAvoidance > 0.6 && roll < p.openness * C.REFORM_INCIDENT_HIGH_OPENNESS_WEIGHT) {
      emitDissent(agent, ctx);
    } else if (p.conscientiousness > 0.65 && roll < p.conscientiousness * C.NORM_ENFORCEMENT_HIGH_CONSCIENTIOUSNESS_WEIGHT * (1 + culture.uncertaintyAvoidance)) {
      emitNormEnforcement(agent, live, ctx);
      metrics.normEnforcementCount++;
    } else if (p.agreeableness < 0.35 && roll < (1 - p.agreeableness) * C.CONFLICT_INCIDENT_LOW_AGREEABLENESS_WEIGHT) {
      emitConflict(agent, live, ctx);
      metrics.conflictCount++;
    } else if (p.extraversion > 0.65 && roll < p.extraversion * C.COALITION_INCIDENT_HIGH_EXTRAVERSION_WEIGHT) {
      emitCoalitionBuilding(agent, live, ctx);
      metrics.cooperationCount++;
    } else if (agent.attachmentStyle === 'avoidant' && agent.needs.belonging < 0.5 && roll < C.WITHDRAWAL_AVOIDANT_WEIGHT) {
      emitWithdrawal(agent, ctx);
    } else if (agent.attachmentStyle === 'anxious' && agent.needs.belonging < 0.4) {
      emitHelpSeeking(agent, live, ctx);
    }
  }
}

function emitBreakdown(agent: MutableAgent, ctx: SimulationTickContext): void {
  agent.affect.negativeAffect = clamp(agent.affect.negativeAffect + 0.1, 0, 1);
  agent.affect.stress = clamp(agent.affect.stress + 0.08, 0, 1);
  agent.statusScore = clamp(agent.statusScore - 0.04, 0, 1);
  ctx.emittedEvents.push({
    experimentId: ctx.experimentId, tick: ctx.tick, type: 'emotional_breakdown',
    title: `${agent.name} is overwhelmed by stress.`,
    facts: { agentId: agent.id, neuroticism: agent.personality.neuroticism, stress: agent.affect.stress },
  });
}

function emitDissent(agent: MutableAgent, ctx: SimulationTickContext): void {
  const socialCost = ctx.culture.uncertaintyAvoidance * 0.06;
  agent.statusScore = clamp(agent.statusScore - socialCost, 0, 1);
  agent.needs.belonging = clamp(agent.needs.belonging - socialCost, 0, 1);
  ctx.emittedEvents.push({
    experimentId: ctx.experimentId, tick: ctx.tick, type: 'dissent_act',
    title: `${agent.name} challenges the group's accepted approach.`,
    facts: { agentId: agent.id, openness: agent.personality.openness, ua: ctx.culture.uncertaintyAvoidance, socialCost },
  });
}

function emitNormEnforcement(agent: MutableAgent, all: MutableAgent[], ctx: SimulationTickContext): void {
  const targets = all.filter((a) => a.id !== agent.id && a.groupId === agent.groupId && a.personality.conscientiousness < 0.4);
  if (targets.length === 0) return;
  const target = targets[Math.floor(ctx.rng() * targets.length)]!;
  target.statusScore = clamp(target.statusScore - 0.04, 0, 1);
  agent.statusScore = clamp(agent.statusScore + C.STATUS_ENFORCEMENT_GAIN, 0, 1);
  ctx.emittedEvents.push({
    experimentId: ctx.experimentId, tick: ctx.tick, type: 'norm_enforcement_act',
    title: `${agent.name} calls out ${target.name} for not meeting group expectations.`,
    facts: { enforcerId: agent.id, targetId: target.id, targetConscientiousness: target.personality.conscientiousness },
  });
}

function emitConflict(agent: MutableAgent, all: MutableAgent[], ctx: SimulationTickContext): void {
  const targets = all.filter((a) => a.id !== agent.id && a.groupId === agent.groupId);
  if (targets.length === 0) return;
  const target = targets[Math.floor(ctx.rng() * targets.length)]!;
  agent.affect.stress = clamp(agent.affect.stress + 0.04, 0, 1);
  target.affect.negativeAffect = clamp(target.affect.negativeAffect + 0.06, 0, 1);
  target.needs.safety = clamp(target.needs.safety - 0.04, 0, 1);
  ctx.emittedEvents.push({
    experimentId: ctx.experimentId, tick: ctx.tick, type: 'interpersonal_conflict',
    title: `${agent.name} clashes with ${target.name}.`,
    facts: { agentId: agent.id, targetId: target.id, agreeableness: agent.personality.agreeableness },
  });
}

function emitCoalitionBuilding(agent: MutableAgent, all: MutableAgent[], ctx: SimulationTickContext): void {
  const partners = all.filter((a) => a.id !== agent.id && a.groupId === agent.groupId).slice(0, 3);
  if (partners.length === 0) return;
  for (const partner of partners) {
    partner.needs.belonging = clamp(partner.needs.belonging + 0.04, 0, 1);
    partner.affect.positiveAffect = clamp(partner.affect.positiveAffect + 0.03, 0, 1);
  }
  agent.needs.belonging = clamp(agent.needs.belonging + 0.05, 0, 1);
  ctx.emittedEvents.push({
    experimentId: ctx.experimentId, tick: ctx.tick, type: 'coalition_building',
    title: `${agent.name} rallies others around a shared purpose.`,
    facts: { agentId: agent.id, extraversion: agent.personality.extraversion, partnerCount: partners.length },
  });
}

function emitWithdrawal(agent: MutableAgent, ctx: SimulationTickContext): void {
  agent.needs.autonomy = clamp(agent.needs.autonomy + 0.05, 0, 1);
  agent.needs.belonging = clamp(agent.needs.belonging - 0.03, 0, 1);
  ctx.emittedEvents.push({
    experimentId: ctx.experimentId, tick: ctx.tick, type: 'social_withdrawal',
    title: `${agent.name} withdraws from the group, preferring solitude.`,
    facts: { agentId: agent.id, attachmentStyle: agent.attachmentStyle },
  });
}

function emitHelpSeeking(agent: MutableAgent, all: MutableAgent[], ctx: SimulationTickContext): void {
  const targets = all.filter((a) => a.id !== agent.id && a.groupId === agent.groupId && a.personality.agreeableness > 0.5);
  if (targets.length === 0) return;
  const target = targets[Math.floor(ctx.rng() * targets.length)]!;
  agent.needs.belonging = clamp(agent.needs.belonging + 0.06, 0, 1);
  target.needs.esteem = clamp(target.needs.esteem + 0.03, 0, 1);
  ctx.emittedEvents.push({
    experimentId: ctx.experimentId, tick: ctx.tick, type: 'help_seeking',
    title: `${agent.name} reaches out to ${target.name} for support.`,
    facts: { agentId: agent.id, targetId: target.id, attachmentStyle: agent.attachmentStyle },
  });
}
