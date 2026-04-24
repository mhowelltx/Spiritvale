import { randomUUID } from 'crypto';
import { createSeededRng } from '@/lib/rng/seededRng';
import { generateName } from '@/lib/rng/nameGen';
import { sampleNormal, clamp } from '@/lib/utils/math';
import type {
  BigFiveProfile,
  AgentNeeds,
  AgentAffect,
  AgentMotive,
  AttachmentStyle,
  PersonalityDistributionConfig,
  DistributionSpec,
  LifeStage,
  Sex,
  HofstedeCulture,
  GroupConfig,
  ExperimentConfig,
  DEFAULT_HOFSTEDE_CULTURE,
} from '@/lib/domain/types';
import { DEFAULT_PERSONALITY_DISTRIBUTION, DEFAULT_HOFSTEDE_CULTURE as DEFAULT_CULTURE } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Personality sampling
// ---------------------------------------------------------------------------

function sampleDimension(spec: DistributionSpec, rng: () => number): number {
  if (spec.kind === 'fixed') return clamp(spec.value, 0, 1);
  return sampleNormal(spec.mean, spec.stdDev, rng);
}

export function sampleBigFive(config: PersonalityDistributionConfig, rng: () => number): BigFiveProfile {
  return {
    openness:          sampleDimension(config.openness, rng),
    conscientiousness: sampleDimension(config.conscientiousness, rng),
    extraversion:      sampleDimension(config.extraversion, rng),
    agreeableness:     sampleDimension(config.agreeableness, rng),
    neuroticism:       sampleDimension(config.neuroticism, rng),
  };
}

export function sampleAttachmentStyle(
  dist: PersonalityDistributionConfig['attachmentDistribution'],
  rng: () => number
): AttachmentStyle {
  const r = rng();
  if (r < dist.secure) return 'secure';
  if (r < dist.secure + dist.anxious) return 'anxious';
  if (r < dist.secure + dist.anxious + dist.avoidant) return 'avoidant';
  return 'disorganized';
}

// ---------------------------------------------------------------------------
// Agent demographics
// ---------------------------------------------------------------------------

const TICKS_PER_YEAR = 360;

export function resolveLifeStage(ageInTicks: number): LifeStage {
  const years = ageInTicks / TICKS_PER_YEAR;
  if (years < 15) return 'child';
  if (years < 60) return 'adult';
  return 'elder';
}

export function buildAgentDemographics(rng: () => number): { sex: Sex; ageInTicks: number; lifeStage: LifeStage } {
  const sex: Sex = rng() < 0.5 ? 'male' : 'female';
  let ageInTicks: number;
  const roll = rng();
  if (roll < 0.2) {
    ageInTicks = Math.floor(rng() * 14 * TICKS_PER_YEAR); // child 0–14
  } else if (roll < 0.85) {
    ageInTicks = Math.floor((15 + rng() * 44) * TICKS_PER_YEAR); // adult 15–59
  } else {
    ageInTicks = Math.floor((60 + rng() * 20) * TICKS_PER_YEAR); // elder 60–80
  }
  return { sex, ageInTicks, lifeStage: resolveLifeStage(ageInTicks) };
}

// ---------------------------------------------------------------------------
// Initial needs and affect derived from personality
// ---------------------------------------------------------------------------

export function initialNeeds(personality: BigFiveProfile, lifeStage: LifeStage, rng: () => number): AgentNeeds {
  // Extraverts start with higher belonging satisfaction; neurotics lower safety
  return {
    physiological: clamp(0.8 + rng() * 0.15, 0, 1),
    safety: clamp(0.65 - personality.neuroticism * 0.2 + rng() * 0.15, 0, 1),
    belonging: clamp(0.3 + personality.extraversion * 0.4 + rng() * 0.15, 0, 1),
    esteem: clamp(0.3 + personality.conscientiousness * 0.3 + rng() * 0.15, 0, 1),
    autonomy: clamp(0.3 + personality.openness * 0.3 + rng() * 0.15, 0, 1),
  };
}

