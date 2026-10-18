import { useState } from 'react';
import { useStore } from './store/store';
import DataScreen from './ui/DataScreen';
import DraftScreen from './ui/DraftScreen';
import HelpPanel from './ui/HelpPanel';
import HeroesScreen from './ui/HeroesScreen';
import RatingsScreen from './ui/RatingsScreen';
import SynergyScreen from './ui/SynergyScreen';
import TeamScreen from './ui/TeamScreen';
import ThreatsScreen from './ui/ThreatsScreen';

const TABS = ['Draft', 'Heroes', 'Team', 'Ratings', 'Threats', 'Synergy', 'Data'] as const;
type Tab = (typeof TABS)[number];

export default function App() {
  const [tab, setTab] = useState<Tab>(() => (useStore.getState().draft.actions.length > 0 ? 'Draft' : 'Team'));
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
