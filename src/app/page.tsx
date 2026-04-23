'use client';

import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types (client-safe duplicates of server types)
// ---------------------------------------------------------------------------

type VillagerNeeds = { hunger: number; safety: number; belonging: number; status: number };
type VillagerEmotions = { fear: number; grief: number; hope: number; anger: number };

type VillagerPayload = {
  id: string;
  name: string;
  sex: string;
  ageInDays: number;
  lifeStage: string;
  role: string;
  traits: string[];
  householdId: string | null;
  householdName: string | null;
  needs: VillagerNeeds;
  emotions: VillagerEmotions;
};

type VillagerMotive = { type: string; label: string; urgency: number };

type VillagerDetailPayload = VillagerPayload & {
  kinship: Array<{ id: string; toVillagerId: string; toVillagerName: string; kind: string; certainty: number }>;
  relationships: Array<{ id: string; toVillagerId: string; toVillagerName: string; type: string; strength: number; trust: number }>;
  motives: VillagerMotive[];
};

type HouseholdSummary = { id: string; name: string; memberIds: string[] };

type CultureState = {
  sharingNorm: number;
  punishmentSeverity: number;
  outsiderTolerance: number;
  prestigeByAge: number;
  prestigeBySkill: number;
  ritualIntensity: number;
  spiritualFear: number;
  kinLoyaltyNorm: number;
};

