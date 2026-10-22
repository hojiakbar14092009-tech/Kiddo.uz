import clsx from 'clsx'
import { useEffect, useRef, type ReactNode } from 'react'

export interface SegmentedTab<T extends string> {
  value: T
  /** Always visible – a symbol a pre-reader recognises (Aa, 123, 🧢…). */
  symbol: ReactNode
  /** The word, shown from tablet width up (or always, with `showLabels="always"`). */
  label: string
}

interface SegmentedTabsProps<T extends string> {
  tabs: readonly SegmentedTab<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the whole tab list. */
  label: string
  /** Prefix for tab and panel ids: tabs get `${idBase}-tab-${value}`, panels `${idBase}-panel-${value}`. */
  idBase: string
  /**
   * `tablet` (default, child screens): phones show only the symbol.
   * `always` (grown-ups who read): symbol and word on every size; below
   * desktop width the tabs are a row of pills that scrolls sideways when it
   * does not fit (the page itself never scrolls sideways).
   */
  showLabels?: 'tablet' | 'always'
}

/** Large pill-shaped tabs. Pair with a panel that spreads `tabPanelProps(idBase, value)`. */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
  showLabels = 'tablet',
}: SegmentedTabsProps<T>) {
  const always = showLabels === 'always'
  const list = useRef<HTMLDivElement>(null)

  // a scrolling row keeps the chosen tab in sight (e.g. opened straight on the last tab)
  useEffect(() => {
    if (!always) return
    const row = list.current
    const tab = row?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!row || !tab || row.scrollWidth <= row.clientWidth) return
    const start = tab.offsetLeft - row.offsetLeft
    if (start < row.scrollLeft || start + tab.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = start - (row.clientWidth - tab.offsetWidth) / 2
    }
  }, [always, value])

  return (
    <div
      ref={list}
      role="tablist"
      aria-label={label}
      className={
        always
          ? // runs edge to edge under the page padding (px-4, sm:px-6) and scrolls inside
            '-mx-4 flex w-[calc(100%+2rem)] snap-x scroll-px-4 gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] sm:-mx-6 sm:w-[calc(100%+3rem)] sm:scroll-px-6 sm:px-6 lg:mx-0 lg:w-auto lg:gap-1 lg:overflow-visible lg:rounded-full lg:bg-surface lg:p-1.5 lg:shadow-press-sm'
          : 'flex w-full gap-1 rounded-full bg-surface p-1.5 shadow-press-sm sm:w-auto'
      }
    >
      {tabs.map((tab) => {
        const selected = value === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`${idBase}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${tab.value}`}
            onClick={() => onChange(tab.value)}
            className={clsx(
              'inline-flex items-center justify-center rounded-full font-display font-bold whitespace-nowrap transition-colors',
              always
                ? 'h-12 flex-none snap-start gap-2 px-4 text-base sm:h-14 sm:px-5 sm:text-lg'
                : 'h-14 min-w-14 flex-1 px-3 text-xl sm:min-w-28 sm:flex-none sm:px-5',
              selected ? 'bg-primary text-white' : 'text-ink',
              always && !selected && 'bg-surface shadow-press-sm lg:bg-transparent lg:shadow-none',
            )}
          >
            {always ? (
              <>
                <span aria-hidden="true">{tab.symbol}</span>
                {tab.label}
              </>
            ) : (
              <>
                {tab.symbol}
                <span className="sr-only sm:not-sr-only sm:ml-2">{tab.label}</span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}
