import raw from './heroes.json';

export type HeroId = number;

export interface Hero {
  id: HeroId;
  name: string;
  shortName: string;
  localizedName: string;
  primaryAttr: string;
  img: string;
}

const PREFIX = 'npc_dota_hero_';
const CDN = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/';

export const HEROES: Hero[] = raw.map((h) => {
  const shortName = h.name.startsWith(PREFIX) ? h.name.slice(PREFIX.length) : h.name;
  return {
    id: h.id,
    name: h.name,
    shortName,
    localizedName: h.localized_name,
    primaryAttr: h.primary_attr,
    img: `${CDN}${shortName}.png`,
  };
});

const BY_ID = new Map<HeroId, Hero>(HEROES.map((h) => [h.id, h]));

export function heroById(id: HeroId): Hero | undefined {
  return BY_ID.get(id);
}

function initials(name: string): string {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('');
}

export function searchHeroes(query: string, limit = 10): Hero[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { hero: Hero; rank: number }[] = [];
  for (const hero of HEROES) {
    const n = hero.localizedName.toLowerCase();
    let rank = -1;
    if (n.startsWith(q)) rank = 0;
    else if (initials(n).startsWith(q)) rank = 1;
    else if (n.includes(q)) rank = 2;
    if (rank >= 0) scored.push({ hero, rank });
  }
  scored.sort((a, b) => a.rank - b.rank || a.hero.localizedName.localeCompare(b.hero.localizedName));
  return scored.slice(0, limit).map((s) => s.hero);
}
