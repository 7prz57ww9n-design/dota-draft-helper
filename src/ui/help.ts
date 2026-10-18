import { TAG_LABELS, THREATS, THREAT_ANSWER, THREAT_LABELS } from '../domain/tags';

export type HelpTab = 'Draft' | 'Heroes' | 'Team' | 'Ratings' | 'Threats' | 'Synergy' | 'Data';

export interface HelpSection { heading: string; items: string[] }
export interface PageHelp { summary: string; sections: HelpSection[] }

const threatAnswers = THREATS.map(
  (t) => `${THREAT_LABELS[t]} → answered by ${TAG_LABELS[THREAT_ANSWER[t]]}`,
);

export const PAGE_HELP: Record<HelpTab, PageHelp> = {
  Draft: {
    summary: 'Enter every pick and ban as it happens in game; the app suggests our next pick and ban and explains why.',
    sections: [
      {
        heading: 'How to use it',
        items: [
          'Choose the mode (Captains Mode, Captains Draft or Freeform) and whether we pick first before the draft starts. You can fix "We pick first" later without losing the draft.',
          'The line under the mode shows the expected step, e.g. "Step 8/24 — Our pick". Type a hero name and press Enter to record it.',
          'If the game went differently, click Our pick / Enemy pick / Our ban / Enemy ban to override just the next entry. Undo removes the last entry.',
          'When a hero fits more than one of our open positions, a prompt asks which one: press the position number, or Esc to cancel.',
          'Clicking a suggestion records it straight away: pick suggestions as our pick at the position shown, ban suggestions as our ban.',
          'Captains Draft: first add the heroes available in this draft, then press Start draft. Suggestions only use those heroes.',
        ],
      },
      {
        heading: 'How pick suggestions are scored',
        items: [
          'Fills gaps: for each tag, the hero adds its rating up to what the draft still needs (target minus what our picks already have). Tags we already have enough of add nothing.',
          'Must-have tags of the chosen win condition count double. Tags that answer an enemy threat count 1.5×.',
          'Power curve: early/mid/late ratings weighted by the win condition (e.g. Late scaling favours late heroes).',
          'Comfort: best (3) +2, good (2) 0, okay (1) −2.',
          'Synergy with heroes we already picked, +1 for a lane-duo partner, +2 for a setup + follow-up combo, +1 for a flex hero in our first two picks, −2 if every pick would deal the same damage type.',
          'Each pick suggestion is scored for one position. A hero in two open pools is shown at its best position, with "also Pos N: score" for the other. Open "Why …?" to see each part of the score.',
        ],
      },
      {
        heading: 'Ban suggestions',
        items: [
          'An enemy-side hero scores when it has a threat that nobody in our picks or remaining pools answers well (best answer rating below 2).',
          'Heroes on the ban watchlist (Threats page) get their watch value added.',
          'Heroes still pickable from our own open pools are never suggested as bans.',
        ],
      },
      {
        heading: 'Win condition and coverage',
        items: [
          'Balanced is used until you choose. After two picks the app shows what our picks lean towards; pick a win condition once you know whether to end early or go late. It changes the tag targets and power-curve weights.',
          'Coverage at the bottom shows each needed tag as current / target. MUST-HAVE marks the win condition\'s key tags; rows marked "vs <threat>" appeared because of enemy picks.',
        ],
      },
    ],
  },
  Heroes: {
    summary: 'All heroes grouped by primary attribute, like the in-game hero grid. A quick visual reference during the draft.',
    sections: [
      {
        heading: 'What you see',
        items: [
          'Strength, Agility, Intelligence and Universal heroes, alphabetical within each group. Hover a portrait for the hero\'s name.',
          'A blue outline and a number badge mark heroes in our pools; the number is the position (e.g. 4/5 = in both support pools).',
          'Heroes already used in the current draft are greyed out with BAN, OURS or ENEMY.',
        ],
      },
      {
        heading: 'How it affects the drafter',
        items: [
          'It doesn\'t: this page is only for reference. Record picks and bans on the Draft page.',
        ],
      },
    ],
  },
  Team: {
    summary: 'One row per position. Add each player\'s hero pool and how comfortable they are on each hero.',
    sections: [
      {
        heading: 'How to use it',
        items: [
          'Type a name for the player, then add heroes with the search box (type, Enter).',
          'Set comfort per hero: 3 · best, 2 · good, 1 · okay. Each pool is listed best first. Remove a hero with ×.',
          'The same hero can be in several players\' pools.',
        ],
      },
      {
        heading: 'How it affects the drafter',
        items: [
          'Only heroes in the pools of positions we have not filled yet are suggested as picks.',
          'Comfort adds to the pick score: best +2, good 0, okay −2.',
          'A hero in two open pools is a flex pick: +1 during our first two picks, because it hides which role it will play.',
          'When we pick a hero that is in two open pools, the draft asks which position it is for.',
        ],
      },
    ],
  },
  Ratings: {
    summary: 'Rate every hero in our pools 0–3 on each tag, per position. These ratings drive the pick suggestions.',
    sections: [
      {
        heading: 'How to rate',
        items: [
          'Choose a hero on the left (type in the search box to find one quickly, Enter opens the first match, or use Prev / Next), then click 0–3 on each row: 0 = not at all, 1 = a little, 2 = good at it, 3 = a core reason to pick this hero.',
          'Every hero starts with default ratings pre-filled from its kit (e.g. Ancient Apparition: Heal reduction 3), marked "default". Clicking a value makes it "edited"; "Reset to defaults" discards our edits for that hero.',
          'Each row explains what the tag means. The hero list shows the position, how many tags the hero has and whether we edited it.',
          'Ratings are per hero AND position: a hero in two pools (e.g. carry and support) is listed twice and rated separately, because the role changes what it does. "Copy from Pos N" starts one role from the other. Player comfort is set on the Team page.',
          'Rate together as a team so a "3" means the same thing for everyone.',
        ],
      },
      {
        heading: 'How it affects the drafter',
        items: [
          'Team tags (Initiation, Waveclear, Push, …): the draft has a target for each tag, depending on the win condition. A hero scores for the part of the gap it fills; once a tag reaches its target, more of it adds nothing.',
          'Setup and Follow-up: big AoE lockdown (Black Hole, Ravage) and the AoE damage that needs it. Having both in the draft gives a +2 combo bonus.',
          'Heal reduction: counts once the enemy picks a heal-reliant hero. Other enemy threats are answered by the team tags above (see the Threats page for which tag answers which threat).',
          'Power early / mid / late: when the hero is strongest. The win condition weights these.',
          'Damage type: once we have two or more picks that all deal the same type, another hero of that type gets −2.',
        ],
      },
    ],
  },
  Threats: {
    summary: 'Mark what makes each hero dangerous when the enemy picks it, and which heroes we want banned.',
    sections: [
      {
        heading: 'Threat checkboxes',
        items: [
          'Tick a box when that hero, on the ENEMY team, has that threat (e.g. Phantom Lancer → Illusions). Every hero in the game is listed because the enemy can pick anyone.',
          'Starting values are pre-filled; correct them as you see fit. Hover a column header for its definition.',
        ],
      },
      {
        heading: 'How threats affect picks',
        items: [
          'Each enemy hero with a threat raises our target for the matching answer tag by 2 (up to +4), and that tag counts 1.5× when scoring picks. So after the enemy picks an illusion hero, our heroes rated high on AoE damage move up.',
          ...threatAnswers,
        ],
      },
      {
        heading: 'How threats affect bans',
        items: [
          'Before the enemy picks a hero, the app checks its threats against what we can answer (our picks plus heroes still available in our open pools). If our best answer is rated below 2, that hero gets ban points (2 minus our best answer rating) per unanswered threat.',
        ],
      },
      {
        heading: 'Watch column',
        items: [
          'Heroes we simply hate playing against. The value (1–3) is added directly to that hero\'s ban score; leave it empty for no effect.',
        ],
      },
    ],
  },
  Synergy: {
    summary: 'Link pairs of heroes from our pools that are stronger (or weaker) together.',
    sections: [
      {
        heading: 'How to use it',
        items: [
          'Pick two heroes, set a strength from −2 to +3, and add the pair. Edit or remove pairs in the list.',
          'Use negative values for anti-synergy, e.g. two heroes that both need all the farm.',
          'Tick Lane duo for pairs that lane together (pos 1 + 5, pos 3 + 4).',
        ],
      },
      {
        heading: 'How it affects the drafter',
        items: [
          'Once one hero of a pair is picked, the other gets the pair\'s strength added to its pick score, shown as "Synergy with <hero>".',
          'A lane-duo partner gets an extra +1.',
          'Common combos (setup + follow-up) are detected from the Ratings page automatically, so you don\'t need to enter every combo here.',
        ],
      },
    ],
  },
  Data: {
    summary: 'Share the team data online, back it up, or reset it.',
    sections: [
      {
        heading: 'Team sync (shared online)',
        items: [
          'One person clicks "Create team from my data". The data in that browser becomes the team\'s, and a team link appears.',
          'Send the link to the other four. Opening it (or pasting it under "Join team") loads the team into their browser.',
          'From then on, every change to players, pools, comfort, ratings, threats, synergies and the watchlist is saved online within a second and shows up live for everyone. The header shows "Team synced".',
          'Each position is saved separately, so two players editing their own heroes at the same time never overwrite each other. If two people edit the same position or the shared threats/synergies at once, the last save wins.',
          'The draft in progress is not shared: whoever drives the draft does it in their own browser.',
          'Anyone with the link can view and edit, so keep it within the team. "Leave team" stops syncing; this browser keeps its copy.',
        ],
      },
      {
        heading: 'Where the data lives',
        items: [
          'Without a team, everything is saved only in this browser on this device. Another browser, device, private window or web address starts empty.',
          'With a team, the data is stored online and every browser keeps a local copy, so the app still works offline. Edits made while offline are lost on reload; reconnect before editing.',
          'Clearing this site\'s data in the browser forgets the team link too; open the link again to reconnect.',
        ],
      },
      {
        heading: 'Export, import, reset',
        items: [
          'Export downloads one file with players, pools, ratings, threats, synergies and the watchlist (not the draft in progress).',
          'Import loads such a file and replaces the current data. Files exported before ratings became per-position still import: each hero\'s ratings are copied to every position whose pool has it. An invalid file shows an error and changes nothing.',
          'Reset clears players, pools, ratings, synergies and the watchlist, and restores the default threat flags. It is disabled while in a team, so nobody wipes the team by accident. Importing a file while in a team replaces the team\'s data for everyone (you are asked first).',
        ],
      },
    ],
  },
};
