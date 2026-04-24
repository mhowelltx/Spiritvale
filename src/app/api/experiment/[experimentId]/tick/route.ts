import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { tickExperiment } from '@/lib/server/experimentService';

const TickSchema = z.object({
  ticks: z.number().int().min(1).max(500).default(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  const { experimentId } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = TickSchema.safeParse(body);
    const ticks = parsed.success ? parsed.data.ticks : 1;
    const result = await tickExperiment(experimentId, ticks);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
