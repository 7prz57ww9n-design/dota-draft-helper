import { HEROES, heroById, searchHeroes } from './heroes';

test('loads full roster', () => expect(HEROES.length).toBeGreaterThanOrEqual(120));
test('ids unique', () => expect(new Set(HEROES.map(h => h.id)).size).toBe(HEROES.length));
test('img url built from shortName', () =>
  expect(heroById(1)!.img).toBe('https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png'));
test('search is case-insensitive prefix/substring, prefix first', () => {
  const r = searchHeroes('mag');
  expect(r[0].localizedName).toBe('Magnus');
  expect(r.map(h => h.localizedName)).toContain('Ogre Magi');
});
test('initials match', () => {
  expect(searchHeroes('am').map(h => h.localizedName)).toContain('Anti-Mage');
});
