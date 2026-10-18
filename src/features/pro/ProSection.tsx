import clsx from 'clsx'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, CrownIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { ChoiceChips } from '@/features/parent/dashboard/ChoiceChips'
import { Panel } from '@/features/parent/dashboard/Panel'
import { formatDayMonth } from '@/lib/dates'
import { PAYMENT_PROVIDERS, payMock, type PaymentProvider } from '@/services/payments/mockPayment'
import {
  isProActive,
  useSubscriptionStore,
  type PlanId,
  type PromoResult,
} from '@/store/subscriptionStore'
import { findPlan, formatSum, PLANS } from './plans'

/** What each tier really offers – PRO adds the voice, nothing is taken from Free. */
const FEATURES = [
  { key: 'games', free: true },
  { key: 'parent', free: true },
  { key: 'bubbles', free: true },
  { key: 'voiceLetters', free: false },
  { key: 'voiceMascot', free: false },
  { key: 'voiceTasks', free: false },
] as const

type PayState = 'idle' | 'paying' | 'paid'

/** The PRO tab of the parent dashboard. Only reachable behind the parent gate. */
export function ProSection() {
  const { t } = useTranslation()
  const subscription = useSubscriptionStore()
  const active = isProActive(subscription)
  const [planId, setPlanId] = useState<PlanId>('yearly')
  const [provider, setProvider] = useState<PaymentProvider>('click')
  const [payState, setPayState] = useState<PayState>('idle')
  const [promo, setPromo] = useState('')
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null)
  const plan = findPlan(planId)
  const demoOn = active && subscription.source === 'demo'
  // The demo switch must never wipe out PRO that was paid for or redeemed.
  const paidOrPromo = active && subscription.source !== 'demo'
  const hasLifetime = paidOrPromo && subscription.expiresAt === null

  const pay = async () => {
    setPayState('paying')
    const receipt = await payMock({ plan: planId, provider, amount: plan.price })
    subscription.activatePlan(receipt.plan, 'payment')
    setPayState('paid')
  }

  const redeem = (event: FormEvent) => {
    event.preventDefault()
    if (!promo.trim()) return
    const result = subscription.redeemPromo(promo)
    setPromoResult(result)
    if (result === 'ok') setPromo('')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={t('pro.status')} className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className={clsx(
              'inline-flex items-center gap-2 rounded-full px-4 py-2 font-display text-xl font-extrabold',
              active ? 'bg-coin text-ink' : 'bg-cream',
            )}
          >
            {active && <CrownIcon size={24} />}
            {active ? t('tier.proActive') : t('tier.freeActive')}
          </span>
          {active && (
            <span className="text-ink-soft">
              {subscription.expiresAt
                ? t('pro.until', { date: formatDayMonth(new Date(subscription.expiresAt)) })
                : t('pro.forever')}
              {' · '}
              {t(`pro.source.${subscription.source ?? 'payment'}`)}
            </span>
          )}
          {active && subscription.source !== 'demo' && (
            <Button variant="soft" size="md" onClick={subscription.cancel}>
              {t('pro.turnOff')}
            </Button>
          )}
        </div>
      </Panel>

      <Panel title={t('pro.compare')}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-ink-soft">
              <th scope="col" className="py-2 font-semibold">
                <span className="sr-only">{t('pro.feature')}</span>
              </th>
              <th scope="col" className="w-20 py-2 text-center font-semibold">
                {t('tier.free')}
              </th>
              <th scope="col" className="w-20 py-2 text-center font-semibold">
                {t('tier.pro')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-line">
            {FEATURES.map((feature) => (
              <tr key={feature.key}>
                <th scope="row" className="py-3 font-normal">
                  {t(`pro.features.${feature.key}`)}
                </th>
                <td className="text-center">
                  <Mark yes={feature.free} label={t(feature.free ? 'pro.yes' : 'pro.no')} />
                </td>
                <td className="text-center">
                  <Mark yes label={t('pro.yes')} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title={t('pro.buy')}>
        {hasLifetime && payState !== 'paid' ? (
          <p className="rounded-2xl bg-primary-soft px-4 py-3 text-primary-ink">
            {t('pro.lifetimeOwned')}
          </p>
        ) : payState === 'paid' ? (
          <div role="status" className="flex flex-col items-start gap-3">
            <p className="font-display text-2xl font-extrabold">{t('pro.paid')}</p>
            <p className="text-ink-soft">{t('pro.paidText')}</p>
            <Button variant="soft" size="md" onClick={() => setPayState('idle')}>
              {t('pro.done')}
            </Button>
          </div>
        ) : (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-semibold">{t('pro.plan')}</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {PLANS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={item.id === planId}
                    onClick={() => setPlanId(item.id)}
                    className="relative flex flex-col items-start gap-1 rounded-3xl border-[3px] border-line-strong bg-surface p-4 text-left aria-checked:border-primary aria-checked:bg-primary-soft"
                  >
                    {item.savingPercent && (
                      <span className="absolute -top-3 right-3 rounded-full bg-coin px-2 text-sm font-bold">
                        −{item.savingPercent}%
                      </span>
                    )}
                    <span className="font-semibold">{t(`pro.plans.${item.id}`)}</span>
                    <span className="font-display text-xl font-extrabold whitespace-nowrap">
                      {t('pro.price', { amount: formatSum(item.price) })}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <ChoiceChips
              label={t('pro.method')}
              options={PAYMENT_PROVIDERS.map((value) => ({
                value,
                label: t(`pro.providers.${value}`),
              }))}
              value={provider}
              onChange={setProvider}
            />

            <p className="rounded-2xl bg-sky-soft px-4 py-2 text-sm">{t('pro.testNote')}</p>

            <Button
              variant="coin"
              size="md"
              className="self-start"
              disabled={payState === 'paying'}
              onClick={() => void pay()}
            >
              {payState === 'paying'
                ? t('pro.paying')
                : t('pro.pay', { amount: formatSum(plan.price) })}
            </Button>
          </>
        )}
      </Panel>

      <Panel title={t('pro.promo')}>
        <form onSubmit={redeem} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1 font-semibold">
            {t('pro.promoLabel')}
            <input
              value={promo}
              autoCapitalize="characters"
              autoComplete="off"
              onChange={(event) => {
                setPromo(event.target.value)
                setPromoResult(null)
              }}
              className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal uppercase"
            />
          </label>
          <Button type="submit" variant="soft" size="md">
            {t('pro.apply')}
          </Button>
        </form>
        {promoResult && (
          <p
            role="status"
            className={clsx(
              'rounded-2xl px-4 py-2',
              promoResult === 'ok'
                ? 'bg-primary-soft text-primary-ink'
                : 'bg-oops-soft text-oops-ink',
            )}
          >
            {t(`pro.promoResult.${promoResult}`)}
          </p>
        )}
      </Panel>

      <Panel title={t('pro.demo')}>
        <div className="flex items-center justify-between gap-4">
          <span id="demo-pro-label">
            <span className="block font-semibold">{t('pro.demoLabel')}</span>
            <span className="text-sm text-ink-soft">
              {paidOrPromo ? t('pro.demoBlocked') : t('pro.demoHint')}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={demoOn}
            aria-labelledby="demo-pro-label"
            disabled={paidOrPromo}
            onClick={() => subscription.setDemoPro(!demoOn)}
            className={clsx(
              'flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-40',
              demoOn ? 'bg-primary' : 'bg-line-strong',
            )}
          >
            <span
              aria-hidden="true"
              className={clsx(
                'size-7 rounded-full bg-surface shadow transition-transform',
                demoOn && 'translate-x-7',
              )}
            />
          </button>
        </div>
      </Panel>
    </div>
  )
}

function Mark({ yes, label }: { yes: boolean; label: string }) {
  return yes ? (
    <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
      <CheckIcon size={20} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  ) : (
    <span className="text-xl text-ink-soft">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}
