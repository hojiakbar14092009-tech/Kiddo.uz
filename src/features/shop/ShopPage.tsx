import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TopBar } from '@/components/layout/TopBar'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { tabPanelProps } from '@/components/ui/tabPanel'
import clsx from 'clsx'
import { Mascot } from '@/features/mascot/Mascot'
import { RoamingMascot } from '@/features/mascot/RoamingMascot'
import { useMascot } from '@/features/mascot/useMascot'
import { useMascotModel } from '@/store/familyStore'
import { useChildKey, useProgress, useProgressStore } from '@/store/progressStore'
import { BuyDialog } from './BuyDialog'
import { OutfitCard } from './OutfitCard'
import { OUTFITS, type Outfit, type Wearing } from './outfits'
import { StickerAlbum } from './StickerAlbum'
import { PetsPanel } from '@/features/pets/PetsPanel'

type ShopTab = 'outfits' | 'pets' | 'stickers'

/** `/shop`: spend coins on robot clothes, and look through the sticker album. */
export function ShopPage() {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const { coins, outfits, wearing, stickers } = useProgress()
  const buyOutfit = useProgressStore((state) => state.buyOutfit)
  const toggleOutfit = useProgressStore((state) => state.toggleOutfit)
  const { react, reset } = useMascot()
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const tab: ShopTab = requested === 'stickers' || requested === 'pets' ? requested : 'outfits'
  const [pending, setPending] = useState<Outfit | null>(null)
  const model = useMascotModel()

  useEffect(() => reset, [reset])

  // The robot does not sit still: a few seconds after the last tap it climbs
  // out of its frame and plays on the items; any tap calls it back to show them on.
  const [roaming, setRoaming] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  useEffect(() => {
    if (roaming || pending || tab === 'stickers') return undefined
    const timer = setTimeout(() => setRoaming(true), 4000)
    return () => clearTimeout(timer)
  }, [roaming, pending, tab, lastTap])

  /** While the child is deciding, the robot already tries the item on. */
  const shownWearing: Wearing = pending ? { ...wearing, [pending.slot]: pending.id } : wearing

  const select = (outfit: Outfit) => {
    setRoaming(false)
    setLastTap((count) => count + 1)
    if (outfits.includes(outfit.id)) {
      toggleOutfit(childKey, outfit.id)
      return
    }
    if (coins < outfit.price) {
      react('greet', { text: t('shop.notEnough', { count: outfit.price - coins }), emoji: '💪' })
      return
    }
    setPending(outfit)
  }

  const confirm = () => {
    if (pending && buyOutfit(childKey, pending.id)) {
      react('celebrate', { text: t('shop.bought'), emoji: '🎉' })
    }
    setPending(null)
  }

  return (
    <Screen header={<TopBar />} className="gap-5 px-4 py-5 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t('shop.title')}</h1>
        <SegmentedTabs
          tabs={[
            { value: 'outfits', symbol: '🧢', label: t('shop.tabOutfits') },
            {
              value: 'pets',
              symbol: <img src="/pets/paw-button.webp" alt="" className="inline size-8" />,
              label: t('shop.tabPets'),
            },
            { value: 'stickers', symbol: '📒', label: t('shop.tabStickers') },
          ]}
          value={tab}
          onChange={(next) => setParams(next === 'outfits' ? {} : { tab: next }, { replace: true })}
          label={t('shop.tabs')}
          idBase="shop"
        />
      </div>

      {tab !== 'stickers' ? (
        <div
          {...tabPanelProps('shop', tab)}
          className="flex flex-1 flex-col items-center gap-6 lg:flex-row lg:items-start"
        >
          <div className="flex w-full flex-col items-center gap-3 rounded-[32px] bg-surface p-4 shadow-[0_6px_0_var(--color-line)] lg:sticky lg:top-0 lg:w-80">
            <Mascot
              wearing={shownWearing}
              robotClassName={clsx('w-32 sm:w-44', roaming && 'invisible')}
              robotRoam="shop-frame"
              bubbleSide="right"
              className="w-full max-w-md lg:flex-col"
            />
            {roaming && (
              <button
                type="button"
                onClick={() => {
                  setRoaming(false)
                  setLastTap((count) => count + 1)
                }}
                className="-mt-24 rounded-full bg-primary-soft px-4 py-2 font-display font-bold text-primary-ink sm:-mt-32"
              >
                <span aria-hidden="true">👋 </span>
                {t('shop.callRobot')}
              </button>
            )}
            <p className="text-center text-lg text-ink-soft">
              {tab === 'pets' ? t('shop.petsHint') : t('shop.outfitsHint')}
            </p>
          </div>

          {roaming && (
            <RoamingMascot
              model={model}
              wearing={wearing}
              mode="climb"
              group="shop"
              startAt="shop-frame"
              size={128}
            />
          )}
          {tab === 'pets' ? (
            <PetsPanel />
          ) : (
            <ul className="grid w-full flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
              {OUTFITS.map((outfit) => (
                <li key={outfit.id} data-roam="shop">
                  <OutfitCard
                    outfit={outfit}
                    owned={outfits.includes(outfit.id)}
                    worn={wearing[outfit.slot] === outfit.id}
                    coins={coins}
                    onSelect={() => select(outfit)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div {...tabPanelProps('shop', 'stickers')} className="flex flex-1 flex-col gap-4">
          <StickerAlbum owned={stickers} />
        </div>
      )}

      {pending && (
        <BuyDialog
          outfit={pending}
          model={model}
          wearing={shownWearing}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        />
      )}
    </Screen>
  )
}
