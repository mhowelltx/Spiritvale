export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface CreateGameInput {
  seed?: string;
  name?: string;
  startingPopulation?: number;
  startingFood?: number;
}

export interface VillageView {
  id: string;
  seed: string;
  name: string;
  day: number;
  year: number;
  season: Season;
  population: number;
  resources: {
    food: number;
    weatherHarsh: number;
    diseaseRisk: number;
  };
  events: Array<{
    id: string;
    day: number;
    type: string;
    title: string;
    facts: Record<string, unknown>;
  }>;
}
