import { useState } from 'react';
import { heroById, searchHeroes, type Hero } from '../data/heroes';
import { defaultProfile, effectiveProfile } from '../data/ratingDefaults';
import { profileKey } from '../domain/profiles';
import { ANSWER_TAGS, POSITION_LABELS, TAG_DEFINITIONS, TAG_LABELS } from '../domain/tags';
import type { DamageType, HeroProfile, Phase, Position, Rating, RatingKey } from '../domain/types';
import { useStore } from '../store/store';

const GROUPS: { title: string; note?: string; keys: RatingKey[] }[] = [
  { title: 'Fighting', keys: ['initiation', 'counterInitiation', 'disable', 'bkbPiercingDisable', 'pickoff', 'aoeDamage', 'burst', 'sustainedDamage', 'frontline'] },
  { title: 'Keeping heroes alive', keys: ['save', 'sustain', 'dispel'] },
  { title: 'Map and objectives', keys: ['waveclear', 'push', 'splitPush', 'mapPressure', 'earlyRoshan', 'laning'] },
  { title: 'Setup & follow-up', note: 'Having both in a draft gives a combo bonus.', keys: ['setup', 'followUp'] },
  { title: 'Counters', note: 'Counts once the enemy picks a heal-reliant hero.', keys: ANSWER_TAGS },
];
const ALL_KEYS = GROUPS.flatMap((g) => g.keys);
const PHASES: { phase: Phase; label: string; definition: string }[] = [
  { phase: 'early', label: 'Early game', definition: 'Strength in the first ~10 minutes: lanes and early fights.' },
  { phase: 'mid', label: 'Mid game', definition: 'Strength around 10–30 minutes: rotations, towers, Roshan.' },
  { phase: 'late', label: 'Late game', definition: 'Strength after ~30 minutes with full items.' },
];
const DAMAGE: DamageType[] = ['physical', 'magical', 'pure'];
const SCALE: { value: Rating; word: string }[] = [
  { value: 0, word: 'none' }, { value: 1, word: 'a little' }, { value: 2, word: 'good' }, { value: 3, word: 'core' },
];

const ratedCount = (p: HeroProfile | undefined) => ALL_KEYS.filter((k) => (p?.ratings[k] ?? 0) > 0).length;

