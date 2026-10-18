import type { TeamDocName } from './teamDocs';
import type { TeamBackend } from './teamSync';

/** In-memory stand-in for Firestore, shared by several simulated browsers. */
export class FakeBackend implements TeamBackend {
  docs = new Map<string, Map<TeamDocName, unknown>>();
  listeners = new Set<{ teamId: string; onDoc: (n: TeamDocName, d: unknown | null) => void }>();
  writes: { name: TeamDocName; doc: unknown }[] = [];
  failNext = false;

  subscribe(teamId: string, onDoc: (n: TeamDocName, d: unknown | null) => void, onReady: () => void) {
    const l = { teamId, onDoc };
    this.listeners.add(l);
    queueMicrotask(() => {
      for (const [name, doc] of this.docs.get(teamId) ?? []) onDoc(name, doc);
      onReady();
    });
    return () => { this.listeners.delete(l); };
  }

  async write(teamId: string, name: TeamDocName, doc: object) {
    if (this.failNext) { this.failNext = false; throw new Error('offline'); }
    this.writes.push({ name, doc });
    const team = this.docs.get(teamId) ?? new Map();
    team.set(name, structuredClone(doc));
    this.docs.set(teamId, team);
    for (const l of this.listeners) if (l.teamId === teamId) queueMicrotask(() => l.onDoc(name, structuredClone(doc)));
  }
}
