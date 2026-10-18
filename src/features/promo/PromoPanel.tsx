import clsx from 'clsx'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Panel } from '@/features/parent/dashboard/Panel'
import { useParentStore } from '@/store/parentStore'
import { usePromoStore } from '@/store/promoStore'
import { normalizePromo, useSubscriptionStore } from '@/store/subscriptionStore'
import { AdPlayer } from './AdPlayer'
import {
  promoBackend,
  type ClaimFailure,
  type ClaimedPromo,
  type PlayableAd,
  type RedeemOutcome,
} from './promoBackend'
import { PromoReveal } from './PromoReveal'

type Notice = { tone: 'good' | 'bad' | 'info'; text: string } | null

/**
 * The promo code tab: get the family's one gift code by watching an ad to the
 * end (when the admin has put one up), and use any code.
 */
export function PromoPanel({ onRedeemed }: { onRedeemed: () => void }) {
  const { t } = useTranslation()
  const sessionMode = useParentStore((state) => state.session?.mode ?? null)
  const usedCodes = useSubscriptionStore((state) => state.usedPromoCodes)
  const deviceClaim = usePromoStore((state) => state.claim)
  const [claimed, setClaimed] = useState<ClaimedPromo | null>(null)
  const [busy, setBusy] = useState(false)
  const [ad, setAd] = useState<{ ad: PlayableAd; token: string } | null>(null)
  const [reveal, setReveal] = useState<ClaimedPromo | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<RedeemOutcome | null>(null)

  // the code this family already got (device or account)
  useEffect(() => {
    let alive = true
    promoBackend()
      .currentClaim()
      .then((value) => alive && setClaimed(value))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [sessionMode, deviceClaim])

  const getCode = async () => {
    setNotice(null)
    setBusy(true)
    try {
      const backend = promoBackend()
      const next = await backend.nextAd()
      if (!next) {
        setNotice({ tone: 'info', text: t('pro.getPromo.noAd') })
        return
      }
      const token = await backend.startView(next)
      setAd({ ad: next, token })
    } catch {
      setNotice({ tone: 'bad', text: t('pro.getPromo.failed.error') })
    } finally {
      setBusy(false)
    }
  }

  const closeAd = () => {
    ad?.ad.release()
    setAd(null)
  }

  const finished = async () => {
    if (!ad) return
    const outcome = await promoBackend().claim(ad.token, ad.ad)
    closeAd()
    if (outcome.ok) {
      setClaimed(outcome.promo)
      setReveal(outcome.promo)
    } else {
      setNotice({
        tone: 'bad',
        text: t(`pro.getPromo.failed.${outcome.reason satisfies ClaimFailure}`),
      })
    }
  }

  const redeem = async (value: string) => {
    if (!value.trim()) return
    const outcome = await promoBackend()
      .redeem(value)
      .catch((): RedeemOutcome => 'error')
    setResult(outcome)
    if (outcome === 'ok') {
      setCode('')
      onRedeemed()
    }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void redeem(code)
  }

  const claimUsed = claimed !== null && usedCodes.includes(normalizePromo(claimed.code))

  return (
    <Panel title={t('pro.promo')}>
      <div className="flex flex-col gap-3 rounded-3xl border-[3px] border-dashed border-coin-shadow/50 bg-coin-soft p-4">
        <p className="font-display text-xl font-extrabold">🎁 {t('pro.getPromo.title')}</p>
        {claimed ? (
          <>
            <p className="text-ink-soft">{t('pro.getPromo.yours')}</p>
            <div className="flex flex-wrap items-center gap-3">
              <span
                data-testid="claimed-code"
                className={clsx(
                  'rounded-2xl bg-surface px-4 py-2 font-display text-2xl font-extrabold tracking-widest',
                  claimUsed && 'text-ink-soft line-through',
                )}
              >
                {claimed.code}
              </span>
              <span className="text-ink-soft">
                {t('pro.getPromo.days', { count: claimed.days })}
              </span>
              {!claimUsed && (
                <Button variant="coin" size="md" onClick={() => void redeem(claimed.code)}>
                  {t('pro.getPromo.use')}
                </Button>
              )}
            </div>
            <p className="text-sm text-ink-soft">{t('pro.getPromo.once')}</p>
          </>
        ) : (
          <>
            <p className="text-ink-soft">{t('pro.getPromo.text')}</p>
            <Button
              variant="coin"
              size="md"
              className="self-start"
              disabled={busy}
              onClick={() => void getCode()}
            >
              {busy ? t('pro.getPromo.loading') : t('pro.getPromo.button')}
            </Button>
          </>
        )}
        {notice && (
          <p
            role="status"
            className={clsx(
              'rounded-2xl px-4 py-2',
              notice.tone === 'bad' ? 'bg-oops-soft text-oops-ink' : 'bg-surface text-ink',
            )}
          >
            {notice.text}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 font-semibold">
          {t('pro.promoLabel')}
          <input
            value={code}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(event) => {
              setCode(event.target.value)
              setResult(null)
            }}
            className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal uppercase"
          />
        </label>
        <Button type="submit" variant="soft" size="md">
          {t('pro.apply')}
        </Button>
      </form>
      {result && (
        <p
          role="status"
          className={clsx(
            'rounded-2xl px-4 py-2',
            result === 'ok' ? 'bg-primary-soft text-primary-ink' : 'bg-oops-soft text-oops-ink',
          )}
        >
          {t(`pro.promoResult.${result}`)}
        </p>
      )}

      {ad && (
        <AdPlayer
          ad={ad.ad}
          onComplete={() => void finished()}
          onCancel={closeAd}
          onError={() => {
            closeAd()
            setNotice({ tone: 'bad', text: t('pro.getPromo.failed.video') })
          }}
        />
      )}
      {reveal && (
        <PromoReveal
          promo={reveal}
          onClose={() => setReveal(null)}
          onUse={() => {
            setReveal(null)
            void redeem(reveal.code)
          }}
        />
      )}
    </Panel>
  )
}