function RatingRow({ label, definition, value, isDefault, onChange }: {
  label: string; definition: string; value: Rating; isDefault: boolean; onChange: (r: Rating) => void;
}) {
  return (
    <div className="rating-row">
      <div className="rating-text">
        <div className="rating-label">
          {label}
          {isDefault ? <span className="origin default">default</span> : <span className="origin edited">edited</span>}
        </div>
        <div className="rating-def">{definition}</div>
      </div>
      <div role="radiogroup" aria-label={label} className="rating-scale">
        {SCALE.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={value === s.value}
            aria-label={`${s.value} — ${s.word}`}
            className={`scale-btn scale-${s.value}${value === s.value ? ' selected' : ''}`}
            onClick={() => onChange(s.value)}
          >
            <span className="scale-num">{s.value}</span>
            <span className="scale-word">{s.word}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface Entry { hero: Hero; position: Position; key: string }

export default function RatingsScreen() {
  const players = useStore((s) => s.players);
  const profiles = useStore((s) => s.profiles);
  const setRating = useStore((s) => s.setRating);
  const setPower = useStore((s) => s.setPower);
  const setDamageType = useStore((s) => s.setDamageType);
  const resetProfile = useStore((s) => s.resetProfile);
  const copyProfile = useStore((s) => s.copyProfile);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // One entry per hero and position: a hero in two pools is rated separately for each role.
  const entries: Entry[] = [];
  for (const p of players) {
    for (const e of p.pool) {
      const hero = heroById(e.heroId);
      if (hero) entries.push({ hero, position: p.position, key: profileKey(hero.id, p.position) });
    }
  }
  entries.sort((a, b) => a.hero.localizedName.localeCompare(b.hero.localizedName) || a.position - b.position);

  if (entries.length === 0) {
    return (
      <div className="screen">
        <h2>Ratings</h2>
        <p className="empty">No heroes in any pool yet. Add heroes on the Team tab first.</p>
      </div>
    );
  }

  const index = Math.max(0, entries.findIndex((e) => e.key === selectedKey));
  const { hero, position, key } = entries[index];
  // Same matching as the other hero pickers (prefix, initials, substring), limited to our pools.
  const q = query.trim();
  const rank = new Map(q ? searchHeroes(q, 200).map((h, i) => [h.id, i] as const) : []);
  const shown = q
    ? entries
      .filter((e) => rank.has(e.hero.id))
      .sort((a, b) => rank.get(a.hero.id)! - rank.get(b.hero.id)! || a.position - b.position)
    : entries;
  const stored = profiles[key];
  const prof = effectiveProfile(profiles, hero.id, position);
  const otherPositions = entries.filter((e) => e.hero.id === hero.id && e.position !== position).map((e) => e.position);

  return (
    <div className="screen">
      <h2>Ratings</h2>
      <div className="ratings-layout">
        <div className="ratings-sidebar">
          <input
            type="search"
            className="ratings-search"
            aria-label="Search heroes"
            placeholder="Search heroes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && shown[0]) setSelectedKey(shown[0].key);
              if (e.key === 'Escape') setQuery('');
            }}
          />
          {shown.length === 0 && <p className="empty">No pool hero matches “{q}”.</p>}
          <ul className="ratings-heroes" aria-label="Heroes to rate">
            {shown.map((e) => (
              <li key={e.key}>
                <button type="button" className={e.key === key ? 'active' : ''} aria-current={e.key === key} onClick={() => setSelectedKey(e.key)}>
                  <img src={e.hero.img} alt="" />
                  <span className="rh-name">{e.hero.localizedName}</span>
                  <span className="rh-meta">
                    Pos {e.position} · {ratedCount(effectiveProfile(profiles, e.hero.id, e.position))}/{ALL_KEYS.length} tags
                    {profiles[e.key] ? ' · edited' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="ratings-editor">
          <div className="editor-head card">
            <img src={hero.img} alt="" className="editor-portrait" />
            <div className="editor-title">
              <h3>{hero.localizedName}</h3>
              <span className="editor-pos">as Pos {position} · {POSITION_LABELS[position]}</span>
            </div>
            <label className="damage-select">
              Damage type
              <select
                aria-label="Damage type"
                value={prof.damageType}
                onChange={(e) => setDamageType(hero.id, position, e.target.value as DamageType)}
              >
                {DAMAGE.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            {otherPositions.map((p) => (
              <button
                key={p}
                type="button"
                title={`Make these ratings the same as ${hero.localizedName} at Pos ${p}`}
                onClick={() => copyProfile(hero.id, p, position)}
              >
                Copy from Pos {p}
              </button>
            ))}
            <button
              type="button"
              disabled={!stored}
              title="Discard our edits for this hero at this position and go back to the default ratings"
              onClick={() => resetProfile(hero.id, position)}
            >
              Reset to defaults
            </button>
            <div className="editor-nav">
              <button type="button" aria-label="Previous hero" disabled={index === 0} onClick={() => setSelectedKey(entries[index - 1].key)}>← Prev</button>
              <button type="button" aria-label="Next hero" disabled={index === entries.length - 1} onClick={() => setSelectedKey(entries[index + 1].key)}>Next →</button>
            </div>
          </div>
          <p className="hint">
            0 = not at all · 1 = a little · 2 = good at it · 3 = a core reason to pick this hero. Values marked <em>default</em> are
            pre-filled from the hero's kit; any click makes it <em>edited</em>.
            {otherPositions.length > 0 && <> This hero is also in the Pos {otherPositions.join('/')} pool and is rated separately there.</>}
          </p>

          {GROUPS.map((g) => (
            <section key={g.title} className="card rating-group" aria-label={g.title}>
              <h4>{g.title}</h4>
              {g.note && <p className="hint">{g.note}</p>}
              {g.keys.map((k) => (
                <RatingRow
                  key={k}
                  label={TAG_LABELS[k]}
                  definition={TAG_DEFINITIONS[k]}
                  value={(prof.ratings[k] ?? 0) as Rating}
                  isDefault={stored?.ratings[k] === undefined}
                  onChange={(r) => setRating(hero.id, position, k, r)}
                />
              ))}
            </section>
          ))}

          <section className="card rating-group" aria-label="Power curve">
            <h4>Power curve</h4>
            <p className="hint">When is this hero strongest in this role? Weighted by the chosen win condition.</p>
            {PHASES.map((ph) => (
              <RatingRow
                key={ph.phase}
                label={ph.label}
                definition={ph.definition}
                value={prof.power[ph.phase]}
                isDefault={!stored || stored.power[ph.phase] === defaultProfile(hero.id).power[ph.phase]}
                onChange={(r) => setPower(hero.id, position, ph.phase, r)}
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
