# Spiritvale — Technical Implementation Pack

## Purpose
This document is the implementation handoff for Claude Code. It defines the data model, Prisma schema direction, simulation loop, module boundaries, API surface, AI generation contracts, testing strategy, and milestone-level build prompt.

---

# 1. Technical Architecture

## Recommended Stack
- **Frontend:** Next.js / React
- **Backend:** Next.js App Router server routes or server actions
- **Language:** TypeScript throughout
- **Database:** Postgres
- **ORM:** Prisma
- **Validation:** Zod
- **Simulation Engine:** server-side TypeScript domain engine
- **AI Layer:** provider-abstracted LLM service for text rendering only
- **Jobs:** queue / cron-compatible background job system for AI rendering

## Core Architectural Principle
Use **server-authoritative simulation** with **projection/read-model builders** for UI.

Do not make the client authoritative. Do not let AI decide simulation outcomes.

---

# 2. Canonical Domain Model

## ID / Scalar Rules
- use UUID strings for IDs
- use normalized floats `0.0–1.0` for most trait and state values
- use signed ranges `-1.0–1.0` for relationship valence where needed
- use integer day counters starting from day 0 of the save

## Core Entities
- Village
- WorldTile
- Household
- Villager
- KinshipLink
- RelationshipEdge
- Motive
- Belief
- Memory
- CultureState
- ReligionState
- ResourceState
- TechnologyState
- EventRecord
- SpiritAction
- Rumor
- Faction
- FactionMembership
- AiRenderJob
- SaveSnapshot

---

# 3. TypeScript Domain Schema

## Enums
```ts
export type Sex = "female" | "male";

export type LifeStage =
  | "infant"
  | "child"
  | "adolescent"
  | "young_adult"
  | "adult"
  | "elder";

export type VillagerRole =
  | "leader"
  | "hunter"
  | "gatherer"
  | "healer"
  | "ritual_specialist"
  | "toolmaker"
  | "caretaker"
  | "generalist";

export type MotiveType =
  | "survival"
  | "kin_protection"
  | "status"
  | "romance"
  | "revenge"
  | "belonging"
  | "autonomy"
  | "tradition"
  | "reform"
  | "secrecy"
  | "spiritual_meaning"
  | "resource_security";

export type RelationshipType =
  | "kin"
  | "friendship"
  | "attraction"
  | "pair_bond"
  | "rivalry"
  | "resentment"
  | "patronage"
  | "mentorship"
  | "dependence"
  | "fear"
  | "admiration";

export type BeliefDomain =
  | "person"
  | "group"
  | "spirit"
  | "norm"
  | "event_cause"
  | "ritual"
  | "leadership";

export type MemoryValence = "positive" | "negative" | "ambiguous";

export type FactionType =
  | "kin_bloc"
  | "ritual_bloc"
  | "prestige_bloc"
  | "resource_bloc"
  | "outsider_bloc"
  | "reform_bloc";

export type EventType =
  | "social_conflict"
  | "illness"
  | "death"
  | "birth"
  | "pair_bond"
  | "betrayal"
  | "ritual"
  | "resource_shortage"
  | "storm"
  | "predator_attack"
  | "leadership_shift"
  | "rumor_spread"
  | "spirit_intervention"
  | "discovery"
  | "outsider_arrival";

export type SpiritActionType =
  | "plant_idea"
  | "send_dream"
  | "intensify_emotion"
  | "bless_health"
  | "bless_fertility"
  | "protect_from_death"
  | "resurrect"
  | "reveal_secret"
  | "conceal_truth"
  | "cause_storm"
  | "cause_famine"
  | "cause_illness"
  | "arrange_encounter"
  | "mark_sacred_site";
```

