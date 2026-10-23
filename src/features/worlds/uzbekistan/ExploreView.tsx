import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Explorer3D } from '@/components/explorer3d'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Img3D } from '@/components/ui/Img3D'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { useSpeakable } from '@/features/learn/speakable'
import { tDynamic } from '@/lib/tDynamic'
import { useLanguage } from '@/store/settingsStore'
import { EXPLORE, isLandmark, type ExploreId } from './content'
import { UZ_MODELS } from './explorerModels'
import { HUB } from './useGameRun'

/**
 * One explore card: the 3D model (or a picture for a tradition), its points
 * with a short sentence each, and three facts. Nothing is scored here.
 */
export function ExploreView({ id }: { id: ExploreId }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const item = EXPLORE[id]
  const [active, setActive] = useState<string | null>(null)
  const name = item.name[language]
  const facts = item.facts.map((fact) => fact[language])
  const spot = item.hotspots.find((point) => point.id === active) ?? null
  const spotText = spot ? spot.text[language] : null

  useSpeakable([name, item.tag[language], ...facts, spotText])

  return (
    <Screen header={<TitleTopBar title={name} back={HUB} />}>
      <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 content-start gap-4 px-4 pt-3 pb-8 sm:gap-6 sm:px-6 md:grid-cols-2 short:grid-cols-[minmax(0,42%)_minmax(0,1fr)] short:gap-4 short:py-2">
        <div className="flex flex-col items-center gap-3 short:gap-2">
          {isLandmark(id) ? (
            <Explorer3D
              model={UZ_MODELS[id]}
              label={t('uzbekistan.model', { name })}
              onHotspot={(point) => setActive((now) => (now === point ? null : point))}
              activeHotspot={active}
              className="mx-auto max-w-md short:max-w-[calc(100dvh-9rem)]"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-xs items-center justify-center rounded-panel bg-coin-soft p-8 short:max-w-48 short:p-4">
              <Img3D name={item.picture ?? 'sparkles'} eager className="size-full" />
            </div>
          )}
          <div aria-live="polite" className="w-full max-w-md">
            {spot && spotText && (
              <p
                data-testid="uz-point-text"
                className="animate-fade-in rounded-card bg-primary-soft p-3 text-center text-lg leading-snug short:p-2 short:text-base"
              >
                <span className="font-display font-extrabold text-primary-ink">
                  {tDynamic(t, `uzbekistan.hotspots.${id}.${spot.id}`)}:
                </span>{' '}
                {spotText}
              </p>
            )}
          </div>
        </div>

        <section aria-labelledby="uz-facts" className="flex flex-col gap-3 short:gap-2">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-ink-soft short:text-sm">
                {item.tag[language]}
              </p>
              <h2
                id="uz-facts"
                className="font-display text-2xl font-extrabold sm:text-3xl short:text-xl"
              >
                {t('uzbekistan.facts')}
              </h2>
            </div>
            <SpeakButton fallback={facts} />
          </div>
          <ol className="flex flex-col gap-3 short:gap-2" data-testid="uz-facts">
            {facts.map((fact, index) => (
              <li
                key={index}
                className="flex items-start gap-3 rounded-card bg-surface p-3 shadow-press sm:p-4 short:p-2"
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-coin font-display text-lg font-extrabold"
                >
                  {index + 1}
                </span>
                <p className="text-lg leading-snug sm:text-xl short:text-base">{fact}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Screen>
  )
}
