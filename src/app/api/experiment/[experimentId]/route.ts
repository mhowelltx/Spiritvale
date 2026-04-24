import { NextRequest, NextResponse } from 'next/server';
import { getExperiment } from '@/lib/server/experimentService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  const { experimentId } = await params;
  const experiment = await getExperiment(experimentId);
  if (!experiment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(experiment);
}
