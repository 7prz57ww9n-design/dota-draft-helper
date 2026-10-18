import { parseProfileKey } from '../domain/profiles';
import type { HeroProfile, PoolEntry, Position } from '../domain/types';
import { parseImport } from '../store/exportImport';
import type { DataState } from '../store/store';

/** The team data that is shared online (everything except the local draft). */
export type TeamData = Pick<DataState, 'players' | 'profiles' | 'threats' | 'synergies' | 'watchlist'>;

/** One document per position, so players editing their own position never overwrite each other. */
export interface PositionDoc {
  player: { name: string; pool: PoolEntry[] } | null;
  /** This position's ratings only, keyed "heroId@position". */
  profiles: Record<string, HeroProfile>;
}
export type SharedDoc = Pick<TeamData, 'threats' | 'synergies' | 'watchlist'>;
export type TeamDocName = 'pos-1' | 'pos-2' | 'pos-3' | 'pos-4' | 'pos-5' | 'shared';
export type TeamDocs = Record<Exclude<TeamDocName, 'shared'>, PositionDoc> & { shared: SharedDoc };

export const POSITIONS: Position[] = [1, 2, 3, 4, 5];
export const docNameOf = (p: Position) => `pos-${p}` as const;

export function emptyTeamData(): TeamData {
  return { players: [], profiles: {}, threats: {}, synergies: [], watchlist: {} };
}

export function splitTeamData(data: TeamData): TeamDocs {
  const docs = { shared: { threats: data.threats, synergies: data.synergies, watchlist: data.watchlist } } as TeamDocs;
  for (const pos of POSITIONS) {
    const player = data.players.find((p) => p.position === pos);
    const profiles: Record<string, HeroProfile> = {};
    for (const [key, prof] of Object.entries(data.profiles)) {
      if (parseProfileKey(key)?.position === pos) profiles[key] = prof;
    }
    docs[docNameOf(pos)] = { player: player ? { name: player.name, pool: player.pool } : null, profiles };
  }
  return docs;
}

/**
 * Returns data with one received document applied. Remote data comes from
 * anyone holding the team link, so the result is validated exactly like an
 * imported file; invalid data throws ImportError and nothing changes.
 */
export function applyDoc(data: TeamData, name: string, doc: unknown): TeamData {
  let next: TeamData;
  if (name === 'shared') {
    const d = (doc ?? {}) as Partial<SharedDoc>;
    next = { ...data, threats: d.threats ?? {}, synergies: d.synergies ?? [], watchlist: d.watchlist ?? {} };
  } else {
    const pos = POSITIONS.find((p) => docNameOf(p) === name);
    if (!pos) throw new Error(`Unknown team document "${name}"`);
    const d = (doc ?? { player: null, profiles: {} }) as Partial<PositionDoc>;
    const profiles = Object.fromEntries(
      Object.entries(data.profiles).filter(([key]) => parseProfileKey(key)?.position !== pos),
    );
    for (const [key, prof] of Object.entries(d.profiles ?? {})) {
      if (parseProfileKey(key)?.position !== pos) throw new Error(`Rating "${key}" does not belong to position ${pos}`);
      profiles[key] = prof;
    }
    const players = data.players.filter((p) => p.position !== pos);
    if (d.player) players.push({ id: `pos-${pos}`, name: d.player.name, position: pos, pool: d.player.pool });
    players.sort((a, b) => a.position - b.position);
    next = { ...data, players, profiles };
  }
  const { schemaVersion: _v, ...valid } = parseImport(JSON.stringify({ schemaVersion: 2, ...next }));
  return name === 'shared'
    ? { ...data, threats: valid.threats, synergies: valid.synergies, watchlist: valid.watchlist }
    : { ...data, players: valid.players, profiles: valid.profiles };
}

/** JSON with sorted object keys, for comparing documents regardless of key order. */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v,
  );
}
