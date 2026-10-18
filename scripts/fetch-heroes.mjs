import { writeFile, mkdir } from 'node:fs/promises';

const res = await fetch('https://api.opendota.com/api/heroes');
if (!res.ok) throw new Error(`OpenDota responded ${res.status}`);
const raw = await res.json();
const heroes = raw
  .map(({ id, name, localized_name, primary_attr }) => ({ id, name, localized_name, primary_attr }))
  .sort((a, b) => a.localized_name.localeCompare(b.localized_name));
await mkdir('src/data', { recursive: true });
await writeFile('src/data/heroes.json', JSON.stringify(heroes, null, 2) + '\n');
console.log(`Wrote ${heroes.length} heroes`);
