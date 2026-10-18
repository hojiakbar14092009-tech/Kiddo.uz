import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'

export type MascotNoteKind = 'payment' | 'online' | 'info'

export interface MascotNote {
  id: string
  kind: MascotNoteKind
  text: string
  /** ISO time. */
  at: string
}

/**
 * Navi, the admin panel's own mascot – it never appears in the children's
 * app. A small observation drone with a headset: it keeps watch and writes
 * short notes (it does not talk) about payments and who is playing.
 */
export function NaviFigure({
  excited = false,
  className,
}: {
  excited?: boolean
  className?: string
}) {
  const reduceMotion = useReducedMotion() ?? false
  return (
    <motion.svg
      viewBox="0 0 120 120"
      className={className}
      aria-hidden="true"
      animate={reduceMotion ? undefined : { y: excited ? [0, -10, 0, -6, 0] : [0, -5, 0] }}
      transition={{ duration: excited ? 1 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* rotor */}
      <motion.g
        style={{ originX: '60px', originY: '16px' }}
        animate={reduceMotion ? undefined : { scaleX: [1, 0.15, 1] }}
        transition={{ duration: 0.18, repeat: Infinity }}
      >
        <rect x="30" y="13" width="60" height="6" rx="3" fill="var(--a-ink-soft)" />
      </motion.g>
      <rect x="57" y="16" width="6" height="12" rx="3" fill="var(--a-ink-soft)" />
      {/* body */}
      <ellipse
        cx="60"
        cy="66"
        rx="40"
        ry="38"
        fill="var(--a-raise)"
        stroke="var(--a-line)"
        strokeWidth="2"
      />
      <path d="M24 78 Q60 112 96 78" fill="var(--a-accent-soft)" />
      {/* visor */}
      <rect x="32" y="44" width="56" height="34" rx="17" fill="#0b1416" />
      <motion.g
        animate={reduceMotion ? undefined : { scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, times: [0, 0.9, 0.95, 1] }}
        style={{ originY: '61px' }}
      >
        <circle cx="49" cy="61" r="6" fill={excited ? 'var(--a-gold)' : 'var(--a-accent)'} />
        <circle cx="71" cy="61" r="6" fill={excited ? 'var(--a-gold)' : 'var(--a-accent)'} />
      </motion.g>
      {/* headset */}
      <path
        d="M22 62 Q20 34 60 30 Q100 34 98 62"
        fill="none"
        stroke="var(--a-ink-soft)"
        strokeWidth="4"
      />
      <rect x="15" y="56" width="10" height="18" rx="5" fill="var(--a-gold)" />
      <rect x="95" y="56" width="10" height="18" rx="5" fill="var(--a-gold)" />
      <path d="M20 74 Q24 92 44 90" fill="none" stroke="var(--a-ink-soft)" strokeWidth="3" />
      <circle cx="46" cy="90" r="4" fill="var(--a-ink-soft)" />
    </motion.svg>
  )
}

const KIND_STYLES: Record<MascotNoteKind, string> = {
  payment: 'border-l-[var(--a-gold)]',
  online: 'border-l-[var(--a-online)]',
  info: 'border-l-[var(--a-accent)]',
}

/** Navi with its notes, docked in the corner. Collapsible, so it never covers work. */
export function AdminMascot({ notes, excited }: { notes: MascotNote[]; excited: boolean }) {
  const [open, setOpen] = useState(true)
  const time = new Intl.DateTimeFormat('uz', { hour: '2-digit', minute: '2-digit' })

  return (
    <aside
      aria-label="Navi – yordamchi"
      className="fixed right-3 bottom-3 z-30 flex max-w-[calc(100vw-1.5rem)] items-end gap-2 sm:right-6 sm:bottom-6"
    >
      <AnimatePresence initial={false}>
        {open && notes.length > 0 && (
          <motion.ol
            aria-live="polite"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex w-80 max-w-full flex-col gap-2"
          >
            {notes.slice(0, 3).map((note, index) => (
              <motion.li
                key={note.id}
                layout
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: index === 0 ? 1 : 0.72, x: 0 }}
                className={`kd-panel border-l-4 px-4 py-3 text-sm leading-snug ${KIND_STYLES[note.kind]} ${index > 0 ? 'hidden sm:block' : ''}`}
              >
                <p className="text-[var(--a-ink)]">{note.text}</p>
                <time className="mt-1 block text-xs text-[var(--a-ink-faint)]" dateTime={note.at}>
                  {time.format(new Date(note.at))}
                </time>
              </motion.li>
            ))}
          </motion.ol>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Navi xabarlarini yashirish' : 'Navi xabarlarini ko‘rsatish'}
        className="relative shrink-0 rounded-full"
      >
        <NaviFigure
          excited={excited}
          className="size-20 drop-shadow-[0_10px_14px_rgba(0,0,0,0.25)] sm:size-24"
        />
        {!open && notes.length > 0 && (
          <span className="kd-num absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-[var(--a-gold)] text-xs font-bold text-[#1d1300]">
            {Math.min(notes.length, 9)}
          </span>
        )}
      </button>
    </aside>
  )
}
