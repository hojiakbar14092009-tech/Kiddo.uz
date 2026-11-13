import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { api } from '@/services/cloud/api'
import { useLanguage } from '@/store/settingsStore'
import { NOTIFY_PANEL_TEXT, type NotifySettings } from './notifyPanelText'
import { Panel } from './Panel'

/**
 * The parents' Telegram notifications on Kiddo's own server (stage 9): two switches, both off
 * until the parent turns them on, and a one-time link for a parent who did not sign in with
 * Telegram (a Telegram sign-in's chat is linked by the server itself).
 */
export function NotifyPanel() {
  const language = useLanguage()
  const text = NOTIFY_PANEL_TEXT[language]
  const [settings, setSettings] = useState<NotifySettings | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<string | null>(null)

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setFailed(false)
    try {
      await work()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }
  const load = () => run(async () => setSettings(await api<NotifySettings>('notify/settings')))
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the panel opens
  }, [])

  const save = (patch: Partial<Pick<NotifySettings, 'weekly' | 'events'>>) =>
    run(async () => {
      // the first time it is turned on, messages take the app's language; /til changes it later
      const first = settings !== null && !settings.weekly && !settings.events
      setSettings(
        await api<NotifySettings>('notify/settings', {
          method: 'PUT',
          body: first ? { ...patch, language } : patch,
        }),
      )
    })

  const on = settings !== null && (settings.weekly || settings.events)
  return (
    <Panel title={text.title} className="lg:col-span-2" id="notify">
      <p className="text-ink-soft">{text.intro}</p>
      {settings && (
        <div className="flex flex-col gap-2">
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={settings.weekly}
              disabled={busy}
              onChange={(event) => void save({ weekly: event.target.checked })}
              data-testid="notify-weekly"
              className="size-6 shrink-0 accent-primary"
            />
            {text.weekly}
          </label>
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="checkbox"
              checked={settings.events}
              disabled={busy}
              onChange={(event) => void save({ events: event.target.checked })}
              data-testid="notify-events"
              className="size-6 shrink-0 accent-primary"
            />
            {text.events}
          </label>
          {on && settings.linked && (
            <p className="font-semibold text-primary-ink" data-testid="notify-linked">
              {text.linked}
            </p>
          )}
          {on && !settings.linked && (
            <div className="flex flex-col gap-2" data-testid="notify-need-link">
              <p>{text.needLink}</p>
              {link ? (
                <>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses('primary', 'lg')}
                    data-testid="notify-open-bot"
                  >
                    {text.openBot}
                  </a>
                  <p className="text-sm text-ink-soft">{text.linkHint}</p>
                  <Button
                    variant="soft"
                    size="md"
                    className="self-start"
                    disabled={busy}
                    onClick={() => void load()}
                  >
                    {text.refresh}
                  </Button>
                </>
              ) : (
                <Button
                  size="md"
                  className="self-start"
                  disabled={busy}
                  data-testid="notify-get-link"
                  onClick={() =>
                    void run(async () =>
                      setLink(
                        (await api<{ link: string }>('notify/link', { method: 'POST' })).link,
                      ),
                    )
                  }
                >
                  {text.getLink}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-ink-soft">{text.privacy}</p>
      {failed && (
        <p role="alert" className="rounded-2xl bg-oops-soft px-4 py-2 text-oops-ink">
          {text.error}
        </p>
      )}
    </Panel>
  )
}
