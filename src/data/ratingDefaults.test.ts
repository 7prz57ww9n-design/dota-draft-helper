import { DEFAULT_PROFILES, defaultProfile, effectiveProfile, makeProfileSource } from './ratingDefaults';
import { HEROES } from './heroes';

const aa = HEROES.find((h) => h.localizedName === 'Ancient Apparition')!.id;

describe('rating defaults', () => {
  test('every hero has a default profile', () => {
    expect(Object.keys(DEFAULT_PROFILES)).toHaveLength(HEROES.length);
    expect(defaultProfile(aa).ratings.healReduction).toBe(3);
  });

  test('stored edits for a position override defaults, including an explicit 0', () => {
    const stored = {
      [`${aa}@4`]: { heroId: aa, ratings: { healReduction: 0 as const, push: 2 as const }, power: { early: 1, mid: 1, late: 1 } as const, damageType: 'pure' as const },
    };
    const atPos4 = effectiveProfile(stored, aa, 4);
    expect(atPos4.ratings.healReduction).toBe(0);
    expect(atPos4.ratings.push).toBe(2);
    expect(atPos4.ratings.aoeDamage).toBe(defaultProfile(aa).ratings.aoeDamage);
    expect(atPos4.power).toEqual({ early: 1, mid: 1, late: 1 });
    expect(atPos4.damageType).toBe('pure');
    // Other positions are unaffected.
    expect(makeProfileSource(stored)(aa, 5)).toEqual(DEFAULT_PROFILES[aa]);
  });
});