## Core Interfaces
```ts
export interface Village {
  id: string;
  name: string;
  seed: string;
  day: number;
  year: number;
  season: "spring" | "summer" | "autumn" | "winter";
  biome: string;
  terrain: string;
  climateSeverity: number;
  spiritualAmbiguity: number;
  population: number;
  livingVillagerIds: string[];
  deadVillagerIds: string[];
  householdIds: string[];
  factionIds: string[];
  cultureStateId: string;
  religionStateId: string;
  resourceStateId: string;
  technologyStateId: string;
  mapTileIds: string[];
  currentLeadershipVillagerIds: string[];
  summary?: string;
}

export interface VillagerTraits {
  openness: number;
  conscientiousness: number;
  sociability: number;
  volatility: number;
  agreeableness: number;
  dominance: number;
  suspicion: number;
  shameSensitivity: number;
  riskTolerance: number;
  attachmentSecurity: number;
}

export interface VillagerNeeds {
  hunger: number;
  safety: number;
  belonging: number;
  status: number;
  intimacy: number;
  autonomy: number;
  meaning: number;
}

export interface VillagerEmotions {
  fear: number;
  grief: number;
  anger: number;
  hope: number;
  shame: number;
  jealousy: number;
  attraction: number;
  confidence: number;
}

export interface VillagerHealth {
  vitality: number;
  injury: number;
  illness: number;
  fertility: number;
  pregnancyDays?: number;
  isPregnant?: boolean;
  alive: boolean;
  causeOfDeath?: string;
}

export interface Villager {
  id: string;
  villageId: string;
  name: string;
  sex: Sex;
  ageYears: number;
  ageDays: number;
  lifeStage: LifeStage;
  role: VillagerRole;
  householdId: string;
  lineageLabel: string;
  locationTileId: string;
  traits: VillagerTraits;
  needs: VillagerNeeds;
  emotions: VillagerEmotions;
  health: VillagerHealth;
  visibleMotiveIds: string[];
  hiddenMotiveIds: string[];
  beliefIds: string[];
  memoryIds: string[];
  relationshipEdgeIds: string[];
  factionAffinity: Record<string, number>;
  prestige: number;
  legitimacy: number;
  spiritualSensitivity: number;
  rumorSusceptibility: number;
  secrecy: number;
  laborCapacity: number;
  caregivingLoad: number;
  lastActionSummary?: string;
  privateSummary?: string;
}

export interface Household {
  id: string;
  villageId: string;
  name: string;
  homeTileId: string;
  memberIds: string[];
  dependentIds: string[];
  foodStores: number;
  toolQuality: number;
  socialPrestige: number;
  stability: number;
}

export interface Motive {
  id: string;
  villagerId: string;
  type: MotiveType;
  label: string;
  visibility: "visible" | "hidden";
  urgency: number;
  targetVillagerId?: string;
  targetFactionId?: string;
  targetNormKey?: string;
  expiresDay?: number;
}

export interface KinshipLink {
  id: string;
  villageId: string;
  fromVillagerId: string;
  toVillagerId: string;
  kind:
    | "parent"
    | "child"
    | "sibling"
    | "pair_bonded_partner"
    | "former_partner"
    | "grandparent"
    | "extended_kin";
  certainty: number;
}

export interface RelationshipEdge {
  id: string;
  villageId: string;
  fromVillagerId: string;
  toVillagerId: string;
  type: RelationshipType;
  strength: number;
  trust: number;
  fear: number;
  attraction: number;
  dependence: number;
  admiration: number;
  resentment: number;
  secrecy: number;
  lastInteractionDay: number;
}

export interface Belief {
  id: string;
  villagerId: string;
  domain: BeliefDomain;
  subjectId?: string;
  subjectLabel: string;
  proposition: string;
  confidence: number;
  truthStatus: "true" | "false" | "unknown";
  source: "observation" | "rumor" | "dream" | "ritual" | "inference";
  lastUpdatedDay: number;
}

export interface Memory {
  id: string;
  villagerId: string;
  day: number;
  eventId?: string;
  tags: string[];
  summary: string;
  valence: MemoryValence;
  emotionalIntensity: number;
  socialReinforcement: number;
  decay: number;
  distortion: number;
}

export interface CultureState {
  id: string;
  villageId: string;
  sharingNorm: number;
  punishmentSeverity: number;
  outsiderTolerance: number;
  prestigeByAge: number;
  prestigeBySkill: number;
  prestigeByViolence: number;
  kinLoyaltyNorm: number;
  pairBondStrictness: number;
  genderRoleRigidity: number;
  hospitalityNorm: number;
  revengeAcceptance: number;
  ritualIntensity: number;
  spiritualFear: number;
  burialFormality: number;
  leadershipByConsensus: number;
  leadershipByForce: number;
  tabooKeys: string[];
  sacredSiteTileIds: string[];
  culturalMemorySummary?: string;
}

export interface ReligionState {
  id: string;
  villageId: string;
  spiritBeliefStrength: number;
  omenSensitivity: number;
  ritualExperimentation: number;
  dominantInterpretation?: string;
  sacredSymbols: string[];
  ritualSpecialistVillagerIds: string[];
  doctrineFragments: string[];
  heresyTension: number;
}

export interface ResourceState {
  id: string;
  villageId: string;
  food: number;
  waterSecurity: number;
  shelterQuality: number;
  toolBase: number;
  fireSecurity: number;
  diseasePressure: number;
  predatorPressure: number;
  weatherHarshness: number;
}

export interface TechnologyState {
  id: string;
  villageId: string;
  eraLabel: string;
  foodStorageKnowledge: number;
  huntingCoordination: number;
  medicinalKnowledge: number;
  toolCraftKnowledge: number;
  ritualKnowledge: number;
  socialComplexity: number;
  innovationPressure: number;
}

export interface Faction {
  id: string;
  villageId: string;
  type: FactionType;
  name: string;
  memberIds: string[];
  cohesion: number;
  prestige: number;
  grievanceLevel: number;
  targetIds: string[];
  summary?: string;
}

export interface Rumor {
  id: string;
  villageId: string;
  originVillagerId?: string;
  subjectVillagerId?: string;
  content: string;
  truthiness: number;
  scandalLevel: number;
  credibility: number;
  spreadCount: number;
  believerIds: string[];
  lastMutatedDay: number;
}

export interface EventRecord {
  id: string;
  villageId: string;
  day: number;
  type: EventType;
  title: string;
  participantIds: string[];
  tileId?: string;
  facts: Record<string, unknown>;
  outcomeSummary: string;
  publicInterpretation?: string;
  privateNotes?: string;
  aiTextStatus: "pending" | "generated" | "failed" | "not_requested";
}

export interface SpiritAction {
  id: string;
  villageId: string;
  day: number;
  type: SpiritActionType;
  targetVillagerId?: string;
  targetTileId?: string;
  parameters: Record<string, unknown>;
  resolved: boolean;
  visibleToVillagers: boolean;
  outcomeEventId?: string;
}
```

