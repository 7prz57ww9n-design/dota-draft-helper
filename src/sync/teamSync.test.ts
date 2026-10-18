import { profile } from '../domain/testFixtures';
import type { TeamData } from './teamDocs';
import { emptyTeamData } from './teamDocs';
import { FakeBackend } from './fakeBackend';
import type { SyncStatus } from './teamSync';
import { startTeamSync } from './teamSync';

const AXE = 2;
const LION = 26;
const TEAM = 'Abcdefghijklmnopqrstuvwx';

/** A simulated browser: its own local data plus a running sync. */
function client(backend: FakeBackend, mode: 'join' | 'create', initial: TeamData = emptyTeamData()) {
  let data = initial;
  const listeners = new Set<() => void>();
  const statuses: SyncStatus[] = [];
  const sync = startTeamSync({
    backend,
    teamId: TEAM,
    mode,
    getData: () => data,
    setData: (d) => { data = d; listeners.forEach((l) => l()); },
    subscribeLocal: (l) => { listeners.add(l); return () => listeners.delete(l); },
    onStatus: (s) => statuses.push(s),
    debounceMs: 0,
    now: () => 1,
  });
  return {
    sync,
    statuses,
    get data() { return data; },
    edit(fn: (d: TeamData) => TeamData) { data = fn(data); listeners.forEach((l) => l()); },
  };
}

const settle = () => new Promise((r) => setTimeout(r, 5));
const last = <T,>(xs: T[]) => xs[xs.length - 1];

const seed: TeamData = {
  ...emptyTeamData(),
  players: [{ id: 'pos-1', name: 'Ann', position: 1, pool: [{ heroId: AXE, comfort: 3 }] }],
  profiles: { [`${AXE}@1`]: profile(AXE, { push: 3 }) },
};

describe('startTeamSync', () => {
  test('create uploads all local data; join downloads it, replacing local data', async () => {
    const backend = new FakeBackend();
    const a = client(backend, 'create', seed);
    await settle();
    expect(backend.writes.map((w) => w.name).sort()).toEqual(['pos-1', 'pos-2', 'pos-3', 'pos-4', 'pos-5', 'shared']);
    expect(last(a.statuses)).toEqual({ state: 'synced' });

    const b = client(backend, 'join', { ...emptyTeamData(), watchlist: { 99: 1 } });
    await settle();
    expect(b.data.players).toEqual(seed.players);
    expect(b.data.profiles).toEqual(seed.profiles);
    expect(b.data.watchlist).toEqual({});
  });

  test('edits by two players on different positions reach each other without clobbering', async () => {
    const backend = new FakeBackend();
    const a = client(backend, 'create', seed);
    await settle();
    const b = client(backend, 'join');
    await settle();
    backend.writes = [];

    a.edit((d) => ({ ...d, profiles: { ...d.profiles, [`${AXE}@1`]: profile(AXE, { push: 1 }) } }));
    b.edit((d) => ({ ...d, players: [...d.players, { id: 'pos-4', name: 'Bo', position: 4, pool: [{ heroId: LION, comfort: 2 }] }] }));
    await settle();

    expect(backend.writes.map((w) => w.name).sort()).toEqual(['pos-1', 'pos-4']); // only changed docs
    for (const c of [a, b]) {
      expect(c.data.profiles[`${AXE}@1`].ratings).toEqual({ push: 1 });
      expect(c.data.players.map((p) => p.name)).toEqual(['Ann', 'Bo']);
    }
  });

  test('invalid remote data is rejected with an error status and local data kept', async () => {
    const backend = new FakeBackend();
    const a = client(backend, 'create', seed);
    await settle();
    await backend.write(TEAM, 'pos-1', { player: { name: 'Ann', pool: [{ heroId: AXE, comfort: 7 }] }, profiles: {}, updatedAt: 2 });
    await settle();
    expect(a.data.players[0].pool[0].comfort).toBe(3);
    expect(last(a.statuses)).toEqual({ state: 'error', message: expect.stringMatching(/Comfort 7/) });
  });

  test('a failed save reports an error and is retried on the next change', async () => {
    const backend = new FakeBackend();
    const a = client(backend, 'create', seed);
    await settle();
    backend.failNext = true;
    a.edit((d) => ({ ...d, watchlist: { 5: 2 } }));
    await settle();
    expect(last(a.statuses)).toEqual({ state: 'error', message: expect.stringMatching(/offline/) });
    a.edit((d) => ({ ...d, synergies: [] }));
    await settle();
    expect(backend.docs.get(TEAM)!.get('shared')).toMatchObject({ watchlist: { 5: 2 } });
    expect(last(a.statuses)).toEqual({ state: 'synced' });
  });

  test('joining a code with no team keeps local data and reports it', async () => {
    const backend = new FakeBackend();
    const b = client(backend, 'join', seed);
    await settle();
    expect(b.data).toBe(seed);
    expect(last(b.statuses)).toEqual({ state: 'error', message: expect.stringMatching(/No team found/) });
    b.edit((d) => ({ ...d, watchlist: { 5: 2 } }));
    await settle();
    expect(backend.writes).toEqual([]); // nothing is pushed to the unknown code
  });

  test('stop() ends syncing in both directions', async () => {
    const backend = new FakeBackend();
    const a = client(backend, 'create', seed);
    await settle();
    a.sync.stop();
    backend.writes = [];
    a.edit((d) => ({ ...d, watchlist: { 5: 2 } }));
    await settle();
    expect(backend.writes).toEqual([]);
    expect(backend.listeners.size).toBe(0);
  });
});
