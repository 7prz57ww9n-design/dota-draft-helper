# Dota 2 Draft Helper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static web app that stores our team's hero pools and ratings, and suggests picks and bans with reasons during Captains Mode, Captains Draft and freeform drafts.

**Architecture:**
- All logic lives in pure TypeScript domain modules (`src/domain/`) with unit tests: coverage, pick scoring, ban scoring, win-condition inference, and the draft reducer.
- React screens read and write one Zustand store, persisted to localStorage, with JSON export/import.
- No backend. The output is a static build deployed to GitHub Pages.

**Tech Stack:** Vite, React 18, TypeScript (strict), Zustand (+ persist middleware), Vitest, @testing-library/react, jsdom, plain CSS.

**Spec:** `docs/superpowers/specs/2026-10-18-dota-draft-helper-design.md`

## Global Constraints

- All ratings are integers 0–3. Comfort is 1–3. Synergy strength is −2..+3.
- Win-condition targets, must-haves and power weights are copied verbatim from the spec table into `src/domain/winConditions.ts`. That file is the only place they are defined.
- Threat → answer mapping is exactly the spec table.
- Every scoring term that contributes a non-zero value produces a `Reason`.
- The export file carries `schemaVersion: 1`. Import rejects unknown or missing versions with a readable error.
- The app works fully offline after first load, with no runtime API calls. Hero images are the only network fetches.
- `vite.config.ts` uses `base: './'` so the build works under a GitHub Pages subpath.

## Review Focus

1. **A hero in two open players' pools gets picked.** Expected: the app asks which position, instead of silently assigning one. Test in Task 6.
2. **Pools are empty or no ratings are entered yet.** Expected: the draft screen shows "no candidates for pos N" and does not crash. Tests in Task 4 and Task 9.
3. **Every pool hero for a position is picked or banned.** Expected: that position shows "no candidates," and the other positions still get suggestions. Test in Task 4.
4. **Importing a corrupt, foreign or older file.** Expected: a readable error, and current data left untouched. Test in Task 7.
5. **A hero exists in `heroes.json` but has no threat entry (new patch hero).** Expected: treated as having no threats, with no crash. Test in Task 5.

---

### Task 1: Scaffold and hero data

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`
- Create: `scripts/fetch-heroes.mjs`, which writes `src/data/heroes.json`
- Create: `src/data/heroes.ts`
- Test: `src/data/heroes.test.ts`

**Interfaces:**
- Produces:
  - `type HeroId = number`
  - `interface Hero { id: HeroId; name: string; shortName: string; localizedName: string; primaryAttr: string; img: string }`
  - `HEROES: Hero[]`
  - `heroById(id: HeroId): Hero | undefined`
  - `searchHeroes(query: string, limit?: number): Hero[]`
- `shortName` is `name` without the `npc_dota_hero_` prefix.
- `img` is the Steam CDN URL from the spec.

- [ ] **Step 1:** Run `git init`, then `npm create vite@latest . -- --template react-ts`. Add `zustand`, plus dev dependencies `vitest`, `jsdom`, `@testing-library/react` and `@testing-library/jest-dom`. Set `test.environment = 'jsdom'` and `base: './'` in `vite.config.ts`. Add scripts `"test": "vitest run"` and `"fetch-heroes": "node scripts/fetch-heroes.mjs"`.
- [ ] **Step 2:** Write `scripts/fetch-heroes.mjs`. It GETs `https://api.opendota.com/api/heroes`, maps the result to `{id, name, localized_name, primary_attr}`, and writes the array sorted by `localized_name` to `src/data/heroes.json`. Run `npm run fetch-heroes` and commit the JSON.
- [ ] **Step 3:** Write the failing tests:

