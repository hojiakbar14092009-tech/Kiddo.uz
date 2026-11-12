import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { useRewardStore } from '@/domain/rewards/rewardStore'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { dayKey } from '@/features/tasks/rules'
import { tDynamic } from '@/lib/tDynamic'
import { useActiveChild } from '@/store/familyStore'
import { useChildKey } from '@/store/progressStore'
import { FindPicture } from './FindPicture'
import { FIND_ROUND, praiseKeyFor, promptsForDay } from './prompts'
import { FIND_HOME_PAID_PER_DAY, paidFindsOn, rewardFound, type FindOutcome } from './reward'

/**
 * «Uyda top» (Phase 49): the robot asks the child to show one real thing at
 * home (point to it, not fetch it: said with every prompt), and the child
 * presses the big "Found it!" button. Nothing is photographed or uploaded:
 * the child's word is enough. The first three finds of a day pay nuts, each
 * prompt once (reward.ts); after that the robot only praises.
 */
export function FindHomePage() {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const child = useActiveChild()
  const { say } = useLearnMascot()
  // the day is fixed when the page opens (a page left open past midnight keeps its day)
  const [day] = useState(() => dayKey())
  const prompts = promptsForDay(day)
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<{
    childKey: string
    id: string
    outcome: FindOutcome
    nuts: number
  } | null>(null)
  // re-render when this child's ledger changes (a reward was written)
  useRewardStore((state) => state.byChild[childKey])

  const prompt = prompts[index % prompts.length]!
  const sentence = tDynamic(t, `findHome.say.prompts.${prompt.id}`)
  const paid = paidFindsOn(childKey, day)
  // a result belongs to the prompt and the child it was given to
  const shown = result?.id === prompt.id && result.childKey === childKey ? result : null
  // the first prompt is introduced; every prompt reminds: show it, do not fetch it
  const lines = [index === 0 ? t('findHome.say.intro') : null, sentence, t('findHome.say.safe')]

  const found = () => {
    const { outcome, nuts } = rewardFound(childKey, prompt.id, day)
    setResult({ childKey, id: prompt.id, outcome, nuts })
    say('correct', { text: t(praiseKeyFor(prompt)), emoji: '🎉' })
  }

  const next = () => {
    setResult(null)
    setIndex((value) => value + 1)
  }

  const status = !shown
    ? ''
    : shown.outcome === 'paid'
      ? t('findHome.nutsWon', { nuts: shown.nuts })
      : shown.outcome === 'capped'
        ? t('findHome.capped')
        : t('findHome.already')

  if (index >= FIND_ROUND)
    return (
      <LearnShell title={t('findHome.title')} speak={[t('findHome.say.praise1')]}>
        <section
          data-testid="find-done"
          className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[36px] bg-surface p-6 text-center shadow-[0_8px_0_var(--color-line)]"
        >
          <p className="text-5xl" aria-hidden="true">
            🎉
          </p>
          <h2 className="font-display text-2xl font-extrabold">
            {t('findHome.roundDone', { count: FIND_ROUND })}
          </h2>
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              variant="coin"
              className="w-full"
              onClick={() => setIndex(0)}
              data-testid="find-again"
            >
              {t('reward.again')}
            </Button>
            <LinkButton to="/home" variant="soft" className="w-full">
              {t('reward.home')}
            </LinkButton>
          </div>
        </section>
      </LearnShell>
    )

  return (
    <LearnShell title={t('findHome.title')} speak={lines}>
      <section
        data-testid="find-home"
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[36px] bg-surface p-4 text-center shadow-[0_8px_0_var(--color-line)] sm:gap-5 sm:p-6"
      >
        <p className="font-display text-lg font-bold" data-testid="find-step">
          {t('findHome.step', { n: index + 1, total: FIND_ROUND })}
        </p>
        <p className="text-sm font-semibold text-ink-soft sm:text-base" data-testid="find-progress">
          {t('findHome.progress', {
            found: Math.min(paid, FIND_HOME_PAID_PER_DAY),
            total: FIND_HOME_PAID_PER_DAY,
          })}
        </p>
        <div
          key={prompt.id}
          className="flex items-center justify-center rounded-[32px] bg-sky-soft p-3 motion-safe:animate-pop-in"
        >
          <FindPicture prompt={prompt} label={t('findHome.pictureLabel')} />
        </div>
        <h2
          data-testid="find-prompt"
          className="font-display text-2xl leading-tight font-extrabold [overflow-wrap:anywhere] sm:text-3xl"
        >
          {sentence}
        </h2>
        <p className="font-display text-lg font-bold text-primary-ink" data-testid="find-safe">
          {t('findHome.say.safe')}
        </p>
        {/* always there, so screen readers hear each new result */}
        <p
          role="status"
          data-testid="find-result"
          data-outcome={shown?.outcome}
          className={clsx(
            'flex min-h-12 items-center gap-2 rounded-full px-4 py-2 font-display text-lg font-bold empty:bg-transparent',
            shown?.outcome === 'paid'
              ? 'bg-coin-soft text-ink'
              : 'bg-primary-soft text-primary-ink',
          )}
        >
          {shown?.outcome === 'paid' && <CoinIcon size={28} aria-hidden="true" />}
          {status}
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button
            variant="coin"
            className="min-h-16 w-full text-2xl"
            onClick={found}
            data-testid="find-found"
          >
            {child?.gender === 'girl' ? t('findHome.foundGirl') : t('findHome.found')}
          </Button>
          <Button variant="soft" className="w-full" onClick={next} data-testid="find-next">
            {t('findHome.next')}
          </Button>
        </div>
        <p className="text-sm text-ink-soft">{t('findHome.safety')}</p>
        <p className="text-xs text-ink-soft" data-testid="find-parent-note">
          {t('findHome.parentNote')}
        </p>
      </section>
    </LearnShell>
  )
}
