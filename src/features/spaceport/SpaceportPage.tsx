import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ResourceIcon } from '@/components/reward/ResourceIcon'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { RewardBurst } from '@/components/ui/RewardBurst'
import { toast } from '@/components/ui/toast'
import { useResources, useWorld } from '@/domain/universe'
import { useUnlockNeeds, useWorldProgress } from '@/domain/universe/progression'
import { QuestNeeds } from '@/features/city/QuestNeeds'
import { costRows } from '@/features/city/cityModel'
import { useState } from 'react'

/**
 * The Spaceport: the rocket is built with what maths earned (a crystal and a
 * part) and takes the child to Mars. Building it is the city's normal
 * upgrade (the same price list as the server's); the flight opens because
 * the connected world says so (progression rules), not because of this page.
 */
export function SpaceportPage() {
  const { t } = useTranslation()
  const { buildings, upgrade } = useWorld()
  const balances = useResources()
  const { isUnlocked } = useWorldProgress()
  const [justBuilt, setJustBuilt] = useState(false)
  const port = buildings.find((building) => building.id === 'spaceport')
  const level = port?.level ?? 0
  const marsOpen = isUnlocked('mars')
  const rows = port && level === 0 ? costRows(port, balances) : []
  const ready = rows.length > 0 && rows.every((row) => row.missing === 0)
  // what is still missing, said plainly (the unlock rules and the server's price list)
  const needs = useUnlockNeeds('mars')

  const build = () => {
    if (upgrade('spaceport') === 'ok') {
      setJustBuilt(true)
      toast(t('spaceport.built'), 'success')
    }
  }

  const rocket = (
    <span className="flex size-40 items-center justify-center rounded-card bg-sky-soft sm:size-48 short:size-28">
      <Img3D name="rocket" className="size-[80%]" eager />
    </span>
  )

  return (
    <Screen
      header={<TitleTopBar title={t('spaceport.title')} back="/home" />}
      className="items-center gap-5 px-4 py-6 text-center sm:py-8 short:gap-3 short:py-3"
    >
      {justBuilt ? <RewardBurst pieces={10}>{rocket}</RewardBurst> : rocket}
      <p className="font-display text-2xl font-extrabold" data-testid="rocket-level">
        {level > 0 ? t('spaceport.rocketLevel', { level }) : t('spaceport.notBuilt')}
      </p>

      {level === 0 && (
        <section className="flex w-full max-w-md flex-col items-center gap-3">
          <p className="text-lg text-ink-soft">{t('spaceport.buildText')}</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {rows.map((row) => (
              <li
                key={row.resource}
                className="flex min-h-11 items-center gap-2 rounded-full bg-cream px-3 py-1 font-display text-lg font-extrabold tabular-nums"
              >
                <ResourceIcon resource={row.resource} size={28} />
                {t('city.have', { have: row.have, need: row.need })}
              </li>
            ))}
          </ul>
          {ready ? (
            <Button variant="coin" onClick={build} data-testid="build-rocket">
              {t('spaceport.build')}
            </Button>
          ) : (
            <>
              <QuestNeeds needs={needs} className="justify-center" />
              <p className="text-base font-semibold text-ink-soft">{t('spaceport.howToEarn')}</p>
              <LinkButton to="/math-lab" variant="soft" size="md">
                {t('spaceport.toMathLab')}
              </LinkButton>
            </>
          )}
        </section>
      )}

      {marsOpen && (
        <section className="flex w-full max-w-md flex-col items-center gap-3">
          <p className="text-lg text-ink-soft">{t('spaceport.built')}</p>
          <LinkButton
            to="/spaceport/mars"
            icon={<Img3D name="space/mars" className="size-9" />}
            data-testid="fly-mars"
          >
            {t('spaceport.fly')}
          </LinkButton>
        </section>
      )}
    </Screen>
  )
}
