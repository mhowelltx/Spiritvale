import { clamp } from './worldGenerator';
import type { TickContext, MutableRelationshipEdge } from './tickContext';

const KIN_TYPES = new Set(['kin', 'pair_bond']);

export function stepResolveSocialInteractions(ctx: TickContext): void {
  const deadSet = new Set(ctx.deadIds);
  const changed: MutableRelationshipEdge[] = [];

  for (const edge of ctx.relationshipEdges) {
    if (deadSet.has(edge.fromVillagerId) || deadSet.has(edge.toVillagerId)) continue;

    let { strength, trust } = edge;

    // Kinship bonds decay toward a floor raised by kin loyalty norm
    if (KIN_TYPES.has(edge.type)) {
      const kinFloor = 0.7 + (ctx.cultureState?.kinLoyaltyNorm ?? 0.8) * 0.15;
      strength = strength + (kinFloor - strength) * 0.001;
    }

    // Household cohabitation bonus: +0.002/tick, cap at 0.95
    const fromMembers = ctx.householdMembersById.get(edge.fromVillagerId);
    if (fromMembers?.includes(edge.toVillagerId)) {
      strength = Math.min(0.95, strength + 0.002);

      // Hunger pressure: scarcity creates tension between cohabitants with high fear
      // High sharing norm buffers this tension
      if (ctx.starving) {
        const fromVillager = ctx.villagers.find((v) => v.id === edge.fromVillagerId);
        if (fromVillager && fromVillager.emotions.fear > 0.5) {
          const sharingBuffer = (ctx.cultureState?.sharingNorm ?? 0.5) * 0.003;
          trust = clamp(trust - 0.005 + sharingBuffer, 0, 1);
        }
      }

      // Death grief: shared loss bonds survivors together
      const fromDied = ctx.deadIds.some((id) => fromMembers.includes(id) || id === edge.fromVillagerId);
      if (fromDied) {
        strength = Math.min(0.95, strength + 0.01);
      }
    }

    strength = clamp(strength, 0, 1);
    trust = clamp(trust, 0, 1);

    const strengthDelta = Math.abs(strength - edge.strength);
    const trustDelta = Math.abs(trust - edge.trust);

    if (strengthDelta > 0.0001 || trustDelta > 0.0001) {
      edge.strength = strength;
      edge.trust = trust;
      changed.push(edge);

      if (strengthDelta > 0.1 || trustDelta > 0.1) {
        ctx.emittedEvents.push({
          villageId: ctx.villageId,
          day: ctx.day,
          type: 'relationship_shift',
          title: 'A bond in the village shifts.',
          facts: {
            fromVillagerId: edge.fromVillagerId,
            toVillagerId: edge.toVillagerId,
            type: edge.type,
            strengthDelta: Number(strengthDelta.toFixed(3)),
            trustDelta: Number(trustDelta.toFixed(3)),
          },
        });
      }
    }
  }

  ctx.updatedRelationships = changed.map((e) => ({
    id: e.id,
    strength: e.strength,
    trust: e.trust,
    lastInteractionDay: ctx.day,
  }));
}
