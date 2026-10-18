import type { HeroId } from './heroes';
import seed from './ratings.seed.json';
import type { DamageType, HeroProfile, Rating, RatingKey } from '../domain/types';

interface SeedEntry { ratings: Partial<Record<RatingKey, Rating>>; power: HeroProfile['power']; damageType: DamageType }

/** Starting ratings for every hero, derived from hero kits. The team's own edits override them. */
export const DEFAULT_PROFILES: Record<HeroId, HeroProfile> = Object.fromEntries(
  Object.entries(seed as Record<string, SeedEntry>).map(([id, e]) => [Number(id), { heroId: Number(id), ...e }]),
);

export function defaultProfile(heroId: HeroId): HeroProfile {
  return DEFAULT_PROFILES[heroId] ?? { heroId, ratings: {}, power: { early: 0, mid: 0, late: 0 }, damageType: 'physical' };
}

/**
 * Merges the team's stored edits over the defaults. Stored ratings are
 * overrides (an explicit 0 counts); power and damage type are stored whole.
 */
export function withDefaults(profiles: Record<HeroId, HeroProfile>): Record<HeroId, HeroProfile> {
  const merged: Record<HeroId, HeroProfile> = { ...DEFAULT_PROFILES };
  for (const [id, p] of Object.entries(profiles)) {
    const d = defaultProfile(Number(id));
    merged[Number(id)] = { ...p, ratings: { ...d.ratings, ...p.ratings } };
  }
  return merged;
}
