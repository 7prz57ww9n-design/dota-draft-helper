import type { HeroId } from './heroes';
import seed from './ratings.seed.json';
import { profileKey, type ProfileSource } from '../domain/profiles';
import type { DamageType, HeroProfile, Position, Rating, RatingKey } from '../domain/types';

interface SeedEntry { ratings: Partial<Record<RatingKey, Rating>>; power: HeroProfile['power']; damageType: DamageType }

/** Starting ratings for every hero, derived from hero kits. The team's own edits override them. */
export const DEFAULT_PROFILES: Record<HeroId, HeroProfile> = Object.fromEntries(
  Object.entries(seed as Record<string, SeedEntry>).map(([id, e]) => [Number(id), { heroId: Number(id), ...e }]),
);

export function defaultProfile(heroId: HeroId): HeroProfile {
  return DEFAULT_PROFILES[heroId] ?? { heroId, ratings: {}, power: { early: 0, mid: 0, late: 0 }, damageType: 'physical' };
}

/**
 * The ratings in effect for a hero at a position: the team's stored edits for
 * that position over the hero's defaults. Stored ratings are overrides (an
 * explicit 0 counts); power and damage type are stored whole.
 */
export function effectiveProfile(stored: Record<string, HeroProfile>, heroId: HeroId, position: Position): HeroProfile {
  const d = defaultProfile(heroId);
  const p = stored[profileKey(heroId, position)];
  return p ? { ...p, ratings: { ...d.ratings, ...p.ratings } } : d;
}

export function makeProfileSource(stored: Record<string, HeroProfile>): ProfileSource {
  return (heroId, position) => effectiveProfile(stored, heroId, position);
}
