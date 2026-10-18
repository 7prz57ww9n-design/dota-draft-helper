# Dota 2 Draft Helper — Design

## Intent

A five-stack plays Captains Mode (and Captains Draft; ranked All Pick later). Each player has a hero pool for one position (1 carry, 2 mid, 3 offlane, 4 support, 5 hard support). During the draft, one person enters every pick and ban into the app. The app then suggests our next pick and next ban, and explains each suggestion. A good suggestion fills what our draft is missing for its chosen win condition, answers enemy threats, respects player comfort, and uses known synergies.

## Goals

- Store team pools, per-player comfort, hero tag ratings (0–3), enemy-threat flags for every hero, and synergy pairs.
- Draft screen that is fast enough for a 30-second timer: keyboard hero search, one screen, undo.
- Suggest picks and bans, with reasons.
- Let the user pick a win condition mid-draft, after the app hints at which one the current picks lean toward.
- Static website that can be hosted for free and needs no backend.

## Non-goals (for now)

- Live hero-vs-hero win-rate data from the OpenDota/STRATZ APIs. This is planned for the future, and the scoring needs room for one extra component for it.
- Multiple users editing the same draft at once.
- Ranked All Pick logic beyond freeform entry.
- Accounts or a server-side database.

## Anti-goals

- Suggestions without reasons, or reasons the team can't verify at a glance.
- Rating entry so slow that the team stops keeping it up to date.
- A wrong click that can't be undone during a live draft.

## Data model

**Positions:** 1–5.

**Rating keys (0–3, per hero, shared by all players):**
- Team tags: initiation, counterInitiation, disable, bkbPiercingDisable, pickoff, aoeDamage, burst, sustainedDamage, frontline, save, sustain, dispel, waveclear, push (includes tower damage), splitPush, mapPressure, earlyRoshan, laning, setup, followUp.
- Answer tags: armorReduction, aoeCleave, detection, trueStrike, instantDisable, magicResist, healReduction.

**Other per-hero fields:**
- Power curve: early/mid/late, each rated 0–3.
- Damage type: physical, magical or pure.

**Per player:** name, position, and pool entries `{heroId, comfort 1–3}`. The same hero can appear in several players' pools.

**Threat flags (yes/no, every hero in the game):** tanky, illusions, invisibility, evasion, mobility, magicBurst, healReliant, spellImmune.

**Threat → answer:**

| Threat | Answer |
|---|---|
| tanky | armorReduction |
| illusions | aoeCleave |
| invisibility | detection |
| evasion | trueStrike |
| mobility | instantDisable |
| magicBurst | magicResist |
| healReliant | healReduction |
| spellImmune | bkbPiercingDisable |

**Synergy pair:** `{a, b, strength −2..+3, laneDuo}`.

**Ban watchlist:** heroes the team dislikes facing, each with a weight of 1–3.

## Win conditions

There are five: balanced (the default until the user chooses), fightEarly, pickoff, lateScaling and splitPush. Each one defines:
- a target per team tag, which is the team's total rating across its picks;
- a list of must-have tags;
- power-curve weights.

The starting values below live in one config file so they can be tuned.

| Profile | Targets | Must-have | Power weights (early/mid/late) |
|---|---|---|---|
| balanced | initiation 4, counterInitiation 2, disable 6, bkbPiercingDisable 2, pickoff 2, aoeDamage 4, burst 3, sustainedDamage 3, frontline 3, save 3, sustain 2, dispel 1, waveclear 5, push 4, mapPressure 2, laning 6 | disable, waveclear, push, initiation | 1/1/1 |
| fightEarly | initiation 6, aoeDamage 6, push 7, frontline 4, sustain 3, earlyRoshan 3, waveclear 4, disable 6, laning 7 | initiation, push, aoeDamage | 2/2/0 |
| pickoff | pickoff 7, burst 6, mapPressure 6, disable 6, laning 5, push 4, waveclear 3, earlyRoshan 2 | pickoff, mapPressure, burst | 2/1.5/0.5 |
| lateScaling | waveclear 7, counterInitiation 4, save 5, sustainedDamage 6, frontline 4, disable 5, dispel 2, laning 5, sustain 3 | waveclear, save, sustainedDamage | 0.5/1/2.5 |
| splitPush | splitPush 6, waveclear 6, push 5, counterInitiation 3, save 3, mapPressure 3, disable 4 | splitPush, waveclear | 1/1.5/1.5 |

