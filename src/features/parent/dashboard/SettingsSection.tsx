import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { LANGUAGE_INFO, LANGUAGES } from '@/content/languages'
import { audioManager } from '@/services/audio/audioManager'
import { playCue, SOUND_CUES } from '@/services/audio/soundLanguage'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useParentGateStore, useParentStore } from '@/store/parentStore'
import { useLanguage, useSettingsStore } from '@/store/settingsStore'
import { AiTutorPanel } from './AiTutorPanel'
import { ChoiceChips } from './ChoiceChips'
import { Panel } from './Panel'

/** Family-wide settings. Each child’s time limit lives in their profile. */
export function SettingsSection() {
  const { t } = useTranslation()
  const volume = useSettingsStore((state) => state.volume)
  const setVolume = useSettingsStore((state) => state.setVolume)
  const setLanguage = useSettingsStore((state) => state.setLanguage)
  const closeGate = useParentGateStore((state) => state.close)
  const navigate = useNavigate()
  const language = useLanguage()
  const session = useParentStore((state) => state.session)
  const percent = Math.round(volume * 100)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={t('parent.settings.sound')}>
        <label className="flex flex-col gap-3 font-semibold">
          <span>
            {t('parent.settings.volume')}: <span className="tabular-nums">{percent}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={percent}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
            className="h-10 w-full accent-primary"
          />
        </label>
        <Button
          variant="soft"
          size="md"
          className="self-start"
          onClick={() => audioManager.play('success')}
        >
          {t('parent.settings.testSound')}
        </Button>
        <div className="flex flex-col gap-2" data-testid="sound-language">
          <span className="font-semibold">{t('parent.settings.cuesTitle')}</span>
          <p className="text-sm text-ink-soft">{t('parent.settings.cuesHint')}</p>
          <div className="flex flex-wrap gap-2">
            {SOUND_CUES.map((cue) => (
              <Button key={cue} variant="soft" size="md" onClick={() => playCue(cue)}>
                {t(`parent.settings.cues.${cue}`)}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-sm text-ink-soft">{t('parent.settings.voiceNote')}</p>
      </Panel>

      <Panel title={t('parent.settings.language')}>
        <ChoiceChips
          label={t('parent.settings.languageHint')}
          options={LANGUAGES.map((value) => ({ value, label: LANGUAGE_INFO[value].nativeName }))}
          value={language}
          onChange={setLanguage}
        />
      </Panel>

      <Panel title={t('parent.settings.welcomeTitle')}>
        <p className="text-ink-soft">{t('parent.settings.welcomeText')}</p>
        <Button
          variant="soft"
          size="md"
          className="self-start"
          data-testid="replay-welcome"
          onClick={() => {
            // the grown-ups' area closes first: Back from the tour never reopens it
            closeGate()
            navigate('/welcome', { replace: true })
          }}
        >
          {t('parent.settings.welcomeReplay')}
        </Button>
      </Panel>

      <AiTutorPanel />

      <Panel title={t('parent.settings.account')} className="lg:col-span-2">
        <p>
          {session?.mode === 'cloud'
            ? t('parent.settings.cloud', { email: session.email })
            : isSupabaseConfigured
              ? t('parent.settings.demoCanSignIn')
              : t('parent.settings.demoOffline')}
        </p>
      </Panel>
    </div>
  )
}
