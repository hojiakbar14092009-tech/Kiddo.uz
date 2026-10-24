import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * How crowded the top bar is: 0 = everything shows, 1 = the three language
 * buttons fold into one, 2 = also the plan badge (Free / PRO) is only read out
 * to screen readers, 3 = the coins and the language move to a second row
 * (very large system text on a small phone, where nothing else would fit).
 *
 * Measured, not a fixed width: what the bar holds (a back button, PRO, the
 * coins, the language, the size of the system text) changes how much room
 * there is. It steps up when something no longer fits (the back button
 * squeezed under the coins, a control past the edge) and steps back only when
 * the hidden part fits again with room to spare, so it never flips back and forth.
 */
export type BarCrowding = 0 | 1 | 2 | 3

const SPARE = 8
/** A title that truncates still needs about a word on screen. */
const SHRUNK_TEXT = 48

/** The narrowest an element can get: shrinking text counts as a word, a flex row as its parts. */
function minWidth(element: Element): number {
  const style = getComputedStyle(element)
  const width = element.getBoundingClientRect().width
  if (style.display === 'contents') {
    return [...element.children].reduce((sum, kid) => sum + minWidth(kid), 0)
  }
  const shrinks =
    style.flexShrink !== '0' && (style.minWidth === '0px' || style.overflow === 'hidden')
  if (shrinks && element.children.length === 0) return Math.min(width, SHRUNK_TEXT)
  if (style.display === 'flex' && style.flexDirection.startsWith('row')) {
    const kids = [...element.children].filter((kid) => kid.getBoundingClientRect().width > 0)
    const gap = Number.parseFloat(style.columnGap) || 0
    const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight)
    return (
      kids.reduce((sum, kid) => sum + minWidth(kid), 0) +
      gap * Math.max(0, kids.length - 1) +
      (padding || 0)
    )
  }
  return shrinks ? Math.min(width, SHRUNK_TEXT) : width
}

export function useFoldedSwitch(
  header: RefObject<HTMLElement | null>,
  start: RefObject<HTMLElement | null>,
): BarCrowding {
  const [level, setLevel] = useState<BarCrowding>(0)
  // the plan badge's width while it showed (it is 1 px while only read out)
  const tierWidth = useRef(0)
  // the bar's width and the text size each time it stepped up: it steps back down
  // only once the bar is wider or the text smaller than then, so it can never loop
  const steppedAt = useRef<{ width: number; font: number }[]>([])

  useLayoutEffect(() => {
    const bar = header.current
    const startArea = start.current
    if (!bar || !startArea) return undefined

    const rootFont = () =>
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const stepDown = (to: BarCrowding) => {
      const mark = steppedAt.current[level]
      if (mark && bar.clientWidth <= mark.width && rootFont() >= mark.font) return
      setLevel(to)
    }

    const check = () => {
      const full = bar.querySelector<HTMLElement>('[data-language-full]')
      if (!full) return
      const tier = bar.querySelector<HTMLElement>('[data-tier] > *')
      if (level < 2 && tier) tierWidth.current = tier.getBoundingClientRect().width
      const tooTight =
        startArea.scrollWidth > startArea.clientWidth + 1 || bar.scrollWidth > bar.clientWidth + 1
      if (tooTight) {
        if (level < 3) {
          steppedAt.current[level + 1] = { width: bar.clientWidth, font: rootFont() }
          setLevel((level + 1) as BarCrowding)
        }
        return
      }
      if (level === 0) return
      if (level === 3) {
        // back to one row when the right group fits beside the start content
        const right = bar.querySelector<HTMLElement>('[data-bar-end]')
        const home = bar.firstElementChild as HTMLElement | null
        if (!right) return
        const parts = [...right.children].filter((kid) => kid.getBoundingClientRect().width > 1)
        const rightGap = Number.parseFloat(getComputedStyle(right).columnGap) || 0
        const rightWidth =
          parts.reduce((sum, kid) => sum + kid.getBoundingClientRect().width, 0) +
          rightGap * Math.max(0, parts.length - 1)
        const barGap = Number.parseFloat(getComputedStyle(bar).columnGap) || 0
        const style = getComputedStyle(bar)
        const inner =
          bar.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight)
        const homeWidth =
          home && home !== startArea ? home.getBoundingClientRect().width + barGap : 0
        if (homeWidth + minWidth(startArea) + barGap + rightWidth + SPARE <= inner) stepDown(2)
        return
      }
      // room left in the start area once its content is as narrow as it gets
      const free = startArea.clientWidth - minWidth(startArea)
      const gap = Number.parseFloat(getComputedStyle(bar).columnGap) || 0
      if (level === 2) {
        if (tierWidth.current + gap + SPARE <= free) stepDown(1)
        return
      }
      const compact = bar.querySelector<HTMLElement>('[data-language-compact]')
      if (!compact) return
      if (full.offsetWidth - compact.offsetWidth + SPARE <= free) stepDown(0)
    }

    check()
    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(check)
    observer.observe(bar)
    observer.observe(startArea)
    ;[...startArea.children].forEach((kid) => observer.observe(kid))
    const full = bar.querySelector('[data-language-full]')
    if (full) observer.observe(full)
    return () => observer.disconnect()
  }, [header, start, level])

  return level
}
