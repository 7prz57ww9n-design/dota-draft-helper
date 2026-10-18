import type { AnswerTag, Position, RatingKey, TeamTag, Threat } from './types';

export const TEAM_TAGS: TeamTag[] = [
  'initiation', 'counterInitiation', 'disable', 'bkbPiercingDisable', 'pickoff',
  'aoeDamage', 'burst', 'sustainedDamage', 'frontline', 'save', 'sustain',
  'dispel', 'waveclear', 'push', 'splitPush', 'mapPressure', 'earlyRoshan',
  'laning', 'setup', 'followUp',
];

export const ANSWER_TAGS: AnswerTag[] = [
  'healReduction',
];

export const THREATS: Threat[] = [
  'tanky', 'illusions', 'mobility', 'magicBurst', 'healReliant', 'spellImmune',
];

export const TAG_LABELS: Record<RatingKey, string> = {
  initiation: 'Initiation',
  counterInitiation: 'Counter-initiation',
  disable: 'Disable',
  bkbPiercingDisable: 'BKB-piercing disable',
  pickoff: 'Pickoff',
  aoeDamage: 'AoE damage',
  burst: 'Burst',
  sustainedDamage: 'Sustained damage',
  frontline: 'Frontline',
  save: 'Save',
  sustain: 'Sustain',
  dispel: 'Dispel',
  waveclear: 'Waveclear',
  push: 'Push',
  splitPush: 'Split push',
  mapPressure: 'Map pressure',
  earlyRoshan: 'Early Roshan',
  laning: 'Laning',
  setup: 'Setup',
  followUp: 'Follow-up',
  healReduction: 'Heal reduction',
};

export const THREAT_LABELS: Record<Threat, string> = {
  tanky: 'Tanky',
  illusions: 'Illusions',
  mobility: 'Mobility',
  magicBurst: 'Magic burst',
  healReliant: 'Heal-reliant',
  spellImmune: 'Spell immunity',
};

export const THREAT_ANSWER: Record<Threat, RatingKey> = {
  tanky: 'sustainedDamage',
  illusions: 'aoeDamage',
  mobility: 'disable',
  magicBurst: 'save',
  healReliant: 'healReduction',
  spellImmune: 'bkbPiercingDisable',
};

export const POSITION_LABELS: Record<Position, string> = {
  1: 'Carry',
  2: 'Mid',
  3: 'Offlane',
  4: 'Support',
  5: 'Hard support',
};

export const TAG_DEFINITIONS: Record<RatingKey, string> = {
  initiation: 'Can start a fight with a strong engage',
  counterInitiation: 'Can punish or turn around an enemy initiation',
  disable: 'Stuns, hexes, roots or silences enemies',
  bkbPiercingDisable: 'Disable that works through BKB/spell immunity',
  pickoff: 'Can catch and kill a lone target quickly',
  aoeDamage: 'Deals damage to several enemies at once',
  burst: 'Deals a lot of damage in a short window',
  sustainedDamage: 'Deals high damage over a longer fight',
  frontline: 'Durable enough to absorb damage at the front',
  save: 'Can rescue allies from death or dangerous spells',
  sustain: 'Heals or shields allies during fights',
  dispel: 'Removes debuffs from allies or buffs from enemies',
  waveclear: 'Clears creep waves quickly, defends towers',
  push: 'Takes towers and pushes lanes fast',
  splitPush: 'Can pressure a lane alone while the team defends',
  mapPressure: 'Forces the enemy to respond across the map',
  earlyRoshan: 'Can kill Roshan early',
  laning: 'Strong in the laning stage',
  setup: 'Big AoE lockdown that sets up a teamfight (e.g. Black Hole, Ravage)',
  followUp: 'AoE damage that needs enemies held in place',
  healReduction: 'Cuts enemy healing and regeneration',
};

export const THREAT_DEFINITIONS: Record<Threat, string> = {
  tanky: 'Has high effective HP and is hard to kill',
  illusions: 'Creates illusions that deal or soak damage',
  mobility: 'Can escape or close distance instantly',
  magicBurst: 'Deals heavy magical damage quickly',
  healReliant: 'Depends on healing or regeneration to survive',
  spellImmune: 'Can become immune to most spells',
};
