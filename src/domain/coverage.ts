import type { HeroId } from '../data/heroes';
import { ANSWER_TAGS, TEAM_TAGS, THREATS, THREAT_ANSWER } from './tags';
import type { HeroProfile, RatingKey, Threat, WinCondition, WinProfile } from './types';
import { WIN_PROFILES } from './winConditions';

const RATING_KEYS: RatingKey[] = [...TEAM_TAGS, ...ANSWER_TAGS];

function fill<K extends string, V>(keys: readonly K[], value: V): Record<K, V> {
  return Object.fromEntries(keys.map((k) => [k, value])) as Record<K, V>;
}

export function computeCoverage(
  picks: HeroId[],
  profiles: Record<HeroId, HeroProfile>,
): Record<RatingKey, number> {
  const out = fill(RATING_KEYS, 0);
  for (const id of picks) {
    const p = profiles[id];
    if (!p) continue;
    for (const k of RATING_KEYS) out[k] += p.ratings[k] ?? 0;
  }
  return out;
}

export function enemyThreatCounts(
  enemyPicks: HeroId[],
  threats: Record<HeroId, Threat[]>,
): Record<Threat, number> {
  const out = fill(THREATS, 0);
  for (const id of enemyPicks) {
    for (const t of threats[id] ?? []) out[t] += 1;
  }
  return out;
}

export function effectiveTargets(
  win: WinCondition,
  threatCounts: Record<Threat, number>,
  profiles: Record<WinCondition, WinProfile> = WIN_PROFILES,
): {
  targets: Record<RatingKey, number>;
  weights: Record<RatingKey, number>;
  threatBoosted: Partial<Record<RatingKey, Threat>>;
} {
  const profile = profiles[win];
  const targets = fill(RATING_KEYS, 0);
  const weights = fill(RATING_KEYS, 1);
  const threatBoosted: Partial<Record<RatingKey, Threat>> = {};

  for (const k of TEAM_TAGS) targets[k] = profile.targets[k] ?? 0;
  for (const k of profile.mustHave) weights[k] = Math.max(weights[k], 2);
  for (const t of THREATS) {
    const count = threatCounts[t] ?? 0;
    if (count <= 0) continue;
    const key = THREAT_ANSWER[t];
    targets[key] += Math.min(4, 2 * count);
    weights[key] = Math.max(weights[key], 1.5);
    threatBoosted[key] = t;
  }
  return { targets, weights, threatBoosted };
}
