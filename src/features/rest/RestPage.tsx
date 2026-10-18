import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { LockIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { Button } from '@/components/ui/Button'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { ParentGateOverlay } from '@/features/parent/gate/ParentGate'
import { useParentGateStore } from '@/store/parentStore'
import { useScreenTimeStore } from '@/store/screenTimeStore'
import { EXTRA_MINUTES } from './screenTime'
import { useScreenTime } from './useScreenTime'

const STARS = [
  { left: '12%', top: '14%', delay: 0 },
  { left: '82%', top: '10%', delay: 0.8 },
  { left: '70%', top: '30%', delay: 1.6 },
  { left: '20%', top: '38%', delay: 2.2 },
  { left: '48%', top: '8%', delay: 1.1 },
]

type GateStep = 'closed' | 'asking' | 'open'

/**
 * `/rest`: the daily time is up. A sleepy robot says good night; the page has
 * no way back to the games except through the parent gate.
 */
export function RestPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion() ?? false
  const { over, childKey, day } = useScreenTime()
  const grantExtra = useScreenTimeStore((state) => state.grantExtra)
  const openGate = useParentGateStore((state) => state.open)
  const { react, reset } = useMascot()
  const [gate, setGate] = useState<GateStep>('closed')

  useEffect(() => {
    react('rest')
    return reset
  }, [react, reset])

  if (!over) return <Navigate to="/home" replace />

  return (
    <Screen className="items-center justify-center gap-6 overflow-hidden bg-[#2E2A4F] px-4 py-8 text-center text-white">
      {STARS.map((star) => (
        <motion.span
          key={star.left}
          aria-hidden="true"
          className="absolute text-2xl"
          style={{ left: star.left, top: star.top }}
          animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, delay: star.delay }}
        >
          ✨
        </motion.span>
      ))}

      <Mascot robotClassName="w-40 sm:w-56" className="max-w-xl text-ink" />

      <div className="flex max-w-lg flex-col gap-2">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">{t('rest.title')}</h1>
        <p className="text-xl text-white/80">{t('rest.text')}</p>
      </div>

      {gate === 'open' ? (
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="coin"
            onClick={() => {
              grantExtra(childKey, day, EXTRA_MINUTES)
              navigate('/home', { replace: true })
            }}
          >
            {t('rest.extra', { count: EXTRA_MINUTES })}
          </Button>
          <Button variant="soft" onClick={() => navigate('/parent/dashboard')}>
            {t('common.parentArea')}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setGate('asking')}
          className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full px-4 font-semibold text-white/70"
        >
          <LockIcon size={18} />
          {t('rest.parents')}
        </button>
      )}

      {gate === 'asking' && (
        <ParentGateOverlay
          onPass={() => {
            openGate()
            setGate('open')
          }}
          onCancel={() => setGate('closed')}
        />
      )}
    </Screen>
  )
}
