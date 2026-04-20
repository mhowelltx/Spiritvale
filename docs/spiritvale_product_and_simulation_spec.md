# Spiritvale — Product and Simulation Spec

## Working Title
**Spiritvale**

## Elevator Pitch
A generational simulation god-game in which the player acts as the unseen spirit of a procedurally generated stone-age village. Villagers behave according to realistic human motives, kinship ties, gossip, prestige, fear, attraction, scarcity, and belief formation. The player can bless, curse, protect, influence, reveal, and resurrect, shaping the culture and long-term development of the village across generations.

## Product Shape
This is a **single-player simulation game** with:
- no fixed win condition
- persistent saves
- emergent storytelling
- AI-assisted text rendering
- deterministic world state under the hood
- long-run cultural and technological drift

## Core Player Fantasy
The player is not managing resources directly like a mayor. The player is an unseen force shaping a society by manipulating conditions, emotions, accidents, omens, fertility, survival, and belief.

---

# 1. Core Concept

## Setting
- Stone-age village at the beginning of play
- Realistic human material constraints and social dynamics
- Villagers remain fully human
- Only the player has supernatural power
- The village can progress beyond the stone age over long play through generational change

## Tone
- grounded human interaction
- realistic social behavior
- emotionally serious rather than cartoonish
- supernatural layer exists through player action, dreams, omens, miracles, disaster, and religion

## Player Role
The player is the **spirit of the village**.

Villagers do not initially know the spirit exists. They may gradually infer a spiritual force through dreams, omens, miracles, disasters, and repeated patterns, but they never gain certain omniscient knowledge.

## Core Experience
The game is a **simulation game** rather than a puzzle or victory-driven strategy game. The purpose is to influence the evolution of a village and its culture over time.

The player shapes:
- who survives
- what people believe
- which relationships deepen or collapse
- what norms emerge
- what rituals form
- what kind of society develops over generations

---

# 2. Design Pillars

## Pillar 1: People are internally complex
Each villager should have a persistent internal model combining:
- enduring traits
- current emotional state
- social role
- visible motives
- hidden motives
- relationships
- beliefs
- memory
- practical constraints

Villagers should feel understandable, not random.

## Pillar 2: Social reality is collectively constructed
The village is shaped by:
- rumor
- prestige
- kinship
- reputation
- leadership
- ritual
- shared memory
- in-group / out-group identity
- norms and taboo enforcement

A false accusation can become socially real. A respected villager can calm a feud. A famine can harden norms around hoarding, punishment, marriage, outsiders, or leadership.

## Pillar 3: The player acts from outside the human system
The player is asymmetrical and supernatural. Villagers are not.

The player shapes probabilities, conditions, opportunities, and shocks rather than directly controlling each human action.

## Pillar 4: Time matters
The village changes across:
- days
- seasons
- years
- generations
- developmental eras

Early crises, miracles, betrayals, and leadership patterns should have long-term effects.

## Pillar 5: AI is a layer, not the foundation
AI should enrich:
- dialogue
- dream text
- omen text
- event summaries
- private thoughts
- myth fragments
- public interpretations

AI must not replace the simulation model.

---

# 3. Core Simulation Layers

## 3.1 Human Simulation Layer
Villagers pursue realistic motives under:
- scarcity
- fear
- attraction
- kinship obligations
- grief
- resentment
- prestige competition
- belonging needs
- spiritual interpretation

## 3.2 Social-Cultural Layer
The village develops:
- norms
- taboos
- prestige hierarchies
- ritual patterns
- factions
- proto-politics
- shared narratives
- social memory

## 3.3 Spiritual Intervention Layer
The player may intervene with:
- blessings
- disasters
- dreams
- emotional influence
- protection
- revelation
- resurrection
- symbolic signs

## 3.4 Historical Development Layer
Over time the village can change in:
- leadership structure
- social complexity
- ritual complexity
- kinship norms
- outsider handling
- labor coordination
- knowledge and technology

---

# 4. Village Generation Model

## Setup Inputs
Potential player inputs at world start:
- biome / climate
- terrain type
- starting population size
- abundance vs scarcity
- hostility of environment
- degree of kin-relatedness in starting population
- outsider openness
- spiritual ambiguity level
- optional free-text seed prompt

## Generated Village Components
The game generates:
- map layout
- shelter and shared spaces
- water and food sources
- nearby hazards
- resource profile
- starting families and kinship lines
- age distribution
- sex distribution
- households
- pair bonds where appropriate
- leadership arrangement
- latent tensions
- proto-customs