---

# 4. Prisma Schema Direction

## ORM Choice
Use **Prisma** in v1 for fast schema/migration/client generation.

## Schema Conventions
- use UUID primary keys
- keep nested villager state in JSON columns initially to reduce migration churn
- keep event records append-only
- normalize core ownership and relational links
- use enums for stable categories

## Table Set
- villages
- world_tiles
- households
- villagers
- motives
- kinship_links
- relationship_edges
- beliefs
- memories
- factions
- faction_memberships
- rumors
- culture_states
- religion_states
- resource_states
- technology_states
- event_records
- spirit_actions
- ai_render_jobs
- save_snapshots

## Indexed Query Priorities
- villagers by village
- relationships by source and target
- motives by villager and visibility
- beliefs by villager and domain
- memories by villager and day
- events by village and descending day
- rumors by village and scandal level
- spirit actions by village and day

## Suggested Persistence Strategy
Use Postgres as source of truth for:
- current world state
- append-only event history
- occasional world snapshots for save/load/rewind

---

# 5. World Generation Algorithm

## Generation Steps
1. accept setup input
2. derive random seed
3. generate map tiles and terrain
4. place water, shelter, and hazard zones
5. generate households and lineages
6. generate villagers with age / sex distribution
7. assign pair bonds and dependent children where appropriate
8. generate motives and latent tensions
9. generate culture state
10. generate religion ambiguity and myth fragments
11. generate relationship graph
12. generate 3–5 prehistory events
13. persist state

## Generation Constraints
- at least one viable food source
- at least one social tension
- at least two kin clusters
- at least one spiritually sensitive villager
- at least one leadership ambiguity or succession tension
- unstable enough to produce stories, but not immediate collapse

---

# 6. Villager Decision Model

Use a **weighted action scoring system**, not full autonomous planner agents.

## Daily Decision Outline
For each villager:
1. compute current pressures
2. derive candidate actions
3. score actions using traits, motives, needs, relationships, emotions, culture, and environment
4. choose an action with stochastic variation
5. resolve effects
6. update relationships, beliefs, and memory

## Candidate Action Categories
- forage / hunt / labor
- share resource
- withhold resource
- care for child / elder / mate
- flirt / pair-bond action
- spread rumor
- confront rival
- seek protection
- perform ritual
- defer to leader
- manipulate socially
- withdraw / hide
- pray or interpret spiritually
- migrate temporarily

## Scoring Formula
```ts
score =
  motiveWeight +
  needPressure +
  relationshipModifier +
  traitModifier +
  emotionModifier +
  cultureModifier +
  environmentModifier +
  randomness;
```

