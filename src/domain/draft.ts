import type { HeroId } from '../data/heroes';
import { CM_SEQUENCE } from './draftOrder';
import type { ProfileSource } from './profiles';
import type { DraftContext } from './suggestPicks';
import type { Player, Position, SynergyPair, Threat, WinCondition } from './types';

export type Side = 'us' | 'enemy';
export type ActionKind = 'pick' | 'ban';
export type DraftMode = 'captainsMode' | 'captainsDraft' | 'freeform';

export interface DraftAction { side: Side; kind: ActionKind; heroId: HeroId; position?: Position }
export interface DraftState {
  mode: DraftMode;
  weFirst: boolean;
  available: HeroId[] | null;
  actions: DraftAction[];
  win: WinCondition;
}

export function nextExpected(state: DraftState): { side: Side; kind: ActionKind } | null {
  if (state.mode === 'freeform') return null;
  const step = CM_SEQUENCE[state.actions.length];
  if (!step) return null;
  const first = step.team === 'first';
  return { side: first === state.weFirst ? 'us' : 'enemy', kind: step.kind };
}

function filledPositions(state: DraftState): Set<Position> {
  const filled = new Set<Position>();
  for (const a of state.actions) {
    if (a.side === 'us' && a.kind === 'pick' && a.position !== undefined) filled.add(a.position);
  }
  return filled;
}

export function applyAction(state: DraftState, action: DraftAction): DraftState {
  if (state.actions.some((a) => a.heroId === action.heroId)) {
    throw new Error(`Hero ${action.heroId} is already picked or banned`);
  }
  if (action.kind === 'pick' && action.side === 'us' && action.position !== undefined
      && filledPositions(state).has(action.position)) {
    throw new Error(`Position ${action.position} is already filled`);
  }
  return { ...state, actions: [...state.actions, action] };
}

export function undo(state: DraftState): DraftState {
  if (state.actions.length === 0) return state;
  return { ...state, actions: state.actions.slice(0, -1) };
}

export function positionOptions(state: DraftState, players: Player[], heroId: HeroId): Position[] {
  const filled = filledPositions(state);
  return players
    .filter((p) => !filled.has(p.position) && p.pool.some((e) => e.heroId === heroId))
    .map((p) => p.position)
    .sort((a, b) => a - b);
}

export function toContext(
  state: DraftState,
  data: {
    players: Player[];
    profileOf: ProfileSource;
    threats: Record<HeroId, Threat[]>;
    synergies: SynergyPair[];
  },
): DraftContext {
  const ourPicks: DraftContext['ourPicks'] = [];
  const enemyPicks: HeroId[] = [];
  const bans: HeroId[] = [];
  for (const a of state.actions) {
    if (a.kind === 'ban') bans.push(a.heroId);
    else if (a.side === 'enemy') enemyPicks.push(a.heroId);
    else if (a.position !== undefined) ourPicks.push({ heroId: a.heroId, position: a.position });
  }
  return { ...data, win: state.win, ourPicks, enemyPicks, bans, available: state.available };
}
