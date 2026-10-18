import type { WinCondition, WinProfile } from './types';

export const WIN_PROFILES: Record<WinCondition, WinProfile> = {
  balanced: {
    targets: {
      initiation: 4, counterInitiation: 2, disable: 6, bkbPiercingDisable: 2, pickoff: 2,
      aoeDamage: 4, burst: 3, sustainedDamage: 3, frontline: 3, save: 3, sustain: 2,
      dispel: 1, waveclear: 5, push: 4, mapPressure: 2, laning: 6,
    },
    mustHave: ['disable', 'waveclear', 'push', 'initiation'],
    power: { early: 1, mid: 1, late: 1 },
  },
  fightEarly: {
    targets: {
      initiation: 6, aoeDamage: 6, push: 7, frontline: 4, sustain: 3,
      earlyRoshan: 3, waveclear: 4, disable: 6, laning: 7,
    },
    mustHave: ['initiation', 'push', 'aoeDamage'],
    power: { early: 2, mid: 2, late: 0 },
  },
  pickoff: {
    targets: {
      pickoff: 7, burst: 6, mapPressure: 6, disable: 6, laning: 5,
      push: 4, waveclear: 3, earlyRoshan: 2,
    },
    mustHave: ['pickoff', 'mapPressure', 'burst'],
    power: { early: 2, mid: 1.5, late: 0.5 },
  },
  lateScaling: {
    targets: {
      waveclear: 7, counterInitiation: 4, save: 5, sustainedDamage: 6,
      frontline: 4, disable: 5, dispel: 2, laning: 5, sustain: 3,
    },
    mustHave: ['waveclear', 'save', 'sustainedDamage'],
    power: { early: 0.5, mid: 1, late: 2.5 },
  },
  splitPush: {
    targets: {
      splitPush: 6, waveclear: 6, push: 5, counterInitiation: 3,
      save: 3, mapPressure: 3, disable: 4,
    },
    mustHave: ['splitPush', 'waveclear'],
    power: { early: 1, mid: 1.5, late: 1.5 },
  },
};
