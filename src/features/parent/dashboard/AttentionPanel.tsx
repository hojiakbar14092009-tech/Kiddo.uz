import { useState } from 'react'
import { track } from '@/domain/analytics'
import { useTranslation } from 'react-i18next'
import { askCamera } from '@/features/attention/askCamera'
import { useAttentionStore } from '@/store/attentionStore'
import { AttentionReport } from './AttentionReport'
import { ChoiceChips } from './ChoiceChips'
import { Panel } from './Panel'

/**
 * The attention helper (Phase 58): the answer a grown-up gave on first start,
 * changed here at any time. Turning the camera on asks the browser again.
 */
export function AttentionPanel() {
  const { t } = useTranslation()
  const consent = useAttentionStore((state) => state.consent)
  const camera = useAttentionStore((state) => state.camera)
  const answer = useAttentionStore((state) => state.answer)
  const setCamera = useAttentionStore((state) => state.setCamera)
  const [denied, setDenied] = useState(false)
  const on = consent === 'granted'

  const turnCamera = async (wanted: boolean) => {
    setDenied(false)
    if (!wanted) return setCamera(false)
    const allowed = await askCamera()
    setDenied(!allowed)
    setCamera(allowed)
  }

  return (
    <Panel title={t('attentionSettings.title')}>
      <p className="text-ink-soft">{t('attentionSettings.hint')}</p>
      <div data-testid="attention-setting">
        <ChoiceChips
          label={t('attentionSettings.on')}
          options={[
            { value: 'on', label: t('attentionSettings.stateOn') },
            { value: 'off', label: t('attentionSettings.stateOff') },
          ]}
          value={on ? 'on' : 'off'}
          onChange={(value) => {
            answer(value === 'on', value === 'on' && camera)
            // the admin's counts see a later "yes" too (each is sent once per device)
            track(value === 'on' ? 'attention_yes' : 'attention_no')
          }}
        />
      </div>
      {on && (
        <div data-testid="attention-camera-setting">
          <ChoiceChips
            label={t('attentionSettings.camera')}
            options={[
              { value: 'on', label: t('attentionSettings.stateOn') },
              { value: 'off', label: t('attentionSettings.stateOff') },
            ]}
            value={camera ? 'on' : 'off'}
            onChange={(value) => void turnCamera(value === 'on')}
          />
          <p className="mt-2 text-sm text-ink-soft">{t('attentionSettings.cameraHint')}</p>
          {denied && (
            <p role="alert" className="mt-2 text-sm font-semibold text-oops-ink">
              {t('attentionSettings.cameraDenied')}
            </p>
          )}
        </div>
      )}
      <p className="text-sm text-ink-soft">{t('attentionSettings.voiceFree')}</p>
      {on && <AttentionReport />}
    </Panel>
  )
}
