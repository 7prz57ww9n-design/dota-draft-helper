import { DEFAULT_PROFILES, defaultProfile, withDefaults } from './ratingDefaults';
import { HEROES } from './heroes';

const aa = HEROES.find((h) => h.localizedName === 'Ancient Apparition')!.id;

describe('rating defaults', () => {
  test('every hero has a default profile', () => {
    expect(Object.keys(DEFAULT_PROFILES)).toHaveLength(HEROES.length);
    expect(defaultProfile(aa).ratings.healReduction).toBe(3);
  });

  test('stored edits override defaults, including an explicit 0', () => {
    const merged = withDefaults({
      [aa]: { heroId: aa, ratings: { healReduction: 0, push: 2 }, power: { early: 1, mid: 1, late: 1 }, damageType: 'pure' },
    });
    expect(merged[aa].ratings.healReduction).toBe(0);
    expect(merged[aa].ratings.push).toBe(2);
    expect(merged[aa].ratings.aoeDamage).toBe(defaultProfile(aa).ratings.aoeDamage);
    expect(merged[aa].power).toEqual({ early: 1, mid: 1, late: 1 });
    expect(merged[aa].damageType).toBe('pure');
  });

  test('heroes without edits get their defaults', () => {
    expect(withDefaults({})[aa]).toEqual(DEFAULT_PROFILES[aa]);
  });
});