export function initialAffect(personality: BigFiveProfile, rng: () => number): AgentAffect {
  // Costa & McCrae (1980): extraversion → positive affect; neuroticism → negative affect
  return {
    positiveAffect: clamp(0.2 + personality.extraversion * 0.5 + rng() * 0.1, 0, 1),
    negativeAffect: clamp(0.05 + personality.neuroticism * 0.35 + rng() * 0.1, 0, 1),
    stress: clamp(personality.neuroticism * 0.25 + rng() * 0.1, 0, 1),
  };
}

// ---------------------------------------------------------------------------
// Initial motives derived from OCEAN (adult agents)
// ---------------------------------------------------------------------------

export function generateMotives(
  personality: BigFiveProfile,
  lifeStage: LifeStage,
  attachmentStyle: AttachmentStyle,
  rng: () => number
): AgentMotive[] {
  if (lifeStage === 'child') return [];

  const motives: AgentMotive[] = [];

  if (lifeStage === 'elder') {
    motives.push({
      type: 'belonging',
      label: 'Maintain meaningful connections before declining',
      urgency: clamp(0.6 + rng() * 0.2, 0, 1),
    });
    return motives;
  }

  // Primary OCEAN-driven motive
  const o = personality;
  if (o.openness > 0.65) {
    motives.push({ type: 'reform', label: 'Explore new approaches and challenge assumptions', urgency: clamp(0.5 + o.openness * 0.3 + rng() * 0.15, 0, 1) });
  } else if (o.conscientiousness > 0.65) {
    motives.push({ type: 'status', label: 'Achieve recognition through consistent performance', urgency: clamp(0.5 + o.conscientiousness * 0.3 + rng() * 0.15, 0, 1) });
  } else if (o.extraversion > 0.65) {
    motives.push({ type: 'coalition_building', label: 'Build a strong social network within the group', urgency: clamp(0.5 + o.extraversion * 0.3 + rng() * 0.15, 0, 1) });
  } else if (o.agreeableness > 0.65) {
    motives.push({ type: 'belonging', label: 'Foster harmony and cooperation with others', urgency: clamp(0.5 + o.agreeableness * 0.3 + rng() * 0.15, 0, 1) });
  } else {
    motives.push({ type: 'autonomy', label: 'Maintain independence and self-direction', urgency: clamp(0.45 + rng() * 0.3, 0, 1) });
  }

  // Attachment style secondary motive
  if (attachmentStyle === 'anxious' && rng() < 0.7) {
    motives.push({ type: 'belonging', label: 'Seek reassurance and closeness from others', urgency: clamp(0.6 + rng() * 0.2, 0, 1) });
  } else if (attachmentStyle === 'avoidant' && rng() < 0.7) {
    motives.push({ type: 'autonomy', label: 'Maintain emotional distance and self-sufficiency', urgency: clamp(0.6 + rng() * 0.2, 0, 1) });
  }

  return motives.slice(0, 2);
}

// ---------------------------------------------------------------------------
// Computed structure (pure, no DB)
// ---------------------------------------------------------------------------

export interface ComputedAgent {
  tempId: string;
  name: string;
  sex: Sex;
  ageInTicks: number;
  lifeStage: LifeStage;
  personality: BigFiveProfile;
  attachmentStyle: AttachmentStyle;
  needs: AgentNeeds;
  affect: AgentAffect;
  statusScore: number;
  motives: AgentMotive[];
  groupIndex: number;
}

export interface ComputedGroup {
  tempId: string;
  label: string;
  assignmentRule: string;
  inGroupBias: number;
}

export interface ComputedRelationship {
  fromTempId: string;
  toTempId: string;
  type: string;
  strength: number;
  trust: number;
}

export interface ComputedExperimentStructure {
  groups: ComputedGroup[];
  agents: ComputedAgent[];
  relationships: ComputedRelationship[];
}