```ts
test('loads full roster', () => expect(HEROES.length).toBeGreaterThanOrEqual(120));
test('ids unique', () => expect(new Set(HEROES.map(h => h.id)).size).toBe(HEROES.length));
test('img url built from shortName', () =>
  expect(heroById(1)!.img).toBe('https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png'));
test('search is case-insensitive prefix/substring, prefix first', () => {
  const r = searchHeroes('mag');
  expect(r[0].localizedName).toBe('Magnus');
  expect(r.map(h => h.localizedName)).toContain('Ogre Magi');
});
```

- [ ] **Step 4:** Run `npm test`. Expect FAIL.
- [ ] **Step 5:** Implement `src/data/heroes.ts`. Search ranking: case-insensitive; prefix matches before substring matches; also match initials, so "am" finds Anti-Mage.
- [ ] **Step 6:** Run `npm test`. Expect PASS. Run `npm run build`. Expect success.
- [ ] **Step 7:** Commit with message `feat: scaffold app and hero roster`.

### Task 2: Domain types and constants

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/tags.ts`
- Create: `src/domain/winConditions.ts`
- Test: `src/domain/constants.test.ts`

**Interfaces — Produces:**

```ts
type Position = 1 | 2 | 3 | 4 | 5;
type Rating = 0 | 1 | 2 | 3;
type TeamTag = 'initiation'|'counterInitiation'|'disable'|'bkbPiercingDisable'|'pickoff'|'aoeDamage'|'burst'|'sustainedDamage'|'frontline'|'save'|'sustain'|'dispel'|'waveclear'|'push'|'splitPush'|'mapPressure'|'earlyRoshan'|'laning'|'setup'|'followUp';
type AnswerTag = 'armorReduction'|'aoeCleave'|'detection'|'trueStrike'|'instantDisable'|'magicResist'|'healReduction';
type RatingKey = TeamTag | AnswerTag;
type Threat = 'tanky'|'illusions'|'invisibility'|'evasion'|'mobility'|'magicBurst'|'healReliant'|'spellImmune';
type Phase = 'early' | 'mid' | 'late';
type DamageType = 'physical' | 'magical' | 'pure';
type WinCondition = 'balanced'|'fightEarly'|'pickoff'|'lateScaling'|'splitPush';

