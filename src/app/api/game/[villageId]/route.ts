import { NextResponse } from 'next/server';
import { getGame } from '@/lib/server/gameService';

export async function GET(_: Request, context: { params: Promise<{ villageId: string }> }) {
  const { villageId } = await context.params;
  const game = await getGame(villageId);

  if (!game) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(game);
}