export function computeExperimentStructure(
  config: ExperimentConfig,
  seed: string
): ComputedExperimentStructure {
  const rng = createSeededRng(seed);
  const dist = config.personalityDistribution ?? DEFAULT_PERSONALITY_DISTRIBUTION;
  const groupConfigs: GroupConfig[] = config.groups?.length
    ? config.groups
    : [{ label: 'Group A', size: config.agentCount ?? 20, assignmentRule: 'random' }];

  // Build group list
  const groups: ComputedGroup[] = groupConfigs.map((g, i) => ({
    tempId: `g${i}`,
    label: g.label,
    assignmentRule: g.assignmentRule,
    inGroupBias: 0.5,
  }));

  // Generate agents, distributing across groups
  const agents: ComputedAgent[] = [];
  const totalCount = config.agentCount ?? groupConfigs.reduce((s, g) => s + g.size, 0);
  let agentIdx = 0;

  for (let gi = 0; gi < groupConfigs.length; gi++) {
    const groupConfig = groupConfigs[gi]!;
    const groupDist = groupConfig.personalityOverride
      ? { ...dist, ...groupConfig.personalityOverride }
      : dist;

    const groupSize = groupConfig.size ?? Math.ceil(totalCount / groupConfigs.length);

    for (let j = 0; j < groupSize; j++) {
      const tempId = `a${agentIdx++}`;
      const demographics = buildAgentDemographics(rng);
      const personality = sampleBigFive(groupDist, rng);
      const attachmentStyle = sampleAttachmentStyle(dist.attachmentDistribution, rng);
      const needs = initialNeeds(personality, demographics.lifeStage, rng);
      const affect = initialAffect(personality, rng);
      const motives = generateMotives(personality, demographics.lifeStage, attachmentStyle, rng);
      const name = generateName(demographics.sex, rng);

      agents.push({
        tempId,
        name,
        sex: demographics.sex,
        ageInTicks: demographics.ageInTicks,
        lifeStage: demographics.lifeStage,
        personality,
        attachmentStyle,
        needs,
        affect,
        statusScore: clamp(0.4 + rng() * 0.2, 0, 1),
        motives,
        groupIndex: gi,
      });
    }
  }

  // Generate initial within-group relationships (similarity-attraction hypothesis)
  // Ref: Byrne (1971) — Attraction Paradigm; similarity predicts liking.
  const relationships: ComputedRelationship[] = [];
  const seen = new Set<string>();

  const addEdge = (from: string, to: string, type: string, strength: number, trust: number) => {
    const key1 = `${from}:${to}`;
    const key2 = `${to}:${from}`;
    if (!seen.has(key1)) {
      seen.add(key1);
      relationships.push({ fromTempId: from, toTempId: to, type, strength, trust });
    }
    if (!seen.has(key2)) {
      seen.add(key2);
      relationships.push({ fromTempId: to, toTempId: from, type, strength, trust });
    }
  };

  // Within-group initial bonds
  for (let gi = 0; gi < groups.length; gi++) {
    const groupAgents = agents.filter((a) => a.groupIndex === gi);
    for (let a = 0; a < groupAgents.length; a++) {
      for (let b = a + 1; b < groupAgents.length; b++) {
        const ag = groupAgents[a]!;
        const bg = groupAgents[b]!;
        // OCEAN similarity score (Euclidean-ish, normalized)
        const sim = 1 - (
          Math.abs(ag.personality.openness - bg.personality.openness) +
          Math.abs(ag.personality.conscientiousness - bg.personality.conscientiousness) +
          Math.abs(ag.personality.extraversion - bg.personality.extraversion) +
          Math.abs(ag.personality.agreeableness - bg.personality.agreeableness) +
          Math.abs(ag.personality.neuroticism - bg.personality.neuroticism)
        ) / 5;

        const strength = clamp(0.15 + sim * 0.35 + rng() * 0.1, 0, 1);
        const trust = clamp(0.15 + sim * 0.3 + rng() * 0.1, 0, 1);
        addEdge(ag.tempId, bg.tempId, 'social', strength, trust);
      }
    }
  }

  // Sparse cross-group weak ties (Granovetter 1973 — strength of weak ties)
  if (groups.length > 1) {
    const crossProb = 0.15;
    for (let a = 0; a < agents.length; a++) {
      for (let b = a + 1; b < agents.length; b++) {
        if (agents[a]!.groupIndex === agents[b]!.groupIndex) continue;
        if (rng() < crossProb) {
          addEdge(agents[a]!.tempId, agents[b]!.tempId, 'acquaintance',
            clamp(0.05 + rng() * 0.15, 0, 1),
            clamp(0.05 + rng() * 0.15, 0, 1));
        }
      }
    }
  }

  return { groups, agents, relationships };
}