## Generated Prehistory
Each village begins with shallow prehistory, such as:
- recent migration
- hard winter
- unresolved feud
- unexplained death
- founder dispute
- partial myth fragment

This gives the village inherited meaning from day one.

---

# 5. Villager Model

## Core Identity
Each villager should have:
- name
- age
- sex
- life stage
- household
- lineage label
- social role
- health state
- fertility / reproductive state
- location
- obligations

## Trait Layer
Suggested broad traits:
- openness
- conscientiousness
- sociability
- volatility
- agreeableness
- dominance
- suspicion
- shame sensitivity
- risk tolerance
- attachment security

## Motive Layer
Each villager should have:
- 1–3 visible motives
- 1–3 hidden motives
- urgency level for each

Motive themes include:
- survival
- kin protection
- status
- romance
- revenge
- belonging
- autonomy
- tradition
- reform
- secrecy
- resource security
- spiritual meaning

## Emotional / Need Layer
The simulation should track:
- hunger
- safety
- belonging
- status
- intimacy
- autonomy
- meaning
- fear
- grief
- anger
- hope
- shame
- jealousy
- attraction
- confidence

## Belief Layer
Villagers should hold beliefs about:
- who is trustworthy
- who is dangerous
- who is powerful
- what caused recent events
- whether omens matter
- what norms are legitimate
- who belongs in the group

## Memory Layer
Villagers should remember:
- who helped them
- who harmed them
- who shared food
- who insulted them
- who betrayed them
- who saved them
- what ritual seemed to work
- what ominous event preceded disaster

Memory should decay and distort over time.

---

# 6. Life Cycle and Kinship

## Life Stages
Suggested stages:
- infant
- child
- adolescent
- young adult
- adult
- elder

Life stage affects:
- labor ability
- vulnerability
- pair bonding
- prestige
- ritual role
- dependence

## Reproduction and Pair Bonding
The simulation should include:
- attraction
- courtship / pair formation
- jealousy
- fertility
- pregnancy
- birth risk
- infant survival
- caregiving burden
- paternity uncertainty where relevant

## Kinship Importance
Kinship should strongly affect:
- trust defaults
- alliance structure
- inheritance
- feud dynamics
- child outcomes
- caregiving
- legitimacy and leadership

## Death and Succession
Death should occur at realistic rates for a harsh premodern environment.

Deaths should alter:
- household stability
- dependent care burden
- resource distribution
- leadership succession
- grief patterns
- cultural memory

---

# 7. Relationships, Gossip, Factions, and Politics

## Relationship Types
Track at least:
- kinship
- friendship
- attraction
- pair bond
- rivalry
- resentment
- dependence
- admiration
- fear
- patronage / mentorship

## Gossip System
Gossip is central.

The game should track:
- who knows something
- who thinks they know something
- confidence in the rumor
- willingness to spread it
- how the rumor changes in retelling
- prestige effects on credibility

## Factions
Factions may emerge from:
- kin blocs
- ritual alignments
- prestige alliances
- resource conflict
- outsider tension
- reform/tradition divide

## Proto-Politics
Power can come from:
- age
- competence
- charisma
- ritual authority
- violence
- fairness reputation
- kin network size
- survival success during crisis

The simulation should allow:
- elder councils
- strongman authority
- fragile consensus
- ritual influence
- fractured leadership

---

# 8. Religion and Culture Evolution

## Culture Variables
Village culture should be explicit and evolve over time.

Track variables such as:
- sharing norms
- punishment severity
- outsider tolerance
- prestige by age
- prestige by skill
- prestige by violence
- kin loyalty norm
- pair bond strictness
- gender role rigidity
- hospitality norm
- revenge acceptance
- ritual intensity
- spiritual fear
- burial formality
- leadership by consensus
- leadership by force
- taboo list
- sacred sites

## Emergent Religion
Religion may arise from:
- repeated player interventions
- repeated coincidence after ritual
- dreams and omens
- charismatic interpretation
- unexplained survival or disaster
- inherited myth fragments

Religion should include:
- spirit hypotheses
- ritual experiments
- sacred symbols
- doctrine fragments
- taboo formation
- heresy tension
- ritual specialists

## Cultural Memory
Major events should become village-level memory:
- the year of hunger
- the storm after betrayal
- the child returned from death
- the elder whose ritual preceded good fortune

These memories should shape future interpretation and behavior.

---

