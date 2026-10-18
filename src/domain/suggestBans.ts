import { HEROES } from '../data/heroes';
import type { HeroId } from '../data/heroes';
import type { DraftContext } from './suggestPicks';
import { THREAT_ANSWER, THREAT_LABELS } from './tags';
import type { Position, Reason, Threat } from './types';

export function suggestBans(
  ctx: DraftContext,
  watchlist: Record<HeroId, 1 | 2 | 3>,
  limit = 5,
): { heroId: HeroId; score: number; reasons: Reason[] }[] {
  const taken = new Set<HeroId>([...ctx.ourPicks.map((p) => p.heroId), ...ctx.enemyPicks, ...ctx.bans]);
  const available = ctx.available ? new Set(ctx.available) : null;
  const filled = new Set(ctx.ourPicks.map((p) => p.position));

  // Who could still answer a threat: our picks plus pickable open-pool heroes, each at its position.
  const answerers: { heroId: HeroId; position: Position }[] = [...ctx.ourPicks];
  const ownPickable = new Set<HeroId>(); // we never suggest banning our own prospective picks
  for (const player of ctx.players) {
    if (filled.has(player.position)) continue;
    for (const entry of player.pool) {
      if (taken.has(entry.heroId)) continue;
      if (available && !available.has(entry.heroId)) continue;
      answerers.push({ heroId: entry.heroId, position: player.position });
      ownPickable.add(entry.heroId);
    }
  }
  const coverageOf = (threat: Threat) => {
    const key = THREAT_ANSWER[threat];
    let best = 0;
    for (const a of answerers) best = Math.max(best, ctx.profileOf(a.heroId, a.position)?.ratings[key] ?? 0);
    return best;
  };

  const out: { heroId: HeroId; score: number; reasons: Reason[] }[] = [];
  for (const hero of HEROES) {
    if (taken.has(hero.id) || ownPickable.has(hero.id)) continue;
    if (available && !available.has(hero.id)) continue;
    const reasons: Reason[] = [];
    for (const threat of ctx.threats[hero.id] ?? []) {
      const coverage = coverageOf(threat);
      if (coverage < 2) {
        reasons.push({ label: `We lack answer to ${THREAT_LABELS[threat].toLowerCase()}`, points: 2 - coverage });
      }
    }
    const weight = watchlist[hero.id];
    if (weight) reasons.push({ label: 'Watchlist', points: weight });
    const score = reasons.reduce((sum, r) => sum + r.points, 0);
    if (score <= 0) continue;
    reasons.sort((a, b) => b.points - a.points);
    out.push({ heroId: hero.id, score, reasons });
  }
  out.sort((a, b) => b.score - a.score || a.heroId - b.heroId);
  return out.slice(0, limit);
}
