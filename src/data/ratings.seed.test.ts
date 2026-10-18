import seed from './ratings.seed.json';
import heroes from './heroes.json';

const TAGS = [
  'initiation',
  'counterInitiation',
  'disable',
  'bkbPiercingDisable',
  'pickoff',
  'aoeDamage',
  'burst',
  'sustainedDamage',
  'frontline',
  'save',
  'sustain',
  'dispel',
  'waveclear',
  'push',
  'splitPush',
  'mapPressure',
  'earlyRoshan',
  'laning',
  'setup',
  'followUp',
  'healReduction',
];

type Entry = {
  ratings: Record<string, number>;
  power: { early: number; mid: number; late: number };
  damageType: string;
};

const data = seed as Record<string, Entry>;
const heroList = heroes as { id: number; localized_name: string }[];
const byName = (name: string) => {
  const h = heroList.find((x) => x.localized_name === name);
  if (!h) throw new Error(`hero not found: ${name}`);
  return data[String(h.id)];
};

describe('ratings.seed.json', () => {
  test('every hero has an entry', () => {
    for (const h of heroList) expect(data).toHaveProperty(String(h.id));
  });

  test('every key is a valid hero id', () => {
    const ids = new Set(heroList.map((h) => String(h.id)));
    for (const key of Object.keys(data)) expect(ids.has(key)).toBe(true);
  });

  test('ratings use valid tags and values 1-3', () => {
    for (const entry of Object.values(data)) {
      for (const [tag, value] of Object.entries(entry.ratings)) {
        expect(TAGS).toContain(tag);
        expect([1, 2, 3]).toContain(value);
      }
    }
  });

  test('power has early/mid/late integers 0-3', () => {
    for (const entry of Object.values(data)) {
      for (const k of ['early', 'mid', 'late'] as const) {
        const v = entry.power[k];
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(3);
      }
    }
  });

  test('damageType is valid', () => {
    for (const entry of Object.values(data)) {
      expect(['physical', 'magical', 'pure']).toContain(entry.damageType);
    }
  });

  test('Ancient Apparition has healReduction 3', () => {
    expect(byName('Ancient Apparition').ratings.healReduction).toBe(3);
  });

  test('Enigma has setup 3', () => {
    expect(byName('Enigma').ratings.setup).toBe(3);
  });
});
