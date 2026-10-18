import { HEROES, type Hero, type HeroId } from '../data/heroes';
import { useStore } from '../store/store';

const GROUPS = [
  { attr: 'str', label: 'Strength', className: 'attr-str' },
  { attr: 'agi', label: 'Agility', className: 'attr-agi' },
  { attr: 'int', label: 'Intelligence', className: 'attr-int' },
  { attr: 'all', label: 'Universal', className: 'attr-all' },
] as const;

const BY_ATTR = new Map<string, Hero[]>(
  GROUPS.map((g) => [
    g.attr,
    HEROES.filter((h) => h.primaryAttr === g.attr).sort((a, b) => a.localizedName.localeCompare(b.localizedName)),
  ]),
);

type Status = 'banned' | 'picked by us' | 'picked by enemy';

/** Reference grid of all heroes by primary attribute, like the in-game hero grid. */
export default function HeroesScreen() {
  const actions = useStore((s) => s.draft.actions);
  const players = useStore((s) => s.players);

  const status = new Map<HeroId, Status>();
  for (const a of actions) {
    status.set(a.heroId, a.kind === 'ban' ? 'banned' : a.side === 'us' ? 'picked by us' : 'picked by enemy');
  }
  const poolPositions = new Map<HeroId, number[]>();
  for (const p of players) {
    for (const e of p.pool) poolPositions.set(e.heroId, [...(poolPositions.get(e.heroId) ?? []), p.position]);
  }

  return (
    <div className="screen heroes-screen">
      <div className="hero-grid-groups">
        {GROUPS.map((g) => (
          <section key={g.attr} aria-label={g.label} className="hero-group">
            <h3 className={`attr-title ${g.className}`}><span className="attr-dot" aria-hidden="true" />{g.label}</h3>
            <ul className="hero-grid">
              {BY_ATTR.get(g.attr)!.map((h) => {
                const st = status.get(h.id);
                const positions = [...(poolPositions.get(h.id) ?? [])].sort();
                const title = st
                  ? `${h.localizedName} — ${st}`
                  : positions.length
                    ? `${h.localizedName} — in pool: ${positions.map((p) => `Pos ${p}`).join(', ')}`
                    : h.localizedName;
                const cls = ['hero-card', st ? `is-${st.replace(/ /g, '-')}` : '', positions.length ? 'in-pool' : '']
                  .filter(Boolean).join(' ');
                return (
                  <li key={h.id} className={cls} title={title}>
                    <img src={h.img} alt={h.localizedName} loading="lazy" />
                    {positions.length > 0 && <span className="pool-badge">{positions.join('/')}</span>}
                    {st && <span className="status-badge">{st === 'banned' ? 'BAN' : st === 'picked by us' ? 'OURS' : 'ENEMY'}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
