import type { TeamData, TeamDocName } from './teamDocs';
import { applyDoc, canonical, emptyTeamData, splitTeamData } from './teamDocs';

/** Where team documents live online (Firestore in the app, an in-memory fake in tests). */
export interface TeamBackend {
  /**
   * Delivers every existing document, then calls onReady once, then each
   * later change. A null doc means the document doesn't exist. Returns unsubscribe.
   */
  subscribe(
    teamId: string,
    onDoc: (name: TeamDocName, doc: unknown | null) => void,
    onReady: () => void,
    onError: (e: Error) => void,
  ): () => void;
  write(teamId: string, name: TeamDocName, doc: object): Promise<void>;
}

export type SyncStatus =
  | { state: 'connecting' }
  | { state: 'saving' }
  | { state: 'synced' }
  | { state: 'error'; message: string };

export interface TeamSyncOptions {
  backend: TeamBackend;
  teamId: string;
  /** create: upload this browser's data as the team's. join: replace this browser's data with the team's. */
  mode: 'create' | 'join';
  getData: () => TeamData;
  setData: (data: TeamData) => void;
  subscribeLocal: (listener: () => void) => () => void;
  onStatus: (status: SyncStatus) => void;
  debounceMs?: number;
  now?: () => number;
}

const withoutStamp = (doc: unknown) => {
  if (!doc || typeof doc !== 'object') return doc;
  const { updatedAt: _t, ...rest } = doc as Record<string, unknown>;
  return rest;
};

/**
 * Keeps this browser's team data and the online team in sync, one document
 * per position plus a shared one. Only documents whose content changed are
 * written; a remote change replaces just that document's part of the data.
 */
export function startTeamSync(opts: TeamSyncOptions): { stop: () => void } {
  const { backend, teamId, getData, setData, onStatus, debounceMs = 600, now = Date.now } = opts;
  const lastSynced = new Map<TeamDocName, string>(); // content both sides agree on
  const buffered = new Map<TeamDocName, unknown | null>(); // remote docs before the first snapshot completes
  let ready = false;
  let applying = false;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let errorShown = false;

  const report = (s: SyncStatus) => {
    if (stopped) return;
    errorShown = s.state === 'error';
    onStatus(s);
  };
  const replaceLocal = (data: TeamData) => {
    applying = true;
    try { setData(data); } finally { applying = false; }
  };

  const flush = async () => {
    timer = null;
    if (stopped || !ready) return;
    const docs = splitTeamData(getData());
    const changed = (Object.keys(docs) as TeamDocName[]).filter((n) => canonical(docs[n]) !== lastSynced.get(n));
    if (changed.length === 0) { if (!errorShown) report({ state: 'synced' }); return; }
    report({ state: 'saving' });
    try {
      for (const name of changed) {
        const content = canonical(docs[name]);
        lastSynced.set(name, content);
        try {
          await backend.write(teamId, name, { ...docs[name], updatedAt: now() });
        } catch (e) {
          lastSynced.delete(name); // retried on the next change
          throw e;
        }
      }
      report({ state: 'synced' });
    } catch (e) {
      report({ state: 'error', message: `Couldn't save: ${e instanceof Error ? e.message : String(e)}` });
    }
  };
  const schedule = () => {
    if (stopped || applying || !ready) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void flush(); }, debounceMs);
  };

  const receive = (name: TeamDocName, doc: unknown | null) => {
    const content = canonical(withoutStamp(doc) ?? splitTeamData(emptyTeamData())[name]);
    if (content === lastSynced.get(name)) return; // our own write coming back, or no change
    try {
      replaceLocal(applyDoc(getData(), name, withoutStamp(doc)));
      lastSynced.set(name, content);
      report({ state: 'synced' });
    } catch (e) {
      report({ state: 'error', message: `Ignored invalid team data: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  report({ state: 'connecting' });
  const unsubscribeRemote = backend.subscribe(
    teamId,
    (name, doc) => (ready ? receive(name, doc) : buffered.set(name, doc)),
    () => {
      if (stopped || ready) return;
      if (opts.mode === 'join') {
        if (![...buffered.values()].some((d) => d !== null)) {
          report({ state: 'error', message: 'No team found with this code. Check the link, or create a new team.' });
          return; // stays not ready: nothing is replaced or written
        }
        let data = emptyTeamData();
        try {
          for (const [name, doc] of buffered) data = applyDoc(data, name, withoutStamp(doc));
        } catch (e) {
          report({ state: 'error', message: `Team data is invalid: ${e instanceof Error ? e.message : String(e)}` });
          return;
        }
        replaceLocal(data);
        const docs = splitTeamData(data);
        for (const name of Object.keys(docs) as TeamDocName[]) lastSynced.set(name, canonical(docs[name]));
        ready = true;
        report({ state: 'synced' });
      } else {
        ready = true;
        void flush(); // nothing synced yet, so every document is written
      }
    },
    (e) => report({ state: 'error', message: `Connection problem: ${e.message}` }),
  );
  const unsubscribeLocal = opts.subscribeLocal(schedule);

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      unsubscribeRemote();
      unsubscribeLocal();
    },
  };
}
