import { useEffect, useMemo, useRef, useState } from 'react';
import { HEROES, heroById } from '../data/heroes';
import type { HeroId } from '../data/heroes';
import { computeCoverage, effectiveTargets, enemyThreatCounts } from '../domain/coverage';
import { nextExpected, positionOptions, toContext } from '../domain/draft';
import type { ActionKind, DraftMode, Side } from '../domain/draft';
import { CM_SEQUENCE } from '../domain/draftOrder';
import { inferWinCondition } from '../domain/inferWinCondition';
import { suggestBans } from '../domain/suggestBans';
import { suggestPicks } from '../domain/suggestPicks';
import { POSITION_LABELS } from '../domain/tags';
import type { Position, WinCondition } from '../domain/types';
import { WIN_PROFILES } from '../domain/winConditions';
import { useStore } from '../store/store';
import CoveragePanel from './CoveragePanel';
import HeroPicker from './HeroPicker';
import PositionPrompt from './PositionPrompt';
import SuggestionList, { SuggestionRow } from './SuggestionList';

type Current = { side: Side; kind: ActionKind };

const WIN_LABELS: Record<WinCondition, string> = {
  balanced: 'Balanced',
  fightEarly: 'Fight & end early',
  pickoff: 'Pickoff / tempo',
  lateScaling: 'Late scaling',
  splitPush: 'Split push',
};
const MODE_LABELS: Record<DraftMode, string> = {
  captainsMode: 'Captains Mode',
  captainsDraft: 'Captains Draft',
  freeform: 'Freeform',
};
const ALL_POSITIONS: Position[] = [1, 2, 3, 4, 5];
const OVERRIDES: { label: string; value: Current }[] = [
  { label: 'Our pick', value: { side: 'us', kind: 'pick' } },
  { label: 'Enemy pick', value: { side: 'enemy', kind: 'pick' } },
  { label: 'Our ban', value: { side: 'us', kind: 'ban' } },
  { label: 'Enemy ban', value: { side: 'enemy', kind: 'ban' } },
];
const describe = (c: Current) => `${c.side === 'us' ? 'Our' : 'Enemy'} ${c.kind}`;
const same = (a: Current, b: Current) => a.side === b.side && a.kind === b.kind;

function HeroChip({ heroId, onRemove }: { heroId: HeroId; onRemove?: () => void }) {
  const hero = heroById(heroId);
  return (
    <span className="chip">
      {hero && <img src={hero.img} alt="" loading="lazy" />}
      {hero?.localizedName ?? `Hero ${heroId}`}
      {onRemove && <button aria-label={`Remove ${hero?.localizedName ?? heroId}`} onClick={onRemove}>×</button>}
    </span>
  );
}

