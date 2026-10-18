/*
 * How a spoken text is matched to a recorded clip. The same rules live in
 * scripts/voices/generate.py, which records the clips; keep them in step
 * (phrases.test.ts checks a few shared examples).
 */

function isPictograph(char: string): boolean {
  const code = char.codePointAt(0) ?? 0
  return (
    (code >= 0x2190 && code <= 0x2bff) ||
    (code >= 0x1f000 && code <= 0x1ffff) ||
    code === 0xfe0f ||
    code === 0x200d ||
    code === 0x20e3
  )
}

/** The text as it is recorded: no emoji, single spaces. */
export function normalizePhrase(text: string): string {
  return Array.from(text.normalize('NFC'))
    .filter((char) => !isPictograph(char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tidies a sentence after a word was taken out, e.g. “Salom, !” → “Salom!”. */
export function tidyPhrase(text: string): string {
  return normalizePhrase(
    text
      .replace(/\s*,\s*([!?.])/g, '$1')
      .replace(/\s+([!?.,])/g, '$1')
      .replace(/^[\s,]+/, ''),
  )
}

/** Sentences are recorded one by one, so longer texts can be put together from them. */
export function splitSentences(text: string): string[] {
  return normalizePhrase(text)
    .split(/(?<=[.!?…])\s+/)
    .filter((part) => part.length > 0)
}

/** FNV-1a (32 bit) of language + text: the file name of the clip. */
export function phraseKey(language: string, text: string): string {
  const bytes = new TextEncoder().encode(`${language}\u0000${normalizePhrase(text)}`)
  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** The sentence without the child’s name, for clips recorded without it. */
export function withoutName(sentence: string, name: string | null | undefined): string | null {
  const trimmed = name?.trim()
  if (!trimmed || !sentence.includes(trimmed)) return null
  return tidyPhrase(sentence.split(trimmed).join(''))
}
