import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/server/prisma';
import { resolveSpiritAction } from '@/lib/simulation/spiritResolver';

const bodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cause_famine'), severity: z.enum(['mild', 'severe']) }),
  z.object({
    type: z.literal('send_dream'),
    targetVillagerId: z.string().uuid(),
    intent: z.enum(['hope', 'warning', 'revelation', 'fear']),
  }),
]);

export async function POST(
  request: Request,
  context: { params: Promise<{ villageId: string }> }
) {
  const { villageId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }

  const village = await prisma.village.findUnique({ where: { id: villageId } });
  if (!village) {
    return NextResponse.json({ error: 'Village not found' }, { status: 404 });
  }

  const result = await resolveSpiritAction(villageId, parsed.data, village.day);
  return NextResponse.json(result);
}