interface HeroProfile { heroId: HeroId; ratings: Partial<Record<RatingKey, Rating>>; power: Record<Phase, Rating>; damageType: DamageType }
interface PoolEntry { heroId: HeroId; comfort: 1 | 2 | 3 }
interface Player { id: string; name: string; position: Position; pool: PoolEntry[] }
interface SynergyPair { a: HeroId; b: HeroId; strength: -2|-1|0|1|2|3; laneDuo: boolean }
interface WinProfile { targets: Partial<Record<TeamTag, number>>; mustHave: TeamTag[]; power: Record<Phase, number> }
interface Reason { label: string; points: number }
```

Constants:
- `TEAM_TAGS: TeamTag[]`
- `ANSWER_TAGS: AnswerTag[]`
- `THREATS: Threat[]`
- `TAG_LABELS: Record<RatingKey, string>`
- `THREAT_LABELS: Record<Threat, string>`
- `THREAT_ANSWER: Record<Threat, RatingKey>` (the spec table)
- `WIN_PROFILES: Record<WinCondition, WinProfile>` (the spec table)
- `POSITION_LABELS: Record<Position, string>`: 1 Carry, 2 Mid, 3 Offlane, 4 Support, 5 Hard support

- [ ] **Step 1:** Write the failing tests:
  - every `THREAT` has a `THREAT_ANSWER` that is a member of `TEAM_TAGS ∪ ANSWER_TAGS`;
  - `THREAT_ANSWER.spellImmune === 'bkbPiercingDisable'`;
  - every `WIN_PROFILES[*].mustHave` key has a target > 0;
  - `WIN_PROFILES.balanced.targets.waveclear === 5`;
  - `WIN_PROFILES.lateScaling.power.late === 2.5`.
- [ ] **Step 2:** Run `npm test -- constants`. Expect FAIL.
- [ ] **Step 3:** Implement the three files, copying the values from the spec.
- [ ] **Step 4:** Run `npm test -- constants`. Expect PASS.
- [ ] **Step 5:** Commit with message `feat: domain types, tags, win-condition profiles`.

### Task 3: Coverage and effective targets

**Files:**
- Create: `src/domain/coverage.ts`
- Test: `src/domain/coverage.test.ts`

**Interfaces:**
- Consumes: Task 2 types.
- Produces:
  - `computeCoverage(picks: HeroId[], profiles: Record<HeroId, HeroProfile>): Record<RatingKey, number>`. Every key is present, defaulting to 0. Missing profiles contribute 0.
  - `enemyThreatCounts(enemyPicks: HeroId[], threats: Record<HeroId, Threat[]>): Record<Threat, number>`
  - `effectiveTargets(win: WinCondition, threatCounts: Record<Threat, number>): { targets: Record<RatingKey, number>; weights: Record<RatingKey, number>; threatBoosted: Partial<Record<RatingKey, Threat>> }`

Rules for `effectiveTargets`:
- The answer key of each threat gets `+min(4, 2·count)`.
- Weight is the largest that applies: 1 by default, 2 for must-have, 1.5 for threat-boosted.

- [ ] **Step 1:** Write the failing tests:
  - `computeCoverage([A, B])` sums the ratings, e.g. waveclear 2 + 3 = 5.
  - A hero with no profile → all zeros.
  - Three enemy heroes with `illusions` → `targets.aoeCleave === 4` (capped), `weights.aoeCleave === 1.5`, `threatBoosted.aoeCleave === 'illusions'`.
  - balanced → `weights.waveclear === 2`, `weights.burst === 1`.
  - fightEarly + an enemy `illusions` hero → `weights.aoeCleave === 1.5`. balanced + an enemy `tanky` hero → `weights.armorReduction === 1.5`.
  - A key that is both must-have and threat-boosted gets weight 2. Test it by calling with a temporary profile whose must-have list includes `bkbPiercingDisable`, plus an enemy `spellImmune` hero.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expect PASS.
- [ ] **Step 5:** Commit with message `feat: coverage and effective targets`.

### Task 4: Pick suggestions

**Files:**
- Create: `src/domain/suggestPicks.ts`
- Test: `src/domain/suggestPicks.test.ts`
- Create: `src/domain/testFixtures.ts` (small fake heroes, profiles, players and pairs shared by Tasks 4–6)

**Interfaces:**
- Consumes: Tasks 2 and 3.
- Produces:

```ts
interface DraftContext {
  players: Player[]; profiles: Record<HeroId, HeroProfile>; threats: Record<HeroId, Threat[]>;
  synergies: SynergyPair[]; win: WinCondition;
  ourPicks: { heroId: HeroId; position: Position }[]; enemyPicks: HeroId[];
  bans: HeroId[]; available: HeroId[] | null;   // null = no Captains Draft restriction
}
interface PickSuggestion { heroId: HeroId; positions: Position[]; score: number; reasons: Reason[] }
suggestPicks(ctx: DraftContext, limit = 5): { top: PickSuggestion[]; bestByPosition: Partial<Record<Position, PickSuggestion | null>> }
```

- `bestByPosition[p] === null` means that position is open but has no candidates.
- The score formula is copied exactly from the spec's "Pick score" block.
- Reasons are sorted by |points| descending, and zero-point terms are omitted.

- [ ] **Step 1:** Write the failing tests, each using fixtures:
  - `prefers missing must-have`: our draft has waveclear 0. A waveclear-3 candidate outranks an otherwise identical burst-3 candidate.
  - `saturates`: once coverage meets the target, more of that tag adds 0. The reason label for that tag is absent.
  - `enemy threat boosts answer`: an enemy illusion hero → an aoeCleave-3 candidate gains 3 × 1.5 = 4.5 from that key. Its reason mentions the enemy hero's localized name.
  - `comfort`: the same hero with comfort 3 vs 1 differs by 4.
  - `synergy and lane duo`: a picked ally with a +2 laneDuo pair → +2 synergy and +1 lane duo reasons.
  - `combo`: we have setup 3 and the candidate has followUp 2 → +2 "combo".
  - `flex`: with 0 picks, a hero in pos 4 and pos 5 pools gets +1 "flex pick". With 2 picks, it gets none.
  - `damage type`: 2 magical picks + a magical candidate → −2. A physical candidate → no penalty.
  - `excludes picked, banned, unavailable`: banned and enemy-picked heroes never appear. With `available = [x]`, only x can appear.
  - `filled positions excluded`: after pos 1 is picked, no pos-1-only hero appears, and `bestByPosition[1]` is undefined.
  - `empty pools`: players with empty pools → `top = []` and `bestByPosition[p] === null` for every open p (Review Focus 2, 3).
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement `suggestPicks`.
- [ ] **Step 4:** Run. Expect PASS.
- [ ] **Step 5:** Commit with message `feat: pick suggestions with reasons`.

### Task 5: Ban suggestions and win-condition hint

**Files:**
- Create: `src/domain/suggestBans.ts`
- Create: `src/domain/inferWinCondition.ts`
- Test: `src/domain/suggestBans.test.ts`
- Test: `src/domain/inferWinCondition.test.ts`

**Interfaces:**
- Consumes: `DraftContext` (Task 4), `HEROES` (Task 1).
- Produces:
  - `suggestBans(ctx: DraftContext, watchlist: Record<HeroId, 1|2|3>, limit = 5): { heroId: HeroId; score: number; reasons: Reason[] }[]`
  - `inferWinCondition(ourPicks: HeroId[], profiles: Record<HeroId, HeroProfile>): { win: WinCondition; fit: number }[] | null`
- `inferWinCondition` returns null when there are fewer than 2 picks. Otherwise it returns all non-balanced conditions sorted by fit, descending.
- Fit for a profile: `Σ_tag min(coverage, target) / Σ target`, plus `Σ_phase power weight × mean power of picks / 10`.

Ban score follows the spec. Candidates are all `HEROES` that are not picked or banned. Coverage for a threat's answer is the max rating among our picks and the open-position pool heroes still available.

- [ ] **Step 1:** Write the failing tests:
  - Enemy-side candidate with `illusions` when nobody in our pools has aoeCleave ≥ 2 → reason "We lack answer to illusions", points 2 − best.
  - The same hero when our pool has aoeCleave 3 → score 0 from threats.
  - Watchlist weight 3 → +3, reason "Watchlist".
  - A hero absent from `threats` → threat score 0, no throw (Review Focus 5).
  - Picks with high pickoff/burst/mapPressure → `inferWinCondition(...)[0].win === 'pickoff'`.
  - 1 pick → null.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement both.
- [ ] **Step 4:** Run. Expect PASS.
- [ ] **Step 5:** Commit with message `feat: ban suggestions and win-condition hint`.

### Task 6: Draft state and sequence

**Files:**
- Create: `src/domain/draft.ts`
- Create: `src/domain/draftOrder.ts`
- Test: `src/domain/draft.test.ts`

**Interfaces:**
- Produces:

```ts
type Side = 'us' | 'enemy'; type ActionKind = 'pick' | 'ban';
type DraftMode = 'captainsMode' | 'captainsDraft' | 'freeform';
interface DraftAction { side: Side; kind: ActionKind; heroId: HeroId; position?: Position }
interface DraftState { mode: DraftMode; weFirst: boolean; available: HeroId[] | null; actions: DraftAction[]; win: WinCondition }
CM_SEQUENCE: { team: 'first' | 'second'; kind: ActionKind }[]   // in draftOrder.ts
nextExpected(state): { side: Side; kind: ActionKind } | null    // null in freeform or when done
applyAction(state, action): DraftState                           // throws if hero already used
undo(state): DraftState
positionOptions(state, players, heroId): Position[]              // open positions whose pool has heroId
toContext(state, data): DraftContext                             // derives ourPicks/enemyPicks/bans
```

- [ ] **Step 1:** Build `CM_SEQUENCE` from the current Captains Mode order on Liquipedia ("Captains Mode" page, current patch). Put the source URL and patch in a comment. The spec requires this check; do not guess.
- [ ] **Step 2:** Write the failing tests:
  - `nextExpected` follows the sequence and maps first/second to us/enemy using `weFirst`.
  - In freeform, it returns null.
  - `applyAction` with a used hero throws.
  - `undo` restores the previous state exactly, and undo on empty is a no-op.
  - `positionOptions` returns `[4, 5]` for a hero in both open pools, and `[]` once both are filled (Review Focus 1).
  - `toContext` puts our picks with positions into `ourPicks`.
- [ ] **Step 3:** Run. Expect FAIL.
- [ ] **Step 4:** Implement.
- [ ] **Step 5:** Run. Expect PASS.
- [ ] **Step 6:** Commit with message `feat: draft state, CM sequence, undo`.

### Task 7: Store, persistence, export/import

**Files:**
- Create: `src/store/store.ts`
- Create: `src/store/exportImport.ts`
- Test: `src/store/exportImport.test.ts`

**Interfaces:**
- Produces a Zustand hook `useStore` with:
  - **State:** `players`, `profiles`, `threats`, `synergies`, `watchlist`, `draft: DraftState`
  - **Actions:** `upsertPlayer`, `removePlayer`, `addToPool(playerId, heroId)`, `removeFromPool`, `setComfort`, `setRating(heroId, key, rating)`, `setPower(heroId, phase, rating)`, `setDamageType`, `toggleThreat(heroId, threat)`, `upsertSynergy`, `removeSynergy`, `setWatch(heroId, weight | null)`, `draftApply(action)`, `draftUndo()`, `draftReset(mode, weFirst)`, `setAvailable(ids)`, `setWin(win)`, `importData(data)`
- Persist key: `dota-draft-helper`.
- `exportData(state): ExportFile` and `parseImport(json: string): ExportFile`. The latter throws `ImportError` with a readable message.
- `interface ExportFile { schemaVersion: 1; players; profiles; threats; synergies; watchlist }`. The draft is not exported.
- On first run, `threats` is seeded from `src/data/threats.seed.json` (Task 10). Before that file exists, use `{}`.

- [ ] **Step 1:** Write the failing tests:
  - export → `JSON.stringify` → `parseImport` round-trips deep-equal.
  - Invalid JSON, `schemaVersion: 2`, a missing `players` array, and a rating of 5 each throw `ImportError` with a message naming the problem (Review Focus 4).
  - A failed import leaves the store unchanged.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement. Validate by hand with no schema library: check types, rating range and known keys, and drop unknown keys.
- [ ] **Step 4:** Run. Expect PASS.
- [ ] **Step 5:** Commit with message `feat: persisted store with export/import`.

### Task 8: Setup screens

**Files:**
- Create: `src/ui/HeroPicker.tsx` (keyboard search, used everywhere)
- Create: `src/ui/TeamScreen.tsx` (players, positions, pools, comfort)
- Create: `src/ui/RatingsScreen.tsx` (grid with rows = all pool heroes, columns = rating keys grouped as on the spec, plus power and damage type)
- Create: `src/ui/ThreatsScreen.tsx` (all heroes × 8 checkboxes, plus a ban-watchlist weight select (none/1/2/3), filterable)
- Create: `src/ui/SynergyScreen.tsx` (pair list with strength select and lane-duo toggle)
- Create: `src/ui/DataScreen.tsx` (export download, import file, reset)
- Modify: `src/App.tsx` (tab navigation: Draft, Team, Ratings, Threats, Synergy, Data)
- Test: `src/ui/RatingsScreen.test.tsx`
- Test: `src/ui/HeroPicker.test.tsx`

**Interfaces:** consumes `useStore` (Task 7), `searchHeroes` (Task 1), and the constants (Task 2).

- [ ] **Step 1:** Write the failing tests:
  - Clicking a rating cell cycles 0 → 1 → 2 → 3 → 0, and the store reflects the value.
  - In HeroPicker, typing "pud" then Enter calls `onSelect` with Pudge's id. Arrow keys move the highlight. Escape clears.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement the screens. Rating cells show the number with a color intensity per value. Show tag labels from `TAG_LABELS` with a tooltip definition.
- [ ] **Step 4:** Run. Expect PASS. Run `npm run dev` and check manually: add a player and a hero, rate it, then export and re-import.
- [ ] **Step 5:** Commit with message `feat: setup screens`.

### Task 9: Draft screen

**Files:**
- Create: `src/ui/DraftScreen.tsx`
- Create: `src/ui/CoveragePanel.tsx`
- Create: `src/ui/SuggestionList.tsx`
- Create: `src/ui/PositionPrompt.tsx`
- Test: `src/ui/DraftScreen.test.tsx`

**Layout:**
- **Top bar:** mode, first pick toggle, the next expected action (with override buttons), Undo, Reset.
- **Left:** our 5 position slots, then enemy picks, then bans.
- **Centre:** `HeroPicker`. Enter applies the current action. If `positionOptions` returns more than one position, open `PositionPrompt`.
- **Right:**
  - win-condition selector, with the `inferWinCondition` hint ("Your picks lean: Pickoff");
  - top-5 pick suggestions and best per open position, showing "No candidates for Pos N" when null;
  - top-5 ban suggestions;
  - each suggestion shows its score and an expandable reason list.
- **Bottom:** `CoveragePanel` with a bar per team tag showing current/target, must-haves marked, and threat-boosted answer keys highlighted with the threat name.
- In Captains Draft mode before the first action, show an "Available heroes" multi-select step (`setAvailable`).

- [ ] **Step 1:** Write the failing tests:
  - Render with fixture data and pick a pos-1 hero → the suggestions no longer include pos-1-only heroes, and the coverage bar for its tags increases.
  - With empty pools, the screen shows "No candidates for Pos 1" and does not throw (Review Focus 2).
  - Picking a hero in two open pools opens PositionPrompt (Review Focus 1).
  - Undo removes the pick.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Implement. Memoize `toContext` + `suggestPicks` + `suggestBans` per state change.
- [ ] **Step 4:** Run. Expect PASS. Manual check in `npm run dev`: a full CM draft with fixture-like data in under 2 minutes, keyboard only.
- [ ] **Step 5:** Commit with message `feat: draft screen`.

### Task 10: Threat seed data and deployment

**Files:**
- Create: `src/data/threats.seed.json` (`Record<HeroId, Threat[]>` for every hero in `heroes.json`)
- Create: `.github/workflows/deploy.yml` (on push to main: `npm ci`, `npm test`, `npm run build`, deploy `dist` via `actions/deploy-pages`)
- Create: `README.md` (run, test, update heroes, deploy, share data via export)
- Test: `src/data/threats.seed.test.ts`

- [ ] **Step 1:** Write the failing tests:
  - Every key is a valid hero id.
  - Every value is a subset of `THREATS`.
  - Phantom Lancer includes `illusions`.
  - Riki includes `invisibility`.
- [ ] **Step 2:** Run. Expect FAIL.
- [ ] **Step 3:** Fill `threats.seed.json` with best-effort flags from current hero kits. These are starting values; the team corrects them in the Threats screen.
- [ ] **Step 4:** Run `npm test` (all pass) and `npm run build` (success). Run `npx vite preview` and load the app from the built files.
- [ ] **Step 5:** Commit with message `feat: threat seed data and Pages deploy`.

## Future (not in this plan)

- OpenDota matchup advantage, added as one more scoring term with a reason ("counters Enemy Mid +x").
- Ranked All Pick helper view.
