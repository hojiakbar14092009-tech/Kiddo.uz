/*
 * Admin V4 icons (Phase 54): Phosphor in its duotone weight – a soft filled
 * layer under a 1.5 px line. Only the admin chunk loads them (lazy route), so
 * the children's first screen budget is untouched.
 */
import type { Icon, IconProps } from '@phosphor-icons/react'
import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  ArrowsClockwise,
  Bell,
  BookOpenText,
  ChartBar,
  Coins,
  CreditCard,
  Crown,
  DeviceMobile,
  GearSix,
  Megaphone,
  Microphone,
  Moon,
  ShieldCheck,
  SignOut,
  Sparkle,
  SquaresFour,
  Sun,
  Ticket,
  UsersThree,
} from '@phosphor-icons/react'

const AdminIcons = {
  overview: SquaresFour,
  notifications: Bell,
  analytics: ChartBar,
  children: UsersThree,
  payments: CreditCard,
  demo: Sparkle,
  promo: Ticket,
  ads: Megaphone,
  voices: Microphone,
  content: BookOpenText,
  team: ShieldCheck,
  settings: GearSix,
  openApp: ArrowSquareOut,
  light: Sun,
  dark: Moon,
  signOut: SignOut,
  revenue: Coins,
  installs: DeviceMobile,
  day2: ArrowCounterClockwise,
  day7: ArrowsClockwise,
  pro: Crown,
} satisfies Record<string, Icon>

export type AdminIconName = keyof typeof AdminIcons

/** One icon, duotone, hidden from screen readers (the text next to it says it). */
export function AdminIcon({
  name,
  size = 20,
  ...rest
}: { name: AdminIconName } & Omit<IconProps, 'weight'>) {
  const Glyph = AdminIcons[name]
  return <Glyph weight="duotone" size={size} aria-hidden="true" {...rest} />
}

/** The tinted square an icon sits in on the KPI tiles. */
export function IconChip({
  name,
  tone = 'accent',
}: {
  name: AdminIconName
  tone?: 'accent' | 'gold' | 'coral'
}) {
  return (
    <span className="kd-chip" data-tone={tone}>
      <AdminIcon name={name} size={22} />
    </span>
  )
}
