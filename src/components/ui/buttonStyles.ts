import clsx from 'clsx'

/*
 * The look of the chunky "pressable" button, shared by <Button> and
 * <LinkButton> (a link that looks like a button, e.g. "Go inside").
 */

export type ButtonVariant = 'primary' | 'coin' | 'soft' | 'oops'
export type ButtonSize = 'md' | 'lg'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-[0_6px_0_var(--color-primary-shadow)] active:shadow-[0_2px_0_var(--color-primary-shadow)]',
  coin: 'bg-coin text-ink shadow-[0_6px_0_var(--color-coin-shadow)] active:shadow-[0_2px_0_var(--color-coin-shadow)]',
  soft: 'bg-surface text-ink shadow-[0_6px_0_var(--color-line)] active:shadow-[0_2px_0_var(--color-line)]',
  oops: 'bg-oops-soft text-oops-ink shadow-[0_6px_0_var(--color-oops-shadow)] active:shadow-[0_2px_0_var(--color-oops-shadow)]',
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-14 px-6 text-xl gap-2',
  lg: 'min-h-16 px-8 text-2xl gap-3',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'lg') {
  return clsx(
    'inline-flex items-center justify-center rounded-full font-display font-bold whitespace-nowrap',
    'transition-[transform,box-shadow] duration-100 active:translate-y-1',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  )
}
