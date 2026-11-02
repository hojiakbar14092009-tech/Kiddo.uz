import { getAlphabet } from '@/content/alphabet'
import type { Language } from '@/content/languages'

/*
 * Printable sheets (Phase 49): A4 pages a parent prints from the parent area,
 * drawn as one SVG in millimetres (vector only, no PDF library: the browser's
 * print dialog prints them or saves them as a PDF). Pure data here; the
 * drawing is in WorksheetSvg.tsx.
 */

export const SHEET_KINDS = ['letters', 'numbers', 'count'] as const
export type SheetKind = (typeof SHEET_KINDS)[number]

export function isSheetKind(value: unknown): value is SheetKind {
  return typeof value === 'string' && (SHEET_KINDS as readonly string[]).includes(value)
}

/** A4 in millimetres (portrait). */
export const A4 = { width: 210, height: 297 } as const

export interface SheetLetter {
  id: string
  upper: string
  lower: string
}

/**
 * The letters to trace: the alphabet of the chosen language, as Kiddo teaches
 * it (Uzbek with Sh, Ch, Ng, Oʻ and Gʻ). The Uzbek tutuq belgisi (ʼ) is a mark,
 * not a letter to trace, so it is left out.
 */
export function sheetLetters(language: Language): SheetLetter[] {
  return getAlphabet(language)
    .letters.filter((letter) => letter.id !== 'tutuq')
    .map(({ id, upper, lower }) => ({ id, upper, lower }))
}

/** Numbers 1–20. */
export const SHEET_NUMBERS: readonly number[] = Array.from({ length: 20 }, (_, i) => i + 1)

export type CountShape = 'star' | 'apple' | 'heart' | 'flower' | 'fish' | 'ball'

/** Count-and-circle rows: how many outlines to count (always the same sheet). */
export const COUNT_ROWS: readonly { count: number; shape: CountShape }[] = [
  { count: 3, shape: 'star' },
  { count: 5, shape: 'apple' },
  { count: 2, shape: 'heart' },
  { count: 6, shape: 'flower' },
  { count: 4, shape: 'fish' },
  { count: 7, shape: 'ball' },
]

/** The numbers a child chooses from on each count row. */
export const COUNT_CHOICES: readonly number[] = Array.from({ length: 10 }, (_, i) => i + 1)

/** The child's first name for the top of the sheet (first word, at most 24 characters). */
export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0]?.slice(0, 24) ?? ''
}
