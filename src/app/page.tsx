'use client';

import { useState } from 'react';

type GamePayload = {
  id: string;
  name: string;
  day: number;
  year: number;
  season: string;
  population: number;
  resources: { food: number; weatherHarsh: number; diseaseRisk: number };
  events: Array<{ id: string; day: number; type: string; title: string; facts: Record<string, unknown> }>;
};

export default function HomePage() {
  const [game, setGame] = useState<GamePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGame() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/game/new', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Spiritvale Local' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const data = (await response.json()) as GamePayload;
      setGame(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function tick() {
    if (!game) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/game/${game.id}/tick`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to tick game');
      }

      const data = (await response.json()) as GamePayload;
      setGame(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Spiritvale — Milestone 1 Local Slice</h1>
      <p>Server-authoritative deterministic simulation prototype.</p>

      <button onClick={createGame} disabled={loading}>
        Create village
      </button>
      <button onClick={tick} disabled={loading || !game}>
        Tick one day
      </button>

      {error ? <p role="alert">Error: {error}</p> : null}

      {game ? (
        <div className="card">
          <h2>{game.name}</h2>
          <p>
            Day {game.day} (Year {game.year}, {game.season})
          </p>
          <p>Population: {game.population}</p>
          <p>Food: {game.resources.food}</p>
          <h3>Recent events</h3>
          <pre>{JSON.stringify(game.events.slice(-8), null, 2)}</pre>
        </div>
      ) : (
        <p>No village loaded.</p>
      )}
    </main>
  );
}
