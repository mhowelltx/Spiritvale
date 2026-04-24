import { randomUUID } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { computeExperimentStructure } from '@/lib/simulation/worldGenerator';
import { runTick } from '@/lib/simulation/tickEngine';
import type {
  CreateExperimentInput,
  ExperimentView,
  AgentView,
  AgentDetailView,
  GroupView,
  RelationshipEdgeView,
  EventRecordView,
  MetricSnapshot,
  BigFiveProfile,
  AgentNeeds,
  AgentAffect,
  AgentMotive,
  HofstedeCulture,
  AttachmentStyle,
  LifeStage,
  ExperimentStatus,
  ContextType,
  InterveneInput,
  PersonalityDistributionConfig,
  DEFAULT_HOFSTEDE_CULTURE,
} from '@/lib/domain/types';
import {
  DEFAULT_PERSONALITY_DISTRIBUTION,
  DEFAULT_HOFSTEDE_CULTURE as DEFAULT_CULTURE,
} from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Experiment creation
// ---------------------------------------------------------------------------

export async function createExperiment(input: CreateExperimentInput): Promise<ExperimentView> {
  const seed = input.seed ?? randomUUID();

  const personalityDistribution: PersonalityDistributionConfig = {
    ...DEFAULT_PERSONALITY_DISTRIBUTION,
    ...input.personalityDistribution,
    attachmentDistribution: {
      ...DEFAULT_PERSONALITY_DISTRIBUTION.attachmentDistribution,
      ...input.personalityDistribution?.attachmentDistribution,
    },
  };

  const culture: HofstedeCulture = {
    ...DEFAULT_CULTURE,
    ...input.culture,
  };

  const agentCount = input.agentCount ?? 20;
  const groups = input.groups ?? [{ label: 'Group A', size: agentCount, assignmentRule: 'random' as const }];

  const config = {
    name: input.name,
    description: input.description ?? '',
    hypothesis: input.hypothesis,
    contextType: input.contextType ?? 'neutral',
    agentCount,
    groups,
    personalityDistribution,
    culture,
    scheduledInterventions: input.scheduledInterventions ?? [],
    seed,
  };

  const structure = computeExperimentStructure(config, seed);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create experiment record
    const experiment = await tx.experiment.create({
      data: {
        seed,
        name: config.name,
        description: config.description,
        hypothesis: config.hypothesis,
        contextType: config.contextType,
        status: 'setup',
        tick: 0,
        personalityDistribution: personalityDistribution as object,
        culture: culture as object,
        scheduledInterventions: (config.scheduledInterventions ?? []) as object[],
        events: {
          create: {
            tick: 0,
            type: 'experiment_created',
            title: `Experiment "${config.name}" initialized.`,
            facts: { seed, agentCount, hypothesis: config.hypothesis },
          },
        },
      },
    });

    // 2. Create groups
    const groupIdMap = new Map<string, string>(); // tempId → real id
    for (const g of structure.groups) {
      const row = await tx.socialGroup.create({
        data: {
          experimentId: experiment.id,
          label: g.label,
          assignmentRule: g.assignmentRule,
          inGroupBias: g.inGroupBias,
          cohesionIndex: 0,
          statusRank: 0,
        },
      });
      groupIdMap.set(g.tempId, row.id);
    }

    // 3. Create agents
    const agentIdMap = new Map<string, string>(); // tempId → real id
    for (const a of structure.agents) {
      const realGroupId = groupIdMap.get(`g${a.groupIndex}`) ?? null;
      const row = await tx.agent.create({
        data: {
          experimentId: experiment.id,
          groupId: realGroupId,
          name: a.name,
          sex: a.sex,
          ageInTicks: a.ageInTicks,
          lifeStage: a.lifeStage,
          personality: a.personality as object,
          attachmentStyle: a.attachmentStyle,
          needs: a.needs as object,
          affect: a.affect as object,
          statusScore: a.statusScore,
          motives: a.motives as object[],
        },
      });
      agentIdMap.set(a.tempId, row.id);
    }

    // 4. Create relationship edges
    for (const r of structure.relationships) {
      const fromId = agentIdMap.get(r.fromTempId);
      const toId = agentIdMap.get(r.toTempId);
      if (fromId && toId) {
        await tx.relationshipEdge.create({
          data: {
            experimentId: experiment.id,
            fromAgentId: fromId,
            toAgentId: toId,
            type: r.type,
            strength: r.strength,
            trust: r.trust,
          },
        });
      }
    }

    // 5. Create scheduled interventions
    for (const iv of config.scheduledInterventions ?? []) {
      await tx.interventionRecord.create({
        data: {
          experimentId: experiment.id,
          tick: iv.atTick,
          type: iv.type,
          targetGroupId: iv.targetGroupId,
          targetAgentId: iv.targetAgentId,
          magnitude: iv.magnitude,
          durationTicks: iv.durationTicks,
          remainingTicks: iv.durationTicks,
          params: (iv.params ?? {}) as object,
        },
      });
    }

    return experiment;
  });

  return (await getExperiment(result.id))!;
}

// ---------------------------------------------------------------------------
// Experiment retrieval
// ---------------------------------------------------------------------------

