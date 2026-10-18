import type { ActionKind } from './draft';

// Captains Mode ban/pick order, as introduced in Dota 2 patch 7.34 (bans 3-2-2 for the
// first-pick team, 4-1-2 for the second-pick team; picks 1-3-1 for both).
// Sources: https://liquipedia.net/dota2/Archive:Version_7.34 (summary of the change) and
// https://dotapicks.com/draft-simulator (full 24-step table). Liquipedia's Game_Modes page
// returned 403, so the step table is cross-checked against the 7.34 summary only; no later
// patch was found changing the order.
export const CM_SEQUENCE: { team: 'first' | 'second'; kind: ActionKind }[] = [
  { team: 'first', kind: 'ban' },
  { team: 'first', kind: 'ban' },
  { team: 'second', kind: 'ban' },
  { team: 'second', kind: 'ban' },
  { team: 'first', kind: 'ban' },
  { team: 'second', kind: 'ban' },
  { team: 'second', kind: 'ban' },
  { team: 'first', kind: 'pick' },
  { team: 'second', kind: 'pick' },
  { team: 'first', kind: 'ban' },
  { team: 'first', kind: 'ban' },
  { team: 'second', kind: 'ban' },
  { team: 'second', kind: 'pick' },
  { team: 'first', kind: 'pick' },
  { team: 'first', kind: 'pick' },
  { team: 'second', kind: 'pick' },
  { team: 'second', kind: 'pick' },
  { team: 'first', kind: 'pick' },
  { team: 'first', kind: 'ban' },
  { team: 'second', kind: 'ban' },
  { team: 'first', kind: 'ban' },
  { team: 'second', kind: 'ban' },
  { team: 'first', kind: 'pick' },
  { team: 'second', kind: 'pick' },
];
