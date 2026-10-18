import type { HeroId } from '../data/heroes';
import { ANSWER_TAGS, TEAM_TAGS, THREATS } from '../domain/tags';
import type {
  DamageType, HeroProfile, Phase, Player, PoolEntry, Position, Rating, RatingKey, SynergyPair, Threat,
} from '../domain/types';
import type { DataState } from './store';

export interface ExportFile {
  schemaVersion: 1;
  players: Player[];
  profiles: Record<HeroId, HeroProfile>;
  threats: Record<HeroId, Threat[]>;
  synergies: SynergyPair[];
  watchlist: Record<HeroId, 1 | 2 | 3>;
}

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export function exportData(
  state: Pick<DataState, 'players' | 'profiles' | 'threats' | 'synergies' | 'watchlist'>,
): ExportFile {
  const { players, profiles, threats, synergies, watchlist } = state;
  return { schemaVersion: 1, players, profiles, threats, synergies, watchlist };
}

const RATING_KEYS: readonly string[] = [...TEAM_TAGS, ...ANSWER_TAGS];
const PHASES: Phase[] = ['early', 'mid', 'late'];
const DAMAGE_TYPES: DamageType[] = ['physical', 'magical', 'pure'];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function intIn(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function heroKey(key: string, where: string): HeroId {
  const id = Number(key);
  if (!Number.isInteger(id)) throw new ImportError(`${where} has invalid hero id "${key}"`);
  return id;
}

function heroIdOf(v: unknown, where: string): HeroId {
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new ImportError(`${where} must be an integer hero id`);
  return v;
}

function parsePlayers(raw: unknown): Player[] {
  if (!Array.isArray(raw)) throw new ImportError('players must be an array');
  const seen = new Set<number>();
  return raw.map((p: unknown, i) => {
    if (!isObject(p)) throw new ImportError(`Player ${i} must be an object`);
    if (typeof p.id !== 'string' || typeof p.name !== 'string') {
      throw new ImportError(`Player ${i} must have a string id and name`);
    }
    if (!intIn(p.position, 1, 5)) {
      throw new ImportError(`Player ${p.name} has invalid position ${String(p.position)} (must be 1-5)`);
    }
    if (seen.has(p.position)) throw new ImportError(`Duplicate player for position ${p.position}`);
    seen.add(p.position);
    if (!Array.isArray(p.pool)) throw new ImportError(`Player ${p.name} pool must be an array`);
    const pool: PoolEntry[] = p.pool.map((e: unknown) => {
      if (!isObject(e)) throw new ImportError(`Player ${String(p.name)} has an invalid pool entry`);
      const heroId = heroIdOf(e.heroId, `Player ${String(p.name)} pool heroId`);
      if (!intIn(e.comfort, 1, 3)) {
        throw new ImportError(`Comfort ${String(e.comfort)} for hero ${heroId} is out of range 1-3`);
      }
      return { heroId, comfort: e.comfort as 1 | 2 | 3 };
    });
    return { id: `pos-${p.position}`, name: p.name, position: p.position as Position, pool };
  });
}

function parseProfiles(raw: unknown): Record<HeroId, HeroProfile> {
  if (!isObject(raw)) throw new ImportError('profiles must be an object');
  const out: Record<HeroId, HeroProfile> = {};
  for (const [key, val] of Object.entries(raw)) {
    const heroId = heroKey(key, 'profiles');
    if (!isObject(val)) throw new ImportError(`Profile for hero ${heroId} must be an object`);
    if (!isObject(val.ratings)) throw new ImportError(`ratings for hero ${heroId} must be an object`);
    const ratings: Partial<Record<RatingKey, Rating>> = {};
    for (const [k, r] of Object.entries(val.ratings)) {
      if (!RATING_KEYS.includes(k)) continue; // drop unknown keys
      if (!intIn(r, 0, 3)) {
        throw new ImportError(`Rating ${String(r)} for hero ${heroId} key ${k} is out of range 0–3`);
      }
      ratings[k as RatingKey] = r as Rating;
    }
    if (!isObject(val.power)) throw new ImportError(`power for hero ${heroId} must be an object`);
    const power = {} as Record<Phase, Rating>;
    for (const ph of PHASES) {
      const r = val.power[ph];
      if (!intIn(r, 0, 3)) {
        throw new ImportError(`Power ${String(r)} for hero ${heroId} phase ${ph} is out of range 0–3`);
      }
      power[ph] = r as Rating;
    }
    if (!DAMAGE_TYPES.includes(val.damageType as DamageType)) {
      throw new ImportError(
        `damageType ${String(val.damageType)} for hero ${heroId} is not one of ${DAMAGE_TYPES.join(', ')}`,
      );
    }
    out[heroId] = { heroId, ratings, power, damageType: val.damageType as DamageType };
  }
  return out;
}

function parseThreats(raw: unknown): Record<HeroId, Threat[]> {
  if (!isObject(raw)) throw new ImportError('threats must be an object');
  const out: Record<HeroId, Threat[]> = {};
  for (const [key, val] of Object.entries(raw)) {
    const heroId = heroKey(key, 'threats');
    if (!Array.isArray(val)) throw new ImportError(`threats for hero ${heroId} must be an array`);
    for (const t of val) {
      if (!THREATS.includes(t as Threat)) throw new ImportError(`Unknown threat ${String(t)} for hero ${heroId}`);
    }
    out[heroId] = [...new Set(val as Threat[])];
  }
  return out;
}

function parseSynergies(raw: unknown): SynergyPair[] {
  if (!Array.isArray(raw)) throw new ImportError('synergies must be an array');
  return raw.map((s: unknown, i) => {
    if (!isObject(s)) throw new ImportError(`Synergy ${i} must be an object`);
    const a = heroIdOf(s.a, `Synergy ${i} a`);
    const b = heroIdOf(s.b, `Synergy ${i} b`);
    if (!intIn(s.strength, -2, 3)) {
      throw new ImportError(`Synergy strength ${String(s.strength)} for heroes ${a},${b} is out of range -2 to 3`);
    }
    if (typeof s.laneDuo !== 'boolean') throw new ImportError(`Synergy ${i} laneDuo must be a boolean`);
    return { a, b, strength: s.strength as SynergyPair['strength'], laneDuo: s.laneDuo };
  });
}

function parseWatchlist(raw: unknown): Record<HeroId, 1 | 2 | 3> {
  if (!isObject(raw)) throw new ImportError('watchlist must be an object');
  const out: Record<HeroId, 1 | 2 | 3> = {};
  for (const [key, w] of Object.entries(raw)) {
    const heroId = heroKey(key, 'watchlist');
    if (!intIn(w, 1, 3)) throw new ImportError(`Watchlist weight ${String(w)} for hero ${heroId} is out of range 1-3`);
    out[heroId] = w as 1 | 2 | 3;
  }
  return out;
}

export function parseImport(json: string): ExportFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new ImportError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isObject(raw)) throw new ImportError('Import file must be a JSON object');
  if (raw.schemaVersion !== 1) throw new ImportError(`Unsupported schemaVersion ${String(raw.schemaVersion)}`);
  return {
    schemaVersion: 1,
    players: parsePlayers(raw.players),
    profiles: parseProfiles(raw.profiles),
    threats: parseThreats(raw.threats),
    synergies: parseSynergies(raw.synergies),
    watchlist: parseWatchlist(raw.watchlist),
  };
}
