import { computeCoverage } from './coverage';
import { suggestPicks } from './suggestPicks';
import {
  AXE, CRYSTAL_MAIDEN, JUGGERNAUT, LION, MAGNUS, NAGA_SIREN, PHANTOM_LANCER, SVEN, TIDEHUNTER,
  makeContext, player, profile, profilesAt, profilesOf,
} from './testFixtures';

const find = (s: ReturnType<typeof suggestPicks>, id: number) => s.top.find((x) => x.heroId === id);
const reason = (s: { reasons: { label: string; points: number }[] } | undefined, text: string) =>
  s?.reasons.find((r) => r.label.includes(text));

describe('suggestPicks', () => {
  it('prefers missing must-have', () => {
    const ctx = makeContext({
      players: [player(1, [AXE, SVEN])],
      profileOf: profilesOf(profile(AXE, { waveclear: 3 }), profile(SVEN, { burst: 3 })),
    });
    const s = suggestPicks(ctx);
    expect(s.top[0].heroId).toBe(AXE);
    expect(s.top[0].score).toBe(6);
    expect(find(s, SVEN)!.score).toBe(3);
  });

  it('saturates once coverage meets target', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN]), player(2, [AXE]), player(3, [JUGGERNAUT])],
      profileOf: profilesOf(
        profile(AXE, { waveclear: 3 }),
        profile(JUGGERNAUT, { waveclear: 3 }, 'magical'),
        profile(SVEN, { waveclear: 3 }),
      ),
      ourPicks: [{ heroId: AXE, position: 2 }, { heroId: JUGGERNAUT, position: 3 }],
    });
    const s = find(suggestPicks(ctx), SVEN)!;
    expect(s.score).toBe(0);
    expect(reason(s, 'Waveclear')).toBeUndefined();
  });

  it('enemy threat boosts answer', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN])],
      profileOf: profilesOf(profile(SVEN, { aoeDamage: 3 })),
      threats: { [PHANTOM_LANCER]: ['illusions'], [NAGA_SIREN]: ['illusions'] },
      enemyPicks: [PHANTOM_LANCER, NAGA_SIREN],
    });
    const s = find(suggestPicks(ctx), SVEN)!;
    const r = reason(s, 'illusions')!;
    expect(r.points).toBeCloseTo(4.5);
    expect(r.label).toContain('Phantom Lancer');
    expect(r.label).toContain('Naga Siren');
    expect(s.score).toBeCloseTo(4.5);
  });

  it('comfort differs by 4 between comfort 3 and 1', () => {
    const score = (comfort: 1 | 3) =>
      suggestPicks(makeContext({
        players: [player(1, [{ heroId: SVEN, comfort }])],
        profileOf: profilesOf(profile(SVEN)),
      })).top[0].score;
    expect(score(3) - score(1)).toBe(4);
  });

  it('scores each position with that player\'s comfort; top shows the best position plus alternatives', () => {
    const ctx = makeContext({
      players: [
        player(1, [{ heroId: SVEN, comfort: 1 }]),
        player(2, [{ heroId: SVEN, comfort: 3 }]),
      ],
    });
    const { top, bestByPosition } = suggestPicks(ctx);
    expect(top).toHaveLength(1);
    expect(top[0].positions).toEqual([2]);
    expect(reason(top[0], 'Comfort')!.points).toBe(2);
    expect(top[0].alternatives).toEqual([{ position: 1, score: top[0].score - 4 }]);
    expect(reason(bestByPosition[1]!, 'Comfort')!.points).toBe(-2);
  });

  it('uses the ratings for the position a hero would be played at', () => {
    const ctx = makeContext({
      players: [player(1, [AXE]), player(4, [AXE])],
      profileOf: profilesAt([1, profile(AXE, { push: 3 })], [4, profile(AXE, { disable: 3, save: 2 })]),
    });
    const { top, bestByPosition } = suggestPicks(ctx);
    expect(reason(bestByPosition[1]!, 'Push')).toBeDefined();
    expect(reason(bestByPosition[1]!, 'Disable')).toBeUndefined();
    expect(reason(bestByPosition[4]!, 'Disable')).toBeDefined();
    expect(reason(bestByPosition[4]!, 'Push')).toBeUndefined();
    expect(top[0].positions).toEqual([4]); // disable 6 + save 2 beats push 6
  });

  it('counts a picked hero with the ratings of the position it was picked at', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN]), player(4, [AXE])],
      profileOf: profilesAt(
        [1, profile(AXE, { waveclear: 3 })], [4, profile(AXE, { disable: 3 })],
        [1, profile(SVEN, { waveclear: 3, disable: 3 })],
      ),
      ourPicks: [{ heroId: AXE, position: 4 }],
    });
    const sven = find(suggestPicks(ctx), SVEN)!;
    expect(reason(sven, 'Waveclear')!.points).toBe(6); // Axe at pos 4 has no waveclear: full gap
    expect(reason(sven, 'Disable')!.points).toBe(6); // target 6 − Axe's 3 = gap 3, ×2 must-have
  });

  it('synergy and lane duo', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN]), player(4, [MAGNUS])],
      profileOf: profilesOf(profile(SVEN), profile(MAGNUS)),
      synergies: [{ a: SVEN, b: MAGNUS, strength: 2, laneDuo: true }],
      ourPicks: [{ heroId: MAGNUS, position: 4 }],
    });
    const s = find(suggestPicks(ctx), SVEN)!;
    expect(reason(s, 'Synergy')!.points).toBe(2);
    expect(reason(s, 'Synergy')!.label).toBe('Synergy with Magnus');
    expect(reason(s, 'Lane duo')!.points).toBe(1);
  });

  it('emits one synergy reason per partner and omits zero strength', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN]), player(4, [MAGNUS]), player(3, [AXE]), player(5, [LION])],
      profileOf: profilesOf(profile(SVEN), profile(MAGNUS), profile(AXE), profile(LION, {}, 'magical')),
      synergies: [
        { a: SVEN, b: MAGNUS, strength: 2, laneDuo: false },
        { a: SVEN, b: AXE, strength: 1, laneDuo: false },
        { a: SVEN, b: LION, strength: 0, laneDuo: false },
      ],
      ourPicks: [
        { heroId: MAGNUS, position: 4 }, { heroId: AXE, position: 3 }, { heroId: LION, position: 5 },
      ],
    });
    const s = find(suggestPicks(ctx), SVEN)!;
    expect(s.reasons.filter((r) => r.label.startsWith('Synergy'))).toEqual([
      { label: 'Synergy with Magnus', points: 2 },
      { label: 'Synergy with Axe', points: 1 },
    ]);
    expect(s.score).toBe(3);
  });

  it('synergy pairs are unordered', () => {
    const base = {
      players: [player(1, [SVEN]), player(4, [MAGNUS])],
      ourPicks: [{ heroId: MAGNUS, position: 4 as const }],
    };
    const a = suggestPicks(makeContext({ ...base, synergies: [{ a: SVEN, b: MAGNUS, strength: 3, laneDuo: false }] }));
    const b = suggestPicks(makeContext({ ...base, synergies: [{ a: MAGNUS, b: SVEN, strength: 3, laneDuo: false }] }));
    expect(find(a, SVEN)!.score).toBe(3);
    expect(find(b, SVEN)!.score).toBe(3);
  });

  it('combo: our setup 3 and candidate followUp 2', () => {
    const profiles = profilesOf(profile(MAGNUS, { setup: 3 }), profile(SVEN, { followUp: 2 }));
    const ctx = makeContext({
      players: [player(1, [SVEN]), player(3, [MAGNUS])],
      profileOf: profiles,
      ourPicks: [{ heroId: MAGNUS, position: 3 }],
    });
    expect(computeCoverage([profiles(MAGNUS, 3)]).setup).toBe(3);
    const s = find(suggestPicks(ctx), SVEN)!;
    expect(reason(s, 'Combo')!.points).toBe(2);
  });

  it('flex only with fewer than 2 picks', () => {
    const players = [player(1, [AXE]), player(2, [AXE]), player(4, [SVEN]), player(5, [SVEN])];
    const profiles = profilesOf(profile(AXE), profile(SVEN, {}, 'magical'));
    const zero = suggestPicks(makeContext({ players, profileOf: profiles }));
    expect(reason(find(zero, SVEN), 'Flex')!.points).toBe(1);
    const two = suggestPicks(makeContext({
      players: [...players, player(3, [JUGGERNAUT]), player(2, [LION])],
      profileOf: profiles,
      ourPicks: [{ heroId: JUGGERNAUT, position: 3 }, { heroId: LION, position: 2 }],
    }));
    expect(reason(find(two, SVEN), 'Flex')).toBeUndefined();
  });

  it('damage type penalty', () => {
    const profiles = profilesOf(
      profile(CRYSTAL_MAIDEN, {}, 'magical'), profile(LION, {}, 'magical'),
      profile(MAGNUS, {}, 'magical'), profile(SVEN, {}, 'physical'),
    );
    const ctx = makeContext({
      players: [player(1, [MAGNUS, SVEN])],
      profileOf: profiles,
      ourPicks: [{ heroId: CRYSTAL_MAIDEN, position: 5 }, { heroId: LION, position: 4 }],
    });
    const s = suggestPicks(ctx);
    expect(reason(find(s, MAGNUS), 'magical')!.points).toBe(-2);
    expect(reason(find(s, SVEN), 'damage')).toBeUndefined();
  });

  it('hero without a profile is still a candidate with no penalty', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN])],
      ourPicks: [{ heroId: LION, position: 4 }, { heroId: MAGNUS, position: 3 }],
      profileOf: profilesOf(profile(LION, {}, 'magical'), profile(MAGNUS, {}, 'magical')),
    });
    expect(find(suggestPicks(ctx), SVEN)!.score).toBe(0);
  });

  it('excludes picked, banned, enemy-picked and unavailable heroes', () => {
    const ctx = makeContext({
      players: [player(1, [AXE, SVEN, JUGGERNAUT, LION, TIDEHUNTER]), player(2, [MAGNUS])],
      ourPicks: [{ heroId: MAGNUS, position: 2 }],
      bans: [AXE],
      enemyPicks: [SVEN],
    });
    const ids = suggestPicks(ctx, 10).top.map((x) => x.heroId).sort((a, b) => a - b);
    expect(ids).toEqual([JUGGERNAUT, LION, TIDEHUNTER].sort((a, b) => a - b));
    const restricted = suggestPicks({ ...ctx, available: [LION] }, 10);
    expect(restricted.top.map((x) => x.heroId)).toEqual([LION]);
  });

  it('excludes filled positions', () => {
    const ctx = makeContext({
      players: [player(1, [AXE]), player(2, [SVEN])],
      ourPicks: [{ heroId: LION, position: 1 }],
    });
    const s = suggestPicks(ctx);
    expect(s.top.map((x) => x.heroId)).toEqual([SVEN]);
    expect(1 in s.bestByPosition).toBe(false);
    expect(s.bestByPosition[2]?.heroId).toBe(SVEN);
    expect(s.bestByPosition[3]).toBeNull();
  });

  it('empty pools give no top and null for every open position', () => {
    const s = suggestPicks(makeContext({ players: [player(1, []), player(2, [])] }));
    expect(s.top).toEqual([]);
    expect(Object.keys(s.bestByPosition).sort()).toEqual(['1', '2', '3', '4', '5']);
    for (const p of [1, 2, 3, 4, 5] as const) expect(s.bestByPosition[p]).toBeNull();
  });

  it('sorts by score desc with heroId tie-break, limits, and sorts reasons by magnitude', () => {
    const ctx = makeContext({
      players: [player(1, [SVEN, AXE, LION, JUGGERNAUT])],
      profileOf: profilesOf(
        profile(SVEN, { burst: 1, waveclear: 3 }), profile(AXE), profile(LION), profile(JUGGERNAUT),
      ),
    });
    const { top } = suggestPicks(ctx, 3);
    expect(top.map((x) => x.heroId)).toEqual([SVEN, AXE, JUGGERNAUT]);
    const abs = top[0].reasons.map((r) => Math.abs(r.points));
    expect(abs).toEqual([...abs].sort((a, b) => b - a));
    expect(top[0].reasons.every((r) => r.points !== 0)).toBe(true);
  });
});
