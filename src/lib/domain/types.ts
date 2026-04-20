export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Sex = 'male' | 'female';
export type LifeStage = 'child' | 'adult' | 'elder';
export type Role = 'hunter' | 'gatherer' | 'healer' | 'elder' | 'child';

export interface CreateGameInput {
  seed?: string;
  name?: string;
  startingPopulation?: number;
  startingFood?: number;
}

export interface VillagerView {
  id: string;
  name: string;
  sex: Sex;
  ageInDays: number;
  lifeStage: LifeStage;
  role: Role;
  traits: string[];
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
  villagers: VillagerView[];
  events: Array<{
    id: string;
    day: number;
    type: string;
    title: string;
    facts: Record<string, unknown>;
  }>;
}
