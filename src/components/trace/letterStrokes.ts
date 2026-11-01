import { arc, curve, join, line, type Stroke } from './paths'
import type { Point } from './traceScoring'

/*
 * How each capital letter is written, stroke by stroke, in the 0–100 box
 * (Phase 42b). The writing board follows these lines (a start dot for each
 * stroke, a dot walking the way), checks the child's line against each one,
 * and the help shows a finger drawing them in this order. Latin (Uzbek and
 * English), Cyrillic (Russian), and the Uzbek letters made of two signs.
 * Letters stand between y = 12 and 88, between x ≈ 22 and 78.
 */

const p = (x: number, y: number): Point => ({ x, y })

/** The upper bowl of B, P, R and friends, from the stem at `x` (to `bottom`). */
const bowl = (x: number, top: number, bottom: number, width: number): Point[] => {
  const ry = (bottom - top) / 2
  const cx = x + width - ry * 0.9
  return join(
    line([x, top], [cx, top]),
    arc(cx, top + ry, ry * 0.95, ry, -90, 90),
    line([cx, bottom], [x, bottom]),
  )
}

const O: Stroke = arc(50, 50, 26, 38, -90, -450)
const C: Stroke = arc(52, 50, 26, 38, -40, -320)
const G: Stroke = arc(52, 50, 26, 38, -40, -360)

const LATIN: Record<string, readonly Stroke[]> = {
  A: [line([50, 12], [22, 88]), line([50, 12], [78, 88]), line([33, 60], [67, 60])],
  B: [line([28, 12], [28, 88]), bowl(28, 12, 48, 44), bowl(28, 48, 88, 48)],
  C: [C],
  D: [
    line([28, 12], [28, 88]),
    join(line([28, 12], [44, 12]), arc(44, 50, 30, 38, -90, 90), line([44, 88], [28, 88])),
  ],
  E: [
    line([28, 12], [28, 88]),
    line([28, 12], [72, 12]),
    line([28, 50], [64, 50]),
    line([28, 88], [72, 88]),
  ],
  F: [line([28, 12], [28, 88]), line([28, 12], [72, 12]), line([28, 50], [64, 50])],
  G: [G, line([78, 52], [56, 52])],
  H: [line([28, 12], [28, 88]), line([72, 12], [72, 88]), line([28, 50], [72, 50])],
  I: [line([50, 12], [50, 88])],
  J: [join(line([64, 12], [64, 66]), arc(46, 66, 18, 22, 0, 180))],
  K: [line([30, 12], [30, 88]), line([72, 12], [30, 58]), line([44, 42], [74, 88])],
  L: [line([30, 12], [30, 88], [72, 88])],
  M: [line([24, 12], [24, 88]), line([24, 12], [50, 62], [76, 12], [76, 88])],
  N: [line([28, 12], [28, 88]), line([28, 12], [72, 88], [72, 12])],
  O: [O],
  P: [line([28, 12], [28, 88]), bowl(28, 12, 52, 46)],
  Q: [O, line([58, 70], [78, 92])],
  R: [line([28, 12], [28, 88]), bowl(28, 12, 52, 46), line([46, 52], [74, 88])],
  S: [join(arc(50, 31, 22, 19, -20, -270), arc(50, 69, 24, 19, -90, 160))],
  T: [line([22, 12], [78, 12]), line([50, 12], [50, 88])],
  U: [join(line([28, 12], [28, 62]), arc(50, 62, 22, 26, 180, 0), line([72, 62], [72, 12]))],
  V: [line([24, 12], [50, 88], [76, 12])],
  W: [line([18, 12], [33, 88], [50, 38], [67, 88], [82, 12])],
  X: [line([26, 12], [74, 88]), line([74, 12], [26, 88])],
  Y: [line([26, 12], [50, 50], [50, 88]), line([74, 12], [50, 50])],
  Z: [line([26, 12], [74, 12], [26, 88], [74, 88])],
}

/** A small "h" and "g" for the Uzbek two-sign letters Sh, Ch and Ng. */
const SMALL: Record<string, readonly Stroke[]> = {
  h: [line([30, 12], [30, 88]), join(arc(48, 60, 18, 16, 180, 360), line([66, 60], [66, 88]))],
  g: [arc(48, 58, 18, 18, 0, -360), join(line([66, 40], [66, 88]), arc(50, 88, 16, 10, 0, 180))],
}

