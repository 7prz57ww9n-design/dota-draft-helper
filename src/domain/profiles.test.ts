import { expandToPositions, parseProfileKey, profileKey } from './profiles';
import { AXE, LION, SVEN, player, profile } from './testFixtures';

describe('profile keys', () => {
  test('round-trip hero and position', () => {
    expect(profileKey(7, 4)).toBe('7@4');
    expect(parseProfileKey('7@4')).toEqual({ heroId: 7, position: 4 });
    expect(parseProfileKey('7')).toBeNull();
    expect(parseProfileKey('7@6')).toBeNull();
  });
});

describe('expandToPositions', () => {
  test('copies per-hero ratings to every position whose pool has the hero', () => {
    const axe = profile(AXE, { initiation: 3 });
    const out = expandToPositions(
      { [AXE]: axe, [SVEN]: profile(SVEN, { push: 2 }) },
      [player(1, [AXE]), player(3, [AXE, LION])],
    );
    expect(Object.keys(out).sort()).toEqual(['2@1', '2@3']);
    expect(out['2@1']).toEqual(axe);
    expect(out['2@1']).not.toBe(out['2@3']); // independent copies, editable separately
  });
});
