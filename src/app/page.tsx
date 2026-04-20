'use client';

import { useState } from 'react';

type VillagerPayload = {
  id: string;
  name: string;
  sex: string;
  ageInDays: number;
  lifeStage: string;
  role: string;
  traits: string[];
};

type GamePayload = {
  id: string;
  name: string;
  day: number;
  year: number;
  season: string;
  population: number;
  resources: { food: number; weatherHarsh: number; diseaseRisk: number };
  villagers: VillagerPayload[];
  events: Array<{ id: string; day: number; type: string; title: string; facts: Record<string, unknown> }>;
};

function ageDisplay(ageInDays: number): string {
  const years = Math.floor(ageInDays / 360);
  return `${years}y`;
}

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
      if (!response.ok) throw new Error('Failed to create game');
      setGame((await response.json()) as GamePayload);
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
      const response = await fetch(`/api/game/${game.id}/tick`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to tick game');
      setGame((await response.json()) as GamePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Spiritvale</h1>

      <button onClick={createGame} disabled={loading}>Create village</button>
      <button onClick={tick} disabled={loading || !game}>Tick one day</button>

      {error ? <p role="alert">Error: {error}</p> : null}

      {game ? (
        <div className="card">
          <h2>{game.name}</h2>
          <p>Day {game.day} · Year {game.year} · {game.season}</p>
          <p>Population: {game.population} &nbsp;|&nbsp; Food: {Math.round(game.resources.food)}</p>

          <h3>Villagers ({game.villagers.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Sex</th>
                <th>Age</th>
                <th>Stage</th>
                <th>Role</th>
                <th>Traits</th>
              </tr>
            </thead>
            <tbody>
              {game.villagers.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td>{v.sex[0]?.toUpperCase()}</td>
                  <td>{ageDisplay(v.ageInDays)}</td>
                  <td>{v.lifeStage}</td>
                  <td>{v.role}</td>
                  <td>{v.traits.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Recent events</h3>
          <pre>{JSON.stringify(game.events.slice(-8), null, 2)}</pre>
        </div>
      ) : (
        <p>No village loaded.</p>
      )}
    </main>
  );
}
