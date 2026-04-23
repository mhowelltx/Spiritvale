import { randomUUID } from 'crypto';
import { prisma } from '@/lib/server/prisma';
import { createSeededRng } from '@/lib/rng/seededRng';
import { generateName } from '@/lib/rng/nameGen';
import type {
  CreateGameInput,
  LifeStage,
  Role,
  Season,
  Sex,
  VillagerNeeds,
  VillagerEmotions,
  VillagerMotive,
  VillageView,
  HouseholdSummary,
} from '@/lib/domain/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const DAYS_PER_YEAR = 360;
const DAYS_PER_SEASON = 90;

const TRAITS = ['brave', 'cautious', 'generous', 'stubborn', 'curious', 'loyal', 'proud', 'gentle', 'fierce', 'wise'];

const HOUSEHOLD_NAMES = [
  'Hearth of the Stone', 'Clan of the Oak', 'House of the River',
  'Kin of the Wolf', 'Hearth of the Ash', 'Clan of the Raven',
  'House of the Thorn', 'Kin of the Bear', 'Hearth of the Flint',
  'Clan of the Marsh',
];

// ---------------------------------------------------------------------------
// Motive generation
// ---------------------------------------------------------------------------

// Map traits to motive archetypes
const TRAIT_TO_MOTIVE: Record<string, { type: string; label: string }> = {
  brave:    { type: 'autonomy',        label: 'Act on own judgment, prove worth' },
  fierce:   { type: 'status',          label: 'Rise above others in the group' },
  proud:    { type: 'status',          label: 'Earn recognition from the village' },
  cautious: { type: 'survival',        label: 'Keep the family fed through the season' },
  stubborn: { type: 'tradition',       label: 'Preserve the ways of the ancestors' },
  curious:  { type: 'reform',          label: 'Find a better way of doing things' },
  loyal:    { type: 'kin_protection',  label: 'Keep family safe above all' },
  gentle:   { type: 'belonging',       label: 'Strengthen bonds with kin and friends' },
  generous: { type: 'belonging',       label: 'Be someone others can rely on' },
  wise:     { type: 'tradition',       label: 'Pass knowledge to the next generation' },
};

export function generateMotives(
  lifeStage: LifeStage,
  role: Role,
  traits: string[],
  partnerName: string | null,
  rng: () => number
): VillagerMotive[] {
  if (lifeStage === 'child') return [];

  const motives: VillagerMotive[] = [];

  if (lifeStage === 'elder') {
    const m = rng() < 0.6
      ? { type: 'tradition', label: 'Preserve the old ways for those who come after' }
      : { type: 'belonging', label: 'Keep the family close before the end' };
    motives.push({ ...m, urgency: clamp(0.6 + rng() * 0.2, 0, 1) });
    return motives;
  }

  // Adults: trait-driven primary motive
  for (const trait of traits) {
    const def = TRAIT_TO_MOTIVE[trait];
    if (def) {
      motives.push({ type: def.type, label: def.label, urgency: clamp(0.5 + rng() * 0.4, 0, 1) });
      break;
    }
  }

  // Pair bond motive
  if (partnerName && rng() < 0.7) {
    motives.push({
      type: 'romance',
      label: `Deepen the bond with ${partnerName}`,
      urgency: clamp(0.4 + rng() * 0.3, 0, 1),
    });
  }

  // Survival motive if no primary yet or hunter/gatherer
  if (motives.length === 0 || (role === 'hunter' || role === 'gatherer')) {
    if (!motives.some((m) => m.type === 'survival')) {
      motives.push({ type: 'survival', label: 'Keep the family fed through the season', urgency: clamp(0.5 + rng() * 0.3, 0, 1) });
    }
  }

  return motives.slice(0, 2);
}

// ---------------------------------------------------------------------------
// Pure helpers (shared with gameService and tests)
// ---------------------------------------------------------------------------