After 2 or more of our picks, the app shows the profile that best fits those picks as a hint. The user chooses the win condition, and can change it at any time.

## Scoring

### Pick score

A pick candidate is a hero that meets all of these:
- it is in the pool of a player whose position is still open;
- it is not picked or banned by either team;
- in Captains Draft, it is in the marked available set.

**Effective target per rating key:**
- Start from the win-condition target.
- For each enemy threat, add +2 to that threat's answer key for every enemy hero that has the threat, up to a maximum of +4 per key.

**Current value per key:** the sum of our picked heroes' ratings for that key.

**gap = max(0, target − current)**

**Weight per key:**
- 1 by default;
- 2 if the key is a must-have;
- 1.5 if the key received a threat addition;
- when more than one applies, take the largest.

```
score =
  Σ_k  w_k · min(rating_h(k), gap_k)                       "fills gap"
+ Σ_phase  powerWeight[phase] · power_h[phase] · 0.5       "power curve"
+ (comfort − 2) · 2                                        "comfort"
+ Σ strength(pair with each picked ally)                   "synergy"
+ 2 if (our setup ≥ 2 and h.followUp ≥ 2) or (our followUp ≥ 2 and h.setup ≥ 2)   "combo"
+ 1 if our picks < 2 and h is in ≥ 2 open positions' pools                       "flex pick"
+ 1 per laneDuo pair partner already picked                                       "lane duo"
− 2 if we have ≥ 2 picks and h makes every pick the same damage type             "damage type"
```

- Use the best comfort among the open-position players who have the hero.
- Every non-zero term becomes a reason in the explanation, e.g. "waveclear +3 (must-have)" or "answers illusions (Phantom Lancer) +2".
- The suggestion shows the top 5 overall, plus the best candidate for each open position.

### Ban score

Every hero that is not already picked or banned gets:
- for each threat it has, `(2 − coverage)` if coverage < 2, where coverage is the best answer rating among our picks and the heroes still available in our open pools;
- plus its watchlist weight.

The explanation names the uncovered threat. The top 5 are shown.

## Draft flow

**Modes:**
- **Captains Mode:** follows the default ban/pick sequence. The order must be verified against the current patch (Liquipedia, "Captains Mode") and is kept as data.
- **Captains Draft:** the same as Captains Mode, plus an availability-marking step before the draft starts.
- **Freeform:** no sequence.

**Entering actions:** the next action is pre-selected from the sequence, and the user can always override it (our pick / enemy pick / our ban / enemy ban).

**Position assignment:** when we pick a hero that appears in exactly one open-position pool, the app assigns it automatically. Otherwise it asks which position.

**Undo:** removes the last action.

## Stack

| Concern | Choice |
|---|---|
| App | Vite + React 18 + TypeScript |
| State | Zustand, persisted to localStorage |
| Tests | Vitest + React Testing Library |
| Styling | plain CSS |
| Hero list | OpenDota `/api/heroes`, snapshotted at build time into `src/data/heroes.json` |
| Hero images | Steam CDN `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/{short_name}.png` |
| Hosting | static build on GitHub Pages (via a GitHub Actions workflow); works the same on Netlify or Cloudflare Pages |
| Sharing data | Export/import of one versioned JSON file. The team keeps the file in the repo or a chat, and later it can become the default seed. |

## Left to the builder

- Visual layout details.
- Hero search ranking.
- Exact CSS.
- Wording of the reasons.
