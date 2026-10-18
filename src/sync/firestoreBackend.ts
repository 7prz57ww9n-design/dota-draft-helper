import { firebaseConfig } from './firebaseConfig';
import type { TeamDocName } from './teamDocs';
import type { TeamBackend } from './teamSync';

// Layout (see firestore.rules): teams/{code}/positions/{1-5} and teams/{code}/shared/main.

let dbPromise: Promise<{ db: import('firebase/firestore').Firestore; fs: typeof import('firebase/firestore') }> | null = null;

/** Loads Firebase only when a team is used, so the app stays light without one. */
function database() {
  dbPromise ??= Promise.all([import('firebase/app'), import('firebase/firestore')]).then(([app, fs]) => {
    const firebaseApp = app.getApps()[0] ?? app.initializeApp(firebaseConfig);
    return { db: fs.initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true }), fs };
  });
  return dbPromise;
}

export function createFirestoreBackend(): TeamBackend {
  return {
    subscribe(teamId, onDoc, onReady, onError) {
      let unsubscribers: (() => void)[] = [];
      let cancelled = false;
      void database().then(({ db, fs }) => {
        if (cancelled) return;
        let positionsLoaded = false;
        let sharedLoaded = false;
        let readySent = false;
        const maybeReady = () => {
          if (positionsLoaded && sharedLoaded && !readySent) { readySent = true; onReady(); }
        };
        unsubscribers = [
          fs.onSnapshot(fs.collection(db, 'teams', teamId, 'positions'), (snap) => {
            for (const change of snap.docChanges()) {
              onDoc(`pos-${change.doc.id}` as TeamDocName, change.type === 'removed' ? null : change.doc.data());
            }
            positionsLoaded = true;
            maybeReady();
          }, onError),
          fs.onSnapshot(fs.doc(db, 'teams', teamId, 'shared', 'main'), (snap) => {
            onDoc('shared', snap.exists() ? snap.data() : null);
            sharedLoaded = true;
            maybeReady();
          }, onError),
        ];
      }, onError);
      return () => {
        cancelled = true;
        unsubscribers.forEach((u) => u());
      };
    },

    async write(teamId, name, doc) {
      const { db, fs } = await database();
      const ref = name === 'shared'
        ? fs.doc(db, 'teams', teamId, 'shared', 'main')
        : fs.doc(db, 'teams', teamId, 'positions', name.slice('pos-'.length));
      await fs.setDoc(ref, doc);
    },
  };
}
