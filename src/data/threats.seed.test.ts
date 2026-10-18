import seed from './threats.seed.json';
import { HEROES } from './heroes';
import { THREATS } from '../domain/tags';
import type { Threat } from '../domain/types';

const entries = Object.entries(seed as Record<string, string[]>);
const heroIdByName = (name: string) => HEROES.find((h) => h.name === name)!.id;
const threatsOf = (name: string) =>
  (seed as Record<string, Threat[]>)[String(heroIdByName(name))] ?? [];

describe('threats.seed.json', () => {
  test('every key is a valid hero id', () => {
    const ids = new Set(HEROES.map((h) => String(h.id)));
    for (const [key] of entries) expect(ids.has(key)).toBe(true);
  });

  test('every hero has an entry', () => {
    for (const h of HEROES) expect(seed).toHaveProperty(String(h.id));
  });

  test('every value is a subset of THREATS without duplicates', () => {
    for (const [, list] of entries) {
      for (const t of list) expect(THREATS).toContain(t);
      expect(new Set(list).size).toBe(list.length);
    }
  });

  test('Phantom Lancer includes illusions', () => {
    expect(threatsOf('npc_dota_hero_phantom_lancer')).toContain('illusions');
  });

  test('Lifestealer includes spell immunity', () => {
    expect(threatsOf('npc_dota_hero_life_stealer')).toContain('spellImmune');
  });
});
