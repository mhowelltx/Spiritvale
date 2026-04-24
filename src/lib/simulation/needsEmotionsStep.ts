import { clamp } from '@/lib/utils/math';
import * as C from './coefficients';
import type { SimulationTickContext, MutableAgent } from './tickContext';

// Updates each agent's needs and affect based on:
// - Environmental stress
// - Big Five personality (OCEAN) modulations
// - Attachment style effects
// Ref: Maslow (1943); Ryan & Deci (2000); Watson & Clark (1984);
//      Costa & McCrae (1980); Ainsworth et al. (1978)

export function stepUpdatePsychologicalState(ctx: SimulationTickContext): void {
  const stress = ctx.environmentalStress;

  for (const agent of ctx.agents) {
    if (ctx.exitedAgentIds.includes(agent.id)) continue;

    const p = agent.personality;
    const peerCount = (ctx.groupMemberIds.get(agent.groupId ?? '') ?? []).filter((id) => id !== agent.id).length;
    const hasGroupContact = peerCount > 0;

    // Physiological: degrades under stress, recovers otherwise
    if (stress > 0.5) {
      agent.needs.physiological = clamp(agent.needs.physiological - C.PHYSIOLOGICAL_DEPRIVATION_RATE * stress, 0, 1);
    } else {
      agent.needs.physiological = clamp(agent.needs.physiological + C.PHYSIOLOGICAL_RECOVERY_RATE * (1 - stress), 0, 1);
    }

    // Belonging: extraverts recover faster; introverts slower
    // Ref: Lucas et al. (2000) — extraversion and positive affect in social situations
    const belongingRecovery = clamp(
      C.BELONGING_RECOVERY_MIN + p.extraversion * (C.BELONGING_RECOVERY_BASE - C.BELONGING_RECOVERY_MIN),
      C.BELONGING_RECOVERY_MIN, C.BELONGING_RECOVERY_BASE
    );
    if (hasGroupContact) {
      agent.needs.belonging = clamp(agent.needs.belonging + belongingRecovery, 0, 1);
    } else {
      agent.needs.belonging = clamp(agent.needs.belonging - C.BELONGING_RECOVERY_BASE, 0, 1);
    }

    // Esteem: tied to status score and conscientiousness
    // Ref: Judge et al. (2002) — conscientiousness and status attainment
    const esteemDelta = (agent.statusScore - 0.5) * C.ESTEEM_CONSCIENTIOUSNESS_WEIGHT * p.conscientiousness;
    agent.needs.esteem = clamp(agent.needs.esteem + esteemDelta * 0.05, 0, 1);

    // Autonomy: high openness agents have stronger autonomy needs
    const autonomyTarget = 0.4 + p.openness * 0.4;
    agent.needs.autonomy = clamp(agent.needs.autonomy + (autonomyTarget - agent.needs.autonomy) * 0.02, 0, 1);

    // Negative affect: amplified by neuroticism under stress
    // Ref: Watson & Clark (1984) — neuroticism as predictor of negative affect
    const naBase = stress * 0.4;
    const naAmplified = naBase * (1 + p.neuroticism * C.NEUROTICISM_NEGATIVE_AFFECT_AMPLIFIER);
    const naDecay = (1 - stress) * 0.02;
    agent.affect.negativeAffect = clamp(agent.affect.negativeAffect + naAmplified - naDecay, 0, 1);

    // Positive affect: extraversion raises baseline
    // Ref: Costa & McCrae (1980) — extraversion and positive emotionality
    const paFloor = C.EXTRAVERSION_POSITIVE_AFFECT_FLOOR * p.extraversion;
    const paDelta = hasGroupContact ? p.extraversion * 0.03 : -0.01;
    agent.affect.positiveAffect = clamp(Math.max(agent.affect.positiveAffect + paDelta, paFloor), 0, 1);

    // Stress: weighted composite of unmet needs × neuroticism
    const unmetNeeds =
      (1 - agent.needs.physiological) * 0.4 +
      (1 - agent.needs.safety) * 0.3 +
      (1 - agent.needs.belonging) * 0.2 +
      (1 - agent.needs.esteem) * 0.1;
    const stressDelta = unmetNeeds * C.STRESS_FROM_UNMET_NEEDS_WEIGHT * (0.5 + p.neuroticism * 0.5);
    const stressDecay = 0.02 * (1 - p.neuroticism * 0.5);
    agent.affect.stress = clamp(agent.affect.stress + stressDelta - stressDecay, 0, 1);

    // Safety inversely related to overall stress
    agent.needs.safety = clamp(1 - agent.affect.stress * 0.6 - stress * 0.3, 0, 1);

    applyAttachmentModulation(agent, ctx.rng);
  }
}

function applyAttachmentModulation(agent: MutableAgent, rng: () => number): void {
  switch (agent.attachmentStyle) {
    case 'anxious':
      // Belonging deficit causes disproportionate stress spike
      // Ref: Ainsworth et al. (1978) — anxious attachment and hyperactivating strategies
      if (agent.needs.belonging < 0.4) {
        agent.affect.stress = clamp(agent.affect.stress + C.ANXIOUS_BELONGING_STRESS_SPIKE, 0, 1);
        agent.affect.negativeAffect = clamp(agent.affect.negativeAffect + 0.05, 0, 1);
      }
      break;

    case 'avoidant':
      // Belonging need suppressed in expressed affect; covert stress accumulates instead
      // Ref: Bartholomew & Horowitz (1991) — dismissing-avoidant deactivating strategies
      if (agent.needs.belonging < 0.35) {
        agent.affect.stress = clamp(agent.affect.stress + C.AVOIDANT_BELONGING_SUPPRESSION * 0.1, 0, 1);
        agent.affect.negativeAffect = clamp(agent.affect.negativeAffect - 0.02, 0, 1);
      }
      break;

    case 'disorganized':
      // Unpredictable affect oscillation
      // Ref: Main & Hesse (1990) — disorganized attachment and affect dysregulation
      const noise = (rng() - 0.5) * 2 * C.DISORGANIZED_AFFECT_NOISE;
      agent.affect.positiveAffect = clamp(agent.affect.positiveAffect + noise, 0, 1);
      agent.affect.negativeAffect = clamp(agent.affect.negativeAffect + Math.abs(noise) * 0.5, 0, 1);
      break;

    case 'secure':
      // Mild natural stress regulation
      agent.affect.stress = clamp(agent.affect.stress - 0.01, 0, 1);
      break;
  }
}
