import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@/components/icons'
import { IconButton } from '@/components/ui/IconButton'
import { TopBar } from './TopBar'

/** The top bar with a back button and the screen's title (one `h1`). */
export function TitleTopBar({
  title,
  back,
  showBack = true,
  wrap = false,
  extra,
}: {
  title: ReactNode
  /** Where "back" goes; without it the button goes one step back in history. */
  back?: string
  /** Off where "back" would only repeat the home button (e.g. a screen opened from home). */
  showBack?: boolean
  /** A long title (e.g. a story's) may take two lines instead of being cut off. */
  wrap?: boolean
  /** A control after the title (e.g. the gallery button). */
  extra?: ReactNode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <TopBar
      start={
        <>
          {showBack && (
            <IconButton
              label={t('common.back')}
              onClick={() => (back ? navigate(back) : navigate(-1))}
            >
              <ChevronLeftIcon size={28} />
            </IconButton>
          )}
          {/* a phone has no room for it beside coins and languages: read out only there */}
          <h1
            className={clsx(
              'min-w-0 max-[479px]:sr-only font-display font-extrabold short:text-xl',
              wrap
                ? 'line-clamp-2 text-xl leading-tight sm:text-2xl lg:text-3xl'
                : 'truncate text-2xl sm:text-3xl',
            )}
          >
            {title}
          </h1>
          {extra}
        </>
      }
    />
  )
}
