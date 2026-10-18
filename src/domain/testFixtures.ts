import type { HeroId } from '../data/heroes';
import type { DraftContext } from './suggestPicks';
import { profileKey, type ProfileSource } from './profiles';
import type { DamageType, HeroProfile, Phase, Player, PoolEntry, Position, Rating, RatingKey } from './types';

// Real ids from heroes.json so localized names resolve.
export const AXE = 2;
export const CRYSTAL_MAIDEN = 5;
export const JUGGERNAUT = 8;
export const PHANTOM_LANCER = 12;
export const SVEN = 18;
export const LION = 26;
export const TIDEHUNTER = 29;
export const NAGA_SIREN = 89;
export const MAGNUS = 97;

export function profile(
  heroId: HeroId,
  ratings: Partial<Record<RatingKey, Rating>> = {},
  damageType: DamageType = 'physical',
  power: Partial<Record<Phase, Rating>> = {},
): HeroProfile {
  return { heroId, ratings, damageType, power: { early: 0, mid: 0, late: 0, ...power } };
}

/** Same ratings at every position. */
export function profilesOf(...list: HeroProfile[]): ProfileSource {
  const byHero = new Map(list.map((p) => [p.heroId, p]));
  return (heroId) => byHero.get(heroId);
}

/** Different ratings per position: entries are [position, profile]. */
export function profilesAt(...list: [Position, HeroProfile][]): ProfileSource {
  const byKey = new Map(list.map(([pos, p]) => [profileKey(p.heroId, pos), p]));
  return (heroId, position) => byKey.get(profileKey(heroId, position));
}

export function player(position: Position, pool: Array<HeroId | PoolEntry>): Player {
  return {
    id: `p${position}`,
    name: `Player ${position}`,
    position,
    pool: pool.map((e) => (typeof e === 'number' ? { heroId: e, comfort: 2 as const } : e)),
  };
}

export function makeContext(overrides: Partial<DraftContext> = {}): DraftContext {
  return {
    players: [],
    profileOf: () => undefined,
    threats: {},
    synergies: [],
    win: 'balanced',
    ourPicks: [],
    enemyPicks: [],
    bans: [],
    available: null,
    ...overrides,
  };
}