Keep scoring contributions separate and testable.

---

# 7. Social Systems Algorithms

## Relationship Update Rules
Relationships drift based on:
- direct interaction valence
- reciprocity
- kinship baseline
- betrayal events
- protection events
- rumor effects
- mate or resource competition
- status comparison

## Gossip Propagation
At each gossip opportunity:
- source decides whether to spread
- target acceptance depends on trust, prestige, scandal, and subject reputation
- rumor may mutate in transmission
- confidence and truthiness can diverge over time

## Faction Emergence
A faction can emerge or strengthen when:
- 3+ villagers align around kin, grievance, ritual stance, resource interest, or prestige bloc
- cohesion exceeds threshold
- a shared target or cause exists

## Leadership Legitimacy
Leadership legitimacy should derive from:
- prestige
- competence memories
- fairness reputation
- kin support
- ritual support
- crisis performance

---

# 8. Culture Drift Engine

Culture should change slowly through repeated reinforcement.

## Drift Inputs
- repeated event patterns
- player interventions
- elite behavior
- survival outcomes
- punishment outcomes
- successful rituals
- crisis intensity
- outsider contact

## Example Drift Rules
- repeated betrayal during scarcity increases punishment severity
- repeated outsider help increases outsider tolerance
- repeated strong elder coordination increases consensus legitimacy
- repeated violent problem-solving increases prestige-by-violence
- repeated spirit-linked rescue increases ritual intensity and spirit belief

## Update Frequency
- daily hidden accumulators
- visible culture shifts at seasonal boundaries
- major norm-change events when thresholds are crossed

---

# 9. Religion and Myth Engine

## Spirit Attribution Logic
Villagers interpret events based on:
- spiritual sensitivity
- religion state
- prior omen memory
- grief / fear / hope intensity
- ritual specialist influence
- whether ritual or prayer preceded the event

## Ritual Emergence Rules
A ritual may emerge when:
- a similar unexplained event happens more than once
- a charismatic villager proposes repeated symbolic behavior
- ritual behavior seems to reduce fear or improve outcomes
- dreams or omens cluster around the same symbol or site

## Myth Fragments
Store short reusable fragments like:
- “The spirit turns from the selfish in the hunger season.”
- “Dreams near the river carry warning.”
- “The returned child belongs partly to the unseen.”

These should later feed interpretation prompts.

---

# 10. Spirit Power Implementation Spec

## MVP Powers
Implement first:
- plant_idea
- send_dream
- intensify_emotion
- bless_health
- protect_from_death
- resurrect
- reveal_secret
- cause_storm
- cause_famine
- arrange_encounter

## Power Semantics
### plant_idea
- create or amplify a belief seed
- increase salience of suspicion, fear, hope, or desire
- may influence motives and action scores for multiple days

### send_dream
- generate symbolic dream text
- optionally update beliefs
- may spread if dream is shared

### intensify_emotion
- increase fear, grief, hope, anger, jealousy, etc.

### bless_health
- reduce illness/injury pressure
- improve vitality over several days

### protect_from_death
- intercept otherwise fatal outcome once
- likely causes strong spiritual attribution if observed

### resurrect
- revive recently dead villager
- causes major religious and cultural consequences

### reveal_secret
- turn hidden information into rumor or direct belief shock

### cause_storm
- raise weather harshness
- risk damage, injury, food loss, omen formation

### cause_famine
- reduce village food
- increase fear, conflict, hoarding, and blame dynamics

### arrange_encounter
- force interaction opportunity between selected villagers

## Resolver Contract
Each spirit action must:
1. validate targets
2. apply deterministic state changes
3. emit an `EventRecord`
4. enqueue optional AI render job
5. update belief/culture accumulators if relevant

---

# 11. Deterministic Tick Engine Spec

## Tick Goal
The tick engine must be:
- deterministic given seed + prior state + player actions
- decomposed into small modular steps
- append-only in event logging
- debuggable with step-level logging

## Inputs
- villageId
- daysToAdvance
- pending spirit actions
- generateAiText flag

## Outputs
- updated world state
- emitted event records
- optional AI jobs
- summary projection for UI

