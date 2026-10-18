import { initialState, migratePersisted, useStore } from './store';

describe('setWeFirst', () => {
  it('changes only weFirst and keeps actions', () => {
    useStore.setState({ ...initialState });
    useStore.getState().draftApply({ side: 'enemy', kind: 'ban', heroId: 9 });
    useStore.getState().setWeFirst(false);
    const d = useStore.getState().draft;
    expect(d.weFirst).toBe(false);
    expect(d.actions).toHaveLength(1);
    expect(d.mode).toBe('captainsMode');
  });
});

describe('migratePersisted', () => {
  it('drops removed rating tags and threats from data saved by older versions', () => {
    const old = {
      ...initialState,
      profiles: {
        7: { heroId: 7, ratings: { initiation: 3, aoeCleave: 2, armorReduction: 1 }, power: { early: 1, mid: 2, late: 1 }, damageType: 'magical' },
      },
      threats: { 32: ['invisibility', 'mobility'], 44: ['evasion'] },
    };
    const m = migratePersisted({ ...old, players: [{ id: 'pos-2', name: 'A', position: 2, pool: [{ heroId: 7, comfort: 2 }] }] }, 0);
    expect(m.profiles['7@2'].ratings).toEqual({ initiation: 3 });
    expect(m.profiles['7@2'].power).toEqual({ early: 1, mid: 2, late: 1 });
    expect(m.threats).toEqual({ 32: ['mobility'] });
  });
});

describe('per-position ratings', () => {
  beforeEach(() => useStore.setState({ ...initialState }));

  it('edits one position without touching the other; copy and reset work per position', () => {
    const s = useStore.getState();
    s.setRating(7, 1, 'push', 3);
    s.setRating(7, 4, 'save', 2);
    expect(useStore.getState().profiles['7@1'].ratings).toEqual({ push: 3 });
    expect(useStore.getState().profiles['7@4'].ratings).toEqual({ save: 2 });

    s.copyProfile(7, 1, 4);
    expect(useStore.getState().profiles['7@4'].ratings).toEqual({ push: 3 });
    s.setRating(7, 4, 'disable', 1);
    expect(useStore.getState().profiles['7@1'].ratings).toEqual({ push: 3 }); // a copy, not shared

    s.resetProfile(7, 1);
    expect(useStore.getState().profiles['7@1']).toBeUndefined();
    s.copyProfile(7, 1, 4); // copying defaults resets the target to defaults
    expect(useStore.getState().profiles['7@4']).toBeUndefined();
  });

  it('v1 → v2 migration copies per-hero edits to each position whose pool has the hero', () => {
    const v1 = {
      ...initialState,
      players: [
        { id: 'pos-1', name: 'A', position: 1 as const, pool: [{ heroId: 7, comfort: 3 as const }] },
        { id: 'pos-4', name: 'B', position: 4 as const, pool: [{ heroId: 7, comfort: 2 as const }] },
      ],
      profiles: { 7: { heroId: 7, ratings: { initiation: 3 }, power: { early: 1, mid: 2, late: 1 }, damageType: 'magical' } },
    };
    const m = migratePersisted(v1, 1);
    expect(Object.keys(m.profiles).sort()).toEqual(['7@1', '7@4']);
    expect(m.profiles['7@4'].ratings).toEqual({ initiation: 3 });
  });
});
