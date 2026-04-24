// All simulation coefficients in one place, named and cited.
// Adjust these values to tune the model without hunting through step files.

// ---------------------------------------------------------------------------
// Needs decay / recovery rates (per tick)
// ---------------------------------------------------------------------------

// Physiological need degrades at this rate per tick under scarcity (resource step)
export const PHYSIOLOGICAL_DEPRIVATION_RATE = 0.06;
// Recovery rate per tick when resources are adequate
export const PHYSIOLOGICAL_RECOVERY_RATE = 0.04;

// Belonging need baseline recovery rate for extraverts (extraversion = 1.0)
// Scales linearly with extraversion down to BELONGING_RECOVERY_MIN for introverts.
// Ref: Lucas et al. (2000) — extraversion predicts positive affect in social situations.
export const BELONGING_RECOVERY_BASE = 0.03;
export const BELONGING_RECOVERY_MIN = 0.005; // floor for high-introvert agents

// Esteem need sensitivity to conscientiousness.
// High conscientiousness agents feel esteem loss more acutely.
// Ref: Judge et al. (2002) — conscientiousness predicts job performance and status attainment.
export const ESTEEM_CONSCIENTIOUSNESS_WEIGHT = 0.4;

// ---------------------------------------------------------------------------
// Affect update rates (per tick)
// ---------------------------------------------------------------------------

// Neuroticism amplifier for negative affect spikes.
// Base negative affect delta is multiplied by (1 + neuroticism * this value).
// Ref: Watson & Clark (1984) — neuroticism is the primary predictor of negative affect.
export const NEUROTICISM_NEGATIVE_AFFECT_AMPLIFIER = 1.0;

// Extraversion baseline for positive affect.
// At extraversion = 1.0, positive affect has this minimum floor.
// Ref: Costa & McCrae (1980) — extraversion correlates strongly with positive emotionality.
export const EXTRAVERSION_POSITIVE_AFFECT_FLOOR = 0.15;

// Stress accumulation multiplier from unmet needs.
export const STRESS_FROM_UNMET_NEEDS_WEIGHT = 0.3;

// ---------------------------------------------------------------------------
// Social interaction rates (per tick)
// ---------------------------------------------------------------------------

// Maximum number of social interactions an agent initiates per tick.
// Caps O(n²) pairwise processing to O(n).
export const MAX_INTERACTIONS_PER_TICK = 3;

// Base probability of initiating an interaction (at extraversion = 0.5).
// Ref: Wilt & Revelle (2009) — extraversion predicts frequency of social interactions.
export const BASE_INTERACTION_PROBABILITY = 0.4;

// In-group interaction weight multiplier vs out-group.
// Agents are this many times more likely to interact within their group.
// Ref: Tajfel & Turner (1979) — Social Identity Theory; in-group favoritism.
export const INGROUP_INTERACTION_WEIGHT = 3.0;

// ---------------------------------------------------------------------------
// Relationship dynamics (per tick)
// ---------------------------------------------------------------------------

// Base relationship trust growth per successful interaction.
// Modulated by agreeableness and long-term orientation.
// Ref: Rempel et al. (1985) — trust grows through repeated positive interaction.
export const BASE_TRUST_GROWTH = 0.008;

// Passive relationship decay when no interaction occurs.
export const PASSIVE_DECAY_RATE = 0.001;

// In-group trust floor (Social Identity Theory).
// Agents maintain at least this trust level with in-group members.
// Ref: Brewer (1979) — in-group favoritism results in elevated trust baselines.
export const INGROUP_TRUST_FLOOR = 0.35;

// Out-group trust ceiling — in high uncertainty avoidance cultures,
// cross-group trust is suppressed. Applied as: max = OUT_GROUP_TRUST_CEILING_BASE - UA * 0.3.
// Ref: Hofstede (2001) — uncertainty avoidance correlates with distrust of outsiders.
export const OUT_GROUP_TRUST_CEILING_BASE = 0.7;

// Relationship trust damage per conflict event.
// Scales with power distance (high PD = bigger permanent damage).
export const CONFLICT_TRUST_DAMAGE = 0.06;

// Long-term orientation slows trust growth (invest slowly) but reduces decay.
// Ref: Hofstede (2001) — LTO cultures emphasize perseverance and thrift in relationships.
export const LTO_TRUST_GROWTH_MODIFIER = 0.6;  // multiplier at LTO=1 (slows growth)
export const LTO_TRUST_DECAY_MODIFIER = 0.4;   // decay multiplier at LTO=1 (slows decay)

// ---------------------------------------------------------------------------
// Conformity pressure (Asch, 1951)
// ---------------------------------------------------------------------------

// Base conformity compliance probability.
// Ref: Asch (1951) — ~75% of participants conformed at least once.
export const BASE_CONFORMITY_PROBABILITY = 0.4;

// Agreeableness contribution to conformity compliance.
// High agreeableness → higher compliance with group norms.
export const AGREEABLENESS_CONFORMITY_WEIGHT = 0.35;

