import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AlbumIcon, PawIcon, ShirtIcon } from '@/components/icons'
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
import type { PetId } from '@/features/pets/pets'

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
  // A pet on trial stands next to the robot before it is bought.
  const [previewPet, setPreviewPet] = useState<PetId | null>(null)
  const shownPet = tab === 'pets' && previewPet ? previewPet : undefined

  useEffect(() => reset, [reset])

  // The robot does not sit still: a few seconds after the last tap it climbs
  // out of its frame and plays on the items; any tap calls it back to show them on.
  const [roaming, setRoaming] = useState(false)
  const [lastTap, setLastTap] = useState(0)
  useEffect(() => {
    if (roaming || pending || shownPet || tab === 'stickers') return undefined
    const timer = setTimeout(() => setRoaming(true), 4000)
    return () => clearTimeout(timer)
  }, [roaming, pending, shownPet, tab, lastTap])

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
            { value: 'outfits', symbol: <ShirtIcon size={28} />, label: t('shop.tabOutfits') },
            { value: 'pets', symbol: <PawIcon size={28} />, label: t('shop.tabPets') },
            { value: 'stickers', symbol: <AlbumIcon size={28} />, label: t('shop.tabStickers') },
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
          <div className="flex w-full flex-col items-center gap-3 rounded-card bg-surface p-4 shadow-press lg:sticky lg:top-0 lg:w-80">
            <Mascot
              wearing={shownWearing}
              robotClassName={clsx('w-32 sm:w-44', roaming && 'invisible')}
              robotRoam="shop-frame"
              pet={shownPet}
              bubbleSide="right"
              className="w-full max-w-md lg:flex-col"
              // Beside the robot's (empty) frame, not under it: the robot starts
              // its walk from the frame, so the button is never hidden behind it
              // (on phones and tablets it stays in front of the robot while it hops past;
              // on wide screens the sticky column is its own layer, but the robot never
              // takes taps, so the button always works).
              aside={
                roaming ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRoaming(false)
                      setLastTap((count) => count + 1)
                    }}
                    className="relative z-[16] min-h-12 animate-fade-in rounded-card bg-primary-soft px-4 py-2 text-center font-display text-lg leading-tight font-bold text-primary-ink shadow-press-sm active:translate-y-0.5 active:shadow-none"
                  >
                    <span aria-hidden="true">👋 </span>
                    {t('shop.callRobot')}
                  </button>
                ) : undefined
              }
            />
            {shownPet && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="rounded-full bg-coin px-3 py-1 font-bold">
                  👀 {t('shop.petTrying')}: {t(`shop.pets.${shownPet}`)}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewPet(null)}
                  className="rounded-full bg-cream px-3 py-1 font-bold text-ink-soft"
                >
                  {t('shop.petStopTry')}
                </button>
              </div>
            )}
            <p className="text-center text-lg text-ink-soft">
              {tab === 'pets'
                ? shownPet
                  ? t('shop.petTryHint')
                  : `${t('shop.petsHint')} ${t('shop.petBondHint')}`
                : t('shop.outfitsHint')}
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
            <PetsPanel
              previewing={previewPet}
              onPreview={(pet) => {
                setPreviewPet(pet)
                setRoaming(false)
                setLastTap((count) => count + 1)
              }}
            />
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
