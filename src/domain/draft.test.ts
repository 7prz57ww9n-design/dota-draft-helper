import type { HeroId } from '../data/heroes';
import { applyAction, nextExpected, positionOptions, toContext, undo, type DraftState } from './draft';
import { CM_SEQUENCE } from './draftOrder';
import { AXE, LION, MAGNUS, player, profilesOf, profile, SVEN, TIDEHUNTER } from './testFixtures';

const base = (over: Partial<DraftState> = {}): DraftState => ({
  mode: 'captainsMode', weFirst: true, available: null, actions: [], win: 'balanced', ...over,
});

describe('CM_SEQUENCE', () => {
  test('has 24 steps, 7 bans and 5 picks per team', () => {
    expect(CM_SEQUENCE).toHaveLength(24);
    for (const team of ['first', 'second'] as const) {
      expect(CM_SEQUENCE.filter((s) => s.team === team && s.kind === 'ban')).toHaveLength(7);
      expect(CM_SEQUENCE.filter((s) => s.team === team && s.kind === 'pick')).toHaveLength(5);
    }
  });
});

describe('nextExpected', () => {
  test('maps first/second to us/enemy using weFirst', () => {
    expect(nextExpected(base())).toEqual({ side: 'us', kind: 'ban' });
    expect(nextExpected(base({ weFirst: false }))).toEqual({ side: 'enemy', kind: 'ban' });
    const s = base({ weFirst: false, actions: [{ side: 'enemy', kind: 'ban', heroId: 1 }, { side: 'enemy', kind: 'ban', heroId: 2 }] });
    expect(nextExpected(s)).toEqual({ side: 'us', kind: 'ban' });
  });
  test('null in freeform', () => {
    expect(nextExpected(base({ mode: 'freeform' }))).toBeNull();
  });
  test('null once the sequence is exhausted', () => {
    const actions = CM_SEQUENCE.map((_, i) => ({ side: 'us' as const, kind: 'ban' as const, heroId: i + 1 }));
    expect(nextExpected(base({ actions }))).toBeNull();
  });
});

describe('applyAction', () => {
  test('is pure and appends', () => {
    const s = base();
    const n = applyAction(s, { side: 'enemy', kind: 'pick', heroId: AXE });
    expect(s.actions).toHaveLength(0);
    expect(n.actions).toHaveLength(1);
  });
  test('throws if hero already picked or banned', () => {
    const s = applyAction(base(), { side: 'enemy', kind: 'ban', heroId: AXE });
    expect(() => applyAction(s, { side: 'us', kind: 'pick', heroId: AXE, position: 1 })).toThrow();
    const s2 = applyAction(base(), { side: 'enemy', kind: 'pick', heroId: LION });
    expect(() => applyAction(s2, { side: 'us', kind: 'ban', heroId: LION })).toThrow();
  });
  test('throws if our pick position is already filled', () => {
    const s = applyAction(base(), { side: 'us', kind: 'pick', heroId: AXE, position: 3 });
    expect(() => applyAction(s, { side: 'us', kind: 'pick', heroId: LION, position: 3 })).toThrow();
  });
});

describe('undo', () => {
  test('restores previous state exactly', () => {
    const s = applyAction(base(), { side: 'us', kind: 'ban', heroId: AXE });
    const s2 = applyAction(s, { side: 'enemy', kind: 'pick', heroId: LION });
    expect(undo(s2)).toEqual(s);
  });
  test('no-op on empty', () => {
    const s = base();
    expect(undo(s)).toEqual(s);
  });
});

describe('positionOptions', () => {
  const players = [player(4, [LION, SVEN]), player(5, [LION, MAGNUS]), player(3, [TIDEHUNTER])];
  test('returns open positions whose pool has the hero', () => {
    expect(positionOptions(base(), players, LION)).toEqual([4, 5]);
  });
  test('empty once both positions are filled', () => {
    let s = applyAction(base(), { side: 'us', kind: 'pick', heroId: SVEN, position: 4 });
    s = applyAction(s, { side: 'us', kind: 'pick', heroId: MAGNUS, position: 5 });
    expect(positionOptions(s, players, LION)).toEqual([]);
  });
  test('enemy picks do not fill positions', () => {
    const s = applyAction(base(), { side: 'enemy', kind: 'pick', heroId: SVEN, position: 4 });
    expect(positionOptions(s, players, LION)).toEqual([4, 5]);
  });
});

describe('toContext', () => {
  test('derives ourPicks, enemyPicks, bans', () => {
    let s = base({ win: 'pickoff', available: [AXE as HeroId] });
    s = applyAction(s, { side: 'us', kind: 'pick', heroId: LION, position: 4 });
    s = applyAction(s, { side: 'enemy', kind: 'pick', heroId: AXE });
    s = applyAction(s, { side: 'us', kind: 'ban', heroId: SVEN });
    s = applyAction(s, { side: 'enemy', kind: 'ban', heroId: MAGNUS });
    const players = [player(4, [LION])];
    const profiles = profilesOf(profile(LION));
    const ctx = toContext(s, { players, profiles, threats: {}, synergies: [] });
    expect(ctx.ourPicks).toEqual([{ heroId: LION, position: 4 }]);
    expect(ctx.enemyPicks).toEqual([AXE]);
    expect(ctx.bans).toEqual([SVEN, MAGNUS]);
    expect(ctx.win).toBe('pickoff');
    expect(ctx.available).toEqual([AXE]);
    expect(ctx.players).toBe(players);
    expect(ctx.profiles).toBe(profiles);
  });
});
