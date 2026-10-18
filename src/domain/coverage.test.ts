import { computeCoverage, effectiveTargets, enemyThreatCounts } from './coverage';
import { WIN_PROFILES } from './winConditions';
import { THREATS } from './tags';
import type { HeroProfile, Threat, WinProfile } from './types';

const prof = (heroId: number, ratings: HeroProfile['ratings']): HeroProfile => ({
  heroId, ratings, power: { early: 1, mid: 1, late: 1 }, damageType: 'physical',
});
const counts = (o: Partial<Record<Threat, number>>) =>
  Object.fromEntries(THREATS.map((t) => [t, o[t] ?? 0])) as Record<Threat, number>;

describe('computeCoverage', () => {
  it('sums ratings across picks', () => {
    const profiles = { 1: prof(1, { waveclear: 2 }), 2: prof(2, { waveclear: 3, burst: 1 }) };
    const c = computeCoverage([1, 2], profiles);
    expect(c.waveclear).toBe(5);
    expect(c.burst).toBe(1);
    expect(c.disable).toBe(0);
  });
  it('treats heroes without a profile as zeros', () => {
    const c = computeCoverage([99], {});
    expect(Object.values(c).every((v) => v === 0)).toBe(true);
    expect(Object.keys(c)).toHaveLength(21);
  });
});

describe('enemyThreatCounts', () => {
  it('counts threats, defaults to 0, tolerates unknown heroes', () => {
    const c = enemyThreatCounts([1, 2, 3], { 1: ['illusions', 'tanky'], 2: ['illusions'] });
    expect(c.illusions).toBe(2);
    expect(c.tanky).toBe(1);
    expect(c.mobility).toBe(0);
    expect(Object.keys(c)).toHaveLength(THREATS.length);
  });
});

describe('effectiveTargets', () => {
  it('caps boost at 4 and sets weight 1.5', () => {
    const r = effectiveTargets('balanced', counts({ illusions: 3 }));
    expect(r.targets.aoeDamage).toBe(8); // balanced base 4 + capped boost 4
    expect(r.weights.aoeDamage).toBe(1.5);
    expect(r.threatBoosted.aoeDamage).toBe('illusions');
  });
  it('gives must-have weight 2, others 1', () => {
    const r = effectiveTargets('balanced', counts({}));
    expect(r.weights.waveclear).toBe(2);
    expect(r.weights.burst).toBe(1);
    expect(r.targets.sustain).toBe(2);
    expect(r.targets.earlyRoshan).toBe(0);
  });
  it('boosts weight for single threats', () => {
    expect(effectiveTargets('fightEarly', counts({ illusions: 1 })).weights.aoeDamage).toBe(2); // must-have in fightEarly wins over 1.5
    const b = effectiveTargets('balanced', counts({ tanky: 1 }));
    expect(b.weights.sustainedDamage).toBe(1.5);
    expect(b.targets.sustainedDamage).toBe(5); // balanced base 3 + 2
  });
  it('must-have and boosted gives weight 2', () => {
    const profiles = {
      ...WIN_PROFILES,
      balanced: { ...WIN_PROFILES.balanced, mustHave: ['bkbPiercingDisable'] } as WinProfile,
    };
    const r = effectiveTargets('balanced', counts({ spellImmune: 1 }), profiles);
    expect(r.weights.bkbPiercingDisable).toBe(2);
    expect(r.targets.bkbPiercingDisable).toBe(4);
    expect(r.threatBoosted.bkbPiercingDisable).toBe('spellImmune');
  });
});
