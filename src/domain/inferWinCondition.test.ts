import { inferWinCondition } from './inferWinCondition';
import { AXE, JUGGERNAUT, SVEN, profile, profilesOf } from './testFixtures';

describe('inferWinCondition', () => {
  it('returns null with fewer than 2 picks', () => {
    expect(inferWinCondition([AXE], profilesOf(profile(AXE)))).toBeNull();
    expect(inferWinCondition([], {})).toBeNull();
  });

  it('prefers pickoff for pickoff/burst/mapPressure picks', () => {
    const profiles = profilesOf(
      profile(AXE, { pickoff: 3, burst: 3, mapPressure: 3 }, 'physical', { early: 3, mid: 2 }),
      profile(JUGGERNAUT, { pickoff: 3, burst: 3, mapPressure: 3 }, 'physical', { early: 3, mid: 2 }),
    );
    const res = inferWinCondition([AXE, JUGGERNAUT], profiles)!;
    expect(res[0].win).toBe('pickoff');
    expect(res).toHaveLength(4);
    expect(res.map((r) => r.win)).not.toContain('balanced');
    for (let i = 1; i < res.length; i++) expect(res[i - 1].fit).toBeGreaterThanOrEqual(res[i].fit);
  });

  it('prefers lateScaling for late-power picks and counts missing profiles as zero power', () => {
    const profiles = profilesOf(profile(AXE, { save: 3, sustainedDamage: 3 }, 'physical', { late: 3 }));
    const res = inferWinCondition([AXE, SVEN], profiles)!;
    expect(res[0].win).toBe('lateScaling');
  });
});
