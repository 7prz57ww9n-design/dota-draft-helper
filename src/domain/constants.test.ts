import { ANSWER_TAGS, TEAM_TAGS, THREATS, THREAT_ANSWER } from './tags';
import { WIN_PROFILES } from './winConditions';

describe('domain constants', () => {
  it('maps every threat to a known rating key', () => {
    const keys: string[] = [...TEAM_TAGS, ...ANSWER_TAGS];
    for (const t of THREATS) expect(keys).toContain(THREAT_ANSWER[t]);
  });
  it('answers spellImmune with bkbPiercingDisable', () => {
    expect(THREAT_ANSWER.spellImmune).toBe('bkbPiercingDisable');
  });
  it('gives every must-have tag a positive target', () => {
    for (const p of Object.values(WIN_PROFILES))
      for (const tag of p.mustHave) expect(p.targets[tag] ?? 0).toBeGreaterThan(0);
  });
  it('keeps spec values', () => {
    expect(WIN_PROFILES.balanced.targets.waveclear).toBe(5);
    expect(WIN_PROFILES.lateScaling.power.late).toBe(2.5);
  });
});
