import type { Season, VillagerNeeds, VillagerEmotions, CultureState, VillagerMotive } from '@/lib/domain/types';

export interface MutableVillager {
  id: string;
  name: string;
  sex: string;
  ageInDays: number;
  lifeStage: string;
  role: string;
  traits: string[];
  householdId: string | null;
  needs: VillagerNeeds;
  emotions: VillagerEmotions;
  motives: VillagerMotive[];
}

export interface PendingEvent {
  villageId: string;
  day: number;
  type: string;
  title: string;
  facts: object;
}

export interface NewbornData {
  name: string;
  sex: string;
  ageInDays: number;
  lifeStage: string;
  role: string;
  traits: string[];
  householdId: string | null;
  needs: VillagerNeeds;
  emotions: VillagerEmotions;
}

export interface MutableRelationshipEdge {
  id: string;
  fromVillagerId: string;
  toVillagerId: string;
  type: string;
  strength: number;
  trust: number;
  lastInteractionDay: number;
}

export interface TickContext {
  villageId: string;
  seed: string;
  rng: () => number;
  // calendar
  prevDay: number;
  day: number;
  season: Season;
  year: number;
  // resources
  foodBefore: number;
  foodAfter: number;
  dailyConsumption: number;
  starving: boolean;
  blessingDaysRemaining: number;
  weatherHarsh: number;
  diseaseRisk: number;
  stormDaysRemaining: number;
  healthBlessingDaysRemaining: number;
  // villagers (mutable during tick)
  villagers: MutableVillager[];
  // kinship: villagerId → ids of household members (from preloaded kinshipLinks)
  householdMembersById: Map<string, string[]>;
  // relationship edges (mutable during social step)
  relationshipEdges: MutableRelationshipEdge[];
  // culture (mutable during culture step)
  cultureState: CultureState | null;
  // outcomes
  deadIds: string[];
  newborns: NewbornData[];
  updatedVillagers: Array<{ id: string; ageInDays: number; lifeStage: string; needs: VillagerNeeds; emotions: VillagerEmotions }>;
  updatedRelationships: Array<{ id: string; strength: number; trust: number; lastInteractionDay: number }>;
  updatedCulture: CultureState | null;
  emittedEvents: PendingEvent[];
}
