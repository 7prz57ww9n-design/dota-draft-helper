import { initialState, useStore } from './store';

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