const CYRILLIC: Record<string, readonly Stroke[]> = {
  А: LATIN.A!,
  Б: [line([28, 12], [28, 88]), line([28, 12], [70, 12]), bowl(28, 48, 88, 48)],
  В: LATIN.B!,
  Г: [line([30, 12], [30, 88]), line([30, 12], [72, 12])],
  Д: [
    line([38, 12], [30, 76]),
    line([38, 12], [68, 12], [68, 76]),
    line([20, 76], [80, 76], [80, 92]),
    line([20, 76], [20, 92]),
  ],
  Е: LATIN.E!,
  Ё: [...LATIN.E!, line([38, 4], [38, 7]), line([60, 4], [60, 7])],
  Ж: [
    line([50, 12], [50, 88]),
    line([22, 12], [50, 50], [20, 88]),
    line([78, 12], [50, 50], [80, 88]),
  ],
  З: [join(arc(48, 31, 22, 19, -150, 90), arc(48, 69, 24, 19, -90, 150))],
  И: [line([28, 12], [28, 88]), line([28, 88], [72, 12]), line([72, 12], [72, 88])],
  Й: [
    line([28, 16], [28, 88]),
    line([28, 88], [72, 16]),
    line([72, 16], [72, 88]),
    arc(50, 3, 11, 6, 180, 0),
  ],
  К: LATIN.K!,
  Л: [
    join(line([36, 12], [32, 70]), curve(p(32, 70), p(29, 88), p(18, 86))),
    line([36, 12], [72, 12], [72, 88]),
  ],
  М: LATIN.M!,
  Н: LATIN.H!,
  О: [O],
  П: [line([28, 12], [28, 88]), line([28, 12], [72, 12], [72, 88])],
  Р: LATIN.P!,
  С: [C],
  Т: LATIN.T!,
  У: [
    line([24, 12], [50, 56]),
    join(line([76, 12], [42, 80]), curve(p(42, 80), p(36, 90), p(24, 86))),
  ],
  Ф: [line([50, 6], [50, 94]), arc(50, 44, 28, 20, -90, -450)],
  Х: LATIN.X!,
  Ц: [
    line([28, 12], [28, 82], [70, 82]),
    line([70, 12], [70, 82]),
    line([70, 82], [80, 82], [80, 96]),
  ],
  Ч: [
    join(
      line([28, 12], [28, 40]),
      curve(p(28, 40), p(28, 56), p(52, 56)),
      line([52, 56], [72, 52]),
    ),
    line([72, 12], [72, 88]),
  ],
  Ш: [line([22, 12], [22, 88], [78, 88]), line([50, 12], [50, 88]), line([78, 12], [78, 88])],
  Щ: [
    line([22, 12], [22, 84], [76, 84]),
    line([49, 12], [49, 84]),
    line([76, 12], [76, 84]),
    line([76, 84], [84, 84], [84, 97]),
  ],
  Ъ: [line([18, 12], [32, 12]), line([32, 12], [32, 88]), bowl(32, 50, 88, 44)],
  Ы: [line([24, 12], [24, 88]), bowl(24, 50, 88, 36), line([78, 12], [78, 88])],
  Ь: [line([30, 12], [30, 88]), bowl(30, 50, 88, 46)],
  Э: [arc(48, 50, 26, 38, -140, 140), line([34, 50], [74, 50])],
  Ю: [line([18, 12], [18, 88]), line([18, 50], [36, 50]), arc(60, 50, 22, 38, -90, -450)],
  Я: [
    join(line([72, 12], [48, 12]), arc(48, 31, 20, 19, -90, -270), line([48, 50], [72, 50])),
    line([72, 12], [72, 88]),
    line([54, 50], [28, 88]),
  ],
}

/** The strokes of `strokes` squeezed by `scale` around x = 50 and moved to `center`. */
function placed(strokes: readonly Stroke[], center: number, scale: number, scaleY = 1): Stroke[] {
  return strokes.map((stroke) =>
    stroke.map(({ x, y }) => ({ x: center + (x - 50) * scale, y: 50 + (y - 50) * scaleY })),
  )
}

/** A two-sign letter: the big one on the left, the small one on the right. */
function pair(first: readonly Stroke[], second: readonly Stroke[]): Stroke[] {
  // both signs smaller (not only narrower), so a scribble cannot pass for them
  return [...placed(first, 29, 0.55, 0.8), ...placed(second, 74, 0.5, 0.8)]
}

/** The Uzbek ʻ after O and G. */
const TURNED_COMMA = line([86, 10], [80, 26])

const UZBEK: Record<string, readonly Stroke[]> = {
  Oʻ: [...placed([O], 42, 0.8), TURNED_COMMA],
  Gʻ: [...placed(LATIN.G!, 42, 0.8), TURNED_COMMA],
  Sh: pair(LATIN.S!, SMALL.h!),
  Ch: pair(LATIN.C!, SMALL.h!),
  Ng: pair(LATIN.N!, SMALL.g!),
  ʼ: [line([56, 18], [46, 46])],
}

const ALL: Record<string, readonly Stroke[]> = { ...LATIN, ...CYRILLIC, ...UZBEK }

/** How a capital letter is written (null when there is no stroke data for it). */
export function letterStrokes(glyph: string): readonly Stroke[] | null {
  return ALL[glyph] ?? null
}

/** Every letter with strokes (for tests). */
export const STROKED_LETTERS: readonly string[] = Object.keys(ALL)
