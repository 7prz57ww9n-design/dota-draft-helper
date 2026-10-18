import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { heroById } from '../data/heroes';
import type { HeroId } from '../data/heroes';
import { POSITION_LABELS } from '../domain/tags';
import type { Position } from '../domain/types';

interface Props {
  heroId: HeroId;
  options: Position[];
  onChoose: (position: Position) => void;
  onCancel: () => void;
}

export default function PositionPrompt({ heroId, options, onChoose, onCancel }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.querySelector('button')?.focus(); }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
      return;
    }
    const n = Number(e.key);
    if (options.includes(n as Position)) {
      e.preventDefault();
      onChoose(n as Position);
    }
  };

  const name = heroById(heroId)?.localizedName ?? `Hero ${heroId}`;
  return (
    <div role="dialog" aria-label={`Choose position for ${name}`} className="position-prompt card" ref={ref} onKeyDown={onKeyDown}>
      <div>Which position for <strong>{name}</strong>? (press the number, Esc to cancel)</div>
      <div className="prompt-options">
        {options.map((p) => (
          <button key={p} onClick={() => onChoose(p)}>Pos {p} — {POSITION_LABELS[p]}</button>
        ))}
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
