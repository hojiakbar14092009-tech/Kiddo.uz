import clsx from 'clsx'
import type { ReactNode } from 'react'

export interface SegmentedTab<T extends string> {
  value: T
  /** Always visible – a symbol a pre-reader recognises (Aa, 123, 🧢…). */
  symbol: ReactNode
  /** The word, shown from tablet width up. */
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
}

/** Large pill-shaped tabs. Pair with a panel that spreads `tabPanelProps(idBase, value)`. */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex w-full gap-1 rounded-full bg-surface p-1.5 shadow-[0_4px_0_var(--color-line)] sm:w-auto"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          id={`${idBase}-tab-${tab.value}`}
          aria-selected={value === tab.value}
          aria-controls={`${idBase}-panel-${tab.value}`}
          onClick={() => onChange(tab.value)}
          className={clsx(
            'inline-flex h-14 min-w-14 flex-1 items-center justify-center rounded-full px-3 font-display text-xl font-bold whitespace-nowrap transition-colors sm:min-w-28 sm:flex-none sm:px-5',
            value === tab.value ? 'bg-primary text-white' : 'text-ink',
          )}
        >
          {tab.symbol}
          <span className="sr-only sm:not-sr-only sm:ml-2">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
