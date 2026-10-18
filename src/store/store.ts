import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HeroId } from '../data/heroes';
import { defaultProfile } from '../data/ratingDefaults';
import threatsSeed from '../data/threats.seed.json';
import { applyAction, undo } from '../domain/draft';
import { ANSWER_TAGS, TEAM_TAGS, THREATS } from '../domain/tags';
import type { DraftAction, DraftMode, DraftState } from '../domain/draft';
import type {
  DamageType, HeroProfile, Phase, Player, Rating, RatingKey, SynergyPair, Threat, WinCondition,
} from '../domain/types';
import type { ExportFile } from './exportImport';

export interface DataState {
  players: Player[];
  profiles: Record<HeroId, HeroProfile>;
  threats: Record<HeroId, Threat[]>;
  synergies: SynergyPair[];
  watchlist: Record<HeroId, 1 | 2 | 3>;
  draft: DraftState;
}

export interface Actions {
  upsertPlayer: (player: Player) => void;
  removePlayer: (id: string) => void;
  addToPool: (playerId: string, heroId: HeroId) => void;
  removeFromPool: (playerId: string, heroId: HeroId) => void;
  setComfort: (playerId: string, heroId: HeroId, comfort: 1 | 2 | 3) => void;
  setRating: (heroId: HeroId, key: RatingKey, rating: Rating) => void;
  setPower: (heroId: HeroId, phase: Phase, rating: Rating) => void;
  setDamageType: (heroId: HeroId, damageType: DamageType) => void;
  toggleThreat: (heroId: HeroId, threat: Threat) => void;
  upsertSynergy: (pair: SynergyPair) => void;
  removeSynergy: (a: HeroId, b: HeroId) => void;
  setWatch: (heroId: HeroId, weight: 1 | 2 | 3 | null) => void;
  draftApply: (action: DraftAction) => void;
  draftUndo: () => void;
  draftReset: (mode: DraftMode, weFirst: boolean) => void;
  setWeFirst: (weFirst: boolean) => void;
  setAvailable: (ids: HeroId[] | null) => void;
  setWin: (win: WinCondition) => void;
  importData: (data: ExportFile) => void;
  resetAll: () => void;
  resetProfile: (heroId: HeroId) => void;
}

export type StoreState = DataState & Actions;

function freshDraft(mode: DraftMode, weFirst: boolean): DraftState {
  return { mode, weFirst, available: null, actions: [], win: 'balanced' };
}

function seedThreats(): Record<HeroId, Threat[]> {
  const out: Record<HeroId, Threat[]> = {};
  for (const [id, list] of Object.entries(threatsSeed as Record<string, Threat[]>)) out[Number(id)] = [...list];
  return out;
}

export const initialState: DataState = {
  players: [],
  profiles: {},
  threats: seedThreats(),
  synergies: [],
  watchlist: {},
  draft: freshDraft('captainsMode', true),
};

function profileOf(profiles: Record<HeroId, HeroProfile>, heroId: HeroId): HeroProfile {
  // A new edit starts from the default power curve and damage type; ratings hold only the edits.
  return profiles[heroId] ?? { ...defaultProfile(heroId), ratings: {} };
}

const RATING_KEYS = new Set<string>([...TEAM_TAGS, ...ANSWER_TAGS]);
const THREAT_SET = new Set<string>(THREATS);

/**
 * Upgrades data saved by older app versions. v0 → v1: six answer tags
 * (armor reduction, AoE/cleave, detection, true strike, instant disable,
 * magic resistance) and two threats (invisibility, evasion) were removed.
 */
export function migratePersisted(persisted: unknown, _version: number): DataState {
  const s = persisted as DataState;
  const profiles: Record<HeroId, HeroProfile> = {};
  for (const [id, p] of Object.entries(s.profiles ?? {})) {
    const ratings = Object.fromEntries(Object.entries(p.ratings).filter(([k]) => RATING_KEYS.has(k)));
    profiles[Number(id)] = { ...p, ratings };
  }
  const threats: Record<HeroId, Threat[]> = {};
  for (const [id, list] of Object.entries(s.threats ?? {})) {
    const kept = list.filter((t) => THREAT_SET.has(t));
    if (kept.length) threats[Number(id)] = kept;
  }
  return { ...s, profiles, threats };
}

