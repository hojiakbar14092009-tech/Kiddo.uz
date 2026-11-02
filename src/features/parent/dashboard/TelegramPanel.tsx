import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/toast'
import { LANGUAGE_INFO, LANGUAGES } from '@/content/languages'
import {
  createTelegramCode,
  isTelegramBotName,
  LINK_MINUTES,
  listTelegramLinks,
  TELEGRAM_BOT,
  telegramStartUrl,
  unlinkTelegram,
  updateTelegramLink,
  type TelegramLink,
  type TelegramSettings,
} from '@/services/supabase/telegram'
import { useLanguage } from '@/store/settingsStore'
import { ChoiceChips } from './ChoiceChips'
import { Panel } from './Panel'

/** A chat linked again keeps its row but starts with fresh settings: a new card. */
const linkKey = (link: TelegramLink) => `${link.id}:${link.createdAt}`

/** The hours a message may come at (Tashkent time), as the server allows. */
const HOURS = Array.from({ length: 15 }, (_, index) => index + 7)

/**
 * The parents' Telegram bot (Phase 56): a one-time link connects a chat, then
 * each linked chat has its own messages, language and hour, and can be
 * disconnected. Only with a cloud account and a bot set in the build.
 */
export function TelegramPanel({ cloud, bot = TELEGRAM_BOT }: { cloud: boolean; bot?: string }) {
  const { t } = useTranslation()
  const ready = cloud && isTelegramBotName(bot)
  return (
    <Panel title={t('parent.telegram.title')} className="lg:col-span-2" id="telegram">
      <p className="text-ink-soft">{t('parent.telegram.intro')}</p>
      <p className="text-sm text-ink-soft">{t('parent.telegram.privacy')}</p>
      {!cloud ? (
        <p data-testid="telegram-need-cloud">{t('parent.telegram.needCloud')}</p>
      ) : !ready ? (
        <p data-testid="telegram-no-bot">{t('parent.telegram.noBot')}</p>
      ) : (
        <TelegramLinks bot={bot} />
      )}
    </Panel>
  )
}

function TelegramLinks({ bot }: { bot: string }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const [links, setLinks] = useState<TelegramLink[] | null | 'error'>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [codeError, setCodeError] = useState<'too_many' | 'failed' | null>(null)

  // the chats shown now, to tell a newly linked one on Refresh
  const known = useRef(new Set<string>())
  useEffect(() => {
    known.current = new Set(Array.isArray(links) ? links.map(linkKey) : [])
  }, [links])

  const load = useCallback(async () => {
    const found = await listTelegramLinks()
    // a new or re-linked chat: the shown link is spent, so it goes
    if (found?.some((link) => !known.current.has(linkKey(link)))) setUrl(null)
    setLinks(found ?? 'error')
  }, [])

  useEffect(() => {
    let alive = true
    void listTelegramLinks().then((found) => {
      if (alive) setLinks(found ?? 'error')
    })
    return () => {
      alive = false
    }
  }, [])

  const connect = async () => {
    setBusy(true)
    setCodeError(null)
    const result = await createTelegramCode(language)
    setBusy(false)
    if ('code' in result) setUrl(telegramStartUrl(bot, result.code))
    else {
      setUrl(null)
      setCodeError(result.error)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" onClick={() => void connect()} disabled={busy}>
          {t('parent.telegram.connect')}
        </Button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="telegram-open"
            className="inline-flex min-h-12 items-center rounded-2xl border-2 border-primary px-4 font-display text-lg font-bold text-primary"
          >
            {t('parent.telegram.open')}
          </a>
        )}
      </div>
      {url && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-soft">
            {t('parent.telegram.linkHint', { minutes: LINK_MINUTES })}
          </p>
          <Button variant="soft" size="md" className="self-start" onClick={() => void load()}>
            {t('parent.telegram.refresh')}
          </Button>
        </div>
      )}
      {codeError && (
        <p role="alert" className="text-sm font-semibold text-oops-ink">
          {t(codeError === 'too_many' ? 'parent.telegram.tooMany' : 'parent.telegram.failed')}
        </p>
      )}
      {links === 'error' ? (
        <p role="alert" className="text-sm">
          {t('parent.telegram.loadFailed')}
        </p>
      ) : links && links.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('parent.telegram.none')}</p>
      ) : (
        links?.map((link, index) => (
          <LinkCard
            key={linkKey(link)}
            link={link}
            number={index + 1}
            onUnlinked={() =>
              setLinks((current) =>
                Array.isArray(current) ? current.filter((item) => item.id !== link.id) : current,
              )
            }
          />
        ))
      )}
    </div>
  )
}

