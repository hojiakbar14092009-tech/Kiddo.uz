import { motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CoinIcon, HomeIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Img3D } from './Img3D'
import type { FinishedSession } from './useLearnSession'
import { useLearnMascot } from './useLearnMascot'

/**
 * The end of a short check: how many answers were right on the child's own,
 * how many needed help, a kind word, and coins (given once per session). It
 * is a quick check, so it never claims a skill is fully mastered.
 */
export function LearnResult({ result, onAgain }: { result: FinishedSession; onAgain: () => void }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { say } = useLearnMascot()
  const { summary, coins } = result
  const allOwn = summary.independent === summary.total
  const kind = allOwn
    ? t('learn.result.great')
    : `${t('learn.result.great')} ${t('learn.result.practice')}`

  useEffect(() => {
    say(allOwn ? 'celebrate' : 'greet', { text: kind, emoji: allOwn ? '🏆' : '💪' })
  }, [allOwn, kind, say])

  return (
    <section
      aria-labelledby="learn-result-title"
      className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-[36px] bg-surface p-6 text-center shadow-[0_8px_0_var(--color-line)]"
    >
      <motion.div
        initial={reduceMotion ? false : { scale: 0.4, rotate: -10, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 13 }}
      >
        <Img3D name={allOwn ? 'trophy' : 'glowing-star'} className="size-28" eager />
      </motion.div>
      <h2 id="learn-result-title" className="font-display text-3xl font-extrabold">
        {t('learn.result.title')}
      </h2>
      <p className="font-display text-2xl font-bold text-primary-ink" data-testid="learn-score">
        {t('learn.result.independent', { correct: summary.independent, total: summary.total })}
      </p>
      {summary.helped > 0 && (
        <p className="text-lg text-ink-soft">
          {t('learn.result.helped', { count: summary.helped })}
        </p>
      )}
      <p className="text-lg">{kind}</p>
      {coins > 0 ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-coin-soft px-4 py-2 font-display text-xl font-extrabold">
          <CoinIcon size={26} />
          {t('learn.result.coins', { count: coins })}
        </p>
      ) : (
        <p className="text-sm text-ink-soft">{t('learn.result.noRepeatCoins')}</p>
      )}
      <p className="text-sm text-ink-soft">{t('learn.result.note')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="coin" size="md" onClick={onAgain}>
          {t('learn.again')}
        </Button>
        <Link
          to="/home"
          className="inline-flex min-h-14 items-center gap-2 rounded-full bg-surface px-6 font-display text-xl font-bold shadow-[0_6px_0_var(--color-line)]"
        >
          <HomeIcon size={24} />
          {t('learn.home')}
        </Link>
      </div>
    </section>
  )
}