export default function DraftScreen() {
  const { players, profiles, threats, synergies, watchlist, draft } = useStore();
  const { draftApply, draftUndo, draftReset, setWeFirst, setAvailable, setWin } = useStore.getState();

  const [override, setOverride] = useState<Current | null>(null);
  const [pending, setPending] = useState<{ heroId: HeroId; action: Current; options: Position[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availList, setAvailList] = useState<HeroId[]>([]);
  const [editingAvail, setEditingAvail] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const focusPicker = () => { pickerRef.current?.querySelector('input')?.focus(); };
  useEffect(() => { if (!pending) focusPicker(); }, [pending, draft.actions.length, draft.mode]);

  const expected = nextExpected(draft);
  const current: Current = override ?? expected ?? { side: 'us', kind: 'pick' };
  const sequenceActive = draft.mode !== 'freeform' && expected !== null;
  const stepLabel = sequenceActive
    ? `Step ${draft.actions.length + 1}/${CM_SEQUENCE.length} — ${describe(current)}${override ? ' (override)' : ''}`
    : describe(current);

  const availableStep = draft.mode === 'captainsDraft' && draft.actions.length === 0
    && (draft.available === null || editingAvail);

  const derived = useMemo(() => {
    const ctx = toContext(draft, { players, profiles, threats, synergies });
    const ourIds = ctx.ourPicks.map((p) => p.heroId);
    const picks = suggestPicks(ctx, 5);
    const bans = suggestBans(ctx, watchlist, 5);
    const { targets, threatBoosted } = effectiveTargets(draft.win, enemyThreatCounts(ctx.enemyPicks, threats));
    return {
      ctx,
      picks,
      bans,
      targets,
      threatBoosted,
      coverage: computeCoverage(ourIds, profiles),
      lean: inferWinCondition(ourIds, profiles)?.[0]?.win ?? null,
    };
  }, [draft, players, profiles, threats, synergies, watchlist]);
  const { ctx } = derived;

  const exclude = useMemo(() => {
    const taken = draft.actions.map((a) => a.heroId);
    if (draft.mode === 'captainsDraft' && draft.available && !editingAvail) {
      const avail = new Set(draft.available);
      return [...taken, ...HEROES.filter((h) => !avail.has(h.id)).map((h) => h.id)];
    }
    return taken;
  }, [draft.actions, draft.mode, draft.available, editingAvail]);

  const openPositions = ALL_POSITIONS.filter((p) => !ctx.ourPicks.some((o) => o.position === p));

  const dispatch = (heroId: HeroId, action: Current, position?: Position) => {
    try {
      draftApply({ ...action, heroId, ...(position !== undefined ? { position } : {}) });
      setError(null);
      setOverride(null);
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPending(null);
    }
  };

  const apply = (heroId: HeroId, action: Current) => {
    if (action.side === 'us' && action.kind === 'pick') {
      const opts = positionOptions(draft, players, heroId);
      if (opts.length === 1) { dispatch(heroId, action, opts[0]); return; }
      if (openPositions.length === 0) {
        setError('All five positions are already filled');
        return;
      }
      setPending({ heroId, action, options: opts.length > 1 ? opts : openPositions });
      return;
    }
    dispatch(heroId, action);
  };

  const confirmReset = (mode: DraftMode, weFirst: boolean) => {
    if (draft.actions.length > 0 && !window.confirm('Discard the current draft?')) return;
    draftReset(mode, weFirst);
    setOverride(null);
    setPending(null);
    setError(null);
    setAvailList([]);
    setEditingAvail(false);
  };

  const startEditAvail = () => { setAvailList(draft.available ?? []); setEditingAvail(true); };
  const startDraft = () => { setAvailable(availList); setEditingAvail(false); };

  const enemyPicks = draft.actions.filter((a) => a.side === 'enemy' && a.kind === 'pick');
  const bans = draft.actions.filter((a) => a.kind === 'ban');
  const mustHave = WIN_PROFILES[draft.win].mustHave;
  const pickOurs = (id: HeroId) => apply(id, { side: 'us', kind: 'pick' });

  return (
    <div className="draft">
      <div className="draft-top card">
        <select aria-label="Mode" value={draft.mode} onChange={(e) => confirmReset(e.target.value as DraftMode, draft.weFirst)}>
          {(Object.keys(MODE_LABELS) as DraftMode[]).map((m) => <option key={m} value={m}>{MODE_LABELS[m]}</option>)}
        </select>
        <label>
          <input
            type="checkbox"
            checked={draft.weFirst}
            onChange={(e) => setWeFirst(e.target.checked)}
          /> We pick first
        </label>
        <strong className="step">{stepLabel}</strong>
        <span className="overrides">
          {OVERRIDES.map((o) => (
            <button
              key={o.label}
              className={same(current, o.value) ? 'active' : ''}
              aria-pressed={same(current, o.value)}
              onClick={() => { setOverride(o.value); focusPicker(); }}
            >
              {o.label}
            </button>
          ))}
        </span>
        <button onClick={() => { draftUndo(); setError(null); setOverride(null); setPending(null); }} disabled={draft.actions.length === 0}>Undo</button>
        <button className="danger" onClick={() => confirmReset(draft.mode, draft.weFirst)}>Reset</button>
      </div>

      <div className="draft-cols">
        <section className="draft-left">
          <h3>Our team</h3>
          {ALL_POSITIONS.map((p) => {
            const pick = ctx.ourPicks.find((o) => o.position === p);
            return (
              <div key={p} className="slot">
                <span className="slot-pos">Pos {p} <span className="muted">{POSITION_LABELS[p]}</span></span>
                {pick ? <HeroChip heroId={pick.heroId} /> : <span className="empty">open</span>}
              </div>
            );
          })}
          <h3>Enemy picks</h3>
          <div className="chips">
            {enemyPicks.length === 0 && <span className="empty">none</span>}
            {enemyPicks.map((a) => <HeroChip key={a.heroId} heroId={a.heroId} />)}
          </div>
          <h3>Bans</h3>
          <div className="chips">
            {bans.length === 0 && <span className="empty">none</span>}
            {bans.map((a) => <HeroChip key={a.heroId} heroId={a.heroId} />)}
          </div>
        </section>

        <section className="draft-centre">
          {availableStep ? (
            <div className="card">
              <h3>Available heroes</h3>
              <HeroPicker
                onSelect={(id) => setAvailList((l) => (l.includes(id) ? l : [...l, id]))}
                exclude={availList}
                placeholder="Add available hero…"
                autoFocus
              />
              <div className="chips">
                {availList.map((id) => (
                  <HeroChip key={id} heroId={id} onRemove={() => setAvailList((l) => l.filter((x) => x !== id))} />
                ))}
              </div>
              <button onClick={startDraft} disabled={availList.length === 0}>Start draft</button>
            </div>
          ) : (
            <div className="card">
              <div ref={pickerRef}>
                <HeroPicker
                  onSelect={(id) => apply(id, current)}
                  exclude={exclude}
                  placeholder={`${describe(current)}…`}
                  autoFocus
                />
              </div>
              {pending && (
                <PositionPrompt
                  heroId={pending.heroId}
                  options={pending.options}
                  onChoose={(pos) => dispatch(pending.heroId, pending.action, pos)}
                  onCancel={() => setPending(null)}
                />
              )}
              {error && <div role="alert" className="alert error">{error}</div>}
              {draft.mode === 'captainsDraft' && draft.actions.length === 0 && (
                <button onClick={startEditAvail}>Edit available</button>
              )}
            </div>
          )}
        </section>

        <section className="draft-right">
          <div className="card">
            <label>
              Win condition{' '}
              <select
                aria-label="Win condition"
                value={draft.win}
                onChange={(e) => setWin(e.target.value as WinCondition)}
              >
                {(Object.keys(WIN_LABELS) as WinCondition[]).map((w) => <option key={w} value={w}>{WIN_LABELS[w]}</option>)}
              </select>
            </label>
            {derived.lean && <p className="hint">Your picks lean: {WIN_LABELS[derived.lean]}</p>}
          </div>

          {!availableStep && (
            <>
              <div className="card" data-testid="pick-suggestions">
                <h3>Pick suggestions</h3>
                <SuggestionList items={derived.picks.top} onPick={pickOurs} emptyText="No pick suggestions" />
                <h4>Best per position</h4>
                <ul className="suggestions">
                  {openPositions.map((p) => {
                    const best = derived.picks.bestByPosition[p];
                    return best ? (
                      <SuggestionRow key={p} item={{ ...best, positions: [p] }} onPick={(id) => dispatch(id, { side: 'us', kind: 'pick' }, p)} />
                    ) : (
                      <li key={p} className="empty">No candidates for Pos {p}</li>
                    );
                  })}
                </ul>
              </div>
              <div className="card" data-testid="ban-suggestions">
                <h3>Ban suggestions</h3>
                <SuggestionList
                  items={derived.bans}
                  onPick={(id) => apply(id, { side: 'us', kind: 'ban' })}
                  emptyText="No ban suggestions"
                />
              </div>
            </>
          )}
        </section>
      </div>

      <div className="card draft-bottom">
        <h3>Coverage</h3>
        <CoveragePanel
          coverage={derived.coverage}
          targets={derived.targets}
          mustHave={mustHave}
          threatBoosted={derived.threatBoosted}
        />
      </div>
    </div>
  );
}