## Aggregate Shape
```ts
interface VillageAggregate {
  village: Village;
  tiles: WorldTile[];
  households: Household[];
  villagers: Villager[];
  motives: Motive[];
  kinshipLinks: KinshipLink[];
  relationshipEdges: RelationshipEdge[];
  beliefs: Belief[];
  memories: Memory[];
  factions: Faction[];
  factionMemberships: FactionMembership[];
  rumors: Rumor[];
  culture: CultureState;
  religion: ReligionState;
  resources: ResourceState;
  technology: TechnologyState;
  pendingSpiritActions: SpiritAction[];
}
```

## Daily Tick Order
```ts
function runSingleDayTick(input: RunSingleDayTickInput): RunSingleDayTickResult {
  const ctx = createTickContext(input.aggregate);

  stepAdvanceCalendar(ctx);
  stepResolveSpiritActions(ctx);
  stepUpdateEnvironment(ctx);
  stepUpdateVillageResources(ctx);
  stepAgeAndLifeStage(ctx);
  stepUpdateHealthAndMortalityRisk(ctx);
  stepUpdateNeedsAndEmotions(ctx);
  stepGenerateVillagerIntentions(ctx);
  stepResolveVillagerActions(ctx);
  stepResolveSocialInteractions(ctx);
  stepPropagateRumors(ctx);
  stepUpdateBeliefsAndMemories(ctx);
  stepUpdateFactionsAndLeadership(ctx);
  stepAccumulateCultureDrift(ctx);
  stepDetectThresholdEvents(ctx);
  stepFinalizeDeathsBirthsHouseholds(ctx);
  stepCreateDailySummaryEvents(ctx);
  stepEnqueueAiJobs(ctx);
  stepPersistableNormalization(ctx);

  return finalizeTickResult(ctx);
}
```

## Tick Context
```ts
interface TickContext {
  rng: SeededRng;
  village: Village;
  tilesById: Map<string, WorldTile>;
  householdsById: Map<string, Household>;
  villagersById: Map<string, Villager>;
  motivesByVillagerId: Map<string, Motive[]>;
  kinshipByVillagerId: Map<string, KinshipLink[]>;
  outgoingRelationshipsByVillagerId: Map<string, RelationshipEdge[]>;
  incomingRelationshipsByVillagerId: Map<string, RelationshipEdge[]>;
  beliefsByVillagerId: Map<string, Belief[]>;
  memoriesByVillagerId: Map<string, Memory[]>;
  factionsById: Map<string, Faction>;
  rumorsById: Map<string, Rumor>;
  culture: CultureState;
  religion: ReligionState;
  resources: ResourceState;
  technology: TechnologyState;
  pendingSpiritActions: SpiritAction[];
  villagerIntentions: VillagerIntention[];
  emittedEvents: EventRecord[];
  aiJobs: AiRenderJob[];
  deadToday: string[];
  bornToday: string[];
  cultureAccumulators: Record<string, number>;
  debugNotes: string[];
}
```

## Key Step Responsibilities
### stepAdvanceCalendar
- increment day
- derive season/year rollover
- emit season-change event if needed

### stepResolveSpiritActions
- resolve unresolved spirit actions scheduled for current day or earlier
- apply deterministic changes
- mark resolved

### stepUpdateEnvironment
- update weather, disease, and predator pressure from biome/season/current state

### stepUpdateVillageResources
- apply daily food consumption
- apply passive gains/losses
- emit shortage event when thresholds crossed

### stepAgeAndLifeStage
- increment age
- recompute life stage
- update labor capacity baseline

### stepUpdateHealthAndMortalityRisk
- update injury/illness/fatality risk
- mark pending fatalities for later finalization

### stepUpdateNeedsAndEmotions
- update hunger, safety, belonging, status, intimacy, autonomy, meaning
- derive fear, hope, anger, shame, jealousy drift

### stepGenerateVillagerIntentions
- build candidate actions
- score each action
- select primary action with stochastic variation

### stepResolveVillagerActions
- resolve actions in deterministic order
- survival/care first, then labor, then family/social/ritual actions

### stepResolveSocialInteractions
- apply relationship changes
- generate favors, insults, attraction progress, fear, admiration, resentment

### stepPropagateRumors
- propagate and mutate rumors
- update beliefs
- emit major rumor spread events when significant

### stepUpdateBeliefsAndMemories
- add memories from major interactions
- decay and distort older memories
- update beliefs from observation/rumor/dream/ritual

### stepUpdateFactionsAndLeadership
- update cohesion
- spawn or dissolve weak factions
- recompute legitimacy
- update leadership summary

### stepAccumulateCultureDrift
- add hidden drift contributions from today’s patterns
- do not visibly shift culture every day

