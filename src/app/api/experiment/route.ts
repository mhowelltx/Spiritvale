import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createExperiment, listExperiments } from '@/lib/server/experimentService';

const DistributionSpecSchema = z.union([
  z.object({ kind: z.literal('fixed'), value: z.number().min(0).max(1) }),
  z.object({ kind: z.literal('normal'), mean: z.number().min(0).max(1), stdDev: z.number().min(0).max(0.5) }),
]);

const PersonalitySchema = z.object({
  openness:          DistributionSpecSchema.optional(),
  conscientiousness: DistributionSpecSchema.optional(),
  extraversion:      DistributionSpecSchema.optional(),
  agreeableness:     DistributionSpecSchema.optional(),
  neuroticism:       DistributionSpecSchema.optional(),
  attachmentDistribution: z.object({
    secure: z.number().min(0).max(1),
    anxious: z.number().min(0).max(1),
    avoidant: z.number().min(0).max(1),
    disorganized: z.number().min(0).max(1),
  }).optional(),
}).optional();

const HofstedeSchema = z.object({
  powerDistance:         z.number().min(0).max(1).optional(),
  individualism:         z.number().min(0).max(1).optional(),
  masculinity:           z.number().min(0).max(1).optional(),
  uncertaintyAvoidance:  z.number().min(0).max(1).optional(),
  longTermOrientation:   z.number().min(0).max(1).optional(),
}).optional();

const GroupConfigSchema = z.object({
  label: z.string().min(1),
  size: z.number().int().min(1).max(100),
  assignmentRule: z.enum(['random', 'personality_cluster', 'manual']).default('random'),
});

const InterventionSchema = z.object({
  atTick: z.number().int().min(0),
  type: z.enum(['introduce_stressor','introduce_resource','split_group','merge_groups','introduce_outsider','remove_agent','shift_culture']),
  targetGroupId: z.string().optional(),
  targetAgentId: z.string().optional(),
  magnitude: z.number().min(0).max(1),
  durationTicks: z.number().int().min(1),
  params: z.record(z.unknown()).optional(),
});

const CreateExperimentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  hypothesis: z.string().min(1).max(1000),
  contextType: z.enum(['workplace','community','school','online','neutral']).optional(),
  agentCount: z.number().int().min(2).max(200).optional(),
  groups: z.array(GroupConfigSchema).optional(),
  personalityDistribution: PersonalitySchema,
  culture: HofstedeSchema,
  scheduledInterventions: z.array(InterventionSchema).optional(),
  seed: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateExperimentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const experiment = await createExperiment(parsed.data as Parameters<typeof createExperiment>[0]);
    return NextResponse.json(experiment, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const list = await listExperiments();
    return NextResponse.json(list);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
