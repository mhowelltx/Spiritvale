import { createSeededRng } from '@/lib/rng/seededRng';
import { clamp } from './worldGenerator';
import type { TickContext, MutableVillager, MutableRelationshipEdge } from './tickContext';
import type { VillagerMotive } from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Incident resolution — motive-driven narrative events
// ---------------------------------------------------------------------------

function findRelationshipEdge(
  ctx: TickContext,
  fromId: string,
  toId: string
): MutableRelationshipEdge | undefined {
  return ctx.relationshipEdges.find(
    (e) => e.fromVillagerId === fromId && e.toVillagerId === toId
  );
}

function nudgeRelationship(
  ctx: TickContext,
  fromId: string,
  toId: string,
  strengthDelta: number,
  trustDelta: number,
  day: number
): void {
  const edge = findRelationshipEdge(ctx, fromId, toId);
  if (!edge) return;
  edge.strength = clamp(edge.strength + strengthDelta, 0, 1);
  edge.trust = clamp(edge.trust + trustDelta, 0, 1);
  // Mark for persistence (dedup by id)
  const existing = ctx.updatedRelationships.find((r) => r.id === edge.id);
  if (existing) {
    existing.strength = edge.strength;
    existing.trust = edge.trust;
    existing.lastInteractionDay = day;
  } else {
    ctx.updatedRelationships.push({ id: edge.id, strength: edge.strength, trust: edge.trust, lastInteractionDay: day });
  }
}

function resolveIncident(
  ctx: TickContext,
  actor: MutableVillager,
  motive: VillagerMotive,
  rng: () => number
): void {
  const deadSet = new Set(ctx.deadIds);
  const living = ctx.villagers.filter((v) => !deadSet.has(v.id));
  const householdMembers = (ctx.householdMembersById.get(actor.id) ?? [])
    .map((id) => living.find((v) => v.id === id))
    .filter((v): v is MutableVillager => !!v);

  const emitIncident = (title: string, targetId?: string, targetName?: string) => {
    ctx.emittedEvents.push({
      villageId: ctx.villageId,
      day: ctx.day,
      type: 'villager_incident',
      title,
      facts: {
        motiveType: motive.type,
        actorId: actor.id,
        actorName: actor.name,
        ...(targetId ? { targetId, targetName } : {}),
      },
    });
  };

  switch (motive.type) {
    case 'status': {
      // Challenge a random other adult
      const others = living.filter((v) => v.id !== actor.id && v.lifeStage === 'adult');
      if (others.length === 0) break;
      const target = others[Math.floor(rng() * others.length)]!;
      emitIncident(`${actor.name} presses hard for standing among the group.`, target.id, target.name);
      nudgeRelationship(ctx, actor.id, target.id, 0, -0.03, ctx.day);
      nudgeRelationship(ctx, target.id, actor.id, 0, -0.02, ctx.day);
      break;
    }
    case 'kin_protection': {
      // Find household member with low safety
      const vulnerable = householdMembers.find((v) => v.needs.safety < 0.4);
      const target = vulnerable ?? householdMembers[Math.floor(rng() * householdMembers.length)];
      if (!target) break;
      emitIncident(`${actor.name} keeps close watch over ${target.name}.`, target.id, target.name);
      nudgeRelationship(ctx, actor.id, target.id, 0.04, 0, ctx.day);
      nudgeRelationship(ctx, target.id, actor.id, 0.02, 0, ctx.day);
      break;
    }
    case 'survival': {
      if (ctx.foodAfter < 300 || ctx.starving) {
        emitIncident(`${actor.name} hunts beyond the usual range, pushed by hunger.`);
      }
      break;
    }
    case 'belonging': {
      if (householdMembers.length === 0) break;
      const target = householdMembers[Math.floor(rng() * householdMembers.length)]!;
      emitIncident(`${actor.name} seeks comfort with ${target.name}.`, target.id, target.name);
      nudgeRelationship(ctx, actor.id, target.id, 0.02, 0, ctx.day);
      nudgeRelationship(ctx, target.id, actor.id, 0.01, 0, ctx.day);
      break;
    }
    case 'tradition': {
      if (actor.lifeStage !== 'elder') break;
      emitIncident(`${actor.name} gathers the hearth for the old rites.`);
      // Nudge culture toward more ritual (if culture loaded)
      if (ctx.cultureState) {
        ctx.cultureState.ritualIntensity = clamp(ctx.cultureState.ritualIntensity + 0.003, 0, 1);
        if (ctx.updatedCulture) ctx.updatedCulture.ritualIntensity = ctx.cultureState.ritualIntensity;
      }
      break;
    }
    case 'reform': {
      if (!actor.traits.includes('curious')) break;
      if (householdMembers.length === 0) break;
      const target = householdMembers[Math.floor(rng() * householdMembers.length)]!;
      emitIncident(`${actor.name} questions how things have always been done.`, target.id, target.name);
      nudgeRelationship(ctx, actor.id, target.id, 0, -0.02, ctx.day);
      break;
    }
    case 'autonomy': {
      if (actor.role !== 'hunter') break;
      emitIncident(`${actor.name} slips away from the group to hunt alone.`);
      break;
    }
    case 'romance': {
      // Find partner via pair_bond relationship
      const partnerEdge = ctx.relationshipEdges.find(
        (e) => e.fromVillagerId === actor.id && e.type === 'pair_bond'
      );
      if (!partnerEdge) break;
      const partner = living.find((v) => v.id === partnerEdge.toVillagerId);
      if (!partner) break;
      emitIncident(`${actor.name} steals time with ${partner.name} amid the work.`, partner.id, partner.name);
      nudgeRelationship(ctx, actor.id, partner.id, 0.03, 0, ctx.day);
      nudgeRelationship(ctx, partner.id, actor.id, 0.02, 0, ctx.day);
      break;
    }
  }
}

export function stepResolveMotiveIncidents(ctx: TickContext): void {
  const deadSet = new Set(ctx.deadIds);

  for (const villager of ctx.villagers) {
    if (deadSet.has(villager.id)) continue;
    if (villager.lifeStage === 'child') continue;

    const motives = villager.motives ?? [];
    if (motives.length === 0) continue;

    // Only process highest-urgency motive
    const topMotive = motives.reduce((best, m) => (m.urgency > best.urgency ? m : best), motives[0]!);
    if (topMotive.urgency <= 0.65) continue;

    // Per-villager deterministic RNG for this tick
    const rng = createSeededRng(`${ctx.seed}:incident:${ctx.day}:${villager.id}`);
    if (rng() >= topMotive.urgency * 0.07) continue;

    resolveIncident(ctx, villager, topMotive, rng);
  }
}
