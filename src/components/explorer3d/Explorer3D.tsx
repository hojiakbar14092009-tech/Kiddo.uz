import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { MinusIcon, PlusIcon, RotateIcon, UndoIcon } from '@/components/icons'
import { tDynamic } from '@/lib/tDynamic'
import { ExplorerRemote, KEY_ZOOM } from './orbit'
import { explorerSupport, type ExplorerSupport } from './support'
import type { ExplorerModelDef } from './types'
import { useContent3D } from '@/components/three/content3d'

// three.js and R3F load only with the 3D view, never with the page that shows the explorer
const ExplorerView = lazy(() => import('./ExplorerView'))

export interface Explorer3DProps {
  model: ExplorerModelDef
  /** What the model shows, e.g. "Tiranozavr" (the picture's alt and the canvas's name). */
  label: string
  onHotspot?: (id: string) => void
  activeHotspot?: string | null
  className?: string
}

type Mode = 'still' | '3d' | 'failed'

/**
 * The reusable 3D Explorer of the worlds. The still picture shows at once;
 * the turning model opens by itself on capable devices (not with "save
 * data"), otherwise with the "Turn in 3D" button. Without WebGL, on a lost
 * context or a model that fails to build it stays on the picture with a
 * short note. Hotspots are big numbered buttons on the model, and a row of
 * buttons under the picture when there is no 3D, so every fact stays reachable.
 */
export function Explorer3D({ model, label, onHotspot, activeHotspot, className }: Explorer3DProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion() ?? false
  const [support] = useState<ExplorerSupport>(explorerSupport)
  // the mode belongs to one model: another model starts again from its own picture
  const [state, setState] = useState<{ id: string; mode: Mode }>(() => ({
    id: model.id,
    mode: support.auto ? '3d' : 'still',
  }))
  const mode: Mode = state.id === model.id ? state.mode : support.auto ? '3d' : 'still'
  const setMode = useCallback((next: Mode) => setState({ id: model.id, mode: next }), [model.id])
  const fail = useCallback(() => setMode('failed'), [setMode])
  // the zoom and reset buttons live here, outside the lazy 3D view
  const remote = useMemo(() => new ExplorerRemote(model.id), [model.id])
  const control = (change: (orbit: ExplorerRemote['orbit']) => void) => () => {
    change(remote.orbit)
    remote.redraw()
  }
  const hotspots = model.hotspots ?? []
  useContent3D(mode === '3d')

  const still = (
    <img
      src={model.still}
      alt={label}
      draggable={false}
      decoding="async"
      data-testid="explorer-still"
      className="size-full object-contain select-none"
    />
  )

  return (
    <figure
      className={clsx('flex w-full flex-col items-center gap-2', className)}
      data-testid="explorer"
      data-mode={mode}
    >
      <div className="relative aspect-square w-full">
        {mode === '3d' ? (
          <ErrorBoundary key={model.id} fallback={still} onError={fail}>
            <Suspense fallback={still}>
              <ExplorerView
                key={model.id}
                model={model}
                label={label}
                quality={support.quality}
                reducedMotion={reducedMotion}
                onHotspot={onHotspot}
                activeHotspot={activeHotspot}
                onFail={fail}
                placeholder={still}
                remote={remote}
              />
            </Suspense>
          </ErrorBoundary>
        ) : (
          still
        )}
      </div>

      {mode !== '3d' && hotspots.length > 0 && (
        <ul className="flex flex-wrap justify-center gap-2" aria-label={t('explorer3d.points')}>
          {hotspots.map((spot, index) => {
            const name = tDynamic(t, spot.labelKey)
            return (
              <li key={spot.id}>
                <button
                  type="button"
                  aria-pressed={activeHotspot === spot.id}
                  data-testid={`hotspot-${spot.id}`}
                  onClick={() => onHotspot?.(spot.id)}
                  className={clsx(
                    'flex min-h-12 items-center gap-2 rounded-full py-1 pr-4 pl-1 font-display text-lg font-bold shadow-press-sm',
                    activeHotspot === spot.id ? 'bg-primary text-white' : 'bg-surface text-ink',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'flex size-10 items-center justify-center rounded-full text-xl font-extrabold',
                      activeHotspot === spot.id ? 'bg-white text-primary-ink' : 'bg-coin',
                    )}
                  >
                    {index + 1}
                  </span>
                  {name}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <figcaption className="flex flex-col items-center gap-2 text-center text-base text-ink-soft">
        {mode === 'still' && support.webgl && (
          <button
            type="button"
            onClick={() => setMode('3d')}
            data-testid="explorer-open-3d"
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-display text-lg font-bold text-white shadow-press-primary active:translate-y-1"
          >
            <RotateIcon size={24} />
            {t('explorer3d.turn3d')}
          </button>
        )}
        {mode === '3d' && (
          <span className="flex items-center gap-2">
            {[
              {
                key: 'zoomIn',
                icon: <PlusIcon size={24} />,
                run: control((o) => o.zoomBy(KEY_ZOOM)),
              },
              {
                key: 'zoomOut',
                icon: <MinusIcon size={24} />,
                run: control((o) => o.zoomBy(1 / KEY_ZOOM)),
              },
              { key: 'reset', icon: <UndoIcon size={24} />, run: control((o) => o.reset()) },
            ].map((button) => {
              const name = tDynamic(t, `explorer3d.${button.key}`)
              return (
                <button
                  key={button.key}
                  type="button"
                  aria-label={name}
                  title={name}
                  data-testid={`explorer-${button.key}`}
                  onClick={button.run}
                  className="flex size-12 items-center justify-center rounded-full bg-surface text-ink shadow-press-sm active:translate-y-0.5"
                >
                  {button.icon}
                </button>
              )
            })}
          </span>
        )}
        {mode === '3d' && <span className="short:hidden">{t('explorer3d.hint')}</span>}
        {mode === 'failed' && (
          <span role="status" data-testid="explorer-note">
            {t('explorer3d.failed')}
          </span>
        )}
        {mode === 'still' && !support.webgl && (
          <span data-testid="explorer-note">{t('explorer3d.pictureOnly')}</span>
        )}
      </figcaption>
    </figure>
  )
}
