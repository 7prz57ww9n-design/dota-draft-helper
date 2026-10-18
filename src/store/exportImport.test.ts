import { defaultProfile } from '../data/ratingDefaults';
import { ImportError, exportData, parseImport } from './exportImport';
import { initialState, useStore } from './store';

beforeEach(() => {
  localStorage.clear();
  // Start from empty threats so toggles below don't depend on the seed file's contents.
  useStore.setState({ ...initialState, threats: {} });
});

function populate() {
  const s = useStore.getState();
  s.upsertPlayer({ id: 'pos-1', name: 'Ann', position: 1, pool: [] });
  s.addToPool('pos-1', 1);
  s.addToPool('pos-1', 1);
  s.setComfort('pos-1', 1, 3);
  s.setRating(1, 1, 'disable', 2);
  s.setPower(1, 1, 'late', 3);
  s.setDamageType(1, 1, 'magical');
  s.toggleThreat(2, 'tanky');
  s.upsertSynergy({ a: 1, b: 2, strength: 2, laneDuo: true });
  s.setWatch(3, 2);
}

describe('store', () => {
  it('creates default profile and ignores duplicate pool entries', () => {
    populate();
    const st = useStore.getState();
    expect(st.players[0].pool).toEqual([{ heroId: 1, comfort: 3 }]);
    expect(st.profiles['1@1']).toEqual({
      heroId: 1, ratings: { disable: 2 }, power: { ...defaultProfile(1).power, late: 3 }, damageType: 'magical',
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
    expect(file.schemaVersion).toBe(2);
    expect('draft' in file).toBe(false);
  });

  it('rejects bad input with readable messages', () => {
    expect(() => parseImport('{nope')).toThrow(ImportError);
    expect(() => parseImport('{nope')).toThrow(/Invalid JSON/);
    expect(() => parseImport('{"schemaVersion":3}')).toThrow('Unsupported schemaVersion 3');
    expect(() => parseImport('{"schemaVersion":1}')).toThrow('players must be an array');
    const base = exportData(useStore.getState());
    const bad = { ...base, profiles: { '1@1': { heroId: 1, ratings: { waveclear: 5 }, power: { early: 0, mid: 0, late: 0 }, damageType: 'pure' } } };
    expect(() => parseImport(JSON.stringify(bad))).toThrow('Rating 5 for hero 1 key waveclear is out of range 0–3');
  });

  it('normalises player ids to pos-<position> and rejects duplicate positions', () => {
    const base = exportData(useStore.getState());
    const mk = (id: string, position: number) => ({ id, name: `N${id}`, position, pool: [] });
    const ok = parseImport(JSON.stringify({ ...base, players: [mk('abc', 2), mk('xyz', 5)] }));
    expect(ok.players.map((p) => p.id)).toEqual(['pos-2', 'pos-5']);
    expect(() => parseImport(JSON.stringify({ ...base, players: [mk('a', 2), mk('b', 2)] })))
      .toThrow('Duplicate player for position 2');
  });

  it('de-duplicates each hero threat list on import', () => {
    const base = exportData(useStore.getState());
    const data = { ...base, threats: { 2: ['tanky', 'illusions', 'tanky'] } };
    expect(parseImport(JSON.stringify(data)).threats[2]).toEqual(['tanky', 'illusions']);
  });

  it('imports v1 files by copying each hero ratings to every position whose pool has it', () => {
    const prof = { heroId: 1, ratings: { waveclear: 2 }, power: { early: 1, mid: 1, late: 1 }, damageType: 'pure' };
    const v1 = {
      schemaVersion: 1,
      players: [
        { id: 'pos-1', name: 'A', position: 1, pool: [{ heroId: 1, comfort: 3 }] },
        { id: 'pos-4', name: 'B', position: 4, pool: [{ heroId: 1, comfort: 2 }] },
      ],
      profiles: { 1: prof, 99: { ...prof, heroId: 99 } },
      threats: {}, synergies: [], watchlist: {},
    };
    const file = parseImport(JSON.stringify(v1));
    expect(file.schemaVersion).toBe(2);
    expect(Object.keys(file.profiles).sort()).toEqual(['1@1', '1@4']);
    expect(file.profiles['1@4']).toEqual(prof);
  });

  it('rejects v2 profile keys without a position', () => {
    const base = exportData(useStore.getState());
    const data = { ...base, profiles: { 1: { heroId: 1, ratings: {}, power: { early: 0, mid: 0, late: 0 }, damageType: 'pure' } } };
    expect(() => parseImport(JSON.stringify(data))).toThrow('profiles has invalid key "1" (expected heroId@position)');
  });

  it('drops unknown rating keys', () => {
    const base = exportData(useStore.getState());
    const data = { ...base, profiles: { '1@1': { heroId: 1, ratings: { waveclear: 2, bogus: 3 }, power: { early: 0, mid: 1, late: 0 }, damageType: 'pure' } } };
    expect(parseImport(JSON.stringify(data)).profiles['1@1'].ratings).toEqual({ waveclear: 2 });
  });

  it('failed import leaves store unchanged; successful import keeps draft', () => {
    populate();
    useStore.getState().draftApply({ side: 'enemy', kind: 'ban', heroId: 9 });
    const before = useStore.getState();
    const apply = (json: string) => useStore.getState().importData(parseImport(json));
    expect(() => apply('{"schemaVersion":3}')).toThrow(ImportError);
    expect(useStore.getState()).toBe(before);

    const file = exportData(before);
    useStore.setState(initialState);
    apply(JSON.stringify(file));
    expect(useStore.getState().players).toEqual(before.players);
    expect(useStore.getState().draft).toEqual(initialState.draft);
  });
});