### stepDetectThresholdEvents
- detect scandals, ritual emergence, norm changes, feuds, leadership crises

### stepFinalizeDeathsBirthsHouseholds
- finalize births
- finalize deaths after protection checks
- reassign dependents
- recompute population and households

### stepEnqueueAiJobs
- create AI render jobs for newly emitted events if flag enabled

### stepPersistableNormalization
- clamp values
- clean illegal references
- prune invalid intentions/memberships

## Action Scoring Pseudocode
```ts
function scoreAction(ctx: TickContext, villager: Villager, action: CandidateAction): number {
  const motiveWeight = getMotiveContribution(ctx, villager, action);
  const needPressure = getNeedContribution(ctx, villager, action);
  const relationshipModifier = getRelationshipContribution(ctx, villager, action);
  const traitModifier = getTraitContribution(villager, action);
  const emotionModifier = getEmotionContribution(villager, action);
  const cultureModifier = getCultureContribution(ctx.culture, villager, action);
  const environmentModifier = getEnvironmentContribution(ctx, villager, action);
  const randomness = nextSmallRandom(ctx.rng);

  return (
    motiveWeight +
    needPressure +
    relationshipModifier +
    traitModifier +
    emotionModifier +
    cultureModifier +
    environmentModifier +
    randomness
  );
}
```

## Edge Cases to Handle Explicitly
- newborn created and caregiver dies same day
- villager resurrected after death event emitted
- pair bond target dies before interaction resolves
- rumor subject dies during rumor spread
- famine drives food below zero
- all current leaders die
- household becomes empty
- intended target no longer valid

## Tick Engine Module Layout
```text
/lib/simulation/
  tickEngine.ts
  tickContext.ts
  calendarStep.ts
  spiritStep.ts
  environmentStep.ts
  resourceStep.ts
  agingStep.ts
  healthStep.ts
  needsStep.ts
  intentionStep.ts
  actionResolutionStep.ts
  socialStep.ts
  rumorStep.ts
  beliefMemoryStep.ts
  factionLeadershipStep.ts
  cultureStep.ts
  thresholdEventStep.ts
  householdStep.ts
  aiJobStep.ts
  normalizationStep.ts
```

## Debug Logging Requirement
Add a debug mode that outputs for one selected villager:
- starting needs and emotions
- top scored actions with score breakdown
- chosen action
- relationship deltas
- belief updates
- memory additions

This is essential for tuning behavior.

---

# 12. AI Generation Contracts

## AI Job Types
- render_event_summary
- render_public_interpretation
- render_private_summary
- render_villager_dialogue
- render_dream
- render_chronicle_entry
- render_myth_fragment

## Global Prompt Rules
- do not contradict structured facts
- keep prose concise
- avoid modern language
- preserve uncertainty in villager perspective
- do not describe game systems or numeric values

## Example System Prompt
```text
You are rendering text for a simulation game.
You must follow structured simulation facts exactly.
Do not invent causal facts that contradict the input.
When writing from a villager perspective, write with human uncertainty, bias, and incomplete knowledge.
Keep language concrete, emotionally clear, and non-modern.
Do not describe game systems or numeric values.
```

## Event Summary Prompt Template
```text
TASK: Write a short event summary for the game timeline.

FACTS:
- day: {{day}}
- event_type: {{event_type}}
- participants: {{participants_json}}
- factual_outcome: {{factual_outcome_json}}
- culture_context: {{culture_context_json}}
- recent_history: {{recent_history_json}}

OUTPUT REQUIREMENTS:
- 2 to 4 sentences
- clear and readable
- grounded in concrete action
- do not invent facts beyond the provided data
```

## Dream Prompt Template
```text
TASK: Write a symbolic dream sent to one villager.

TARGET VILLAGER:
{{villager_json}}

DREAM INTENT:
{{dream_intent_json}}

CURRENT VILLAGE CONTEXT:
{{village_context_json}}

OUTPUT REQUIREMENTS:
- 80 to 140 words
- symbolic but interpretable
- emotionally resonant
- should plausibly influence future beliefs
- do not mention a literal game player
```

## Dialogue Prompt Template
```text
TASK: Write a short line of dialogue a villager might say.

SPEAKER:
{{speaker_json}}
LISTENER:
{{listener_json}}
SCENE FACTS:
{{scene_json}}

OUTPUT REQUIREMENTS:
- 1 to 3 lines
- reflect speaker traits, motives, beliefs, and emotional state
- do not reveal hidden truths the speaker would not know
```

