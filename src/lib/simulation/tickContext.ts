import type { Season, VillagerNeeds, VillagerEmotions } from '@/lib/domain/types';

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
  // villagers (mutable during tick)
  villagers: MutableVillager[];
  // kinship: villagerId → ids of household members (from preloaded kinshipLinks)
  householdMembersById: Map<string, string[]>;
  // outcomes
  deadIds: string[];
  newborns: NewbornData[];
  updatedVillagers: Array<{ id: string; ageInDays: number; lifeStage: string; needs: VillagerNeeds; emotions: VillagerEmotions }>;
  emittedEvents: PendingEvent[];
}
