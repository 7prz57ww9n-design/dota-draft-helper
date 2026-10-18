import { suggestBans } from './suggestBans';
import {
  AXE, JUGGERNAUT, MAGNUS, NAGA_SIREN, SVEN, makeContext, player, profile, profilesOf,
} from './testFixtures';

describe('suggestBans', () => {
  const find = (list: ReturnType<typeof suggestBans>, id: number) => list.find((s) => s.heroId === id);

  it('flags a threat we have no answer to', () => {
    const ctx = makeContext({
      players: [player(1, [JUGGERNAUT])],
      profiles: profilesOf(profile(JUGGERNAUT, { aoeCleave: 1 })),
      threats: { [NAGA_SIREN]: ['illusions'] },
    });
    const naga = find(suggestBans(ctx, {}, 200), NAGA_SIREN);
    expect(naga?.score).toBe(1);
    expect(naga?.reasons).toEqual([{ label: 'We lack answer to illusions', points: 1 }]);
  });

  it('gives no threat score when our pool has a strong answer', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN])],
      profiles: profilesOf(profile(SVEN, { aoeCleave: 3 })),
      threats: { [NAGA_SIREN]: ['illusions'] },
    });
    expect(find(suggestBans(ctx, {}, 200), NAGA_SIREN)).toBeUndefined();
  });

  it('ignores answers that are picked by the enemy, banned, or unavailable', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN, AXE])],
      profiles: profilesOf(profile(SVEN, { aoeCleave: 3 }), profile(AXE, { aoeCleave: 3 })),
      threats: { [NAGA_SIREN]: ['illusions'] },
      enemyPicks: [SVEN],
      available: [SVEN, AXE, NAGA_SIREN],
      bans: [AXE],
    });
    expect(find(suggestBans(ctx, {}, 200), NAGA_SIREN)?.score).toBe(2);
  });

  it('uses answers from our picks too', () => {
    const ctx = makeContext({
      profiles: profilesOf(profile(SVEN, { aoeCleave: 2 })),
      threats: { [NAGA_SIREN]: ['illusions'] },
      ourPicks: [{ heroId: SVEN, position: 1 }],
    });
    expect(find(suggestBans(ctx, {}, 200), NAGA_SIREN)).toBeUndefined();
  });

  it('adds watchlist weight', () => {
    const list = suggestBans(makeContext(), { [MAGNUS]: 3 });
    expect(list).toEqual([{ heroId: MAGNUS, score: 3, reasons: [{ label: 'Watchlist', points: 3 }] }]);
  });

  it('does not throw for heroes absent from threats and excludes picked/banned', () => {
    const ctx = makeContext({ ourPicks: [{ heroId: AXE, position: 3 }], enemyPicks: [SVEN], bans: [MAGNUS] });
    const list = suggestBans(ctx, { [AXE]: 3, [SVEN]: 3, [MAGNUS]: 3, [JUGGERNAUT]: 1 });
    expect(list.map((s) => s.heroId)).toEqual([JUGGERNAUT]);
  });

  it('sorts by score then id and respects the limit', () => {
    const list = suggestBans(makeContext(), { [MAGNUS]: 2, [AXE]: 2, [SVEN]: 3 }, 2);
    expect(list.map((s) => s.heroId)).toEqual([SVEN, AXE]);
  });
});
