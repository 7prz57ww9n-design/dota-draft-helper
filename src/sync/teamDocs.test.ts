import { profile } from '../domain/testFixtures';
import type { TeamData } from './teamDocs';
import { applyDoc, canonical, emptyTeamData, splitTeamData } from './teamDocs';

const AXE = 2;
const LION = 26;

const data: TeamData = {
  players: [
    { id: 'pos-1', name: 'Ann', position: 1, pool: [{ heroId: AXE, comfort: 3 }] },
    { id: 'pos-4', name: 'Bo', position: 4, pool: [{ heroId: AXE, comfort: 2 }, { heroId: LION, comfort: 3 }] },
  ],
  profiles: {
    [`${AXE}@1`]: profile(AXE, { push: 3 }),
    [`${AXE}@4`]: profile(AXE, { save: 2 }),
    [`${LION}@4`]: profile(LION, { disable: 3 }),
  },
  threats: { 12: ['illusions'] },
  synergies: [{ a: AXE, b: LION, strength: 2, laneDuo: true }],
  watchlist: { 12: 3 },
};

describe('splitTeamData', () => {
  test('one doc per position with that position\'s profiles, plus a shared doc', () => {
    const docs = splitTeamData(data);
    expect(Object.keys(docs).sort()).toEqual(['pos-1', 'pos-2', 'pos-3', 'pos-4', 'pos-5', 'shared']);
    expect(docs['pos-1']).toEqual({ player: { name: 'Ann', pool: [{ heroId: AXE, comfort: 3 }] }, profiles: { [`${AXE}@1`]: data.profiles[`${AXE}@1`] } });
    expect(Object.keys(docs['pos-4'].profiles).sort()).toEqual([`${AXE}@4`, `${LION}@4`].sort());
    expect(docs['pos-2']).toEqual({ player: null, profiles: {} });
    expect(docs.shared).toEqual({ threats: data.threats, synergies: data.synergies, watchlist: data.watchlist });
  });
});

describe('applyDoc', () => {
  test('applying every doc to empty data rebuilds the same data', () => {
    const docs = splitTeamData(data);
    let rebuilt = emptyTeamData();
    for (const [name, doc] of Object.entries(docs)) rebuilt = applyDoc(rebuilt, name, doc);
    expect(canonical(rebuilt)).toBe(canonical(data));
  });

  test('a position doc replaces only that position', () => {
    const next = applyDoc(data, 'pos-4', { player: { name: 'Cy', pool: [] }, profiles: {} });
    expect(next.players.find((p) => p.position === 4)).toEqual({ id: 'pos-4', name: 'Cy', position: 4, pool: [] });
    expect(next.players.find((p) => p.position === 1)).toEqual(data.players[0]);
    expect(Object.keys(next.profiles)).toEqual([`${AXE}@1`]);
    expect(next.threats).toBe(data.threats);
  });

  test('rejects invalid remote data with a readable error and leaves data alone', () => {
    const bad = { player: { name: 'X', pool: [{ heroId: AXE, comfort: 9 }] }, profiles: {} };
    expect(() => applyDoc(data, 'pos-2', bad)).toThrow(/Comfort 9/);
    expect(() => applyDoc(data, 'pos-9', { player: null, profiles: {} })).toThrow(/Unknown team document/);
  });
});

describe('canonical', () => {
  test('ignores key order', () => {
    expect(canonical({ b: 1, a: { d: 2, c: 3 } })).toBe(canonical({ a: { c: 3, d: 2 }, b: 1 }));
  });
});