const samePair = (p: SynergyPair, a: HeroId, b: HeroId) =>
  (p.a === a && p.b === b) || (p.a === b && p.b === a);

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      const mapPlayer = (id: string, fn: (p: Player) => Player) =>
        set((s) => ({ players: s.players.map((p) => (p.id === id ? fn(p) : p)) }));
      const patchProfile = (heroId: HeroId, fn: (p: HeroProfile) => HeroProfile) =>
        set((s) => ({ profiles: { ...s.profiles, [heroId]: fn(profileOf(s.profiles, heroId)) } }));
      return {
        ...initialState,
        upsertPlayer: (player) => set((s) => ({
          players: s.players.some((p) => p.id === player.id)
            ? s.players.map((p) => (p.id === player.id ? player : p))
            : [...s.players, player],
        })),
        removePlayer: (id) => set((s) => ({ players: s.players.filter((p) => p.id !== id) })),
        addToPool: (playerId, heroId) => mapPlayer(playerId, (p) => (
          p.pool.some((e) => e.heroId === heroId) ? p : { ...p, pool: [...p.pool, { heroId, comfort: 2 }] }
        )),
        removeFromPool: (playerId, heroId) => mapPlayer(playerId, (p) => ({
          ...p, pool: p.pool.filter((e) => e.heroId !== heroId),
        })),
        setComfort: (playerId, heroId, comfort) => mapPlayer(playerId, (p) => ({
          ...p, pool: p.pool.map((e) => (e.heroId === heroId ? { ...e, comfort } : e)),
        })),
        setRating: (heroId, key, rating) => patchProfile(heroId, (p) => ({
          ...p, ratings: { ...p.ratings, [key]: rating },
        })),
        setPower: (heroId, phase, rating) => patchProfile(heroId, (p) => ({
          ...p, power: { ...p.power, [phase]: rating },
        })),
        setDamageType: (heroId, damageType) => patchProfile(heroId, (p) => ({ ...p, damageType })),
        toggleThreat: (heroId, threat) => set((s) => {
          const cur = s.threats[heroId] ?? [];
          const next = cur.includes(threat) ? cur.filter((t) => t !== threat) : [...cur, threat];
          return { threats: { ...s.threats, [heroId]: next } };
        }),
        upsertSynergy: (pair) => set((s) => ({
          synergies: s.synergies.some((p) => samePair(p, pair.a, pair.b))
            ? s.synergies.map((p) => (samePair(p, pair.a, pair.b) ? pair : p))
            : [...s.synergies, pair],
        })),
        removeSynergy: (a, b) => set((s) => ({ synergies: s.synergies.filter((p) => !samePair(p, a, b)) })),
        setWatch: (heroId, weight) => set((s) => {
          const next = { ...s.watchlist };
          if (weight === null) delete next[heroId];
          else next[heroId] = weight;
          return { watchlist: next };
        }),
        draftApply: (action) => {
          const next = applyAction(get().draft, action); // throws, state untouched
          set({ draft: next });
        },
        draftUndo: () => set((s) => ({ draft: undo(s.draft) })),
        draftReset: (mode, weFirst) => set({ draft: freshDraft(mode, weFirst) }),
        setWeFirst: (weFirst) => set((s) => ({ draft: { ...s.draft, weFirst } })),
        setAvailable: (ids) => set((s) => ({ draft: { ...s.draft, available: ids } })),
        setWin: (win) => set((s) => ({ draft: { ...s.draft, win } })),
        importData: (data) => set({
          players: data.players,
          profiles: data.profiles,
          threats: data.threats,
          synergies: data.synergies,
          watchlist: data.watchlist,
        }),
        resetProfile: (heroId) => set((s) => {
          const { [heroId]: _removed, ...rest } = s.profiles;
          return { profiles: rest };
        }),
        resetAll: () => set({
          players: [], profiles: {}, threats: seedThreats(), synergies: [], watchlist: {},
        }),
      };
    },
    { name: 'dota-draft-helper', version: 1, migrate: migratePersisted },
  ),
);