---

# 13. API Design

## Core Routes
- `POST /api/game/new`
- `GET /api/game/:villageId`
- `POST /api/game/:villageId/tick`
- `POST /api/game/:villageId/spirit-action`
- `GET /api/game/:villageId/villagers/:villagerId`
- `GET /api/game/:villageId/events`
- `GET /api/game/:villageId/culture`
- `GET /api/game/:villageId/graph`
- `POST /api/game/:villageId/ai/render-missing`

## Example Create Route Input
```json
{
  "seed": "optional string",
  "biome": "temperate",
  "terrain": "river valley",
  "startingPopulation": 16,
  "abundance": 0.45,
  "hostility": 0.55,
  "kinCloseness": 0.7,
  "outsiderOpenness": 0.3,
  "spiritualAmbiguity": 0.8,
  "prompt": "A river village that survived a recent hard winter"
}
```

---

# 14. Frontend Screen Spec

## Village Dashboard
Show:
- season/day/year
- population
- food, danger, disease, tension meters
- recent events
- faction alerts
- culture drift warnings

## Map View
Show:
- tile map
- homes
- resources
- sacred sites
- hazards
- selected villager markers
- event markers

## Villager Detail
Show:
- age, role, household, status
- trait summary
- visible motives
- likely hidden tendency summary
- emotional state bars
- strongest relationships
- beliefs
- recent memories
- available spirit actions

## Relationship Graph
Show:
- villager nodes
- edge types for kinship, pair bond, rivalry, fear, admiration
- faction and household filters
- trust/fear/resentment tooltips

## Culture and Religion
Show:
- culture variable bars
- active taboos
- sacred symbols
- ritual specialists
- doctrine fragments
- norm drift notes

## Chronicle
Show:
- timeline of events
- filters by type
- AI-rendered entries

## Spirit Action Panel
Show:
- action categories
- target selectors
- descriptions
- cooldown/cost if used later
- consequence hints when possible

---

# 15. File and Folder Layout

```text
/src
  /app
    /api
      /game
        /new/route.ts
        /[villageId]/route.ts
        /[villageId]/tick/route.ts
        /[villageId]/spirit-action/route.ts
        /[villageId]/events/route.ts
        /[villageId]/culture/route.ts
        /[villageId]/graph/route.ts
    /game/[villageId]/page.tsx
    /page.tsx
  /components
    VillageDashboard.tsx
    MapView.tsx
    VillagerPanel.tsx
    RelationshipGraph.tsx
    CulturePanel.tsx
    ChroniclePanel.tsx
    SpiritActionPanel.tsx
  /lib
    /domain
      types.ts
      constants.ts
      factories.ts
    /simulation
      tickEngine.ts
      villagerDecision.ts
      relationshipEngine.ts
      rumorEngine.ts
      factionEngine.ts
      cultureEngine.ts
      religionEngine.ts
      eventEngine.ts
      spiritResolver.ts
      worldGenerator.ts
      technologyEngine.ts
    /ai
      promptBuilders.ts
      renderers.ts
      validators.ts
    /db
      schema.ts
      queries.ts
      mutations.ts
    /server
      gameService.ts
      saveService.ts
      queueService.ts
  /prompts
    eventSummary.txt
    dream.txt
    dialogue.txt
    mythFragment.txt
  /tests
    worldGenerator.test.ts
    decisionEngine.test.ts
    cultureEngine.test.ts
    spiritResolver.test.ts
    rumorEngine.test.ts
```

---

# 16. Game Service Contracts

## GameService
Responsibilities:
- create new village
- load village state
- advance ticks
- apply spirit actions
- fetch UI projections

## TickEngine
Responsibilities:
- execute one or many days
- call sub-engines in deterministic order
- collect emitted events

## WorldGenerator
Responsibilities:
- deterministic setup from seed
- create initial village state and prehistory

## SpiritResolver
Responsibilities:
- validate and resolve spirit actions
- emit events and state changes

## Projection Builders
Build read models for:
- dashboard
- villager detail
- graph
- culture
- chronicle

---

# 17. Testing Strategy

## Unit Tests
Must cover:
- world generation determinism
- relationship update math
- rumor propagation rules
- faction thresholds
- culture drift thresholds
- spirit action resolution
- death/protection/resurrection rules

