import type { Language } from '@/content/languages'

interface FlagProps {
  language: Language
  width?: number
}

/** Simplified national flags (2:1) used on the language picker. */
export function Flag({ language, width = 160 }: FlagProps) {
  const height = width / 2
  const common = {
    width,
    height,
    'aria-hidden': true,
    focusable: false,
    className: 'rounded-xl',
  } as const

  if (language === 'uz') {
    return (
      <svg viewBox="0 0 160 80" {...common}>
        <rect width="160" height="80" fill="#FFFFFF" />
        <rect width="160" height="26" fill="#0099B5" />
        <rect y="26" width="160" height="2" fill="#CE1126" />
        <rect y="52" width="160" height="2" fill="#CE1126" />
        <rect y="54" width="160" height="26" fill="#1EB53A" />
        <circle cx="22" cy="13" r="8" fill="#FFFFFF" />
        <circle cx="25" cy="13" r="7" fill="#0099B5" />
        {[38, 45, 52].map((cx) =>
          [8, 15].map((cy) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.6" fill="#FFFFFF" />
          )),
        )}
      </svg>
    )
  }

  if (language === 'ru') {
    return (
      <svg viewBox="0 0 160 80" {...common}>
        <rect width="160" height="27" fill="#FFFFFF" />
        <rect y="27" width="160" height="26" fill="#0039A6" />
        <rect y="53" width="160" height="27" fill="#D52B1E" />
        <rect
          x="1"
          y="1"
          width="158"
          height="78"
          rx="11"
          fill="none"
          stroke="#EADFC9"
          strokeWidth="2"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 60 30" {...common}>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="2" />
      <path d="M30,0 V30 M0,15 H60" stroke="#FFFFFF" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  )
}
