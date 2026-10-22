import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CoinIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { grantReward } from '@/domain/rewards'
import type { ChildProfile } from '@/store/familyStore'
import { useProgress } from '@/store/progressStore'
import { Panel } from './Panel'
import { newId } from '@/lib/id'

/**
 * If homework was not done, a parent may – only if they want to – take some
 * coins away. They enter the amount and confirm it in a second step.
 */
export function CoinPenaltyPanel({ child }: { child: ChildProfile }) {
  const { t } = useTranslation()
  const { coins } = useProgress(child.id)
  const [amount, setAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState<number | null>(null)
  const value = Math.min(coins, Math.max(0, Math.floor(Number(amount) || 0)))

  const ask = (event: FormEvent) => {
    event.preventDefault()
    if (value <= 0) return
    setDone(null)
    setConfirming(true)
  }

  const confirm = () => {
    // Each confirmed penalty is its own ledger entry; the balance never goes below zero.
    const entry = grantReward({
      childKey: child.id,
      coins: -value,
      reason: 'penalty',
      refId: newId(),
    })
    setDone(entry ? -entry.coins : 0)
    setAmount('')
    setConfirming(false)
  }

  return (
    <Panel title={t('parent.penalty.title')}>
      <p className="text-ink-soft">{t('parent.penalty.text')}</p>
      <p className="inline-flex items-center gap-2 self-start rounded-full bg-coin-soft px-4 py-2 font-display text-xl font-extrabold">
        <CoinIcon size={26} />
        {t('parent.penalty.balance', { name: child.name, count: coins })}
      </p>
      <form onSubmit={ask} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 font-semibold">
          {t('parent.penalty.amount')}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={coins}
            value={amount}
            disabled={coins === 0}
            onChange={(event) => {
              setAmount(event.target.value)
              setDone(null)
            }}
            className="h-12 w-36 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal tabular-nums"
          />
        </label>
        <Button type="submit" variant="soft" size="md" disabled={value <= 0}>
          {t('parent.penalty.take')}
        </Button>
      </form>
      {coins === 0 && (
        <p className="text-ink-soft">{t('parent.penalty.empty', { name: child.name })}</p>
      )}
      {done !== null && (
        <p role="status" className="font-semibold text-primary-ink">
          {t('parent.penalty.done', { name: child.name, count: done })}
        </p>
      )}
      {confirming && (
        <ConfirmDialog
          text={t('parent.penalty.confirm', { name: child.name, count: value })}
          yes={t('parent.penalty.yes')}
          no={t('parent.cancel')}
          onYes={confirm}
          onNo={() => setConfirming(false)}
        />
      )}
    </Panel>
  )
}

function ConfirmDialog({
  text,
  yes,
  no,
  onYes,
  onNo,
}: {
  text: string
  yes: string
  no: string
  onYes: () => void
  onNo: () => void
}) {
  const cancel = useRef<HTMLButtonElement>(null)
  // Taking coins away needs an explicit answer: a tap outside does nothing,
  // Escape and the focused default both mean “cancel”.
  return (
    <Dialog
      role="alertdialog"
      dismissible={false}
      initialFocus={cancel}
      onClose={onNo}
      size="sm"
      title={text}
      testId="penalty-confirm"
    >
      <div className="flex w-full flex-wrap justify-center gap-3">
        <Button ref={cancel} variant="soft" size="md" onClick={onNo}>
          {no}
        </Button>
        <Button size="md" onClick={onYes}>
          {yes}
        </Button>
      </div>
    </Dialog>
  )
}
