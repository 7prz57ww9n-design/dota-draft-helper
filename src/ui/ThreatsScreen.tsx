import { useState } from 'react';
import { HEROES } from '../data/heroes';
import { THREATS, THREAT_DEFINITIONS, THREAT_LABELS } from '../domain/tags';
import { useStore } from '../store/store';

const SORTED = [...HEROES].sort((a, b) => a.localizedName.localeCompare(b.localizedName));

export default function ThreatsScreen() {
  const threats = useStore((s) => s.threats);
  const watchlist = useStore((s) => s.watchlist);
  const toggleThreat = useStore((s) => s.toggleThreat);
  const setWatch = useStore((s) => s.setWatch);
  const [filter, setFilter] = useState('');

  const q = filter.trim().toLowerCase();
  const heroes = SORTED.filter((h) => !q || h.localizedName.toLowerCase().includes(q));

  return (
    <div className="screen">
      <h2>Threats &amp; ban watchlist</h2>
      <input
        className="filter"
        aria-label="Filter heroes"
        placeholder="Filter by name"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="table-wrap">
        <table className="threats">
          <thead>
            <tr>
              <th className="hero-col">Hero</th>
              {THREATS.map((t) => <th key={t} title={THREAT_DEFINITIONS[t]}>{THREAT_LABELS[t]}</th>)}
              <th>Watch</th>
            </tr>
          </thead>
          <tbody>
            {heroes.map((h) => (
              <tr key={h.id}>
                <th className="hero-col"><img src={h.img} alt="" loading="lazy" />{h.localizedName}</th>
                {THREATS.map((t) => (
                  <td key={t}>
                    <input
                      type="checkbox"
                      aria-label={`${h.localizedName} ${THREAT_LABELS[t]}`}
                      checked={(threats[h.id] ?? []).includes(t)}
                      onChange={() => toggleThreat(h.id, t)}
                    />
                  </td>
                ))}
                <td>
                  <select
                    aria-label={`${h.localizedName} watchlist`}
                    value={watchlist[h.id] ?? ''}
                    onChange={(e) => setWatch(h.id, e.target.value === '' ? null : (Number(e.target.value) as 1 | 2 | 3))}
                  >
                    <option value="">none</option>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
