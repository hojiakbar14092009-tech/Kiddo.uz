import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Img3D } from '@/components/ui/Img3D'
import { useLater, useLine, type Finish } from './hooks'
import { Line } from './kit'
import { changeOf, COINS, paid, SHOP_ROUNDS, type Coin } from './shopRules'

const COIN_LOOK: Record<Coin, string> = {
  1: 'size-12 text-xl',
  2: 'size-14 text-2xl',
  5: 'size-16 text-3xl',
}

/** A gold coin with its value. */
function CoinFace({ value }: { value: Coin }) {
  return (
    <span
      className={clsx(
        'flex items-center justify-center rounded-full border-4 border-coin-shadow bg-coin font-display font-extrabold text-ink shadow-[0_3px_0_var(--color-coin-shadow)]',
        COIN_LOOK[value],
      )}
    >
      {value}
    </span>
  )
}

/**
 * The little shop (Phase 66): pay exactly for a toy with coins of 1, 2 and 5;
 * then, having paid with a 5, pick the change. A round counts as first-try
 * without paying too much (or a wrong change).
 */
export function LittleShop({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  const later = useLater()
  const [index, setIndex] = useState(0)
  const [coins, setCoins] = useState<{ key: number; value: Coin }[]>([])
  const [missed, setMissed] = useState(false)
  const [firstTry, setFirstTry] = useState(0)
  const [sold, setSold] = useState(false)
  const key = useRef(0)
  /** The coins on the counter as of the last tap (two taps in one frame see each other). */
  const counter = useRef<{ key: number; value: Coin }[]>([])
  const done = useRef(-1)
  const round = SHOP_ROUNDS[index]!
  const sum = paid(coins.map((coin) => coin.value))

  useEffect(() => {
    say(
      t(SHOP_ROUNDS[index]!.kind === 'pay' ? 'sciGames.shop.say.pay' : 'sciGames.shop.say.change'),
    )
  }, [index, say, t])

  const win = (wasMissed: boolean) => {
    if (done.current === index) return
    done.current = index
    setSold(true)
    const score = firstTry + (wasMissed ? 0 : 1)
    setFirstTry(score)
    say(t('sciGames.shop.say.bought'))
    later(() => {
      if (index + 1 < SHOP_ROUNDS.length) {
        setIndex(index + 1)
        counter.current = []
        setCoins([])
        setMissed(false)
        setSold(false)
      } else {
        say(t('sciGames.shop.say.done'))
        later(() => onDone(SHOP_ROUNDS.length, score), 1400)
      }
    }, 2000)
  }

  const pay = (value: Coin) => {
    if (round.kind !== 'pay' || sold) return
    const next = [...counter.current, { key: key.current++, value }]
    counter.current = next
    setCoins(next)
    const total = paid(next.map((coin) => coin.value))
    if (total === round.price) win(missed)
    else if (total > round.price) {
      setMissed(true)
      say(t('sciGames.shop.say.tooMuch'))
    } else say(t('sciGames.shop.say.more'))
  }
  const takeBack = (coinKey: number) => {
    if (sold) return
    counter.current = counter.current.filter((coin) => coin.key !== coinKey)
    setCoins(counter.current)
  }
  const pickChange = (value: number) => {
    if (round.kind !== 'change' || sold) return
    if (value === changeOf(round)) win(missed)
    else {
      setMissed(true)
      say(t('sciGames.shop.say.wrongChange'))
    }
  }

  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-4" data-testid="sci-shop">
      <p className="text-base font-semibold text-ink-soft tabular-nums">
        {t('sciGames.shop.round', { n: index + 1, total: SHOP_ROUNDS.length })}
      </p>

      {/* the shelf: the toy and its price tag */}
      <motion.div
        key={index}
        initial={reduceMotion ? false : { y: -30, opacity: 0 }}
        animate={
          sold && !reduceMotion ? { y: 0, opacity: 1, scale: [1, 1.15, 1] } : { y: 0, opacity: 1 }
        }
        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
        className="relative flex w-full max-w-xs flex-col items-center rounded-[2rem] bg-surface p-4 shadow-[0_6px_0_var(--color-line)]"
      >
        <Img3D name={round.item} className="size-28 short:size-20" eager />
        {/* the tag says what it is: the word "price" over the number, swinging gently
            like a real shop tag so the child's eye goes to it */}
        <motion.span
          className="absolute top-3 right-3 flex origin-top flex-col items-center rounded-xl bg-oops px-3 pt-1 pb-1.5 font-display font-extrabold text-white shadow-[0_3px_0_#d96a30]"
          data-testid="shop-price"
          initial={{ rotate: 6 }}
          animate={reduceMotion ? { rotate: 6 } : { rotate: [6, -4, 6] }}
          transition={
            reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
          }
        >
          <motion.span
            data-testid="shop-price-word"
            className="text-sm leading-tight tracking-wide uppercase"
            animate={reduceMotion ? undefined : { scale: [1, 1.12, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.2 }}
          >
            {t('sciGames.shop.priceWord')}
          </motion.span>
          <span className="text-2xl leading-none">{round.price} 🪙</span>
        </motion.span>
        {sold && (
          <motion.span
            aria-hidden="true"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-3 -left-3 text-5xl"
          >
            🛍️
          </motion.span>
        )}
      </motion.div>

      {round.kind === 'pay' ? (
        <>
          {/* the counter: the coins paid so far (tap one to take it back) */}
          <div className="flex min-h-20 w-full max-w-xs flex-col items-center gap-1 rounded-2xl bg-coin-soft p-2">
            <span className="font-display text-lg font-bold tabular-nums" data-testid="shop-sum">
              {t('sciGames.shop.paid', { n: sum })}
            </span>
            <ul className="flex flex-wrap justify-center gap-1">
              <AnimatePresence>
                {coins.map((coin) => (
                  <motion.li
                    key={coin.key}
                    initial={reduceMotion ? false : { y: 80, scale: 0.5 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                  >
                    <button
                      type="button"
                      onClick={() => takeBack(coin.key)}
                      aria-label={t('sciGames.shop.takeBack', { n: coin.value })}
                      className="flex min-h-11 min-w-11 items-center justify-center"
                    >
                      <CoinFace value={coin.value} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
          {/* the purse */}
          <div className="flex items-end justify-center gap-3">
            {COINS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => pay(value)}
                disabled={sold}
                aria-label={t('sciGames.shop.give', { n: value })}
                data-testid={`shop-coin-${value}`}
                className="transition-transform active:translate-y-1 disabled:opacity-50"
              >
                <CoinFace value={value} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="font-display text-xl font-bold" data-testid="shop-question">
            {t('sciGames.shop.changeQuestion', { paid: round.paid, price: round.price })}
          </p>
          <div className="flex gap-3">
            {round.options.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => pickChange(value)}
                disabled={sold}
                data-testid={`shop-change-${value}`}
                className="flex size-20 items-center justify-center rounded-3xl bg-surface font-display text-4xl font-extrabold shadow-[0_5px_0_var(--color-line)] transition-transform active:translate-y-1 active:shadow-none disabled:opacity-60"
              >
                {value}
              </button>
            ))}
          </div>
        </>
      )}
      <Line text={line} />
    </section>
  )
}