# 9. Spirit Power Model

## Player Powers
The player starts with full god-game powers.

Suggested categories:
- **Mind:** plant ideas, send dreams, intensify emotions
- **Life:** heal, bless fertility, protect from death, resurrect
- **Ruin:** famine, storm, illness, disaster
- **Fate:** create encounters, coincidences, escapes
- **Revelation:** expose secrets, reveal patterns, mark sacred places

## Key Design Rule
Each power should have:
- direct world-state effect
- indirect effect on belief and culture
- villager interpretation consequences
- memory consequences
- possible unintended spillover

---

# 10. Time and Development

## Time Scales
The game should support:
- daily simulation
- seasonal changes
- yearly progression
- generational drift

## Seasonal Effects
Seasons should influence:
- food availability
- disease risk
- travel difficulty
- ritual timing
- mortality pressure
- labor burden

## Generational Change
Across generations, the village should evolve in:
- family structure
- leadership style
- religious complexity
- social stratification
- labor specialization
- knowledge continuity
- treatment of outsiders

## Technological Development
Technology should advance only when preconditions exist, such as:
- food surplus
- stable knowledge transmission
- resource access
- intergenerational teaching
- enough social complexity
- enough coordination and peace

MVP should keep this believable and light, not turn it into a giant tech tree.

---

# 11. UI Concept

The UI should support both macro and micro play.

## Core Views
- **Village Dashboard** — season, day, population, tension, food, danger, recent events
- **Map View** — homes, resources, sacred places, hazards, event markers
- **Villager Detail** — traits, motives, emotional state, beliefs, memories, kin, strongest relationships
- **Relationship Graph** — kinship, pair bonds, rivalries, fear, admiration, factions
- **Culture and Religion View** — values, taboos, sacred symbols, ritual specialists, doctrine fragments
- **Chronicle View** — major events, births, deaths, rituals, scandals, disasters, omens
- **Spirit Action Panel** — available powers and targets

## UI Principle
At all times, the player should be able to answer:
- what is happening socially right now?
- why is it happening?

---

# 12. MVP Scope Freeze

## In Scope
- one village per save
- 12 to 20 villagers
- one map
- late stone-age starting context
- daily simulation tick
- households and kinship
- aging and death
- pair bonds and basic reproduction
- relationships and gossip
- loose factions
- explicit culture variables
- spirit powers
- AI-generated dialogue, dreams, omen text, and event summaries
- chronicle / event log
- culture screen
- villager detail screen
- relationship graph screen
- save/load

## Out of Scope for MVP
- multiple villages interacting
- tactical combat
- full tech tree UI
- pathfinding-heavy movement simulation
- detailed individual inventories
- multiplayer
- mobile-first design
- full economics simulation

## MVP Success Criteria
The MVP succeeds if the player can:
- generate a village
- inspect villagers and relationships
- advance time
- apply spirit powers
- observe believable social change
- observe belief and gossip shifts
- see births, deaths, pair bonds, and household change
- read AI-rendered text that stays consistent with the simulation

---

# 13. Implementation Guidance for AI Coding Agents

## Hard Rules
- simulation state is canonical
- AI text is derived from state and cannot overwrite it
- villagers never access omniscient truth
- culture changes slowly through reinforcement
- memory decays and distorts over time
- player actions are real, villager interpretations are subjective

## Soft Rules
- villagers should feel human, not optimal
- contradictions are allowed if psychologically explainable
- no villager is purely good or evil by default
- the game should be legible, not opaque chaos

## Most Important Architecture Principle
This project should be built as a **simulation engine with an interpretive AI shell**, not as an AI story generator with weak mechanics.

If the simulation is strong, the game will hold together. If it is weak, the prose will not save it.

---

# 14. Suggested Milestone Path

## Milestone 1
- deterministic non-AI village simulation slice
- village generation
- daily tick
- villagers, households, needs, relationships
- one spirit action
- dashboard and villager view

## Milestone 2
- social legibility systems
- rumors
- belief summaries
- relationship graph
- culture drift indicators
- chronicle

## Milestone 3
- AI rendering layer
- dream text
- event summaries
- villager dialogue
- fallback and retry logic

---

# 15. Claude Code Guidance Summary

When handing this project to Claude Code, emphasize:
- TypeScript throughout
- server-authoritative simulation
- seeded deterministic world generation
- modular simulation steps
- strict separation between simulation facts and AI-rendered prose
- a first playable slice before adding too much lore or too many systems

