import { NextResponse } from 'next/server';
import { CULTURAL_PRESETS, PERSONALITY_PRESETS } from '@/lib/domain/types';

export async function GET() {
  return NextResponse.json({
    cultures: CULTURAL_PRESETS,
    personalities: PERSONALITY_PRESETS,
  });
}
