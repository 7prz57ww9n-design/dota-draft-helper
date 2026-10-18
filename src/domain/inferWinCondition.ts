import type { HeroProfile, Phase, TeamTag, WinCondition } from './types';
import { WIN_PROFILES } from './winConditions';

const PHASES: Phase[] = ['early', 'mid', 'late'];
const CANDIDATES: WinCondition[] = ['fightEarly', 'pickoff', 'lateScaling', 'splitPush'];

/** ourPicks: our picked heroes' profiles, resolved for the positions they were picked at. */
export function inferWinCondition(
  ourPicks: (HeroProfile | undefined)[],
): { win: WinCondition; fit: number }[] | null {
  if (ourPicks.length < 2) return null;

  const coverage: Partial<Record<TeamTag, number>> = {};
  const meanPower: Record<Phase, number> = { early: 0, mid: 0, late: 0 };
  for (const p of ourPicks) {
    if (!p) continue;
    for (const [tag, rating] of Object.entries(p.ratings) as [TeamTag, number][]) {
      coverage[tag] = (coverage[tag] ?? 0) + rating;
    }
    for (const ph of PHASES) meanPower[ph] += p.power[ph] / ourPicks.length;
  }

  return CANDIDATES.map((win) => {
    const { targets, power } = WIN_PROFILES[win];
    const entries = Object.entries(targets) as [TeamTag, number][];
    const total = entries.reduce((sum, [, t]) => sum + t, 0);
    const covered = entries.reduce((sum, [tag, t]) => sum + Math.min(coverage[tag] ?? 0, t), 0);
    const powerFit = PHASES.reduce((sum, ph) => sum + power[ph] * meanPower[ph], 0) / 10;
    return { win, fit: (total > 0 ? covered / total : 0) + powerFit };
  }).sort((a, b) => b.fit - a.fit);
}
