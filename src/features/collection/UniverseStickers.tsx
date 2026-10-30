import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { ACHIEVEMENTS, stickerTitleKey, type UniverseStickerDef } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'
import { tierLabelKey } from './medalLabels'
import { StickerArt } from './StickerArt'

export interface UniverseStickerView {
  sticker: UniverseStickerDef
  unlocked: boolean
}

/**
 * The Kiddo Universe stickers: unlocked ones in colour, the rest as their own
 * shadow with the medal step that opens them, so the child sees the goal.
 */
export function UniverseStickers({ items }: { items: readonly UniverseStickerView[] }) {
  const { t } = useTranslation()
  const count = items.filter((item) => item.unlocked).length

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2
          id="universe-stickers-title"
          className="font-display text-2xl font-extrabold sm:text-3xl"
        >
          {t('collection.universeStickers')}
        </h2>
        <p className="text-base text-ink-soft" data-testid="universe-stickers-count">
          {t('collection.universeStickersCount', { count, total: items.length })}
        </p>
        <p className="max-w-prose text-base leading-snug text-ink-soft">
          {t('collection.universeStickersHint')}
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
        {items.map(({ sticker, unlocked }) => {
          const title = tDynamic(t, stickerTitleKey(sticker.id))
          const medal = ACHIEVEMENTS.find((item) => item.id === sticker.achievement)
          const need = medal
            ? t('collection.stickerNeed', {
                medal: tDynamic(t, medal.titleKey),
                tier: tDynamic(t, tierLabelKey(medal.collection, sticker.tier)),
              })
            : ''
          return (
            <li
              key={sticker.id}
              data-testid={`ustick-${sticker.id}`}
              data-unlocked={unlocked}
              className={clsx(
                'flex flex-col items-center gap-1.5 rounded-card p-3 text-center',
                unlocked
                  ? 'bg-surface shadow-press'
                  : 'border-2 border-dashed border-line-strong bg-cream/60',
              )}
            >
              <StickerArt id={sticker.id} locked={!unlocked} className="size-20 sm:size-24" />
              <h3 className="font-display text-base leading-tight font-extrabold sm:text-lg">
                {title}
              </h3>
              <p
                className={clsx(
                  'text-sm leading-snug',
                  unlocked ? 'font-bold text-primary-ink' : 'text-ink-soft',
                )}
              >
                {unlocked ? (
                  t('collection.stickerOpen')
                ) : (
                  <>
                    <span className="sr-only">{t('collection.stickerLocked')}: </span>
                    {need}
                  </>
                )}
              </p>
            </li>
          )
        })}
      </ul>
    </>
  )
}
