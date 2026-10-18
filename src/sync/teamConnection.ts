import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useStore } from '../store/store';
import { createFirestoreBackend } from './firestoreBackend';
import { parseTeamCode, teamLink } from './teamCode';
import type { TeamData } from './teamDocs';
import type { SyncStatus, TeamBackend } from './teamSync';
import { startTeamSync } from './teamSync';

interface TeamState {
  /** The team this browser syncs with, remembered across visits. */
  teamId: string | null;
  status: SyncStatus | null;
}

export const useTeamStore = create<TeamState>()(
  persist(() => ({ teamId: null, status: null }) as TeamState, {
    name: 'dota-draft-helper-team',
    partialize: (s) => ({ teamId: s.teamId }),
  }),
);

let makeBackend: () => TeamBackend = createFirestoreBackend;
/** Tests swap in an in-memory backend. */
export function setTeamBackendFactory(factory: () => TeamBackend) { makeBackend = factory; }

const TEAM_KEYS = ['players', 'profiles', 'threats', 'synergies', 'watchlist'] as const;
const teamData = (): TeamData => {
  const s = useStore.getState();
  return { players: s.players, profiles: s.profiles, threats: s.threats, synergies: s.synergies, watchlist: s.watchlist };
};

let running: { stop: () => void } | null = null;

function showTeamInAddressBar(code: string | null) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set('team', code);
  else url.searchParams.delete('team');
  window.history.replaceState(null, '', url);
}

/** create: this browser's data becomes the team's. join: the team's data replaces this browser's. */
export function connectTeam(teamId: string, mode: 'create' | 'join') {
  running?.stop();
  useTeamStore.setState({ teamId, status: { state: 'connecting' } });
  showTeamInAddressBar(teamId);
  running = startTeamSync({
    backend: makeBackend(),
    teamId,
    mode,
    getData: teamData,
    setData: (data) => useStore.setState(data),
    subscribeLocal: (listener) => useStore.subscribe((s, prev) => {
      if (TEAM_KEYS.some((k) => s[k] !== prev[k])) listener();
    }),
    onStatus: (status) => useTeamStore.setState({ status }),
  });
}

/** Stops syncing; this browser keeps its current copy of the data. */
export function leaveTeam() {
  running?.stop();
  running = null;
  useTeamStore.setState({ teamId: null, status: null });
  showTeamInAddressBar(null);
}

export const currentTeamLink = () => {
  const id = useTeamStore.getState().teamId;
  return id ? teamLink(id) : null;
};

const hasLocalData = () => useStore.getState().players.some((p) => p.pool.length > 0 || p.name);

/**
 * On page load: open the team from a ?team= link (asking before it replaces
 * this browser's data), or reconnect to the remembered team.
 */
export function resumeTeam(confirmReplace: (message: string) => boolean = (m) => window.confirm(m)) {
  const fromLink = parseTeamCode(window.location.search);
  const remembered = useTeamStore.getState().teamId;
  if (fromLink && fromLink !== remembered) {
    const ok = !hasLocalData() || confirmReplace(
      'Open the shared team from this link? The team\'s players, pools and ratings will replace the data in this browser.',
    );
    if (ok) { connectTeam(fromLink, 'join'); return; }
    showTeamInAddressBar(remembered);
  }
  if (remembered) connectTeam(remembered, 'join');
}
