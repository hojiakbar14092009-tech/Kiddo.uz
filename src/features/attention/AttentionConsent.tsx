import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { isAdminPreview } from '@/app/preview/adminPreview'
import { toursOff } from '@/features/onboarding/tour'
import { ParentGate } from '@/features/parent/gate/ParentGate'
import { useAttentionStore } from '@/store/attentionStore'
import { useSettingsStore } from '@/store/settingsStore'
import { askCamera } from './askCamera'
import { inChildArea } from './routes'

/**
 * Asked once on this device (Phase 58): may the robot notice when the child looks
 * away or leaves, and remind them? There is no way past it but an answer – yes or
 * no are both fine – and the answer is a grown-up's: either button first asks the
 * grown-ups' question. A parent changes it later in Settings.
 */
export function AttentionConsent() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const consent = useAttentionStore((state) => state.consent)
  const answer = useAttentionStore((state) => state.answer)
  const language = useSettingsStore((state) => state.language)
  const onboarded = useSettingsStore((state) => state.onboarded)
  const [pending, setPending] = useState<'yes' | 'no' | null>(null)
  const [busy, setBusy] = useState(false)
  /** After a grown-up's yes: the camera is a separate choice, off unless they pick it. */
  const [cameraStep, setCameraStep] = useState(false)

  const ask =
    consent === 'unasked' &&
    language !== null &&
    onboarded &&
    pathname !== '/welcome' &&
    inChildArea(pathname) &&
    !isAdminPreview() &&
    // browser tests of other features switch first-run questions off for the device
    // (`kiddo.e2e.tours`, as for the tours); the attention tests turn it back on
    !toursOff()
  if (!ask) return null

  const passed = () => {
    const granted = pending === 'yes'
    setPending(null)
    if (granted) setCameraStep(true)
    else answer(false, false)
  }

  const withCamera = async () => {
    // the browser's own camera question comes now, while the grown-up is here
    setBusy(true)
    const camera = await askCamera()
    setBusy(false)
    answer(true, camera)
  }

  if (cameraStep) {
    return (
      <Dialog
        title={t('attention.consent.cameraTitle')}
        onClose={() => undefined}
        dismissible={false}
        closeOnEscape={false}
        size="lg"
        role="alertdialog"
        testId="attention-camera"
      >
        <p className="text-left text-base leading-snug text-ink-soft">
          <span aria-hidden="true">📷 </span>
          {t('attention.consent.camera')}
        </p>
        <div className="mt-5 grid gap-3 min-[400px]:grid-cols-2">
          <Button variant="primary" size="md" disabled={busy} onClick={() => void withCamera()}>
            {t('attention.consent.cameraYes')}
          </Button>
          <Button variant="soft" size="md" disabled={busy} onClick={() => answer(true, false)}>
            {t('attention.consent.cameraNo')}
          </Button>
        </div>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog
        title={t('attention.consent.title')}
        onClose={() => undefined}
        dismissible={false}
        closeOnEscape={false}
        size="lg"
        role="alertdialog"
        testId="attention-consent"
      >
        <div className="space-y-3 text-left text-base leading-snug text-ink-soft">
          <p className="font-bold text-ink">{t('attention.consent.lead')}</p>
          <p>{t('attention.consent.what')}</p>
          <div>
            <p className="font-bold text-ink">{t('attention.consent.whyTitle')}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>{t('attention.consent.why1')}</li>
              <li>{t('attention.consent.why2')}</li>
              <li>{t('attention.consent.why3')}</li>
            </ul>
          </div>
          <p>
            <span aria-hidden="true">📷 </span>
            {t('attention.consent.camera')}
          </p>
          <p>
            <span aria-hidden="true">🔊 </span>
            {t('attention.consent.voice')}
          </p>
          <p className="text-sm">{t('attention.consent.later')}</p>
        </div>
        <div className="mt-5 grid gap-3 min-[400px]:grid-cols-2">
          <Button variant="primary" size="md" disabled={busy} onClick={() => setPending('yes')}>
            {t('attention.consent.yes')}
          </Button>
          <Button variant="soft" size="md" disabled={busy} onClick={() => setPending('no')}>
            {t('attention.consent.no')}
          </Button>
        </div>
      </Dialog>
      {pending && <ParentGate onPass={passed} onCancel={() => setPending(null)} />}
    </>
  )
}
