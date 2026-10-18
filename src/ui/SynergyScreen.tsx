import { useMemo, useState } from 'react';
import { HEROES, heroById } from '../data/heroes';
import type { HeroId } from '../data/heroes';
import type { SynergyPair } from '../domain/types';
import { useStore } from '../store/store';
import HeroPicker from './HeroPicker';

const STRENGTHS = [-2, -1, 0, 1, 2, 3] as const;
type Strength = SynergyPair['strength'];
const nameOf = (id: HeroId) => heroById(id)?.localizedName ?? `Hero ${id}`;
const fmt = (s: number) => (s > 0 ? `+${s}` : String(s));

export default function SynergyScreen() {
  const players = useStore((s) => s.players);
  const synergies = useStore((s) => s.synergies);
  const upsertSynergy = useStore((s) => s.upsertSynergy);
  const removeSynergy = useStore((s) => s.removeSynergy);

  const [a, setA] = useState<HeroId | null>(null);
  const [b, setB] = useState<HeroId | null>(null);
  const [strength, setStrength] = useState<Strength>(1);
  const [laneDuo, setLaneDuo] = useState(false);

  const notInPool = useMemo(() => {
    const poolIds = new Set(players.flatMap((p) => p.pool.map((e) => e.heroId)));
    return HEROES.filter((h) => !poolIds.has(h.id)).map((h) => h.id);
  }, [players]);

  const canAdd = a !== null && b !== null && a !== b;
  const add = () => {
    if (a === null || b === null || a === b) return;
    upsertSynergy({ a, b, strength, laneDuo });
    setA(null);
    setB(null);
  };

  return (
    <div className="screen">
      <h2>Synergies</h2>
      <p className="hint">Pairs are picked from heroes in your pools.</p>
      <div className="card synergy-form">
        <div>
          <HeroPicker placeholder="Hero A" exclude={notInPool} onSelect={setA} />
          <div className="chosen">{a !== null ? nameOf(a) : '—'}</div>
        </div>
        <div>
          <HeroPicker placeholder="Hero B" exclude={notInPool} onSelect={setB} />
          <div className="chosen">{b !== null ? nameOf(b) : '—'}</div>
        </div>
        <label>
          Strength{' '}
          <select
            aria-label="New synergy strength"
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value) as Strength)}
          >
            {STRENGTHS.map((s) => <option key={s} value={s}>{fmt(s)}</option>)}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={laneDuo} onChange={(e) => setLaneDuo(e.target.checked)} /> Lane duo
        </label>
        <button onClick={add} disabled={!canAdd}>Add pair</button>
      </div>

      {synergies.length === 0 ? (
        <p className="empty">No synergy pairs yet.</p>
      ) : (
        <ul className="synergy-list">
          {synergies.map((p) => (
            <li key={`${p.a}-${p.b}`} className="card">
              <span className="pair">{nameOf(p.a)} + {nameOf(p.b)}</span>
              <select
                aria-label={`Strength ${nameOf(p.a)} ${nameOf(p.b)}`}
                value={p.strength}
                onChange={(e) => upsertSynergy({ ...p, strength: Number(e.target.value) as Strength })}
              >
                {STRENGTHS.map((s) => <option key={s} value={s}>{fmt(s)}</option>)}
              </select>
              <label>
                <input
                  type="checkbox"
                  aria-label={`Lane duo ${nameOf(p.a)} ${nameOf(p.b)}`}
                  checked={p.laneDuo}
                  onChange={(e) => upsertSynergy({ ...p, laneDuo: e.target.checked })}
                /> Lane duo
              </label>
              <button aria-label={`Remove ${nameOf(p.a)} ${nameOf(p.b)}`} onClick={() => removeSynergy(p.a, p.b)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
