import { useEffect, useRef, useState } from 'react';
import { PAGE_HELP, type HelpTab } from './help';

/** One-line page summary with a "How this page works" button that opens a side panel. */
export default function HelpPanel({ tab }: { tab: HelpTab }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const help = PAGE_HELP[tab];

  useEffect(() => setOpen(false), [tab]);
  useEffect(() => { if (open) panelRef.current?.focus(); }, [open]);

  return (
    <>
      <div className="page-intro">
        <span>{help.summary}</span>
        <button type="button" className="help-button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span aria-hidden="true" className="help-icon">?</span> How this page works
        </button>
      </div>
      {open && (
        <>
          <div className="help-backdrop" onClick={() => setOpen(false)} />
          <aside
            role="dialog"
            aria-label={`${tab} page help`}
            className="help-panel"
            tabIndex={-1}
            ref={panelRef}
            onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
          >
            <div className="help-head">
              <h2>{tab}: how it works</h2>
              <button type="button" aria-label="Close help" onClick={() => setOpen(false)}>×</button>
            </div>
            <p className="hint">{help.summary}</p>
            {help.sections.map((s) => (
              <section key={s.heading}>
                <h3>{s.heading}</h3>
                <ul>{s.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            ))}
          </aside>
        </>
      )}
    </>
  );
}
