// ---------------------------------------------------------------------------
// Core enumerations
// ---------------------------------------------------------------------------

export type Sex = 'male' | 'female';
export type LifeStage = 'child' | 'adult' | 'elder';
export type AttachmentStyle = 'secure' | 'anxious' | 'avoidant' | 'disorganized';
export type ExperimentStatus = 'setup' | 'running' | 'paused' | 'completed';
export type ContextType = 'workplace' | 'community' | 'school' | 'online' | 'neutral';
export type GroupAssignmentRule = 'random' | 'personality_cluster' | 'manual';
export type InterventionType =
  | 'introduce_stressor'
  | 'introduce_resource'
  | 'split_group'
  | 'merge_groups'
  | 'introduce_outsider'
  | 'remove_agent'
  | 'shift_culture';

export type IncidentType =
  | 'interpersonal_conflict'
  | 'coalition_building'
  | 'help_seeking'
  | 'norm_enforcement_act'
  | 'dissent_act'
  | 'social_withdrawal'
  | 'attachment_protest'
  | 'emotional_breakdown'
  | 'bystander_help'
  | 'bystander_no_action';

// ---------------------------------------------------------------------------
// Personality: Big Five (OCEAN)
// Ref: Costa & McCrae (1992) — NEO-PI-R; McCrae & John (1992)
// ---------------------------------------------------------------------------

export interface BigFiveProfile {
  openness: number;           // 0–1: curiosity, creativity, novel experience
  conscientiousness: number;  // 0–1: organization, self-discipline, goal-directed
  extraversion: number;       // 0–1: sociability, positive affect, assertiveness
  agreeableness: number;      // 0–1: trust, cooperation, altruism
  neuroticism: number;        // 0–1: emotional instability, anxiety, moodiness
}

// Specification for generating a personality dimension from a distribution
export type DistributionSpec =
  | { kind: 'fixed'; value: number }
  | { kind: 'normal'; mean: number; stdDev: number };

export interface PersonalityDistributionConfig {
  openness:          DistributionSpec;
  conscientiousness: DistributionSpec;
  extraversion:      DistributionSpec;
  agreeableness:     DistributionSpec;
  neuroticism:       DistributionSpec;
  attachmentDistribution: {
    secure:       number; // proportion 0–1, must sum to 1.0
    anxious:      number;
    avoidant:     number;
    disorganized: number;
  };
}

// ---------------------------------------------------------------------------
// Culture: Hofstede's Cultural Dimensions
// Ref: Hofstede (1980, 2001) — Culture's Consequences
// ---------------------------------------------------------------------------

export interface HofstedeCulture {
  powerDistance: number;          // 0–1: acceptance of hierarchical inequality
  individualism: number;          // 0–1 (0=collectivist, 1=individualist)
  masculinity: number;            // 0–1 (0=feminine/cooperative, 1=masculine/competitive)
  uncertaintyAvoidance: number;   // 0–1: intolerance for ambiguity and risk
  longTermOrientation: number;    // 0–1: future vs present/past focus
}

export interface CulturalPreset {
  name: string;
  description: string;
  hofstede: HofstedeCulture;
}

// ---------------------------------------------------------------------------
// Agent psychological state
// ---------------------------------------------------------------------------

// Ref: Maslow (1943) hierarchy adapted for social simulation;
// Ryan & Deci (2000) — Self-Determination Theory (autonomy/belonging/esteem).
export interface AgentNeeds {
  physiological: number; // 0–1 (0=deprived, 1=fully met)
  safety: number;        // 0–1 physical/social security
  belonging: number;     // 0–1 group connection
  esteem: number;        // 0–1 status/recognition
  autonomy: number;      // 0–1 self-direction
}

// Valence-arousal model adapted from Russell (1980) — Circumplex Model of Affect.
export interface AgentAffect {
  positiveAffect: number; // 0–1 (high extraversion raises baseline)
  negativeAffect: number; // 0–1 (high neuroticism raises reactivity)
  stress: number;         // 0–1 composite of unmet needs × neuroticism
}

export interface AgentMotive {
  type: IncidentType | 'coalition_building' | 'belonging' | 'status' | 'autonomy' | 'reform';
  label: string;
  urgency: number; // 0–1
}

// ---------------------------------------------------------------------------
// Social identity
// Ref: Tajfel & Turner (1979, 1986) — Social Identity Theory
// ---------------------------------------------------------------------------

export interface SocialGroup {
  id: string;
  experimentId: string;
  label: string;
  assignmentRule: GroupAssignmentRule;
  inGroupBias: number;        // experimenter-set starting value
  cohesionIndex: number;      // computed each tick
  statusRank: number;         // relative prestige vs other groups (emergent)
}

// ---------------------------------------------------------------------------
// Experimenter-defined intervention
// ---------------------------------------------------------------------------

