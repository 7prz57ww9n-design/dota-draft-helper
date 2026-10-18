# Dota 2 Draft Helper

A static web app that helps a team draft in Dota 2 Captains Mode. You enter your players, their hero pools and team ratings for each hero. During the draft the app suggests picks and bans, shows which needs the draft still has to cover, and flags enemy threats your heroes must answer. All data stays in the browser (localStorage). There is no backend.

Built with Vite, React, TypeScript, Zustand and Vitest.

## Quick start

```sh
npm install
npm run dev
```

Open the URL that Vite prints (usually http://localhost:5173).

## Tests and build

```sh
npm test          # run the Vitest suite once
npm run build     # type-check, then build to dist/
npm run preview   # serve the built dist/ locally
```

## Updating heroes after a patch

When a patch adds heroes, refresh the hero list from OpenDota:

```sh
npm run fetch-heroes
```

This rewrites `src/data/heroes.json`. Then add an entry for each new hero to `src/data/threats.seed.json` (the tests check that every hero has one), and rate the hero in the app.

## Deploying to GitHub Pages

1. Push the repository to GitHub.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` runs the tests, builds, and publishes `dist/` to Pages. You can also start it by hand from the Actions tab.

The build uses a relative base path, so it works at any Pages URL.

## Sharing data with your team

Each browser keeps its own data. To share it, open the **Data** tab and choose **Export JSON** to save a file (`dota-draft-helper.json`). A teammate opens the **Data** tab and chooses **Import JSON** with that file. Import replaces their players, ratings, threats, synergies and watchlist.

## Starting values to tune

- **Threat flags** (`src/data/threats.seed.json`) are best-effort values from current hero kits. Correct them in the Threats screen for your team.
- **Win-condition targets** (`src/domain/winConditions.ts`) are starting values. Adjust the targets and must-haves to match how your team plays.
- **Captains Mode order** (`src/domain/draftOrder.ts`) follows the order introduced in patch 7.34. Check it against the current patch before relying on it.

## Team sync (Firebase)

Team data can be shared online through Firestore in the Firebase project `dota-drafter-55d00` (free Spark plan).
On the Data tab, one player clicks **Create team from my data** and sends the team link to the others.

- Web config: `src/sync/firebaseConfig.ts` (public by design; access is controlled by the rules).
- Security rules: `firestore.rules`. Anyone who knows a team's 24-character code can read and write that team;
  teams cannot be listed. After changing the rules, deploy them with:

  ```bash
  npx firebase-tools login
  npx firebase-tools deploy --only firestore:rules
  ```
