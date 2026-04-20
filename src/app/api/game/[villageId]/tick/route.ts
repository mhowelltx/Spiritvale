import { NextResponse } from 'next/server';
import { tickGame } from '@/lib/server/gameService';

export async function POST(_: Request, context: { params: Promise<{ villageId: string }> }) {
  const { villageId } = await context.params;
  const game = await tickGame(villageId);

  if (!game) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(game);
}