export interface ScheduledIntervention {
  atTick: number;
  type: InterventionType;
  targetGroupId?: string;
  targetAgentId?: string;
  magnitude: number;     // 0–1 severity / size of effect
  durationTicks: number; // how many ticks the effect persists
  params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Per-tick observable metrics snapshot
// ---------------------------------------------------------------------------

export interface MetricSnapshot {
  tick: number;
  groupCohesion: Record<string, number>;     // groupId → 0–1
  interGroupTension: Record<string, number>; // "gA::gB" → 0–1
  hierarchySteepness: number;                // Gini coefficient of status scores
  conformityPressure: number;                // mean pressure across all agents
  conflictRate: number;                      // conflict incidents / agentCount in this tick
  cooperationRate: number;                   // cooperative events / agentCount in this tick
  averageWellbeing: number;                  // mean (belonging + safety) / 2
  groupthinkRisk: Record<string, number>;    // groupId → 0–1
  socialLoafingIndex: number;                // 0–1
  groupPolarizationIndex: number;            // 0–1
  bystanderEffectRate: number;               // no-help / total distress events
  normEnforcementRate: number;               // enforcement acts / agentCount
  attachmentSecureRatio: number;             // 0–1
  attachmentAnxiousRatio: number;
  attachmentAvoidantRatio: number;
  attachmentDisorganizedRatio: number;
}

// ---------------------------------------------------------------------------
// Experiment configuration
// ---------------------------------------------------------------------------

export interface GroupConfig {
  label: string;
  size: number;
  assignmentRule: GroupAssignmentRule;
  // optional per-group personality override (else uses experiment-level distribution)
  personalityOverride?: Partial<PersonalityDistributionConfig>;
}

export interface ExperimentConfig {
  name: string;
  description: string;
  hypothesis: string;
  contextType: ContextType;
  agentCount: number;
  groups: GroupConfig[];
  personalityDistribution: PersonalityDistributionConfig;
  culture: HofstedeCulture;
  scheduledInterventions: ScheduledIntervention[];
  seed?: string;
}

// ---------------------------------------------------------------------------
// View / response types (used by API + UI)
// ---------------------------------------------------------------------------

export interface AgentView {
  id: string;
  name: string;
  sex: Sex;
  ageInTicks: number;
  lifeStage: LifeStage;
  groupId: string | null;
  groupLabel: string | null;
  personality: BigFiveProfile;
  attachmentStyle: AttachmentStyle;
  needs: AgentNeeds;
  affect: AgentAffect;
  statusScore: number;
  motives: AgentMotive[];
}

export interface AgentDetailView extends AgentView {
  relationships: RelationshipEdgeView[];
}

export interface RelationshipEdgeView {
  id: string;
  toAgentId: string;
  toAgentName: string;
  type: string;
  strength: number;
  trust: number;
}

export interface GroupView {
  id: string;
  label: string;
  memberIds: string[];
  cohesionIndex: number;
  statusRank: number;
  inGroupBias: number;
}

export interface ExperimentView {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  contextType: ContextType;
  status: ExperimentStatus;
  tick: number;
  seed: string;
  culture: HofstedeCulture;
  personalityDistribution: PersonalityDistributionConfig;
  groups: GroupView[];
  agents: AgentView[];
  latestMetrics: MetricSnapshot | null;
  recentEvents: EventRecordView[];
}

export interface EventRecordView {
  id: string;
  tick: number;
  type: string;
  title: string;
  facts: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// API input types
// ---------------------------------------------------------------------------

export interface CreateExperimentInput {
  name: string;
  description?: string;
  hypothesis: string;
  contextType?: ContextType;
  agentCount?: number;
  groups?: GroupConfig[];
  personalityDistribution?: Partial<PersonalityDistributionConfig>;
  culture?: Partial<HofstedeCulture>;
  scheduledInterventions?: ScheduledIntervention[];
  seed?: string;
}

export interface RunTicksInput {
  ticks: number;
}

export interface InterveneInput {
  type: InterventionType;
  targetGroupId?: string;
  targetAgentId?: string;
  magnitude: number;
  durationTicks: number;
  params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Cultural presets library
// ---------------------------------------------------------------------------

export const CULTURAL_PRESETS: CulturalPreset[] = [
  {
    name: 'High Power Distance / Collectivist',
    description: 'Hierarchical, group-oriented culture. Status differences are accepted; loyalty to the group is paramount.',
    hofstede: { powerDistance: 0.8, individualism: 0.2, masculinity: 0.5, uncertaintyAvoidance: 0.6, longTermOrientation: 0.7 },
  },
  {
    name: 'Nordic Egalitarian',
    description: 'Low hierarchy, individualist but cooperative. High trust, uncertainty tolerance, long-term focus.',
    hofstede: { powerDistance: 0.2, individualism: 0.7, masculinity: 0.1, uncertaintyAvoidance: 0.2, longTermOrientation: 0.7 },
  },
  {
    name: 'Competitive Individualist',
    description: 'Low hierarchy, high individualism, strongly masculine. Achievement and competition are valued.',
    hofstede: { powerDistance: 0.3, individualism: 0.9, masculinity: 0.85, uncertaintyAvoidance: 0.35, longTermOrientation: 0.3 },
  },
  {
    name: 'High Uncertainty Avoidance',
    description: 'Rules are important; ambiguity is stressful. Strong norm enforcement and resistance to change.',
    hofstede: { powerDistance: 0.5, individualism: 0.5, masculinity: 0.5, uncertaintyAvoidance: 0.9, longTermOrientation: 0.5 },
  },
  {
    name: 'Cooperative / Feminine',
    description: 'Care, quality of life, and consensus are valued over competition and achievement.',
    hofstede: { powerDistance: 0.35, individualism: 0.5, masculinity: 0.1, uncertaintyAvoidance: 0.4, longTermOrientation: 0.6 },
  },
];

// ---------------------------------------------------------------------------
// Personality presets library
// ---------------------------------------------------------------------------

export const PERSONALITY_PRESETS: Array<{ name: string; config: PersonalityDistributionConfig }> = [
  {
    name: 'Balanced (Random)',
    config: {
      openness:          { kind: 'normal', mean: 0.5, stdDev: 0.15 },
      conscientiousness: { kind: 'normal', mean: 0.5, stdDev: 0.15 },
      extraversion:      { kind: 'normal', mean: 0.5, stdDev: 0.15 },
      agreeableness:     { kind: 'normal', mean: 0.5, stdDev: 0.15 },
      neuroticism:       { kind: 'normal', mean: 0.5, stdDev: 0.15 },
      attachmentDistribution: { secure: 0.55, anxious: 0.2, avoidant: 0.2, disorganized: 0.05 },
    },
  },
  {
    name: 'All Introverts',
    config: {
      openness:          { kind: 'normal', mean: 0.5, stdDev: 0.1 },
      conscientiousness: { kind: 'normal', mean: 0.55, stdDev: 0.1 },
      extraversion:      { kind: 'normal', mean: 0.2, stdDev: 0.08 },
      agreeableness:     { kind: 'normal', mean: 0.55, stdDev: 0.1 },
      neuroticism:       { kind: 'normal', mean: 0.5, stdDev: 0.12 },
      attachmentDistribution: { secure: 0.45, anxious: 0.2, avoidant: 0.3, disorganized: 0.05 },
    },
  },
  {
    name: 'High Agreeableness',
    config: {
      openness:          { kind: 'normal', mean: 0.5, stdDev: 0.12 },
      conscientiousness: { kind: 'normal', mean: 0.55, stdDev: 0.12 },
      extraversion:      { kind: 'normal', mean: 0.5, stdDev: 0.12 },
      agreeableness:     { kind: 'normal', mean: 0.8, stdDev: 0.08 },
      neuroticism:       { kind: 'normal', mean: 0.35, stdDev: 0.1 },
      attachmentDistribution: { secure: 0.65, anxious: 0.2, avoidant: 0.1, disorganized: 0.05 },
    },
  },
  {
    name: 'Neurotic Mix',
    config: {
      openness:          { kind: 'normal', mean: 0.5, stdDev: 0.15 },
      conscientiousness: { kind: 'normal', mean: 0.45, stdDev: 0.15 },
      extraversion:      { kind: 'normal', mean: 0.5, stdDev: 0.15 },
      agreeableness:     { kind: 'normal', mean: 0.45, stdDev: 0.15 },
      neuroticism:       { kind: 'normal', mean: 0.75, stdDev: 0.1 },
      attachmentDistribution: { secure: 0.25, anxious: 0.4, avoidant: 0.25, disorganized: 0.1 },
    },
  },
  {
    name: 'High Conscientiousness',
    config: {
      openness:          { kind: 'normal', mean: 0.5, stdDev: 0.12 },
      conscientiousness: { kind: 'normal', mean: 0.82, stdDev: 0.08 },
      extraversion:      { kind: 'normal', mean: 0.5, stdDev: 0.12 },
      agreeableness:     { kind: 'normal', mean: 0.55, stdDev: 0.12 },
      neuroticism:       { kind: 'normal', mean: 0.3, stdDev: 0.1 },
      attachmentDistribution: { secure: 0.6, anxious: 0.15, avoidant: 0.2, disorganized: 0.05 },
    },
  },
];

// Default personality distribution when none specified
export const DEFAULT_PERSONALITY_DISTRIBUTION: PersonalityDistributionConfig =
  PERSONALITY_PRESETS[0]!.config;

// Default culture when none specified (moderate on all dimensions)
export const DEFAULT_HOFSTEDE_CULTURE: HofstedeCulture = {
  powerDistance: 0.5,
  individualism: 0.5,
  masculinity: 0.5,
  uncertaintyAvoidance: 0.5,
  longTermOrientation: 0.5,
};
