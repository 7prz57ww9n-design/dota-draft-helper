import { useState } from 'react';
import { useStore } from '../store/store';
import { newTeamCode, parseTeamCode } from '../sync/teamCode';
import { connectTeam, currentTeamLink, leaveTeam, useTeamStore } from '../sync/teamConnection';
import type { SyncStatus } from '../sync/teamSync';

export function statusText(s: SyncStatus | null): string {
  if (!s) return 'Not connected';
  switch (s.state) {
    case 'connecting': return 'Connecting…';
    case 'saving': return 'Saving…';
    case 'synced': return 'All changes saved to the team';
    case 'error': return s.message;
  }
}

export default function TeamSyncCard() {
  const teamId = useTeamStore((s) => s.teamId);
  const status = useTeamStore((s) => s.status);
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const create = () => {
    if (!window.confirm('Create a shared team from the data in this browser? Anyone you give the link to can view and edit it.')) return;
    connectTeam(newTeamCode(), 'create');
  };

  const join = () => {
    const code = parseTeamCode(joinInput);
    if (!code) { setJoinError('That doesn\'t look like a team link or code.'); return; }
    const hasData = useStore.getState().players.length > 0;
    if (hasData && !window.confirm('Join this team? The team\'s players, pools and ratings will replace the data in this browser.')) return;
    setJoinError(null);
    setJoinInput('');
    connectTeam(code, 'join');
  };

  const copy = async () => {
    const link = currentTeamLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy the team link:', link);
    }
  };

  if (!teamId) {
    return (
      <section className="card team-sync" aria-label="Team sync">
        <h3>Team sync</h3>
        <p className="hint">
          Share players, pools, ratings, threats, synergies and the watchlist online, so every teammate can edit
          their own heroes from their own browser. The draft itself stays in this browser.
        </p>
        <div className="team-sync-row">
          <button onClick={create}>Create team from my data</button>
        </div>
        <div className="team-sync-row">
          <input
            aria-label="Team link or code"
            placeholder="Paste a team link or code"
            value={joinInput}
            onChange={(e) => setJoinInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') join(); }}
          />
          <button onClick={join}>Join team</button>
        </div>
        {joinError && <div role="alert" className="alert error">{joinError}</div>}
      </section>
    );
  }

  return (
    <section className="card team-sync" aria-label="Team sync">
      <h3>Team sync</h3>
      <p className={`sync-status sync-${status?.state ?? 'none'}`} role="status">{statusText(status)}</p>
      <p className="hint">
        Send this link to your teammates. Anyone with it can view and edit the team, so share it only with the team.
      </p>
      <div className="team-sync-row">
        <input readOnly aria-label="Team link" value={currentTeamLink() ?? ''} onFocus={(e) => e.target.select()} />
        <button onClick={() => void copy()}>{copied ? 'Copied!' : 'Copy link'}</button>
      </div>
      <div className="team-sync-row">
        <button
          onClick={() => {
            if (window.confirm('Stop syncing with this team? This browser keeps its current copy of the data.')) leaveTeam();
          }}
        >
          Leave team
        </button>
      </div>
    </section>
  );
}
