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
    const m = migratePersisted(old, 0);
    expect(m.profiles[7].ratings).toEqual({ initiation: 3 });
    expect(m.profiles[7].power).toEqual({ early: 1, mid: 2, late: 1 });
    expect(m.threats).toEqual({ 32: ['mobility'] });
  });
});
