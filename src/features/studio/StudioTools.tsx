import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EraserIcon,
  MinusIcon,
  PictureIcon,
  PlusIcon,
  RedoIcon,
  SaveIcon,
  StickerIcon,
  TrashIcon,
  UndoIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { canRedo, canUndo } from './history'
import { BRUSH_SIZES, hasEnoughToSave, PALETTE, STICKER_SIZE } from './studioDoc'
import type { StudioAction, StudioState } from './studioState'

/** A square tool button, at least 48px, with its name for screen readers and a tooltip. */
export function ToolButton({
  label,
  pressed,
  className,
  children,
  ...rest
}: {
  label: string
  pressed?: boolean
  children: ReactNode
} & Omit<React.ComponentProps<'button'>, 'aria-label' | 'aria-pressed'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={clsx(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 bg-surface text-ink transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100 sm:size-14 short:size-12',
        pressed ? 'border-primary bg-primary-soft text-primary-ink' : 'border-line-strong',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

interface StudioToolsProps {
  state: StudioState
  dispatch: (action: StudioAction) => void
  saving: boolean
  onStickers: () => void
  onBackgrounds: () => void
  onClear: () => void
  onSave: () => void
  className?: string
}

/** Colours, brush sizes, eraser, stickers, background, undo/redo, clear and save. */
export function StudioTools({
  state,
  dispatch,
  saving,
  onStickers,
  onBackgrounds,
  onClear,
  onSave,
  className,
}: StudioToolsProps) {
  const { t } = useTranslation()
  const doc = state.history.present
  const brushColor = PALETTE.find((entry) => entry.id === state.color)?.color ?? '#3A2E4D'
  const selected = doc.stickers.find((sticker) => sticker.id === state.selected)

  return (
    <div className={clsx('flex flex-col gap-3 short:gap-2', className)}>
      <div
        role="group"
        aria-label={t('studio.colors.title')}
        className="grid grid-cols-5 justify-items-center gap-2"
      >
        {PALETTE.map((entry) => {
          const active = state.tool === 'brush' && state.color === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              aria-label={t(`studio.colors.${entry.id}`)}
              title={t(`studio.colors.${entry.id}`)}
              aria-pressed={active}
              onClick={() => dispatch({ type: 'color', color: entry.id })}
              className={clsx(
                'size-12 rounded-full border-4 transition-transform active:scale-95 sm:size-14 short:size-12',
                active ? 'scale-110 border-ink' : 'border-surface shadow-press-sm',
              )}
              style={{ backgroundColor: entry.color }}
            />
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {BRUSH_SIZES.map((brush, index) => (
          <ToolButton
            key={brush.id}
            label={t(`studio.sizes.${brush.id}`)}
            pressed={state.brush === brush.id}
            onClick={() => dispatch({ type: 'brush', brush: brush.id })}
          >
            <span
              aria-hidden="true"
              className="rounded-full"
              style={{
                width: 8 + index * 8,
                height: 8 + index * 8,
                backgroundColor: state.tool === 'eraser' ? '#B8AC9A' : brushColor,
              }}
            />
          </ToolButton>
        ))}
        <ToolButton
          label={t('studio.eraser')}
          pressed={state.tool === 'eraser'}
          onClick={() =>
            dispatch({ type: 'tool', tool: state.tool === 'eraser' ? 'brush' : 'eraser' })
          }
        >
          <EraserIcon size={26} />
        </ToolButton>
        <ToolButton label={t('studio.stickersButton')} onClick={onStickers}>
          <StickerIcon size={26} />
        </ToolButton>
        <ToolButton label={t('studio.backgroundButton')} onClick={onBackgrounds}>
          <PictureIcon size={26} />
        </ToolButton>
      </div>

      {selected && (
        <div
          role="group"
          aria-label={t('studio.stickerTools')}
          className="flex items-center justify-center gap-2 rounded-card bg-primary-soft p-2 animate-fade-in"
        >
          <ToolButton
            label={t('studio.smaller')}
            disabled={selected.size <= STICKER_SIZE.min + 0.001}
            onClick={() => dispatch({ type: 'resizeSticker', factor: 1 / STICKER_SIZE.step })}
          >
            <MinusIcon size={26} />
          </ToolButton>
          <ToolButton
            label={t('studio.bigger')}
            disabled={selected.size >= STICKER_SIZE.max - 0.001}
            onClick={() => dispatch({ type: 'resizeSticker', factor: STICKER_SIZE.step })}
          >
            <PlusIcon size={26} />
          </ToolButton>
          <ToolButton
            label={t('studio.removeSticker')}
            onClick={() => dispatch({ type: 'removeSticker' })}
          >
            <TrashIcon size={26} />
          </ToolButton>
        </div>
      )}

      {/* pinned to the bottom edge, so Save is never below the fold on a small phone */}
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-center gap-2 bg-cream px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] short:static short:pb-0">
        <ToolButton
          label={t('studio.undo')}
          disabled={!canUndo(state.history)}
          onClick={() => dispatch({ type: 'undo' })}
        >
          <UndoIcon size={26} />
        </ToolButton>
        <ToolButton
          label={t('studio.redo')}
          disabled={!canRedo(state.history)}
          onClick={() => dispatch({ type: 'redo' })}
        >
          <RedoIcon size={26} />
        </ToolButton>
        <ToolButton
          label={t('studio.clear')}
          disabled={doc.strokes.length === 0 && doc.stickers.length === 0}
          onClick={onClear}
        >
          <TrashIcon size={26} />
        </ToolButton>
        <Button
          size="md"
          className="min-w-0 flex-1 short:min-h-12 short:px-4 short:text-lg"
          icon={<SaveIcon size={24} />}
          disabled={saving || !hasEnoughToSave(doc)}
          onClick={onSave}
        >
          {t('studio.save')}
        </Button>
      </div>
    </div>
  )
}