export async function getExperiment(experimentId: string): Promise<ExperimentView | null> {
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      groups: true,
      agents: { orderBy: { ageInTicks: 'desc' } },
      events: { orderBy: [{ tick: 'desc' }, { createdAt: 'desc' }], take: 30 },
      metrics: { orderBy: { tick: 'desc' }, take: 1 },
    },
  });

  if (!experiment) return null;

  const groups: GroupView[] = experiment.groups.map((g) => ({
    id: g.id,
    label: g.label,
    memberIds: experiment.agents.filter((a) => a.groupId === g.id).map((a) => a.id),
    cohesionIndex: g.cohesionIndex,
    statusRank: g.statusRank,
    inGroupBias: g.inGroupBias,
  }));

  const groupLabelMap = new Map(experiment.groups.map((g) => [g.id, g.label]));

  const agents: AgentView[] = experiment.agents.map((a) => ({
    id: a.id,
    name: a.name,
    sex: a.sex as 'male' | 'female',
    ageInTicks: a.ageInTicks,
    lifeStage: a.lifeStage as LifeStage,
    groupId: a.groupId,
    groupLabel: a.groupId ? (groupLabelMap.get(a.groupId) ?? null) : null,
    personality: a.personality as unknown as BigFiveProfile,
    attachmentStyle: a.attachmentStyle as AttachmentStyle,
    needs: a.needs as unknown as AgentNeeds,
    affect: a.affect as unknown as AgentAffect,
    statusScore: a.statusScore,
    motives: (a.motives as unknown as AgentMotive[]) ?? [],
  }));

  const events: EventRecordView[] = experiment.events.map((e) => ({
    id: e.id,
    tick: e.tick,
    type: e.type,
    title: e.title,
    facts: e.facts as Record<string, unknown>,
  }));

  const latestMetrics = experiment.metrics[0]
    ? (experiment.metrics[0].metrics as unknown as MetricSnapshot)
    : null;

  return {
    id: experiment.id,
    name: experiment.name,
    description: experiment.description,
    hypothesis: experiment.hypothesis,
    contextType: experiment.contextType as ContextType,
    status: experiment.status as ExperimentStatus,
    tick: experiment.tick,
    seed: experiment.seed,
    culture: experiment.culture as unknown as HofstedeCulture,
    personalityDistribution: experiment.personalityDistribution as unknown as PersonalityDistributionConfig,
    groups,
    agents,
    latestMetrics,
    recentEvents: events,
  };
}

// ---------------------------------------------------------------------------
// Tick execution
// ---------------------------------------------------------------------------

export async function tickExperiment(experimentId: string, count: number = 1): Promise<ExperimentView | null> {
  for (let i = 0; i < count; i++) {
    const result = await runTick(experimentId);
    if (!result) return null;
  }
  return getExperiment(experimentId);
}

// ---------------------------------------------------------------------------
// Intervention injection
// ---------------------------------------------------------------------------

export async function applyIntervention(experimentId: string, input: InterveneInput): Promise<void> {
  await prisma.interventionRecord.create({
    data: {
      experimentId,
      tick: 0, // applied immediately (current tick)
      type: input.type,
      targetGroupId: input.targetGroupId,
      targetAgentId: input.targetAgentId,
      magnitude: input.magnitude,
      durationTicks: input.durationTicks,
      remainingTicks: input.durationTicks,
      params: (input.params ?? {}) as object,
    },
  });
}

// ---------------------------------------------------------------------------
// Agent detail view
// ---------------------------------------------------------------------------

export async function getAgentDetail(agentId: string): Promise<AgentDetailView | null> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      group: true,
      relationshipFrom: {
        include: { toAgent: true },
        orderBy: { strength: 'desc' },
        take: 20,
      },
    },
  });

  if (!agent) return null;

  const relationships: RelationshipEdgeView[] = agent.relationshipFrom.map((e) => ({
    id: e.id,
    toAgentId: e.toAgentId,
    toAgentName: e.toAgent.name,
    type: e.type,
    strength: e.strength,
    trust: e.trust,
  }));

  return {
    id: agent.id,
    name: agent.name,
    sex: agent.sex as 'male' | 'female',
    ageInTicks: agent.ageInTicks,
    lifeStage: agent.lifeStage as LifeStage,
    groupId: agent.groupId,
    groupLabel: agent.group?.label ?? null,
    personality: agent.personality as unknown as BigFiveProfile,
    attachmentStyle: agent.attachmentStyle as AttachmentStyle,
    needs: agent.needs as unknown as AgentNeeds,
    affect: agent.affect as unknown as AgentAffect,
    statusScore: agent.statusScore,
    motives: (agent.motives as unknown as AgentMotive[]) ?? [],
    relationships,
  };
}

// ---------------------------------------------------------------------------
// Metrics time-series
// ---------------------------------------------------------------------------

export async function getMetricsSeries(
  experimentId: string,
  fromTick?: number,
  toTick?: number
): Promise<MetricSnapshot[]> {
  const snapshots = await prisma.metricSnapshot.findMany({
    where: {
      experimentId,
      tick: {
        ...(fromTick !== undefined ? { gte: fromTick } : {}),
        ...(toTick !== undefined ? { lte: toTick } : {}),
      },
    },
    orderBy: { tick: 'asc' },
  });

  return snapshots.map((s) => s.metrics as unknown as MetricSnapshot);
}

// ---------------------------------------------------------------------------
// List experiments
// ---------------------------------------------------------------------------

export async function listExperiments(): Promise<Array<{ id: string; name: string; status: ExperimentStatus; tick: number; createdAt: Date }>> {
  const rows = await prisma.experiment.findMany({
    select: { id: true, name: true, status: true, tick: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({ ...r, status: r.status as ExperimentStatus }));
}
