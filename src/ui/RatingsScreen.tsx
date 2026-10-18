import { heroById } from '../data/heroes';
import { ANSWER_TAGS, TAG_DEFINITIONS, TAG_LABELS } from '../domain/tags';
import type { DamageType, Phase, Rating, RatingKey } from '../domain/types';
import { useStore } from '../store/store';

const GROUPS: { title: string; keys: RatingKey[] }[] = [
  { title: 'Fighting', keys: ['initiation', 'counterInitiation', 'disable', 'bkbPiercingDisable', 'pickoff', 'aoeDamage', 'burst', 'sustainedDamage', 'frontline'] },
  { title: 'Keeping heroes alive', keys: ['save', 'sustain', 'dispel'] },
  { title: 'Map and objectives', keys: ['waveclear', 'push', 'splitPush', 'mapPressure', 'earlyRoshan', 'laning'] },
  { title: 'Setup & follow-up', keys: ['setup', 'followUp'] },
  { title: 'Answers', keys: ANSWER_TAGS },
];
const ALL_KEYS = GROUPS.flatMap((g) => g.keys);
const PHASES: Phase[] = ['early', 'mid', 'late'];
const DAMAGE: DamageType[] = ['physical', 'magical', 'pure'];

const next = (r: Rating): Rating => ((r + 1) % 4) as Rating;

function Cell({ value, label, onClick }: { value: Rating; label: string; onClick: () => void }) {
  return (
    <td>
      <button className={`rate rate-${value}`} aria-label={label} onClick={onClick}>{value}</button>
    </td>
  );
}

export default function RatingsScreen() {
  const players = useStore((s) => s.players);
  const profiles = useStore((s) => s.profiles);
  const setRating = useStore((s) => s.setRating);
  const setPower = useStore((s) => s.setPower);
  const setDamageType = useStore((s) => s.setDamageType);

  const ids = [...new Set(players.flatMap((p) => p.pool.map((e) => e.heroId)))];
  const heroes = ids
    .map((id) => heroById(id))
    .filter((h): h is NonNullable<typeof h> => !!h)
    .sort((a, b) => a.localizedName.localeCompare(b.localizedName));

  if (heroes.length === 0) {
    return (
      <div className="screen">
        <h2>Ratings</h2>
        <p className="empty">No heroes in any pool yet. Add heroes on the Team tab first.</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2>Ratings</h2>
      <p className="hint">Click a cell to cycle 0 → 1 → 2 → 3 → 0.</p>
      <div className="table-wrap">
        <table className="ratings">
          <thead>
            <tr>
              <th rowSpan={2} className="hero-col">Hero</th>
              {GROUPS.map((g) => <th key={g.title} colSpan={g.keys.length} className="group">{g.title}</th>)}
              <th colSpan={3} className="group">Power</th>
              <th rowSpan={2}>Damage</th>
            </tr>
            <tr>
              {ALL_KEYS.map((k) => (
                <th key={k} title={TAG_DEFINITIONS[k]} className="tag"><span>{TAG_LABELS[k]}</span></th>
              ))}
              {PHASES.map((ph) => <th key={ph} className="tag" title={`Power ${ph}`}><span>{ph}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {heroes.map((h) => {
              const prof = profiles[h.id];
              return (
                <tr key={h.id}>
                  <th className="hero-col"><img src={h.img} alt="" />{h.localizedName}</th>
                  {ALL_KEYS.map((k) => {
                    const v = (prof?.ratings[k] ?? 0) as Rating;
                    return (
                      <Cell
                        key={k}
                        value={v}
                        label={`${h.localizedName} ${TAG_LABELS[k]}`}
                        onClick={() => setRating(h.id, k, next(v))}
                      />
                    );
                  })}
                  {PHASES.map((ph) => {
                    const v = (prof?.power[ph] ?? 0) as Rating;
                    return (
                      <Cell
                        key={ph}
                        value={v}
                        label={`${h.localizedName} Power ${ph}`}
                        onClick={() => setPower(h.id, ph, next(v))}
                      />
                    );
                  })}
                  <td>
                    <select
                      aria-label={`${h.localizedName} damage type`}
                      value={prof?.damageType ?? 'physical'}
                      onChange={(e) => setDamageType(h.id, e.target.value as DamageType)}
                    >
                      {DAMAGE.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
