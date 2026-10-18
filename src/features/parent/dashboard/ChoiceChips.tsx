import clsx from 'clsx'
import type { ReactNode } from 'react'

interface ChoiceChipsProps<T extends string | number> {
  label: string
  options: readonly { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
}

/** A single-choice row of chips (age, gender, minutes…), announced as a radio group. */
export function ChoiceChips<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: ChoiceChipsProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={clsx(
              'min-h-12 min-w-12 rounded-2xl border-2 px-4 font-display text-lg font-bold transition-colors',
              option.value === value
                ? 'border-primary bg-primary text-white'
                : 'border-line-strong bg-surface text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
