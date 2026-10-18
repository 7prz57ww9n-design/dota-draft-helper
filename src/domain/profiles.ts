import type { HeroId } from '../data/heroes';
import type { HeroProfile, Player, Position } from './types';

/**
 * Looks up a hero's ratings as played at a position. A hero in two pools
 * (e.g. carry and support) can be rated differently for each role.
 */
export type ProfileSource = (heroId: HeroId, position: Position) => HeroProfile | undefined;

/** Storage key for a hero's ratings at one position, e.g. "7@4". */
export const profileKey = (heroId: HeroId, position: Position): string => `${heroId}@${position}`;

/**
 * Converts ratings stored once per hero (older saves and export files) into
 * per-position ratings: each hero's ratings are copied to every position whose
 * pool contains it. Heroes in no pool are dropped (their ratings had no effect).
 */
export function expandToPositions(
  perHero: Record<HeroId, HeroProfile>,
  players: Player[],
): Record<string, HeroProfile> {
  const out: Record<string, HeroProfile> = {};
  for (const player of players) {
    for (const entry of player.pool) {
      const p = perHero[entry.heroId];
      if (p) out[profileKey(entry.heroId, player.position)] = { ...p, ratings: { ...p.ratings }, power: { ...p.power } };
    }
  }
  return out;
}

export function parseProfileKey(key: string): { heroId: HeroId; position: Position } | null {
  const m = /^(\d+)@([1-5])$/.exec(key);
  return m ? { heroId: Number(m[1]), position: Number(m[2]) as Position } : null;
}