type GamePayload = {
  id: string;
  name: string;
  day: number;
  year: number;
  season: string;
  population: number;
  resources: { food: number; weatherHarsh: number; diseaseRisk: number; blessingDaysRemaining: number };
  culture: CultureState | null;
  households: HouseholdSummary[];
  villagers: VillagerPayload[];
  events: Array<{ id: string; day: number; type: string; title: string; facts: Record<string, unknown> }>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ageDisplay(ageInDays: number): string {
  return `${Math.floor(ageInDays / 360)}y`;
}

const EVENT_ICONS: Record<string, string> = {
  world_created: '★',
  daily_tick: '·',
  villager_death: '†',
  villager_birth: '◎',
  resource_shortage: '⚠',
  spirit_intervention: '✦',
  household_grief: '~',
  season_change: '◑',
  culture_shift: '◈',
  villager_incident: '◆',
  relationship_shift: '↔',
};

function eventIcon(type: string): string {
  return EVENT_ICONS[type] ?? '•';
}

function Bar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-pct">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [game, setGame] = useState<GamePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedVillagerId, setSelectedVillagerId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, VillagerDetailPayload>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  const [spiritAction, setSpiritAction] = useState<'cause_famine' | 'send_dream' | 'bless_harvest'>('cause_famine');
  const [famineSeverity, setFamineSeverity] = useState<'mild' | 'severe'>('mild');
  const [dreamTargetId, setDreamTargetId] = useState<string>('');
  const [dreamIntent, setDreamIntent] = useState<'hope' | 'warning' | 'revelation' | 'fear'>('hope');
  const [spiritResult, setSpiritResult] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 3 | 10>(1);
  const isAutoTicking = useRef(false);

  // Auto-tick effect
  useEffect(() => {
    if (!isPlaying || !game) return;
    const interval = setInterval(async () => {
      if (isAutoTicking.current) return;
      isAutoTicking.current = true;
      try {
        let latest: GamePayload = game;
        for (let i = 0; i < playSpeed; i++) {
          const res = await fetch(`/api/game/${game.id}/tick`, { method: 'POST' });
          if (!res.ok) { setIsPlaying(false); setError('Tick failed during play'); return; }
          latest = await res.json() as GamePayload;
          if (latest.villagers.length === 0) { setIsPlaying(false); break; }
        }
        setGame(latest);
      } catch {
        setIsPlaying(false);
      } finally {
        isAutoTicking.current = false;
      }
    }, 800);
    return () => clearInterval(interval);
  // game.id is stable; re-run when isPlaying, playSpeed, or game.id changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playSpeed, game?.id]);

  // --- API helpers ---

  async function fetchGame(id: string) {
    const res = await fetch(`/api/game/${id}`);
    if (!res.ok) throw new Error('Failed to fetch game state');
    return res.json() as Promise<GamePayload>;
  }

  async function createGame() {
    setLoading(true);
    setError(null);
    setSpiritResult(null);
    setSelectedVillagerId(null);
    setDetailCache({});
    try {
      const res = await fetch('/api/game/new', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Spiritvale' }),
      });
      if (!res.ok) throw new Error('Failed to create game');
      setGame((await res.json()) as GamePayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function tickOnce(): Promise<GamePayload> {
    if (!game) throw new Error('No game loaded');
    const res = await fetch(`/api/game/${game.id}/tick`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to tick game');
    return res.json() as Promise<GamePayload>;
  }

  async function tick() {
    setLoading(true);
    setError(null);
    setSpiritResult(null);
    try {
      setGame(await tickOnce());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function tickMany(n: number) {
    if (!game) return;
    setLoading(true);
    setError(null);
    setSpiritResult(null);
    try {
      let latest: GamePayload = game;
      for (let i = 0; i < n; i++) {
        latest = await tickOnce();
      }
      setGame(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function selectVillager(v: VillagerPayload) {
    if (selectedVillagerId === v.id) {
      setSelectedVillagerId(null);
      return;
    }
    setSelectedVillagerId(v.id);
    if (detailCache[v.id]) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/game/${game!.id}/villagers/${v.id}`);
      if (!res.ok) throw new Error('Failed to load villager detail');
      const detail = (await res.json()) as VillagerDetailPayload;
      setDetailCache((c) => ({ ...c, [v.id]: detail }));
    } catch {
      // silently degrade — base info still shown
    } finally {
      setDetailLoading(false);
    }
  }

  async function blessHarvest() {
    if (!game) return;
    setLoading(true);
    setError(null);
    setSpiritResult(null);
    try {
      const res = await fetch(`/api/game/${game.id}/spirit-action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'bless_harvest' }),
      });
      if (!res.ok) throw new Error('Spirit action failed');
      const updated = await fetchGame(game.id);
      setGame(updated);
      setSpiritResult('Your blessing enriches the soil. Production will be 50% greater for 7 days.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function sendDream() {
    if (!game || !dreamTargetId) return;
    setLoading(true);
    setError(null);
    setSpiritResult(null);
    try {
      const res = await fetch(`/api/game/${game.id}/spirit-action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'send_dream', targetVillagerId: dreamTargetId, intent: dreamIntent }),
      });
      if (!res.ok) throw new Error('Spirit action failed');
      const updated = await fetchGame(game.id);
      setGame(updated);
      const target = game.villagers.find((v) => v.id === dreamTargetId);
      setSpiritResult(`A dream visited ${target?.name ?? 'the villager'}. Their spirit has shifted.`);
      // Invalidate cached detail so next click re-fetches updated emotions
      setDetailCache((c) => { const next = { ...c }; delete next[dreamTargetId]; return next; });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function causeFamine() {
    if (!game) return;
    setLoading(true);
    setError(null);
    setSpiritResult(null);
    try {
      const res = await fetch(`/api/game/${game.id}/spirit-action`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'cause_famine', severity: famineSeverity }),
      });
      if (!res.ok) throw new Error('Spirit action failed');
      const result = (await res.json()) as { foodAfter: number; affectedVillagerCount: number };
      const updated = await fetchGame(game.id);
      setGame(updated);
      setSpiritResult(
        `Famine struck. Food reduced to ${result.foodAfter}. ${result.affectedVillagerCount} villagers gripped by fear.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const selectedDetail = selectedVillagerId ? detailCache[selectedVillagerId] : null;

  return (
    <main>
      <h1>Spiritvale</h1>

      <div className="controls">
        <button onClick={createGame} disabled={loading || isPlaying}>Create village</button>
        <button
          onClick={() => setIsPlaying((p) => !p)}
          disabled={!game}
          className={isPlaying ? 'btn-pause' : 'btn-play'}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <select
          value={playSpeed}
          onChange={(e) => setPlaySpeed(Number(e.target.value) as 1 | 3 | 10)}
          disabled={!game || isPlaying}
          className="speed-select"
        >
          <option value={1}>1×</option>
          <option value={3}>3×</option>
          <option value={10}>10×</option>
        </select>
        <button onClick={tick} disabled={loading || isPlaying || !game}>Tick 1 day</button>
        <button onClick={() => tickMany(7)} disabled={loading || isPlaying || !game}>Tick 7 days</button>
        <button onClick={() => tickMany(30)} disabled={loading || isPlaying || !game}>Tick 30 days</button>
      </div>

      {error ? <p role="alert" className="error">Error: {error}</p> : null}

      {game ? (
        <div className="card">
          <h2>{game.name}</h2>
          <p className="village-meta">
            Day {game.day} · Year {game.year} · {game.season}
            &nbsp;|&nbsp; Population: {game.population}
            &nbsp;|&nbsp; Food: {Math.round(game.resources.food)}
            {(() => {
              const last = game.events.at(-1);
              const prod = last?.type === 'daily_tick' ? (last.facts.dailyProduction as number | undefined) : undefined;
              const cons = last?.type === 'daily_tick' ? (last.facts.dailyConsumption as number | undefined) : undefined;
              if (prod !== undefined && cons !== undefined) {
                return <> · +{Math.round(prod)} −{cons}/day</>;
              }
              return null;
            })()}
            {game.resources.blessingDaysRemaining > 0 ? (
              <span className="blessing-indicator"> · ✦ Blessed: {game.resources.blessingDaysRemaining}d</span>
            ) : null}
            &nbsp;|&nbsp; Households: {game.households.length}
          </p>

          {/* Spirit Action Panel */}
          <section className="spirit-panel">
            <h3>Spirit Actions</h3>
            <div className="spirit-action-tabs">
              <button
                onClick={() => setSpiritAction('cause_famine')}
                className={`tab-btn${spiritAction === 'cause_famine' ? ' active' : ''}`}
                disabled={loading}
              >Cause Famine</button>
              <button
                onClick={() => setSpiritAction('send_dream')}
                className={`tab-btn${spiritAction === 'send_dream' ? ' active' : ''}`}
                disabled={loading}
              >Send Dream</button>
              <button
                onClick={() => setSpiritAction('bless_harvest')}
                className={`tab-btn${spiritAction === 'bless_harvest' ? ' active' : ''}`}
                disabled={loading}
              >Bless Harvest</button>
            </div>
            {spiritAction === 'bless_harvest' ? (
              <div className="spirit-controls">
                <button onClick={blessHarvest} disabled={loading || game.resources.blessingDaysRemaining > 0} className="btn-spirit">
                  ✦ Bless Harvest
                </button>
                {game.resources.blessingDaysRemaining > 0 && (
                  <span className="blessing-active">Blessing active: {game.resources.blessingDaysRemaining} days remaining</span>
                )}
              </div>
            ) : spiritAction === 'cause_famine' ? (
              <div className="spirit-controls">
                <label htmlFor="severity-select">Severity: </label>
                <select
                  id="severity-select"
                  value={famineSeverity}
                  onChange={(e) => setFamineSeverity(e.target.value as 'mild' | 'severe')}
                  disabled={loading}
                >
                  <option value="mild">Mild</option>
                  <option value="severe">Severe</option>
                </select>
                <button onClick={causeFamine} disabled={loading} className="btn-spirit">
                  ✦ Cause Famine
                </button>
              </div>
            ) : (
              <div className="spirit-controls">
                <label htmlFor="dream-target">Villager: </label>
                <select
                  id="dream-target"
                  value={dreamTargetId}
                  onChange={(e) => setDreamTargetId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">— select —</option>
                  {game.villagers.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.lifeStage})</option>
                  ))}
                </select>
                <label htmlFor="dream-intent" style={{ marginLeft: '0.5rem' }}>Intent: </label>
                <select
                  id="dream-intent"
                  value={dreamIntent}
                  onChange={(e) => setDreamIntent(e.target.value as typeof dreamIntent)}
                  disabled={loading}
                >
                  <option value="hope">Hope</option>
                  <option value="warning">Warning</option>
                  <option value="revelation">Revelation</option>
                  <option value="fear">Fear</option>
                </select>
                <button onClick={sendDream} disabled={loading || !dreamTargetId} className="btn-spirit">
                  ✦ Send Dream
                </button>
              </div>
            )}
            {spiritResult ? <p className="spirit-result">{spiritResult}</p> : null}
          </section>

          {/* Culture Panel */}
          {game.culture ? (
            <section className="culture-panel">
              <h3>Village Culture</h3>
              <div className="culture-bars">
                <Bar label="Sharing norm"      value={game.culture.sharingNorm} />
                <Bar label="Kin loyalty"       value={game.culture.kinLoyaltyNorm} />
                <Bar label="Spiritual fear"    value={game.culture.spiritualFear} />
                <Bar label="Ritual intensity"  value={game.culture.ritualIntensity} />
                <Bar label="Outsider tolerance" value={game.culture.outsiderTolerance} />
              </div>
            </section>
          ) : null}

          {/* Villager Table */}
          <h3>Villagers ({game.villagers.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Household</th>
                <th>Sex</th>
                <th>Age</th>
                <th>Stage</th>
                <th>Role</th>
                <th>Traits</th>
              </tr>
            </thead>
            <tbody>
              {game.villagers.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => selectVillager(v)}
                  className={`villager-row${selectedVillagerId === v.id ? ' selected' : ''}`}
                >
                  <td>{v.name}</td>
                  <td>{v.householdName ?? '—'}</td>
                  <td>{v.sex[0]?.toUpperCase()}</td>
                  <td>{ageDisplay(v.ageInDays)}</td>
                  <td>{v.lifeStage}</td>
                  <td>{v.role}</td>
                  <td>{v.traits.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Villager Detail Panel */}
          {selectedVillagerId ? (
            <div className="villager-detail card">
              {detailLoading ? (
                <p>Loading…</p>
              ) : selectedDetail ? (
                <>
                  <h4>{selectedDetail.name} <span className="detail-meta">· {selectedDetail.lifeStage} · {selectedDetail.role} · {selectedDetail.householdName ?? 'no household'}</span></h4>

                  <div className="detail-columns">
                    <div>
                      <p className="detail-section-label">Needs</p>
                      <Bar label="Hunger" value={selectedDetail.needs.hunger} />
                      <Bar label="Safety" value={selectedDetail.needs.safety} />
                      <Bar label="Belonging" value={selectedDetail.needs.belonging} />
                      <Bar label="Status" value={selectedDetail.needs.status} />
                    </div>
                    <div>
                      <p className="detail-section-label">Emotions</p>
                      <Bar label="Fear" value={selectedDetail.emotions.fear} />
                      <Bar label="Grief" value={selectedDetail.emotions.grief} />
                      <Bar label="Hope" value={selectedDetail.emotions.hope} />
                      <Bar label="Anger" value={selectedDetail.emotions.anger} />
                    </div>
                  </div>

                  {selectedDetail.kinship.length > 0 && (
                    <div className="detail-section">
                      <p className="detail-section-label">Kinship</p>
                      <ul className="kin-list">
                        {selectedDetail.kinship.map((k) => (
                          <li key={k.id}>{k.toVillagerName} <span className="kin-kind">({k.kind.replace(/_/g, ' ')})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedDetail.relationships.length > 0 && (
                    <div className="detail-section">
                      <p className="detail-section-label">Relationships</p>
                      <ul className="rel-list">
                        {selectedDetail.relationships.map((r) => (
                          <li key={r.id}>
                            {r.toVillagerName} · <span className="rel-type">{r.type}</span> · strength {Math.round(r.strength * 100)}% · trust {Math.round(r.trust * 100)}%
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedDetail.motives && selectedDetail.motives.length > 0 && (
                    <div className="detail-section">
                      <p className="detail-section-label">Motives</p>
                      <ul className="motive-list">
                        {selectedDetail.motives.map((m, i) => (
                          <li key={i} className="motive-item">
                            <span className="motive-label">{m.label}</span>
                            <span className={`motive-urgency urgency-${m.urgency >= 0.7 ? 'high' : m.urgency >= 0.4 ? 'mid' : 'low'}`}>
                              {m.urgency >= 0.7 ? 'urgent' : m.urgency >= 0.4 ? 'present' : 'faint'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                // Fallback: show base info without kinship/relationships
                (() => {
                  const v = game.villagers.find((vv) => vv.id === selectedVillagerId)!;
                  return (
                    <>
                      <h4>{v.name}</h4>
                      <div className="detail-columns">
                        <div>
                          <p className="detail-section-label">Needs</p>
                          <Bar label="Hunger" value={v.needs.hunger} />
                          <Bar label="Safety" value={v.needs.safety} />
                          <Bar label="Belonging" value={v.needs.belonging} />
                          <Bar label="Status" value={v.needs.status} />
                        </div>
                        <div>
                          <p className="detail-section-label">Emotions</p>
                          <Bar label="Fear" value={v.emotions.fear} />
                          <Bar label="Grief" value={v.emotions.grief} />
                          <Bar label="Hope" value={v.emotions.hope} />
                          <Bar label="Anger" value={v.emotions.anger} />
                        </div>
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          ) : null}

          {/* Event List */}
          <h3>Recent events</h3>
          <ul className="event-list">
            {game.events.slice(-12).map((evt) => (
              <li key={evt.id} className={`event event-${evt.type}`}>
                <span className="event-day">Day {evt.day}</span>
                <span className="event-icon">{eventIcon(evt.type)}</span>
                <span className="event-title">{evt.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No village loaded.</p>
      )}
    </main>
  );
}
