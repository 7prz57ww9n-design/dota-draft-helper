import type { AnswerTag, Position, RatingKey, TeamTag, Threat } from './types';

export const TEAM_TAGS: TeamTag[] = [
  'initiation', 'counterInitiation', 'disable', 'bkbPiercingDisable', 'pickoff',
  'aoeDamage', 'burst', 'sustainedDamage', 'frontline', 'save', 'sustain',
  'dispel', 'waveclear', 'push', 'splitPush', 'mapPressure', 'earlyRoshan',
  'laning', 'setup', 'followUp',
];

export const ANSWER_TAGS: AnswerTag[] = [
  'armorReduction', 'aoeCleave', 'detection', 'trueStrike',
  'instantDisable', 'magicResist', 'healReduction',
];

export const THREATS: Threat[] = [
  'tanky', 'illusions', 'invisibility', 'evasion',
  'mobility', 'magicBurst', 'healReliant', 'spellImmune',
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
  armorReduction: 'Armor reduction',
  aoeCleave: 'AoE / cleave',
  detection: 'Detection',
  trueStrike: 'True strike',
  instantDisable: 'Instant disable',
  magicResist: 'Magic resistance',
  healReduction: 'Heal reduction',
};

export const THREAT_LABELS: Record<Threat, string> = {
  tanky: 'Tanky',
  illusions: 'Illusions',
  invisibility: 'Invisibility',
  evasion: 'Evasion',
  mobility: 'Mobility',
  magicBurst: 'Magic burst',
  healReliant: 'Heal-reliant',
  spellImmune: 'Spell immunity',
};

export const THREAT_ANSWER: Record<Threat, RatingKey> = {
  tanky: 'armorReduction',
  illusions: 'aoeCleave',
  invisibility: 'detection',
  evasion: 'trueStrike',
  mobility: 'instantDisable',
  magicBurst: 'magicResist',
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
