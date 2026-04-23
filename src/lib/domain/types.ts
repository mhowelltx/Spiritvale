export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Sex = 'male' | 'female';
export type LifeStage = 'child' | 'adult' | 'elder';
export type Role = 'hunter' | 'gatherer' | 'healer' | 'elder' | 'child';
export type KinshipKind =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'pair_bonded_partner'
  | 'former_partner';
export type FamineSeverity = 'mild' | 'severe';

export interface VillagerNeeds {
  hunger: number;    // 0 = satisfied, 1 = starving
  safety: number;    // 0 = unsafe, 1 = safe
  belonging: number; // 0 = isolated, 1 = connected
  status: number;    // 0 = low, 1 = high
}

export interface VillagerEmotions {
  fear: number;   // 0–1
  grief: number;  // 0–1
  hope: number;   // 0–1
  anger: number;  // 0–1
}

export interface CreateGameInput {
  seed?: string;
  name?: string;
  startingPopulation?: number;
  startingFood?: number;
}

export interface HouseholdSummary {
  id: string;
  name: string;
  memberIds: string[];
}

export interface VillagerView {
  id: string;
  name: string;
  sex: Sex;
  ageInDays: number;
  lifeStage: LifeStage;
  role: Role;
  traits: string[];
  householdId: string | null;
  householdName: string | null;
  needs: VillagerNeeds;
  emotions: VillagerEmotions;
}

export interface KinshipLinkView {
  id: string;
  toVillagerId: string;
  toVillagerName: string;
  kind: KinshipKind;
  certainty: number;
}

export interface RelationshipEdgeView {
  id: string;
  toVillagerId: string;
  toVillagerName: string;
  type: string;
  strength: number;
  trust: number;
}

export interface VillagerMotive {
  type: string;   // e.g. 'survival', 'status', 'belonging', 'kin_protection', 'romance', 'tradition', 'reform', 'autonomy'
  label: string;  // human-readable description
  urgency: number; // 0–1
}

export interface CultureState {
  sharingNorm: number;
  punishmentSeverity: number;
  outsiderTolerance: number;
  prestigeByAge: number;
  prestigeBySkill: number;
  ritualIntensity: number;
  spiritualFear: number;
  kinLoyaltyNorm: number;
}

export interface VillagerDetailView extends VillagerView {
  kinship: KinshipLinkView[];
  relationships: RelationshipEdgeView[];
  motives: VillagerMotive[];
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
  culture: CultureState | null;
  households: HouseholdSummary[];
  villagers: VillagerView[];
  events: Array<{
    id: string;
    day: number;
    type: string;
    title: string;
    facts: Record<string, unknown>;
  }>;
}

export type SpiritActionInput =
  | { type: 'cause_famine'; severity: FamineSeverity }
  | { type: 'send_dream'; targetVillagerId: string; intent: 'hope' | 'warning' | 'revelation' | 'fear' };

export interface SpiritActionResult {
  success: boolean;
  eventId: string;
  foodAfter: number;
  affectedVillagerCount: number;
}
