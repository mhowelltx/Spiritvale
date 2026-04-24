import { describe, it, expect } from 'vitest';
import { stepAdvanceTick } from '@/lib/simulation/calendarStep';
import type { SimulationTickContext } from '@/lib/simulation/tickContext';
import { DEFAULT_HOFSTEDE_CULTURE } from '@/lib/domain/types';

function makeCtx(prevTick: number): SimulationTickContext {
  return {
    experimentId: 'exp1',
    seed: 'test',
    rng: Math.random,
    tick: prevTick,
    prevTick,
    culture: { ...DEFAULT_HOFSTEDE_CULTURE },
    cultureSetpoint: { ...DEFAULT_HOFSTEDE_CULTURE },
    agents: [],
    groups: [],
    groupMemberIds: new Map(),
    relationships: [],
    environmentalStress: 0.1,
    activeInterventions: [],
    metrics: { conflictCount: 0, cooperationCount: 0, bystanderHelpCount: 0, bystanderNoActionCount: 0, normEnforcementCount: 0, distressCount: 0 },
    exitedAgentIds: [],
    updatedAgents: [],
    updatedRelationships: [],
    updatedGroups: [],
    updatedCulture: { ...DEFAULT_HOFSTEDE_CULTURE },
    emittedEvents: [],
    snapshotMetrics: null,
  };
}

describe('stepAdvanceTick', () => {
  it('increments tick by 1', () => {
    const ctx = makeCtx(0);
    stepAdvanceTick(ctx);
    expect(ctx.tick).toBe(1);
  });

  it('increments from arbitrary starting tick', () => {
    const ctx = makeCtx(42);
    stepAdvanceTick(ctx);
    expect(ctx.tick).toBe(43);
  });
});