export function resolveSeason(day: number): Season {
  const idx = Math.floor(day / DAYS_PER_SEASON) % SEASONS.length;
  return SEASONS[idx] ?? 'spring';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolveLifeStage(ageInDays: number): LifeStage {
  const years = ageInDays / DAYS_PER_YEAR;
  if (years < 15) return 'child';
  if (years < 50) return 'adult';
  return 'elder';
}

function resolveRole(lifeStage: LifeStage, sex: Sex, rng: () => number): Role {
  if (lifeStage === 'child') return 'child';
  if (lifeStage === 'elder') return 'elder';
  if (rng() < 0.1) return 'healer';
  return sex === 'male' ? (rng() < 0.75 ? 'hunter' : 'gatherer') : (rng() < 0.65 ? 'gatherer' : 'hunter');
}

function pickTraits(rng: () => number): string[] {
  const count = 1 + Math.floor(rng() * 2);
  const shuffled = [...TRAITS].sort(() => rng() - 0.5);
  return shuffled.slice(0, count);
}

export function buildVillagerData(rng: () => number) {
  const sex: Sex = rng() < 0.5 ? 'male' : 'female';

  let ageInDays: number;
  const roll = rng();
  if (roll < 0.4) {
    ageInDays = Math.floor(rng() * 14 * DAYS_PER_YEAR);
  } else if (roll < 0.85) {
    ageInDays = Math.floor((15 + rng() * 34) * DAYS_PER_YEAR);
  } else {
    ageInDays = Math.floor((50 + rng() * 20) * DAYS_PER_YEAR);
  }

  const lifeStage = resolveLifeStage(ageInDays);
  const role = resolveRole(lifeStage, sex, rng);
  const name = generateName(sex, rng);
  const traits = pickTraits(rng);

  return { name, sex, ageInDays, lifeStage, role, traits };
}

// ---------------------------------------------------------------------------
// Pure village structure computation (no DB — fully testable)
// ---------------------------------------------------------------------------

export interface ComputedVillager {
  tempId: string; // local reference before DB insert
  name: string;
  sex: Sex;
  ageInDays: number;
  lifeStage: LifeStage;
  role: Role;
  traits: string[];
  needs: VillagerNeeds;
  emotions: VillagerEmotions;
  motives: VillagerMotive[];
  householdIndex: number; // index into computed households array
}

export interface ComputedHousehold {
  tempId: string;
  name: string;
}

export interface ComputedKinship {
  fromTempId: string;
  toTempId: string;
  kind: string;
  certainty: number;
}

export interface ComputedRelationship {
  fromTempId: string;
  toTempId: string;
  type: string;
  strength: number;
  trust: number;
}

export interface ComputedVillageStructure {
  households: ComputedHousehold[];
  villagers: ComputedVillager[];
  kinshipLinks: ComputedKinship[];
  relationships: ComputedRelationship[];
}

export function computeVillageStructure(seed: string, population: number): ComputedVillageStructure {
  const rng = createSeededRng(seed);

  // --- Generate raw villager data ---
  const rawVillagers = Array.from({ length: population }, (_, i) => ({
    tempId: `v${i}`,
    ...buildVillagerData(rng),
  }));

  // --- Generate households ---
  const householdCount = 3 + Math.floor(rng() * 3); // 3–5
  const shuffledNames = [...HOUSEHOLD_NAMES].sort(() => rng() - 0.5);
  const households: ComputedHousehold[] = Array.from({ length: householdCount }, (_, i) => ({
    tempId: `h${i}`,
    name: shuffledNames[i] ?? `Hearth ${i + 1}`,
  }));

  // --- Bucket villagers by life stage ---
  const adults = rawVillagers.filter((v) => v.lifeStage === 'adult');
  const children = rawVillagers.filter((v) => v.lifeStage === 'child');
  const elders = rawVillagers.filter((v) => v.lifeStage === 'elder');

  const adultMales = adults.filter((v) => v.sex === 'male');
  const adultFemales = adults.filter((v) => v.sex === 'female');

  // Map tempId → household index
  const householdAssignment = new Map<string, number>();

  // --- Pair adult males and females, assign to households ---
  const pairCount = Math.min(adultMales.length, adultFemales.length);
  const pairs: Array<{ male: (typeof rawVillagers)[0]; female: (typeof rawVillagers)[0] }> = [];
  for (let i = 0; i < pairCount; i++) {
    pairs.push({ male: adultMales[i]!, female: adultFemales[i]! });
    const hIdx = i % householdCount;
    householdAssignment.set(adultMales[i]!.tempId, hIdx);
    householdAssignment.set(adultFemales[i]!.tempId, hIdx);
  }

  // Assign remaining unpaired adults round-robin
  const unpairedAdults = [
    ...adultMales.slice(pairCount),
    ...adultFemales.slice(pairCount),
  ];
  unpairedAdults.forEach((v, i) => {
    householdAssignment.set(v.tempId, i % householdCount);
  });

  // --- Assign children to households of paired adults ---
  // Track which household index has how many adults
  const householdAdultPairs = new Array<string[]>(householdCount).fill(null as unknown as string[]).map(() => [] as string[]);
  pairs.forEach(({ male, female }, i) => {
    const hIdx = i % householdCount;
    householdAdultPairs[hIdx]!.push(male.tempId, female.tempId);
  });

  children.forEach((child, i) => {
    householdAssignment.set(child.tempId, i % householdCount);
  });

  // --- Assign elders to smallest household ---
  elders.forEach((elder) => {
    const counts = Array.from({ length: householdCount }, (_, idx) =>
      [...householdAssignment.values()].filter((h) => h === idx).length
    );
    const smallest = counts.indexOf(Math.min(...counts));
    householdAssignment.set(elder.tempId, smallest);
  });

  // Build partner lookup: tempId → partner name (for motive generation)
  const partnerNameByTempId = new Map<string, string>();
  for (let i = 0; i < pairCount; i++) {
    partnerNameByTempId.set(adultMales[i]!.tempId, adultFemales[i]!.name);
    partnerNameByTempId.set(adultFemales[i]!.tempId, adultMales[i]!.name);
  }

  // --- Attach household index to each villager, compute needs/emotions/motives ---
  const villagers: ComputedVillager[] = rawVillagers.map((v) => {
    const hIdx = householdAssignment.get(v.tempId) ?? 0;

    const needs: VillagerNeeds = {
      hunger: 0,
      safety: v.lifeStage === 'elder' ? clamp(0.55 + rng() * 0.2, 0, 1) : clamp(0.65 + rng() * 0.2, 0, 1),
      belonging: clamp(0.4 + rng() * 0.3, 0, 1),
      status: clamp(0.3 + rng() * 0.4, 0, 1),
    };

    const emotions: VillagerEmotions = {
      fear: clamp(0.05 + rng() * 0.1, 0, 1),
      grief: 0,
      hope: v.lifeStage === 'child' ? clamp(0.55 + rng() * 0.2, 0, 1) : clamp(0.4 + rng() * 0.2, 0, 1),
      anger: clamp(rng() * 0.1, 0, 1),
    };

    const motives = generateMotives(
      v.lifeStage,
      v.role,
      v.traits,
      partnerNameByTempId.get(v.tempId) ?? null,
      rng
    );

    return { ...v, householdIndex: hIdx, needs, emotions, motives };
  });

  // --- Generate kinship links ---
  const kinshipLinks: ComputedKinship[] = [];

  // Pair bonds (both directions)
  pairs.forEach(({ male, female }) => {
    kinshipLinks.push({ fromTempId: male.tempId, toTempId: female.tempId, kind: 'pair_bonded_partner', certainty: 1.0 });
    kinshipLinks.push({ fromTempId: female.tempId, toTempId: male.tempId, kind: 'pair_bonded_partner', certainty: 1.0 });
  });

  // Parent-child links: children in a household whose household index has a pair
  const pairByHousehold = new Map<number, { male: (typeof rawVillagers)[0]; female: (typeof rawVillagers)[0] }>();
  pairs.forEach((pair, i) => {
    pairByHousehold.set(i % householdCount, pair);
  });

  // Group children by household
  const childrenByHousehold = new Map<number, typeof villagers[0][]>();
  villagers.filter((v) => v.lifeStage === 'child').forEach((child) => {
    const hIdx = child.householdIndex;
    if (!childrenByHousehold.has(hIdx)) childrenByHousehold.set(hIdx, []);
    childrenByHousehold.get(hIdx)!.push(child);
  });

  childrenByHousehold.forEach((kids, hIdx) => {
    const pair = pairByHousehold.get(hIdx);
    if (!pair) return;

    kids.forEach((child) => {
      // parent → child
      kinshipLinks.push({ fromTempId: pair.male.tempId, toTempId: child.tempId, kind: 'child', certainty: 1.0 });
      kinshipLinks.push({ fromTempId: pair.female.tempId, toTempId: child.tempId, kind: 'child', certainty: 1.0 });
      // child → parent
      kinshipLinks.push({ fromTempId: child.tempId, toTempId: pair.male.tempId, kind: 'parent', certainty: 1.0 });
      kinshipLinks.push({ fromTempId: child.tempId, toTempId: pair.female.tempId, kind: 'parent', certainty: 1.0 });
    });

    // Sibling links between children in the same household
    for (let a = 0; a < kids.length; a++) {
      for (let b = a + 1; b < kids.length; b++) {
        kinshipLinks.push({ fromTempId: kids[a]!.tempId, toTempId: kids[b]!.tempId, kind: 'sibling', certainty: 1.0 });
        kinshipLinks.push({ fromTempId: kids[b]!.tempId, toTempId: kids[a]!.tempId, kind: 'sibling', certainty: 1.0 });
      }
    }
  });

  // --- Generate relationship edges ---
  const relationships: ComputedRelationship[] = [];

  const addEdge = (from: string, to: string, type: string, strength: number, trust: number) => {
    relationships.push({ fromTempId: from, toTempId: to, type, strength, trust });
    relationships.push({ fromTempId: to, toTempId: from, type, strength, trust });
  };

  // Pair bonds
  pairs.forEach(({ male, female }) => {
    addEdge(male.tempId, female.tempId, 'pair_bond', clamp(0.7 + rng() * 0.3, 0, 1), clamp(0.7 + rng() * 0.2, 0, 1));
  });

  // Parent-child kin
  childrenByHousehold.forEach((kids, hIdx) => {
    const pair = pairByHousehold.get(hIdx);
    if (!pair) return;
    kids.forEach((child) => {
      addEdge(pair.male.tempId, child.tempId, 'kin', 0.8, 0.85);
      addEdge(pair.female.tempId, child.tempId, 'kin', 0.8, 0.85);
    });
    // Sibling kin
    for (let a = 0; a < kids.length; a++) {
      for (let b = a + 1; b < kids.length; b++) {
        addEdge(kids[a]!.tempId, kids[b]!.tempId, 'kin', clamp(0.6 + rng() * 0.3, 0, 1), clamp(0.65 + rng() * 0.2, 0, 1));
      }
    }
  });

  // Household non-kin adults (friendship seed)
  for (let hIdx = 0; hIdx < householdCount; hIdx++) {
    const houseAdults = villagers.filter((v) => v.householdIndex === hIdx && v.lifeStage === 'adult');
    for (let a = 0; a < houseAdults.length; a++) {
      for (let b = a + 1; b < houseAdults.length; b++) {
        const aId = houseAdults[a]!.tempId;
        const bId = houseAdults[b]!.tempId;
        // Skip if already covered by pair_bond or kin
        const alreadyLinked = relationships.some(
          (r) => (r.fromTempId === aId && r.toTempId === bId) || (r.fromTempId === bId && r.toTempId === aId)
        );
        if (!alreadyLinked) {
          addEdge(aId, bId, 'friendship', clamp(0.4 + rng() * 0.3, 0, 1), clamp(0.4 + rng() * 0.3, 0, 1));
        }
      }
    }
  }

  // Deduplicate relationships (addEdge adds both directions — filter to unique pairs)
  const seen = new Set<string>();
  const dedupedRelationships: ComputedRelationship[] = [];
  relationships.forEach((r) => {
    const key = `${r.fromTempId}:${r.toTempId}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedRelationships.push(r);
    }
  });

  return { households, villagers, kinshipLinks, relationships: dedupedRelationships };
}

// ---------------------------------------------------------------------------
// Effectful village generation (calls compute, then persists to DB)
// ---------------------------------------------------------------------------

export async function generateVillage(input: CreateGameInput): Promise<VillageView> {
  const seed = input.seed ?? randomUUID();
  const rng = createSeededRng(seed);

  const population = input.startingPopulation ?? 16;
  const startingFood = input.startingFood ?? Math.round(110 + rng() * 40);
  const weatherHarsh = Number((0.2 + rng() * 0.5).toFixed(3));
  const diseaseRisk = Number((0.1 + rng() * 0.4).toFixed(3));

  const structure = computeVillageStructure(seed, population);

  // Use interactive transaction so we can capture IDs before cross-referencing
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create village core
    const village = await tx.village.create({
      data: {
        seed,
        name: input.name ?? 'Spiritvale',
        population,
        resources: {
          create: { food: startingFood, weatherHarsh, diseaseRisk },
        },
        events: {
          create: {
            day: 0,
            type: 'world_created',
            title: 'A new village takes root.',
            facts: { seed, population, startingFood },
          },
        },
      },
      include: { resources: true, events: true },
    });

    // 2. Create households, capture real IDs
    const householdIdMap = new Map<string, string>(); // tempId → real DB id
    for (const h of structure.households) {
      const row = await tx.household.create({
        data: { villageId: village.id, name: h.name },
      });
      householdIdMap.set(h.tempId, row.id);
    }

    // 3. Create culture state
    await tx.cultureState.create({
      data: {
        villageId: village.id,
        sharingNorm:        clamp(0.5 + rng() * 0.3, 0, 1),
        punishmentSeverity: clamp(0.3 + rng() * 0.3, 0, 1),
        outsiderTolerance:  clamp(0.2 + rng() * 0.3, 0, 1),
        prestigeByAge:      clamp(0.6 + rng() * 0.2, 0, 1),
        prestigeBySkill:    clamp(0.4 + rng() * 0.3, 0, 1),
        ritualIntensity:    clamp(0.2 + rng() * 0.4, 0, 1),
        spiritualFear:      clamp(0.3 + rng() * 0.4, 0, 1),
        kinLoyaltyNorm:     clamp(0.7 + rng() * 0.2, 0, 1),
      },
    });

    // 4. Create villagers with household references, capture real IDs
    const villagerIdMap = new Map<string, string>(); // tempId → real DB id
    for (const v of structure.villagers) {
      const row = await tx.villager.create({
        data: {
          villageId: village.id,
          householdId: householdIdMap.get(`h${v.householdIndex}`) ?? null,
          name: v.name,
          sex: v.sex,
          ageInDays: v.ageInDays,
          lifeStage: v.lifeStage,
          role: v.role,
          traits: v.traits,
          needs: v.needs as object,
          emotions: v.emotions as object,
          motives: v.motives as object[],
        },
      });
      villagerIdMap.set(v.tempId, row.id);
    }

    // 4. Create kinship links
    for (const k of structure.kinshipLinks) {
      const fromId = villagerIdMap.get(k.fromTempId);
      const toId = villagerIdMap.get(k.toTempId);
      if (fromId && toId) {
        await tx.kinshipLink.create({
          data: { villageId: village.id, fromVillagerId: fromId, toVillagerId: toId, kind: k.kind, certainty: k.certainty },
        });
      }
    }

    // 5. Create relationship edges
    for (const r of structure.relationships) {
      const fromId = villagerIdMap.get(r.fromTempId);
      const toId = villagerIdMap.get(r.toTempId);
      if (fromId && toId) {
        await tx.relationshipEdge.create({
          data: { villageId: village.id, fromVillagerId: fromId, toVillagerId: toId, type: r.type, strength: r.strength, trust: r.trust },
        });
      }
    }

    return village;
  });

  // Load the full view via gameService helper
  const { getGame } = await import('@/lib/server/gameService');
  return (await getGame(result.id))!;
}

// ---------------------------------------------------------------------------
// Shared mapper used by gameService and tickEngine
// ---------------------------------------------------------------------------

export function mapVillager(v: {
  id: string;
  name: string;
  sex: string;
  ageInDays: number;
  lifeStage: string;
  role: string;
  traits: unknown;
  householdId: string | null;
  needs: unknown;
  emotions: unknown;
  household?: { name: string } | null;
}) {
  const defaultNeeds: VillagerNeeds = { hunger: 0, safety: 0.7, belonging: 0.5, status: 0.5 };
  const defaultEmotions: VillagerEmotions = { fear: 0.1, grief: 0, hope: 0.5, anger: 0 };

  return {
    id: v.id,
    name: v.name,
    sex: v.sex as Sex,
    ageInDays: v.ageInDays,
    lifeStage: v.lifeStage as LifeStage,
    role: v.role as Role,
    traits: v.traits as string[],
    householdId: v.householdId,
    householdName: v.household?.name ?? null,
    needs: (v.needs as VillagerNeeds) ?? defaultNeeds,
    emotions: (v.emotions as VillagerEmotions) ?? defaultEmotions,
  };
}
