import { useEffect, useState } from 'react';
import { useStore } from './store/store';
import { resumeTeam, useTeamStore } from './sync/teamConnection';
import DataScreen from './ui/DataScreen';
import DraftScreen from './ui/DraftScreen';
import HelpPanel from './ui/HelpPanel';
import HeroesScreen from './ui/HeroesScreen';
import RatingsScreen from './ui/RatingsScreen';
import SynergyScreen from './ui/SynergyScreen';
import TeamScreen from './ui/TeamScreen';
import { statusText } from './ui/TeamSyncCard';
import ThreatsScreen from './ui/ThreatsScreen';

const TABS = ['Draft', 'Heroes', 'Team', 'Ratings', 'Threats', 'Synergy', 'Data'] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>(() => (useStore.getState().draft.actions.length > 0 ? 'Draft' : 'Team'));
  const teamStatus = useTeamStore((s) => (s.teamId ? s.status : null));
  useEffect(() => { resumeTeam(); }, []);
  return (
    <div className="app">
      <header>
        <h1>Dota Draft Helper</h1>
        <nav role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={tab === t ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
        {teamStatus && (
          <button
            type="button"
            className={`team-badge sync-${teamStatus.state}`}
            title={statusText(teamStatus)}
            onClick={() => setTab('Data')}
          >
            <span className="team-dot" aria-hidden="true" /> Team {teamStatus.state === 'error' ? 'problem' : teamStatus.state === 'synced' ? 'synced' : 'syncing…'}
          </button>
        )}
      </header>
      <main>
        <HelpPanel tab={tab} />
        {tab === 'Draft' && <DraftScreen />}
        {tab === 'Heroes' && <HeroesScreen />}
        {tab === 'Team' && <TeamScreen />}
        {tab === 'Ratings' && <RatingsScreen />}
        {tab === 'Threats' && <ThreatsScreen />}
        {tab === 'Synergy' && <SynergyScreen />}
        {tab === 'Data' && <DataScreen />}
      </main>
    </div>
  );
}
