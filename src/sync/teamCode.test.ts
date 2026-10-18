import { newTeamCode, parseTeamCode, teamLink } from './teamCode';

describe('team codes', () => {
  test('new codes are 24 letters/digits and differ', () => {
    const a = newTeamCode();
    expect(a).toMatch(/^[A-Za-z0-9]{24}$/);
    expect(newTeamCode()).not.toBe(a);
  });

  test('parses a bare code or a link, rejects anything else', () => {
    const code = 'Abcdefghijklmnopqrstuvwx';
    expect(parseTeamCode(` ${code} `)).toBe(code);
    expect(parseTeamCode(teamLink(code, 'https://x.github.io/dota-draft-helper/'))).toBe(code);
    expect(parseTeamCode('https://x.github.io/app/?foo=1&team=' + code)).toBe(code);
    expect(parseTeamCode('short')).toBeNull();
    expect(parseTeamCode('https://x.github.io/?team=bad!code')).toBeNull();
  });
});
