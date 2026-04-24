import type {
  BigFiveProfile,
  AgentNeeds,
  AgentAffect,
  AgentMotive,
  AttachmentStyle,
  HofstedeCulture,
  LifeStage,
  Sex,
  MetricSnapshot,
  IncidentType,
} from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Mutable in-memory agent (used during tick, not persisted until end)
// ---------------------------------------------------------------------------

export interface MutableAgent {
  id: string;
  name: string;
  sex: Sex;
  ageInTicks: number;
  lifeStage: LifeStage;
  groupId: string | null;
  personality: BigFiveProfile;
  attachmentStyle: AttachmentStyle;
  needs: AgentNeeds;
  affect: AgentAffect;
  statusScore: number;
  motives: AgentMotive[];
}

export interface MutableRelationshipEdge {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: string;
  strength: number;
  trust: number;
  lastInteractionTick: number;
}

export interface MutableGroup {
  id: string;
  label: string;
  inGroupBias: number;
  cohesionIndex: number;
  statusRank: number;
}

// ---------------------------------------------------------------------------
// Events emitted during a tick (batch-persisted at end)
// ---------------------------------------------------------------------------

export interface PendingEvent {
  experimentId: string;
  tick: number;
  type: string;
  title: string;
  facts: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Metric accumulators (populated during tick, snapshotted at metricsStep)
// ---------------------------------------------------------------------------

export interface TickMetricAccumulator {
  conflictCount: number;
  cooperationCount: number;
  bystanderHelpCount: number;
  bystanderNoActionCount: number;
  normEnforcementCount: number;
  distressCount: number;
}

// ---------------------------------------------------------------------------
// Main tick context — passed through all simulation steps
// ---------------------------------------------------------------------------

export interface SimulationTickContext {
  experimentId: string;
  seed: string;
  rng: () => number;
  tick: number;           // current tick number (after advance)
  prevTick: number;       // tick before this run

  // Cultural environment (mutable during cultureStep)
  culture: HofstedeCulture;
  // Configured setpoint — culture drifts back toward this
  cultureSetpoint: HofstedeCulture;

  // Agents (mutable during tick)
  agents: MutableAgent[];

  // Groups (mutable — cohesionIndex updated in identityStep)
  groups: MutableGroup[];

  // Group membership lookup: groupId → agentIds
  groupMemberIds: Map<string, string[]>;

  // Relationships (mutable during socialStep)
  relationships: MutableRelationshipEdge[];

  // Environmental stress level (0–1), set by interventionStep / resourceStep
  environmentalStress: number;

  // Active interventions (durationTick tracking)
  activeInterventions: Array<{
    id: string;
    type: string;
    targetGroupId?: string;
    targetAgentId?: string;
    magnitude: number;
    remainingTicks: number;
  }>;

  // Per-tick metric accumulators
  metrics: TickMetricAccumulator;

  // Outputs collected during tick
  exitedAgentIds: string[];   // agents removed this tick (attrition)
  updatedAgents: Array<{
    id: string;
    ageInTicks: number;
    lifeStage: LifeStage;
    needs: AgentNeeds;
    affect: AgentAffect;
    statusScore: number;
    motives: AgentMotive[];
  }>;
  updatedRelationships: Array<{
    id: string;
    strength: number;
    trust: number;
    lastInteractionTick: number;
  }>;
  updatedGroups: Array<{
    id: string;
    cohesionIndex: number;
    statusRank: number;
  }>;
  updatedCulture: HofstedeCulture;
  emittedEvents: PendingEvent[];
  snapshotMetrics: MetricSnapshot | null;
}