## Property Tests
Examples:
- population never negative
- every villager belongs to a household or is explicitly unattached
- dead villagers cannot act unless resurrected
- relationship values stay within bounds
- culture variables stay within [0,1]
- events are append-only

## Snapshot Tests
Use for:
- generated village seed outputs
- prompt payload construction
- projection JSON for screens

---

# 18. Build Backlog

## Epic 1: Project Setup
- initialize Next.js app
- configure Prisma/Postgres
- add seedable RNG utility
- add domain types and validation

## Epic 2: World Generation
- setup form
- world generation service
- create village, villagers, households, map
- render dashboard and villager list

## Epic 3: Simulation Core
- daily tick engine
- villager state updates
- relationship updates
- resource pressure
- event persistence

## Epic 4: Social Systems
- rumor engine
- faction engine
- culture drift engine
- belief and memory updates

## Epic 5: Spirit Systems
- spirit action panel
- MVP powers
- deterministic action resolution and event emission

## Epic 6: AI Layer
- prompt builders
- AI job table and renderer service
- event summaries, dreams, dialogue
- fallback text when AI fails

## Epic 7: UI Depth
- map view
- villager detail
- relationship graph
- culture/religion screen
- chronicle

## Epic 8: Stability
- save/load
- tests
- reproducibility
- simulation performance tuning

---

# 19. Milestones

## Milestone 1
Deterministic non-AI village simulation slice:
- generate village
- persist it
- render villagers and households
- advance one day at a time
- update food, needs, and relationships
- emit event records
- implement one spirit action end-to-end
- display dashboard and villager view

## Milestone 2
Social legibility:
- rumors
- relationship graph
- visible motives
- belief summaries
- culture drift indicators
- chronicle entries

## Milestone 3
AI rendering layer:
- dream text
- event summaries
- villager dialogue snippets
- retry/fallback logic

---

# 20. Claude Code Bootstrapping Prompt

```text
Build the MVP foundation for Spiritvale using TypeScript, Next.js App Router, Prisma, and Postgres.

Core requirements:
- The player is the supernatural spirit of a procedurally generated stone-age village.
- Villagers are fully human and operate through traits, motives, needs, emotions, relationships, beliefs, and memories.
- The simulation is deterministic and server-authoritative.
- AI text generation is optional and asynchronous, and must never be the source of truth for simulation state.

Implement Milestone 1 first:
1. Set up the project structure.
2. Define the core TypeScript domain schema.
3. Add Prisma schema and persistence.
4. Implement a seeded world generator that creates a valid village with 12–20 villagers, households, kinship, initial relationships, initial culture state, and initial resources.
5. Implement a deterministic daily tick engine that updates resource pressure, villager needs, villager emotions, and simple relationship changes.
6. Emit append-only EventRecords.
7. Implement one spirit action end-to-end, preferably `send_dream` or `cause_famine`.
8. Build a basic UI with a village dashboard, villager list, villager detail page, and a tick button.

Constraints:
- Do not implement real-time movement or pathfinding.
- Do not make the client authoritative.
- Do not use AI to decide simulation outcomes.
- Keep all systems testable and strongly typed.
- Use simple readable code and modular services.

After Milestone 1, prepare for Milestone 2: rumors, relationship graph, belief summaries, and culture drift.
```

## Follow-Up Prompt for Schema + Tick Engine

```text
Implement two concrete foundations for Spiritvale:

1. Convert the relational data model into a working Prisma schema and generate migrations.
2. Implement the deterministic tick engine skeleton with modular simulation steps.

Requirements:
- Keep villager nested state such as traits, needs, emotions, health, and faction affinity in JSON columns for v1.
- Add repository functions to load a full VillageAggregate from Prisma.
- Implement `advanceVillageByDays` and `runSingleDayTick` as server-side application services.
- Split the tick engine into modular step files.
- Add placeholder but working logic for calendar, resources, aging, needs/emotions, villager intentions, social resolution, deaths, and event emission.
- Make the engine deterministic with a seeded RNG.
- Add tests for world loading, one-day ticking, food shortage event emission, and death protection behavior.
- Do not add AI rendering logic yet beyond job placeholders.

Deliverables:
- `prisma/schema.prisma`
- migration files
- aggregate loader/service code
- tick engine modules
- tests
- a short README section explaining tick order and how to run a one-day simulation
```

---

# 21. Final Technical Note

Build this as a **simulation engine with an interpretive AI shell**.

If the engine is strong, the rest compounds. If the engine is weak, the writing layer will only decorate a hollow game.

