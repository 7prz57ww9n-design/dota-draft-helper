import { useState } from 'react';
import { heroById, type HeroId } from '../data/heroes';
import { defaultProfile, withDefaults } from '../data/ratingDefaults';
import { ANSWER_TAGS, TAG_DEFINITIONS, TAG_LABELS } from '../domain/tags';
import type { DamageType, HeroProfile, Phase, Rating, RatingKey } from '../domain/types';
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

export default function RatingsScreen() {
  const players = useStore((s) => s.players);
  const profiles = useStore((s) => s.profiles);
  const setRating = useStore((s) => s.setRating);
  const setPower = useStore((s) => s.setPower);
  const setDamageType = useStore((s) => s.setDamageType);
  const resetProfile = useStore((s) => s.resetProfile);
  const effective = withDefaults(profiles);
  const [selectedId, setSelectedId] = useState<HeroId | null>(null);

  const positionsOf = new Map<HeroId, number[]>();
  for (const p of players) {
    for (const e of p.pool) positionsOf.set(e.heroId, [...(positionsOf.get(e.heroId) ?? []), p.position]);
  }
  const heroes = [...positionsOf.keys()]
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

  const index = Math.max(0, heroes.findIndex((h) => h.id === selectedId));
  const hero = heroes[index];
  const stored = profiles[hero.id];
  const prof = effective[hero.id] ?? defaultProfile(hero.id);

  return (
    <div className="screen">
      <h2>Ratings</h2>
      <div className="ratings-layout">
        <ul className="ratings-heroes" aria-label="Heroes to rate">
          {heroes.map((h, i) => (
            <li key={h.id}>
              <button type="button" className={i === index ? 'active' : ''} aria-current={i === index} onClick={() => setSelectedId(h.id)}>
                <img src={h.img} alt="" />
                <span className="rh-name">{h.localizedName}</span>
                <span className="rh-meta">Pos {[...positionsOf.get(h.id)!].sort().join('/')} · {ratedCount(effective[h.id])}/{ALL_KEYS.length} tags{profiles[h.id] ? ' · edited' : ''}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="ratings-editor">
          <div className="editor-head card">
            <img src={hero.img} alt="" className="editor-portrait" />
            <h3>{hero.localizedName}</h3>
            <label className="damage-select">
              Damage type
              <select
                aria-label="Damage type"
                value={prof.damageType}
                onChange={(e) => setDamageType(hero.id, e.target.value as DamageType)}
              >
                {DAMAGE.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <button type="button" disabled={!stored} title="Discard our edits for this hero and go back to the default ratings" onClick={() => resetProfile(hero.id)}>Reset to defaults</button>
            <div className="editor-nav">
              <button type="button" aria-label="Previous hero" disabled={index === 0} onClick={() => setSelectedId(heroes[index - 1].id)}>← Prev</button>
              <button type="button" aria-label="Next hero" disabled={index === heroes.length - 1} onClick={() => setSelectedId(heroes[index + 1].id)}>Next →</button>
            </div>
          </div>
          <p className="hint">0 = not at all · 1 = a little · 2 = good at it · 3 = a core reason to pick this hero. Values marked <em>default</em> are pre-filled from the hero's kit; any click makes it <em>edited</em>.</p>

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
                  onChange={(r) => setRating(hero.id, k, r)}
                />
              ))}
            </section>
          ))}

          <section className="card rating-group" aria-label="Power curve">
            <h4>Power curve</h4>
            <p className="hint">When is this hero strongest? Weighted by the chosen win condition.</p>
            {PHASES.map((ph) => (
              <RatingRow
                key={ph.phase}
                label={ph.label}
                definition={ph.definition}
                value={prof.power[ph.phase]}
                isDefault={!stored || stored.power[ph.phase] === defaultProfile(hero.id).power[ph.phase]}
                onChange={(r) => setPower(hero.id, ph.phase, r)}
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
