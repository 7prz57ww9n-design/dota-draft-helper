import type { HeroId } from '../data/heroes';

export type Position = 1 | 2 | 3 | 4 | 5;
export type Rating = 0 | 1 | 2 | 3;
export type TeamTag =
  | 'initiation' | 'counterInitiation' | 'disable' | 'bkbPiercingDisable' | 'pickoff'
  | 'aoeDamage' | 'burst' | 'sustainedDamage' | 'frontline' | 'save' | 'sustain'
  | 'dispel' | 'waveclear' | 'push' | 'splitPush' | 'mapPressure' | 'earlyRoshan'
  | 'laning' | 'setup' | 'followUp';
export type AnswerTag =
  | 'armorReduction' | 'aoeCleave' | 'detection' | 'trueStrike'
  | 'instantDisable' | 'magicResist' | 'healReduction';
export type RatingKey = TeamTag | AnswerTag;
export type Threat =
  | 'tanky' | 'illusions' | 'invisibility' | 'evasion'
  | 'mobility' | 'magicBurst' | 'healReliant' | 'spellImmune';
export type Phase = 'early' | 'mid' | 'late';
export type DamageType = 'physical' | 'magical' | 'pure';
export type WinCondition = 'balanced' | 'fightEarly' | 'pickoff' | 'lateScaling' | 'splitPush';

export interface HeroProfile {
  heroId: HeroId;
  ratings: Partial<Record<RatingKey, Rating>>;
  power: Record<Phase, Rating>;
  damageType: DamageType;
}
export interface PoolEntry { heroId: HeroId; comfort: 1 | 2 | 3 }
export interface Player { id: string; name: string; position: Position; pool: PoolEntry[] }
export interface SynergyPair { a: HeroId; b: HeroId; strength: -2 | -1 | 0 | 1 | 2 | 3; laneDuo: boolean }
export interface WinProfile {
  targets: Partial<Record<TeamTag, number>>;
  mustHave: TeamTag[];
  power: Record<Phase, number>;
}
export interface Reason { label: string; points: number }
