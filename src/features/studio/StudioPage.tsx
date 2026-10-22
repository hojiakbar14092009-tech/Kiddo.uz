import { useEffect, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AlbumIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { BottomSheet, Dialog } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { Img3D } from '@/components/ui/Img3D'
import { toast } from '@/components/ui/toast'
import { emitActivity } from '@/domain/universe'
import { newId } from '@/lib/id'
import { useChildKey } from '@/store/progressStore'
import { studioGallery } from './gallery'
import { backgroundCss, flattenDoc } from './renderStudio'
import { StudioBoard } from './StudioBoard'
import {
  BACKGROUNDS,
  BRUSH_SIZES,
  ERASER_SCALE,
  hasEnoughToSave,
  PALETTE,
  STICKERS,
} from './studioDoc'
import { initialStudio, studioReducer } from './studioState'
import { StudioTools } from './StudioTools'

type Sheet = 'stickers' | 'backgrounds' | 'clear' | null

interface Saved {
  url: string
  stars: number
  crystals: number
}

/**
 * `/studio`: draw, add stickers, pick a background and save the picture to
 * the child's gallery. Every saved picture is one finished art activity.
 */
export function StudioPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const childKey = useChildKey()
  const [state, dispatch] = useReducer(studioReducer, undefined, initialStudio)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<Saved | null>(null)
  const keepButton = useRef<HTMLButtonElement>(null)
  const doc = state.history.present

  useEffect(
    () => () => {
      if (saved) URL.revokeObjectURL(saved.url)
    },
    [saved],
  )

  const brush = BRUSH_SIZES.find((entry) => entry.id === state.brush) ?? BRUSH_SIZES[1]
  const pen = {
    color: PALETTE.find((entry) => entry.id === state.color)?.color ?? '#3A2E4D',
    size: state.tool === 'eraser' ? brush.size * ERASER_SCALE : brush.size,
    erase: state.tool === 'eraser',
  }

  const save = async () => {
    if (saving) return
    if (!hasEnoughToSave(doc)) return
    if (state.saved === doc) {
      toast(t('studio.alreadySaved'))
      return
    }
    setSaving(true)
    try {
      const image = await flattenDoc(doc)
      if (!image) throw new Error('This browser cannot draw the picture')
      const { work, removed } = await studioGallery().save(childKey, newId(), image)
      if (removed > 0) toast(t('studio.oldestRemoved', { count: removed }), 'warning', 6000)
      let reward = { stars: 0, crystals: 0 }
      try {
        const gained = emitActivity({
          id: work.id,
          childKey,
          activity: 'studio:creation',
          strand: 'art',
          correct: 1,
          total: 1,
          independent: 1,
        })
        reward = { stars: gained.stars, crystals: gained.crystals }
      } catch {
        // the picture is saved either way
      }
      dispatch({ type: 'saved', doc })
      setSaved({ url: URL.createObjectURL(work.image), ...reward })
    } catch {
      toast(t('studio.saveFailed'), 'warning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Screen
      header={
        <TitleTopBar
          title={t('studio.title')}
          showBack={false}
          extra={
            <IconButton label={t('studio.gallery')} onClick={() => navigate('/studio/gallery')}>
              <AlbumIcon size={26} />
            </IconButton>
          }
        />
      }
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-4 px-3 pt-1 pb-4 sm:px-6 landscape:flex-row landscape:items-start landscape:justify-center short:gap-3 short:py-1.5">
        <StudioBoard
          className="max-w-[min(56rem,calc((100dvh-22rem)*4/3))] landscape:max-w-[calc((100dvh-7rem)*4/3)] short:max-w-[calc((100dvh-6rem)*4/3)]"
          doc={doc}
          pen={pen}
          selected={state.selected}
          onStroke={(stroke) => dispatch({ type: 'stroke', stroke })}
          onStickerChange={(sticker) => dispatch({ type: 'updateSticker', sticker })}
          onSelect={(id) => dispatch({ type: 'select', id })}
        />
        <StudioTools
          className="w-full max-w-md landscape:w-80 landscape:shrink-0 short:w-[22rem]"
          state={state}
          dispatch={dispatch}
          saving={saving}
          onStickers={() => setSheet('stickers')}
          onBackgrounds={() => setSheet('backgrounds')}
          onClear={() => setSheet('clear')}
          onSave={() => void save()}
        />
      </div>

      {sheet === 'stickers' && (
        <BottomSheet title={t('studio.stickersTitle')} onClose={() => setSheet(null)} dismissible>
          <ul className="grid grid-cols-4 gap-2 sm:gap-3">
            {STICKERS.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  aria-label={t(`studio.stickers.${name}`)}
                  className="flex aspect-square w-full items-center justify-center rounded-tile bg-cream p-2 transition-transform active:scale-95"
                  onClick={() => {
                    dispatch({ type: 'addSticker', name, id: newId() })
                    setSheet(null)
                  }}
                >
                  <Img3D name={name} className="size-full max-h-20" eager />
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}

      {sheet === 'backgrounds' && (
        <BottomSheet title={t('studio.backgroundTitle')} onClose={() => setSheet(null)} dismissible>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {BACKGROUNDS.map((background) => (
              <li key={background.id}>
                <button
                  type="button"
                  aria-pressed={doc.background === background.id}
                  className="flex w-full flex-col items-center gap-1 font-bold"
                  onClick={() => {
                    dispatch({ type: 'background', background: background.id })
                    setSheet(null)
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={
                      doc.background === background.id
                        ? 'aspect-[4/3] w-full rounded-tile border-4 border-primary'
                        : 'aspect-[4/3] w-full rounded-tile border-4 border-line-strong'
                    }
                    style={backgroundCss(background.id)}
                  />
                  {t(`studio.backgrounds.${background.id}`)}
                </button>
              </li>
            ))}
          </ul>
        </BottomSheet>
      )}

      {sheet === 'clear' && (
        <Dialog
          role="alertdialog"
          dismissible={false}
          initialFocus={keepButton}
          title={t('studio.clearTitle')}
          description={t('studio.clearText')}
          onClose={() => setSheet(null)}
          size="sm"
        >
          <div className="flex w-full flex-wrap justify-center gap-3">
            <Button ref={keepButton} variant="soft" size="md" onClick={() => setSheet(null)}>
              {t('studio.clearNo')}
            </Button>
            <Button
              variant="oops"
              size="md"
              onClick={() => {
                dispatch({ type: 'clear' })
                setSheet(null)
              }}
            >
              {t('studio.clearYes')}
            </Button>
          </div>
        </Dialog>
      )}

      {saved && (
        <Dialog
          title={t('studio.savedTitle')}
          onClose={() => setSaved(null)}
          dismissible
          media={
            <img
              src={saved.url}
              alt={t('studio.savedPicture')}
              className="aspect-[4/3] w-56 rounded-card object-cover shadow-press short:hidden"
            />
          }
          testId="studio-saved"
        >
          <div className="flex flex-col items-center gap-4 short:gap-2">
            <ActivityReward stars={saved.stars} crystals={saved.crystals} />
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="soft" size="md" onClick={() => navigate('/studio/gallery')}>
                {t('studio.gallery')}
              </Button>
              <Button
                size="md"
                onClick={() => {
                  dispatch({ type: 'new' })
                  setSaved(null)
                }}
              >
                {t('studio.newPicture')}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </Screen>
  )
}
