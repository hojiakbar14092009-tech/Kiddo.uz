import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { tDynamic } from '@/lib/tDynamic'
import { dayKey } from '@/features/tasks/rules'
import {
  HOMEWORK_ACTIVITIES,
  MAX_HOMEWORK_NOTE,
  MAX_HOMEWORK_TIMES,
} from '@/features/homework/activityHomework'
import type { ActivityNameKey } from '@/features/parent/insights/activityNames'
import { childAge, levelOfChild, useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { ChoiceChips } from './ChoiceChips'
import { homeworkActivity } from '@/features/homework/activityHomework'
import { topicLabel, topicsFor } from '@/features/homework/topics'
import { useLanguage } from '@/store/settingsStore'
import { Panel } from './Panel'

/**
 * Advanced homework (Phase 23): any learning activity, a number of times,
 * an optional day and a short word for the child. Counted automatically when
 * the child finishes the activity.
 */
export function ActivityHomeworkPanel({ child }: { child: ChildProfile }) {
  const { t } = useTranslation()
  const assign = useFamilyStore((state) => state.assignActivityHomework)
  const age = childAge(child)
  const level = levelOfChild(child)
  // activities that suit the age first; nothing is hidden by age
  const activities = [...HOMEWORK_ACTIVITIES].sort(
    (a, b) => Number(a.fromAge > age) - Number(b.fromAge > age),
  )
  const [target, setTarget] = useState<ActivityNameKey>(activities[0]!.key)
  const [times, setTimes] = useState(2)
  const today = dayKey()
  const [dueDay, setDueDay] = useState('')
  const [note, setNote] = useState('')
  const [added, setAdded] = useState(false)
  // a single lesson (a planet lesson in Space), or any of them
  const language = useLanguage()
  const topics = [...topicsFor(target)].sort(
    (a, b) => Number(a.level !== level) - Number(b.level !== level),
  )
  const [topic, setTopic] = useState('')
  const chosenTopic = topics.some((item) => item.id === topic) ? topic : ''

  const submit = () => {
    assign(child.id, { target, times, dueDay: dueDay || null, note, topic: chosenTopic || null })
    setNote('')
    setDueDay('')
    setAdded(true)
  }

  return (
    <Panel title={t('parent.homework.activity.title')}>
      <p className="text-ink-soft">{t('parent.homework.activity.intro', { name: child.name })}</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">{t('parent.homework.activity.what')}</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-2">
          {activities.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === target}
              onClick={() => {
                setTarget(item.key)
                setAdded(false)
              }}
              data-testid={`hw-activity-${item.key}`}
              className={clsx(
                'flex min-h-12 items-center gap-2 rounded-2xl border-2 px-3 py-2 text-left font-semibold',
                item.key === target
                  ? 'border-primary bg-primary text-white'
                  : 'border-line-strong bg-surface text-ink',
              )}
            >
              <span aria-hidden="true" className="text-xl">
                {item.emoji}
              </span>
              {tDynamic(t, `parent.insights.names.${item.key}`)}
            </button>
          ))}
        </div>
      </fieldset>
      {topics.length > 0 && (
        <ChoiceChips
          label={t('parent.homework.activity.topic')}
          options={[
            { value: '', label: t('parent.homework.activity.anyTopic') },
            ...topics.map((item) => ({
              value: item.id,
              label: `${topicLabel(target, item.id, language)} · ${t('parent.homework.activity.topicAge', { age: item.level })}`,
            })),
          ]}
          value={chosenTopic}
          onChange={(next) => {
            setTopic(next)
            setAdded(false)
          }}
        />
      )}
      {homeworkActivity(target)?.game && (
        <p className="text-sm text-ink-soft">{t('parent.homework.activity.lettersElsewhere')}</p>
      )}
      <ChoiceChips
        label={t('parent.homework.activity.times')}
        options={Array.from({ length: MAX_HOMEWORK_TIMES }, (_, i) => ({
          value: i + 1,
          label: t('parent.homework.activity.timesValue', { count: i + 1 }),
        }))}
        value={times}
        onChange={(next) => {
          setTimes(next)
          setAdded(false)
        }}
      />
      <label className="flex flex-col gap-2 font-semibold">
        {t('parent.homework.activity.due')}
        <input
          type="date"
          min={today}
          value={dueDay}
          onChange={(event) => setDueDay(event.target.value)}
          data-testid="hw-due"
          className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal"
        />
        <span className="text-sm font-normal text-ink-soft">
          {t('parent.homework.activity.dueHint')}
        </span>
      </label>
      <label className="flex flex-col gap-2 font-semibold">
        {t('parent.homework.activity.note')}
        <input
          type="text"
          maxLength={MAX_HOMEWORK_NOTE}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('parent.homework.activity.notePlaceholder')}
          data-testid="hw-note"
          className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal"
        />
      </label>
      <Button size="md" className="self-start" onClick={submit} data-testid="hw-activity-assign">
        {t('parent.homework.activity.assign', { name: child.name })}
      </Button>
      <p
        aria-live="polite"
        data-testid="hw-activity-status"
        className={clsx('text-sm', added ? 'font-semibold text-primary-ink' : 'text-ink-soft')}
      >
        {added ? t('parent.homework.added') : t('parent.homework.activity.counted')}
      </p>
    </Panel>
  )
}