function LinkCard({
  link,
  number,
  onUnlinked,
}: {
  link: TelegramLink
  number: number
  onUnlinked: () => void
}) {
  const { t, i18n } = useTranslation()
  const [settings, setSettings] = useState<TelegramSettings>({
    language: link.language,
    weekly: link.weekly,
    daily: link.daily,
    reminders: link.reminders,
    sendHour: link.sendHour,
  })
  const [busy, setBusy] = useState(false)
  // disconnecting asks once more: a tap by mistake would stop the messages
  const [confirming, setConfirming] = useState(false)
  const set = <K extends keyof TelegramSettings>(key: K, value: TelegramSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }))
  const since = new Date(link.createdAt).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const save = async () => {
    setBusy(true)
    const done = await updateTelegramLink(link.id, settings)
    setBusy(false)
    toast(
      t(done ? 'parent.telegram.saved' : 'parent.telegram.saveFailed'),
      done ? 'success' : 'warning',
    )
  }

  const unlink = async () => {
    setConfirming(false)
    setBusy(true)
    const done = await unlinkTelegram(link.id)
    setBusy(false)
    if (done) {
      toast(t('parent.telegram.unlinked'), 'success')
      onUnlinked()
    } else toast(t('parent.telegram.saveFailed'), 'warning')
  }

  const toggles = [
    ['weekly', 'parent.telegram.weekly'],
    ['daily', 'parent.telegram.daily'],
    ['reminders', 'parent.telegram.reminders'],
  ] as const

  return (
    <section
      className="flex flex-col gap-3 rounded-2xl border-2 border-line p-4"
      data-testid="telegram-link"
      aria-label={t('parent.telegram.chat', { n: number })}
    >
      <div>
        <h3 className="font-display text-lg font-bold">
          {t('parent.telegram.chat', { n: number })}
        </h3>
        <p className="text-sm text-ink-soft">{t('parent.telegram.since', { date: since })}</p>
      </div>
      <ChoiceChips
        label={t('parent.telegram.messageLanguage')}
        options={LANGUAGES.map((value) => ({ value, label: LANGUAGE_INFO[value].nativeName }))}
        value={settings.language}
        onChange={(value) => set('language', value)}
      />
      <div className="flex flex-col gap-1">
        {toggles.map(([key, label]) => (
          <label
            key={key}
            className="flex min-h-12 cursor-pointer items-center gap-3 font-semibold"
          >
            <input
              type="checkbox"
              className="size-6 accent-primary"
              checked={settings[key]}
              onChange={(event) => set(key, event.target.checked)}
            />
            {t(label)}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-2 font-semibold">
        {t('parent.telegram.hour')}
        <select
          value={settings.sendHour}
          onChange={(event) => set('sendHour', Number(event.target.value))}
          className="min-h-12 w-40 rounded-2xl border-2 border-line-strong bg-surface px-3 text-lg"
        >
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {`${String(hour).padStart(2, '0')}:00`}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" size="md" onClick={() => void save()} disabled={busy}>
          {t('parent.telegram.save')}
        </Button>
        {confirming ? (
          <>
            <Button variant="oops" size="md" onClick={() => void unlink()} disabled={busy}>
              {t('parent.telegram.unlinkYes')}
            </Button>
            <Button variant="soft" size="md" onClick={() => setConfirming(false)}>
              {t('parent.telegram.unlinkKeep')}
            </Button>
          </>
        ) : (
          <Button variant="oops" size="md" onClick={() => setConfirming(true)} disabled={busy}>
            {t('parent.telegram.unlink')}
          </Button>
        )}
      </div>
    </section>
  )
}
