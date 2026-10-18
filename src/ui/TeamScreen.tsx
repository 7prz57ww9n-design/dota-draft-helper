import { heroById } from '../data/heroes';
import type { HeroId } from '../data/heroes';
import { POSITION_LABELS } from '../domain/tags';
import type { Player, PoolEntry, Position } from '../domain/types';
import { useStore } from '../store/store';
import HeroPicker from './HeroPicker';

const POSITIONS: Position[] = [1, 2, 3, 4, 5];

/** Display order: best → good → okay, alphabetical within a comfort level. */
function sortByComfort(pool: PoolEntry[]): PoolEntry[] {
  const name = (e: PoolEntry) => heroById(e.heroId)?.localizedName ?? '';
  return [...pool].sort((a, b) => b.comfort - a.comfort || name(a).localeCompare(name(b)));
}

export default function TeamScreen() {
  const players = useStore((s) => s.players);
  const upsertPlayer = useStore((s) => s.upsertPlayer);
  const addToPool = useStore((s) => s.addToPool);
  const removeFromPool = useStore((s) => s.removeFromPool);
  const setComfort = useStore((s) => s.setComfort);

  const ensure = (position: Position): Player => {
    const id = `pos-${position}`;
    const existing = useStore.getState().players.find((p) => p.id === id);
    if (existing) return existing;
    const fresh: Player = { id, name: '', position, pool: [] };
    upsertPlayer(fresh);
    return fresh;
  };

  return (
    <div className="screen">
      <h2>Team</h2>
      {POSITIONS.map((pos) => {
        const player = players.find((p) => p.id === `pos-${pos}`);
        return (
          <section className="card player-row" key={pos} aria-label={`Position ${pos}`}>
            <div className="player-head">
              <span className="pos-label">{pos} · {POSITION_LABELS[pos]}</span>
              <input
                aria-label={`Player name position ${pos}`}
                placeholder="Player name"
                value={player?.name ?? ''}
                onChange={(e) => upsertPlayer({ ...ensure(pos), name: e.target.value })}
              />
              <HeroPicker
                placeholder="Add hero to pool"
                exclude={player?.pool.map((e) => e.heroId)}
                onSelect={(heroId: HeroId) => { ensure(pos); addToPool(`pos-${pos}`, heroId); }}
              />
            </div>
            <ul className="pool">
              {sortByComfort(player?.pool ?? []).map((e) => {
                const hero = heroById(e.heroId);
                const name = hero?.localizedName ?? `Hero ${e.heroId}`;
                return (
                  <li key={e.heroId} className="pool-item">
                    {hero && <img src={hero.img} alt="" />}
                    <span>{name}</span>
                    <select
                      aria-label={`Comfort ${name} position ${pos}`}
                      value={e.comfort}
                      onChange={(ev) => setComfort(`pos-${pos}`, e.heroId, Number(ev.target.value) as 1 | 2 | 3)}
                    >
                      <option value={3}>3 · best</option>
                      <option value={2}>2 · good</option>
                      <option value={1}>1 · okay</option>
                    </select>
                    <button
                      aria-label={`Remove ${name} from position ${pos}`}
                      onClick={() => removeFromPool(`pos-${pos}`, e.heroId)}
                    >×</button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
