/**
 * A letter of a long word in the bold display font is at most ~0.67 em wide (measured
 * in uz, ru and en: "Продолжить" at weight 800 is the widest), plus a margin.
 */
const LETTER_EM = 0.72

/** The `--fit` size at which the longest word of `text` fills the container's width. */
export function fitSize(text: string, minLetters = 1): string {
  const longest = Math.max(minLetters, ...text.split(/\s+/).map((word) => [...word].length))
  return `${(100 / (longest * LETTER_EM)).toFixed(2)}cqi`
}
