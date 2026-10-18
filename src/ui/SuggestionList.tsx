import { heroById } from '../data/heroes';
import type { HeroId } from '../data/heroes';
import type { Position, Reason } from '../domain/types';

export interface SuggestionItem {
  heroId: HeroId;
  score: number;
  reasons: Reason[];
  positions?: Position[];
}

export function formatPoints(n: number, signed = true): string {
  const r = Math.round(n * 10) / 10;
  const body = String(Math.abs(r));
  if (r < 0) return `−${body}`;
  return signed && r > 0 ? `+${body}` : body;
}

interface Props {
  items: SuggestionItem[];
  onPick: (heroId: HeroId) => void;
  emptyText?: string;
}

export function SuggestionRow({ item, onPick }: { item: SuggestionItem; onPick: (heroId: HeroId) => void }) {
  const hero = heroById(item.heroId);
  const name = hero?.localizedName ?? `Hero ${item.heroId}`;
  return (
    <li className="suggestion">
      <button className="suggestion-apply" onClick={() => onPick(item.heroId)}>
        {hero && <img src={hero.img} alt="" loading="lazy" />}
        <span className="suggestion-name">{name}</span>
        {item.positions && <span className="muted">Pos {item.positions.join('/')}</span>}
        <span className="score">{formatPoints(item.score, false)}</span>
      </button>
      <details>
        <summary>Why {name}?</summary>
        <ul className="reasons">
          {item.reasons.map((r, i) => (
            <li key={i}>
              <span className={r.points < 0 ? 'neg' : 'pos'}>{formatPoints(r.points)}</span> {r.label}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function SuggestionList({ items, onPick, emptyText = 'No suggestions' }: Props) {
  if (items.length === 0) return <p className="empty">{emptyText}</p>;
  return (
    <ul className="suggestions">
      {items.map((item) => <SuggestionRow key={item.heroId} item={item} onPick={onPick} />)}
    </ul>
  );
}
