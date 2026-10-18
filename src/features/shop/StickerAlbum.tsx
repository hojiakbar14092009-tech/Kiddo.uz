import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { STICKERS } from '@/features/stickers/stickers'
import { Picture } from '@/components/ui/Picture'

/** Every sticker in the collection: earned ones in colour, the rest as empty slots. */
export function StickerAlbum({ owned }: { owned: readonly string[] }) {
  const { t } = useTranslation()
  const ownedSet = new Set(owned)

  return (
    <>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-extrabold">
          {t('stickers.title')}{' '}
          <span className="text-ink-soft">
            {t('stickers.count', { count: ownedSet.size, total: STICKERS.length })}
          </span>
        </h2>
        {ownedSet.size === 0 && <p className="text-lg text-ink-soft">{t('stickers.empty')}</p>}
      </div>
      <ul className="grid grid-cols-4 gap-3 sm:grid-cols-6 sm:gap-4 lg:grid-cols-8">
        {STICKERS.map((sticker) => {
          const has = ownedSet.has(sticker.id)
          return (
            <li
              key={sticker.id}
              aria-label={has ? undefined : t('stickers.emptySlot')}
              className={clsx(
                'flex aspect-square items-center justify-center rounded-3xl text-4xl sm:text-5xl',
                has
                  ? 'bg-white shadow-[0_5px_0_var(--color-line)]'
                  : 'border-[3px] border-dashed border-line-strong text-2xl font-bold text-line-strong',
              )}
            >
              {has ? <Picture emoji={sticker.emoji} className="size-[72%]" /> : '?'}
            </li>
          )
        })}
      </ul>
    </>
  )
}
