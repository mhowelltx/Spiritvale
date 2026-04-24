import { NextRequest, NextResponse } from 'next/server';
import { getMetricsSeries } from '@/lib/server/experimentService';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  const { experimentId } = await params;
  const { searchParams } = new URL(req.url);
  const fromTick = searchParams.get('from') ? parseInt(searchParams.get('from')!) : undefined;
  const toTick = searchParams.get('to') ? parseInt(searchParams.get('to')!) : undefined;

  try {
    const metrics = await getMetricsSeries(experimentId, fromTick, toTick);
    return NextResponse.json(metrics);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