// Openness reduces conformity (independent thinking).
// Ref: McCrae (1996) — openness correlates with tolerance for ambiguity and dissent.
export const OPENNESS_CONFORMITY_REDUCTION = 0.3;

// Uncertainty avoidance (Hofstede) multiplies conformity pressure per group.
// Ref: Hofstede (2001) — high UA cultures enforce rules more strictly.
export const UA_CONFORMITY_AMPLIFIER = 0.4;

// ---------------------------------------------------------------------------
// Social loafing (Ringelmann / Latané et al., 1979)
// ---------------------------------------------------------------------------

// Group size above which social loafing activates.
export const LOAFING_GROUP_SIZE_THRESHOLD = 5;

// Conscientiousness reduces loafing. At conscientiousness = 1.0, loafing = 0.
// Ref: Karau & Williams (1993) — individual differences moderate social loafing.
export const CONSCIENTIOUSNESS_LOAFING_REDUCTION = 0.5;

// ---------------------------------------------------------------------------
// Bystander effect (Darley & Latané, 1968)
// ---------------------------------------------------------------------------

// Base probability of helping a distressed agent (single witness).
export const BASE_HELP_PROBABILITY = 0.8;

// Exponent in the diffusion-of-responsibility decay: P(help) ∝ 1 / n^BYSTANDER_EXPONENT.
// Ref: Latané & Darley (1970) — responsibility diffuses across witnesses.
export const BYSTANDER_EXPONENT = 0.6;

// Agreeableness weight for overriding bystander effect.
// High agreeableness agents are more likely to help regardless of witness count.
export const AGREEABLENESS_HELP_WEIGHT = 0.4;

// ---------------------------------------------------------------------------
// Groupthink (Janis, 1972)
// ---------------------------------------------------------------------------

// Cohesion threshold above which groupthink risk activates.
export const GROUPTHINK_COHESION_THRESHOLD = 0.75;

// Average openness below which groupthink risk amplifies.
export const GROUPTHINK_OPENNESS_CEILING = 0.4;

// Conformity pressure bonus when groupthink is active.
export const GROUPTHINK_CONFORMITY_BONUS = 0.3;

// ---------------------------------------------------------------------------
// Hierarchy / status dynamics
// ---------------------------------------------------------------------------

// Base status score increment per successful norm-enforcement act.
// Ref: Ridgeway (1991) — status characteristics theory; status accrues from visible contributions.
export const STATUS_ENFORCEMENT_GAIN = 0.04;

// Status decay per tick (towards mean).
export const STATUS_DECAY_RATE = 0.002;

// Power distance amplifier for hierarchy steepness.
// High PD cultures allow status gaps to widen more quickly.
// Ref: Hofstede (2001) — power distance dimension.
export const POWER_DISTANCE_HIERARCHY_AMPLIFIER = 0.5;

// Extraversion bonus for leadership candidacy (over status threshold).
// Ref: Judge et al. (2002) — extraversion is the strongest Big Five predictor of leadership emergence.
export const EXTRAVERSION_LEADERSHIP_BONUS = 0.3;

// ---------------------------------------------------------------------------
// Hofstede cultural drift rates (per tick)
// ---------------------------------------------------------------------------

// How quickly culture shifts in response to events (damped toward configured setpoint).
export const CULTURE_DRIFT_RATE = 0.003;

// Mean-reversion strength toward experimenter-set Hofstede values.
export const CULTURE_MEAN_REVERSION = 0.0005;

// ---------------------------------------------------------------------------
// Incident base probabilities (per eligible agent per tick)
// ---------------------------------------------------------------------------

export const INCIDENT_BASE_PROBABILITY = 0.07;

// OCEAN dimension weight in incident probability (applied as multipliers).
export const CONFLICT_INCIDENT_LOW_AGREEABLENESS_WEIGHT = 0.5;
export const REFORM_INCIDENT_HIGH_OPENNESS_WEIGHT = 0.4;
export const COALITION_INCIDENT_HIGH_EXTRAVERSION_WEIGHT = 0.4;
export const NORM_ENFORCEMENT_HIGH_CONSCIENTIOUSNESS_WEIGHT = 0.4;
export const WITHDRAWAL_AVOIDANT_WEIGHT = 0.5;

// Negative affect threshold above which emotional breakdown risk activates.
export const BREAKDOWN_NEGATIVE_AFFECT_THRESHOLD = 0.7;

// ---------------------------------------------------------------------------
// Attachment style modifiers
// Ref: Ainsworth et al. (1978); Bartholomew & Horowitz (1991)
// ---------------------------------------------------------------------------

// Anxious attachment: belonging-deficit stress spike
export const ANXIOUS_BELONGING_STRESS_SPIKE = 0.15;

// Avoidant attachment: belonging need suppressed in affect expression
export const AVOIDANT_BELONGING_SUPPRESSION = 0.5;

// Disorganized attachment: random perturbation to affect each tick
export const DISORGANIZED_AFFECT_NOISE = 0.05;
