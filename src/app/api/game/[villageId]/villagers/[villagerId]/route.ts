import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';
import { mapVillager } from '@/lib/simulation/worldGenerator';
import type { VillagerDetailView, KinshipLinkView, RelationshipEdgeView, KinshipKind } from '@/lib/domain/types';

export async function GET(
  _: Request,
  context: { params: Promise<{ villageId: string; villagerId: string }> }
) {
  const { villageId, villagerId } = await context.params;

  const villager = await prisma.villager.findFirst({
    where: { id: villagerId, villageId },
    include: {
      household: true,
      kinshipFrom: {
        include: { toVillager: { select: { id: true, name: true } } },
      },
      relationshipFrom: {
        where: { strength: { gt: 0.3 } },
        orderBy: { strength: 'desc' },
        take: 8,
        include: { toVillager: { select: { id: true, name: true } } },
      },
    },
  });

  if (!villager) {
    return NextResponse.json({ error: 'Villager not found' }, { status: 404 });
  }

  const base = mapVillager({ ...villager, household: villager.household ?? null });

  const kinship: KinshipLinkView[] = villager.kinshipFrom.map((k) => ({
    id: k.id,
    toVillagerId: k.toVillagerId,
    toVillagerName: k.toVillager.name,
    kind: k.kind as KinshipKind,
    certainty: k.certainty,
  }));

  const relationships: RelationshipEdgeView[] = villager.relationshipFrom.map((r) => ({
    id: r.id,
    toVillagerId: r.toVillagerId,
    toVillagerName: r.toVillager.name,
    type: r.type,
    strength: r.strength,
    trust: r.trust,
  }));

  const detail: VillagerDetailView = { ...base, kinship, relationships };
  return NextResponse.json(detail);
}
