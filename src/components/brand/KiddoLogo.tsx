import { motion } from 'framer-motion'

/**
 * Kiddo’s mark: a friendly robot head on a teal tile. The antenna ball is a
 * gold coin, the screen face smiles. Drawn as plain shapes, so it stays crisp
 * from the favicon to the splash screen.
 */
export function KiddoMark({ size = 96, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="kiddo-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1FB39A" />
          <stop offset="1" stopColor="#0E7F6E" />
        </linearGradient>
        <linearGradient id="kiddo-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A2E4D" />
          <stop offset="1" stopColor="#241B33" />
        </linearGradient>
        <clipPath id="kiddo-clip">
          <rect width="512" height="512" rx="128" />
        </clipPath>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#kiddo-tile)" />
      <path
        d="M0 384 Q256 300 512 384 V512 H0Z"
        fill="#0C6B5D"
        opacity=".35"
        clipPath="url(#kiddo-clip)"
      />
      {/* antenna */}
      <rect x="244" y="92" width="24" height="60" rx="12" fill="#FFFFFF" />
      <circle cx="256" cy="86" r="34" fill="#FFC93C" stroke="#E0A419" strokeWidth="8" />
      <circle cx="245" cy="76" r="9" fill="#FFF3C4" />
      {/* ears */}
      <rect x="78" y="226" width="48" height="104" rx="24" fill="#F27BA6" />
      <rect x="386" y="226" width="48" height="104" rx="24" fill="#7CC4F5" />
      {/* head */}
      <rect x="108" y="146" width="296" height="250" rx="96" fill="#FFFFFF" />
      <rect x="140" y="182" width="232" height="168" rx="70" fill="url(#kiddo-screen)" />
      {/* face */}
      <ellipse cx="208" cy="250" rx="22" ry="28" fill="#7CF5D9" />
      <ellipse cx="304" cy="250" rx="22" ry="28" fill="#7CF5D9" />
      <circle cx="214" cy="240" r="7" fill="#FFFFFF" />
      <circle cx="310" cy="240" r="7" fill="#FFFFFF" />
      <path
        d="M214 300 Q256 336 298 300"
        fill="none"
        stroke="#7CF5D9"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <ellipse cx="174" cy="300" rx="16" ry="10" fill="#F27BA6" opacity=".7" />
      <ellipse cx="338" cy="300" rx="16" ry="10" fill="#F27BA6" opacity=".7" />
    </svg>
  )
}

const WORD = [
  { ch: 'K', color: '#13917E' },
  { ch: 'i', color: '#FFB020' },
  { ch: 'd', color: '#F27BA6' },
  { ch: 'd', color: '#4FA8E8' },
  { ch: 'o', color: '#8E6CEF' },
]

/** The wordmark: each letter its own colour, like alphabet blocks. */
export function KiddoWordmark({
  animate = false,
  delay = 0,
  className,
}: {
  animate?: boolean
  delay?: number
  className?: string
}) {
  return (
    <span
      aria-label="Kiddo"
      role="img"
      className={`inline-flex font-display font-extrabold tracking-tight ${className ?? ''}`}
    >
      {WORD.map(({ ch, color }, index) => (
        <motion.span
          key={index}
          aria-hidden="true"
          style={{ color, textShadow: '0 4px 0 rgba(58,46,77,.12)' }}
          initial={animate ? { y: -70, opacity: 0, rotate: -12 } : false}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{
            delay: delay + index * 0.09,
            type: 'spring',
            stiffness: 420,
            damping: 14,
          }}
          className="inline-block"
        >
          {ch}
        </motion.span>
      ))}
    </span>
  )
}
