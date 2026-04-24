import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  const { experimentId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const page = Math.max(parseInt(searchParams.get('page') ?? '0'), 0);

  try {
    const events = await prisma.eventRecord.findMany({
      where: {
        experimentId,
        ...(type ? { type } : {}),
      },
      orderBy: [{ tick: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: page * limit,
    });

    return NextResponse.json(events.map((e) => ({
      id: e.id,
      tick: e.tick,
      type: e.type,
      title: e.title,
      facts: e.facts,
    })));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
