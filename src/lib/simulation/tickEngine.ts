import { prisma } from '@/lib/server/prisma';
import { createSeededRng } from '@/lib/rng/seededRng';
import { stepAdvanceTick } from './calendarStep';
import { stepApplyInterventions } from './interventionStep';
import { stepUpdatePsychologicalState } from './needsEmotionsStep';
import { stepResolveSocialDynamics } from './socialStep';
import { stepResolveGroupIdentityDynamics } from './identityStep';
import { stepDriftHofstedeCulture } from './cultureStep';
import { stepResolveBehaviorIncidents } from './incidentStep';
import { stepComputeMetrics } from './metricsStep';
import type { SimulationTickContext, MutableAgent, MutableRelationshipEdge, MutableGroup } from './tickContext';
import type { BigFiveProfile, AgentNeeds, AgentAffect, AgentMotive, HofstedeCulture, ExperimentView, AttachmentStyle, LifeStage } from '@/lib/domain/types';

export async function runTick(experimentId: string): Promise<ExperimentView | null> {
  // 1. Load current experiment state
  const experiment = await prisma.experiment.findUnique({
    where: { id: experimentId },
    include: {
      groups: true,
      agents: true,
      relationships: true,
      interventions: { where: { resolved: false } },
    },
  });

  if (!experiment) return null;

  // 2. Deserialize JSON fields
  const culture = experiment.culture as unknown as HofstedeCulture;
  const cultureSetpoint: HofstedeCulture = { ...culture };

  // 3. Build mutable agent list
  const mutableAgents: MutableAgent[] = experiment.agents.map((a) => ({
    id: a.id,
    name: a.name,
    sex: a.sex as 'male' | 'female',
    ageInTicks: a.ageInTicks,
    lifeStage: a.lifeStage as LifeStage,
    groupId: a.groupId,
    personality: a.personality as unknown as BigFiveProfile,
    attachmentStyle: a.attachmentStyle as AttachmentStyle,
    needs: a.needs as unknown as AgentNeeds,
    affect: a.affect as unknown as AgentAffect,
    statusScore: a.statusScore,
    motives: (a.motives as unknown as AgentMotive[]) ?? [],
  }));

  // 4. Build mutable relationship list
  const mutableRelationships: MutableRelationshipEdge[] = experiment.relationships.map((e) => ({
    id: e.id,
    fromAgentId: e.fromAgentId,
    toAgentId: e.toAgentId,
    type: e.type,
    strength: e.strength,
    trust: e.trust,
    lastInteractionTick: e.lastInteractionTick,
  }));

  // 5. Build mutable group list
  const mutableGroups: MutableGroup[] = experiment.groups.map((g) => ({
    id: g.id,
    label: g.label,
    inGroupBias: g.inGroupBias,
    cohesionIndex: g.cohesionIndex,
    statusRank: g.statusRank,
  }));

  // 6. Build group member index
  const groupMemberIds = new Map<string, string[]>();
  for (const group of mutableGroups) {
    groupMemberIds.set(group.id, []);
  }
  for (const agent of mutableAgents) {
    if (agent.groupId) {
      groupMemberIds.get(agent.groupId)?.push(agent.id);
    }
  }

  // 7. Build active interventions from DB records
  const activeInterventions = experiment.interventions.map((i) => ({
    id: i.id,
    type: i.type,
    targetGroupId: i.targetGroupId ?? undefined,
    targetAgentId: i.targetAgentId ?? undefined,
    magnitude: i.magnitude,
    remainingTicks: i.remainingTicks,
  }));

  // 8. Build tick context
  const prevTick = experiment.tick;
  const ctx: SimulationTickContext = {
    experimentId,
    seed: experiment.seed,
    rng: createSeededRng(`${experiment.seed}:tick:${prevTick + 1}`),
    tick: prevTick,
    prevTick,
    culture: { ...culture },
    cultureSetpoint,
    agents: mutableAgents,
    groups: mutableGroups,
    groupMemberIds,
    relationships: mutableRelationships,
    environmentalStress: 0.1, // baseline stress level
    activeInterventions,
    metrics: {
      conflictCount: 0,
      cooperationCount: 0,
      bystanderHelpCount: 0,
      bystanderNoActionCount: 0,
      normEnforcementCount: 0,
      distressCount: 0,
    },
    exitedAgentIds: [],
    updatedAgents: [],
    updatedRelationships: [],
    updatedGroups: [],
    updatedCulture: { ...culture },
    emittedEvents: [],
    snapshotMetrics: null,
  };

  // 9. Run steps in order
  stepAdvanceTick(ctx);
  stepApplyInterventions(ctx);
  stepUpdatePsychologicalState(ctx);
  stepResolveSocialDynamics(ctx);
  stepResolveGroupIdentityDynamics(ctx);
  stepDriftHofstedeCulture(ctx);
  stepResolveBehaviorIncidents(ctx);
  stepComputeMetrics(ctx);

  // 10. Emit tick summary
  ctx.emittedEvents.unshift({
    experimentId,
    tick: ctx.tick,
    type: 'tick_summary',
    title: `Tick ${ctx.tick} complete.`,
    facts: {
      agentCount: ctx.agents.filter((a) => !ctx.exitedAgentIds.includes(a.id)).length,
      conflictRate: ctx.metrics.conflictCount,
      cooperationRate: ctx.metrics.cooperationCount,
      environmentalStress: ctx.environmentalStress,
    },
  });

  // 11. Persist all changes in a single transaction
  await prisma.$transaction([
    // Advance tick counter and update culture
    prisma.experiment.update({
      where: { id: experimentId },
      data: {
        tick: ctx.tick,
        status: 'running',
        culture: ctx.updatedCulture as object,
      },
    }),
    // Update surviving agents
    ...ctx.agents
      .filter((a) => !ctx.exitedAgentIds.includes(a.id))
      .map((a) =>
        prisma.agent.update({
          where: { id: a.id },
          data: {
            ageInTicks: a.ageInTicks + 1,
            lifeStage: a.lifeStage,
            needs: a.needs as object,
            affect: a.affect as object,
            statusScore: a.statusScore,
            motives: a.motives as object[],
          },
        })
      ),
    // Update relationships
    ...ctx.updatedRelationships.map((r) =>
      prisma.relationshipEdge.update({
        where: { id: r.id },
        data: { strength: r.strength, trust: r.trust, lastInteractionTick: r.lastInteractionTick },
      })
    ),
    // Update groups (cohesion index)
    ...ctx.updatedGroups.map((g) =>
      prisma.socialGroup.update({
        where: { id: g.id },
        data: { cohesionIndex: g.cohesionIndex, statusRank: g.statusRank },
      })
    ),
    // Persist metric snapshot
    ...(ctx.snapshotMetrics
      ? [prisma.metricSnapshot.create({
          data: {
            experimentId,
            tick: ctx.tick,
            metrics: ctx.snapshotMetrics as object,
          },
        })]
      : []),
    // Mark expired interventions as resolved
    ...experiment.interventions
      .filter((i) => !ctx.activeInterventions.some((ai) => ai.id === i.id))
      .map((i) => prisma.interventionRecord.update({ where: { id: i.id }, data: { resolved: true } })),
    // Persist events
    ...ctx.emittedEvents.map((e) =>
      prisma.eventRecord.create({ data: { ...e, facts: e.facts as object } })
    ),
  ]);

  // 12. Return updated view
  const { getExperiment } = await import('@/lib/server/experimentService');
  return getExperiment(experimentId);
}
