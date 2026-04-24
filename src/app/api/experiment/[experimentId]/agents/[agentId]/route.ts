import { NextRequest, NextResponse } from 'next/server';
import { getAgentDetail } from '@/lib/server/experimentService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ experimentId: string; agentId: string }> }
) {
  const { agentId } = await params;
  const agent = await getAgentDetail(agentId);
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(agent);
}
