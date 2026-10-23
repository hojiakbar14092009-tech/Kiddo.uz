/*
 * The shape of a story's words (no imports: the e2e tests read the story
 * texts with Node's module resolution, see text.uz.ts).
 */

/** A story's words in one language. */
export interface StoryText {
  title: string
  /** One short line on the library card. */
  blurb: string
  /** Page id → 1–3 short sentences. */
  pages: Readonly<Record<string, readonly string[]>>
  /** Choice textKey → the words on its button. */
  choices: Readonly<Record<string, string>>
  /** Question id → its prompt and the labels of its answers (same order as the spec). */
  questions: Readonly<Record<string, { prompt: string; options: readonly string[] }>>
}
