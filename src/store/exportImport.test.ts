import { ImportError, exportData, parseImport } from './exportImport';
import { initialState, useStore } from './store';

beforeEach(() => {
  localStorage.clear();
  useStore.setState(initialState);
});

function populate() {
  const s = useStore.getState();
  s.upsertPlayer({ id: 'p1', name: 'Ann', position: 1, pool: [] });
  s.addToPool('p1', 1);
  s.addToPool('p1', 1);
  s.setComfort('p1', 1, 3);
  s.setRating(1, 'disable', 2);
  s.setPower(1, 'late', 3);
  s.setDamageType(1, 'magical');
  s.toggleThreat(2, 'tanky');
  s.upsertSynergy({ a: 1, b: 2, strength: 2, laneDuo: true });
  s.setWatch(3, 2);
}

describe('store', () => {
  it('creates default profile and ignores duplicate pool entries', () => {
    populate();
    const st = useStore.getState();
    expect(st.players[0].pool).toEqual([{ heroId: 1, comfort: 3 }]);
    expect(st.profiles[1]).toEqual({
      heroId: 1, ratings: { disable: 2 }, power: { early: 0, mid: 0, late: 3 }, damageType: 'magical',
    });
    expect(st.threats[2]).toEqual(['tanky']);
    st.toggleThreat(2, 'tanky');
    expect(useStore.getState().threats[2] ?? []).toEqual([]);
  });

  it('draftApply propagates errors and leaves state unchanged', () => {
    const a = { side: 'us', kind: 'pick', heroId: 5 } as const;
    useStore.getState().draftApply(a);
    expect(() => useStore.getState().draftApply(a)).toThrow();
    expect(useStore.getState().draft.actions).toHaveLength(1);
    useStore.getState().draftUndo();
    expect(useStore.getState().draft.actions).toHaveLength(0);
  });
});

describe('export/import', () => {
  it('round-trips', () => {
    populate();
    const file = exportData(useStore.getState());
    expect(parseImport(JSON.stringify(file))).toEqual(file);
    expect(file.schemaVersion).toBe(1);
    expect('draft' in file).toBe(false);
  });

  it('rejects bad input with readable messages', () => {
    expect(() => parseImport('{nope')).toThrow(ImportError);
    expect(() => parseImport('{nope')).toThrow(/Invalid JSON/);
    expect(() => parseImport('{"schemaVersion":2}')).toThrow('Unsupported schemaVersion 2');
    expect(() => parseImport('{"schemaVersion":1}')).toThrow('players must be an array');
    const base = exportData(useStore.getState());
    const bad = { ...base, profiles: { 1: { heroId: 1, ratings: { waveclear: 5 }, power: { early: 0, mid: 0, late: 0 }, damageType: 'pure' } } };
    expect(() => parseImport(JSON.stringify(bad))).toThrow('Rating 5 for hero 1 key waveclear is out of range 0–3');
  });

  it('drops unknown rating keys', () => {
    const base = exportData(useStore.getState());
    const data = { ...base, profiles: { 1: { heroId: 1, ratings: { waveclear: 2, bogus: 3 }, power: { early: 0, mid: 1, late: 0 }, damageType: 'pure' } } };
    expect(parseImport(JSON.stringify(data)).profiles[1].ratings).toEqual({ waveclear: 2 });
  });

  it('failed import leaves store unchanged; successful import keeps draft', () => {
    populate();
    useStore.getState().draftApply({ side: 'enemy', kind: 'ban', heroId: 9 });
    const before = useStore.getState();
    const apply = (json: string) => useStore.getState().importData(parseImport(json));
    expect(() => apply('{"schemaVersion":2}')).toThrow(ImportError);
    expect(useStore.getState()).toBe(before);

    const file = exportData(before);
    useStore.setState(initialState);
    apply(JSON.stringify(file));
    expect(useStore.getState().players).toEqual(before.players);
    expect(useStore.getState().draft).toEqual(initialState.draft);
  });
});
