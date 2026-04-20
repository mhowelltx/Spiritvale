import { NextRequest, NextResponse } from 'next/server';
import { createGame } from '@/lib/server/gameService';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    seed?: string;
    name?: string;
    startingPopulation?: number;
    startingFood?: number;
  };

  const game = await createGame(body);
  return NextResponse.json(game, { status: 201 });
}
