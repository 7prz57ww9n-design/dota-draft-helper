const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const CODE = /^[A-Za-z0-9]{24}$/; // must match isTeamCode in firestore.rules

/** A random 24-character team code (~143 bits), practically impossible to guess. */
export function newTeamCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  // 248 is the largest multiple of 62 below 256; re-draw above it to avoid bias.
  let code = '';
  for (let i = 0; code.length < 24; i++) {
    const b = i < bytes.length ? bytes[i] : crypto.getRandomValues(new Uint8Array(1))[0];
    if (b < 248) code += ALPHABET[b % 62];
  }
  return code;
}

/** Accepts a bare code or any link containing ?team=CODE. */
export function parseTeamCode(input: string): string | null {
  const text = input.trim();
  if (CODE.test(text)) return text;
  const m = /[?&]team=([A-Za-z0-9]+)/.exec(text);
  return m && CODE.test(m[1]) ? m[1] : null;
}

export function teamLink(code: string, base = `${location.origin}${location.pathname}`): string {
  return `${base}?team=${code}`;
}
