import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FitWords } from '@/components/ui/FitWords'
import { Img3D } from '@/components/ui/Img3D'

/** The big way to the Games page (Phase 62), on Home and at the top of the hubs. */
export function GamesLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/games"
      data-testid="games-link"
      className="flex w-full max-w-xl items-center gap-4 rounded-card bg-coin px-5 py-3 text-ink shadow-[0_8px_0_var(--color-coin-shadow)] transition-transform active:translate-y-1 sm:px-7 sm:py-4"
    >
      <span
        aria-hidden="true"
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/50 sm:size-16"
      >
        <Img3D name="ball" className="size-[72%]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <FitWords
          text={t('games.title')}
          className="font-display text-2xl leading-tight font-extrabold sm:text-3xl"
        />
        <span className="text-base font-bold opacity-90">{t('games.linkText')}</span>
      </span>
    </Link>
  )
}
