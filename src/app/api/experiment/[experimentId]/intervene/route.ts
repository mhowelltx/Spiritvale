import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { applyIntervention } from '@/lib/server/experimentService';

const InterveneSchema = z.object({
  type: z.enum(['introduce_stressor','introduce_resource','split_group','merge_groups','introduce_outsider','remove_agent','shift_culture']),
  targetGroupId: z.string().optional(),
  targetAgentId: z.string().optional(),
  magnitude: z.number().min(0).max(1),
  durationTicks: z.number().int().min(1),
  params: z.record(z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ experimentId: string }> }
) {
  const { experimentId } = await params;
  try {
    const body = await req.json();
    const parsed = InterveneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await applyIntervention(experimentId, parsed.data);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
