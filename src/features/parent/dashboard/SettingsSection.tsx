import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { LANGUAGE_INFO, LANGUAGES } from '@/content/languages'
import { audioManager } from '@/services/audio/audioManager'
import { playCue, playTap, SOUND_CUES } from '@/services/audio/soundLanguage'
import { isSupabaseConfigured } from '@/services/supabase/client'
import { useParentGateStore, useParentStore } from '@/store/parentStore'
import { useLanguage, useSettingsStore } from '@/store/settingsStore'
import { resetTours } from '@/features/onboarding/tour'
import { AccountPanel } from './AccountPanel'
import { AiTutorPanel } from './AiTutorPanel'
import { AttentionPanel } from './AttentionPanel'
import { ChoiceChips } from './ChoiceChips'
import { NotifyPanel } from './NotifyPanel'
import { Panel } from './Panel'
import { TelegramPanel } from './TelegramPanel'

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
  const slowVoice = useSettingsStore((state) => state.slowVoice)
  const setSlowVoice = useSettingsStore((state) => state.setSlowVoice)
  const autoVoice = useSettingsStore((state) => state.autoVoice)
  const setAutoVoice = useSettingsStore((state) => state.setAutoVoice)

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
            className="h-11 w-full accent-primary"
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
        {/* Phase 42: each part of the app answers a tap in its own voice */}
        <div className="flex flex-col gap-2" data-testid="tap-palettes">
          <span className="font-semibold">{t('parent.settings.tapsTitle')}</span>
          <div className="flex flex-wrap gap-2">
            {(['xylophone', 'nut', 'blip'] as const).map((palette) => (
              <Button key={palette} variant="soft" size="md" onClick={() => playTap(palette)}>
                {t(`parent.settings.taps.${palette}`)}
              </Button>
            ))}
          </div>
        </div>
        {/* Phase 41: instructions read on their own, or only when the speaker is pressed */}
        <ChoiceChips
          label={t('parent.settings.autoVoice')}
          options={[
            { value: 'auto', label: t('parent.settings.autoVoiceOn') },
            { value: 'tap', label: t('parent.settings.autoVoiceOff') },
          ]}
          value={autoVoice ? 'auto' : 'tap'}
          onChange={(value) => setAutoVoice(value === 'auto')}
        />
        {/* Phase 41: the pause between a letter and its word (longer at four, longer still when slow) */}
        <ChoiceChips
          label={t('parent.settings.pace')}
          options={[
            { value: 'normal', label: t('parent.settings.paceNormal') },
            { value: 'slow', label: t('parent.settings.paceSlow') },
          ]}
          value={slowVoice ? 'slow' : 'normal'}
          onChange={(value) => setSlowVoice(value === 'slow')}
        />
        <p className="text-sm text-ink-soft">{t('parent.settings.paceHint')}</p>
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
            // the guided tours on Home and in games start over for this child too
            resetTours()
            // the grown-ups' area closes first: Back from the tour never reopens it
            closeGate()
            navigate('/welcome', { replace: true })
          }}
        >
          {t('parent.settings.welcomeReplay')}
        </Button>
      </Panel>

      <AttentionPanel />

      <AiTutorPanel />

      {session?.mode === 'cloud' && !isSupabaseConfigured ? (
        // Kiddo's own server (MVP): the stage 9 notifications; the Supabase bot panel otherwise
        <NotifyPanel />
      ) : (
        <TelegramPanel cloud={session?.mode === 'cloud'} />
      )}

      {session?.mode === 'cloud' ? (
        <AccountPanel email={session.email} userId={session.userId} />
      ) : (
        <Panel title={t('parent.settings.account')} className="lg:col-span-2">
          <p>
            {isSupabaseConfigured
              ? t('parent.settings.demoCanSignIn')
              : t('parent.settings.demoOffline')}
          </p>
        </Panel>
      )}

      <Panel title={t('privacy.title')} className="lg:col-span-2">
        <Link to="/privacy" className="font-bold text-primary-ink underline">
          {t('privacy.link')}
        </Link>
      </Panel>
    </div>
  )
}
