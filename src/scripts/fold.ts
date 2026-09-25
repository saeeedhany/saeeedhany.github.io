/**
 * Text matching shared by the site search and the in-page list search.
 * Pure: no DOM, no imports — unit-tested with `node --test`.
 */

// ---- normalisation --------------------------------------------------
// Arabic is matched without tashkeel or tatweel, and with the letter
// variants people type interchangeably folded together. `map` records,
// for every character of the folded string, where it came from in the
// original — so a match found in folded text can be highlighted in the
// original, diacritics and all.
const FOLD: Record<string, string> = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };
const SKIP = /[ً-ٰٟـ]/;
export function fold(s: string): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (SKIP.test(ch)) continue;
    const f = (FOLD[ch] ?? ch).toLowerCase();
    text += f;
    for (let k = 0; k < f.length; k++) map.push(i);
  }
  return { text, map };
}
export const tokensOf = (q: string) => fold(q).text.split(/[\s,،.;:!?()\[\]"'`]+/).filter(Boolean);

/** Every position of `tok` in `text`. One-character tokens ("c") count
 *  only as whole words: as substrings they'd match nearly everything. */
const WORD = /[\p{L}\p{N}]/u;
export function positions(text: string, tok: string): number[] {
  const out: number[] = [];
  let at = text.indexOf(tok);
  while (at >= 0) {
    const whole = !WORD.test(text[at - 1] ?? '') && !WORD.test(text[at + tok.length] ?? '');
    if (tok.length > 1 || whole) out.push(at);
    at = text.indexOf(tok, at + 1);
  }
  return out;
}

/** Every token appears in the (already folded) text. No tokens: everything matches. */
export const matchesAll = (folded: string, tokens: string[]) => tokens.every((t) => positions(folded, t).length > 0);
