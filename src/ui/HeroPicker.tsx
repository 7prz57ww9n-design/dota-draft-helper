import { useId, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { searchHeroes } from '../data/heroes';
import type { HeroId } from '../data/heroes';

interface Props {
  onSelect: (heroId: HeroId) => void;
  exclude?: HeroId[];
  placeholder?: string;
  autoFocus?: boolean;
}

export default function HeroPicker({ onSelect, exclude, placeholder = 'Search hero…', autoFocus }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const uid = useId();
  const listId = `${uid}-list`;

  const results = useMemo(() => {
    const ex = new Set(exclude ?? []);
    return searchHeroes(query, 1000).filter((h) => !ex.has(h.id)).slice(0, 8);
  }, [query, exclude]);

  const clear = () => { setQuery(''); setIndex(0); setOpen(true); };
  const visible = open && results.length > 0;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length) setIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) setIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hero = results[Math.min(index, results.length - 1)];
      if (hero) { onSelect(hero.id); clear(); }
    } else if (e.key === 'Escape') {
      clear();
    }
  };

  return (
    <div className="hero-picker">
      <input
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={visible ? `${uid}-opt-${results[Math.min(index, results.length - 1)].id}` : undefined}
        aria-label={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIndex(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {visible && (
        <ul role="listbox" id={listId} className="hero-picker-list">
          {results.map((h, i) => (
            <li
              key={h.id}
              id={`${uid}-opt-${h.id}`}
              role="option"
              data-hero-id={h.id}
              aria-selected={i === index}
              className={i === index ? 'active' : ''}
              onMouseDown={(e) => { e.preventDefault(); onSelect(h.id); clear(); }}
              onMouseEnter={() => setIndex(i)}
            >
              <img src={h.img} alt="" loading="lazy" />
              {h.localizedName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
