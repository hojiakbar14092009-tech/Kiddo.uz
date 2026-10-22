import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Picture } from '@/components/ui/Picture'
import { PICTURE_FILES } from '@/content/pictures'
import { canRender3D } from '@/features/mascot/webgl'

const PictureModel3D = lazy(() => import('./three/PictureModel3D'))

/**
 * The letter’s picture as a 3D object the child can spin with a finger.
 * Devices without WebGL (or very weak ones) keep the flat picture.
 */
export function PictureViewer({ emoji, word }: { emoji: string; word: string }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const file = PICTURE_FILES[emoji]
  const [failed, setFailed] = useState<string | null>(null)
  const onFail = useCallback(() => setFailed(emoji), [emoji])
  const flat = <Picture emoji={emoji} alt={word} className="size-full" />

  if (!file || failed === emoji || !canRender3D()) return flat
  return (
    <div className="relative size-full">
      {/* a 3D crash or a model that fails to load falls back to the flat picture */}
      <ErrorBoundary fallback={flat} onError={onFail}>
        <Suspense fallback={flat}>
          <PictureModel3D
            key={file}
            file={file}
            label={t('letter.model3d', { word })}
            reducedMotion={reduceMotion}
            onFail={onFail}
          />
        </Suspense>
      </ErrorBoundary>
      <span className="pointer-events-none absolute right-0 bottom-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-bold text-primary-ink">
        <span aria-hidden="true">🔄 </span>
        {t('letter.spin')}
      </span>
    </div>
  )
}
