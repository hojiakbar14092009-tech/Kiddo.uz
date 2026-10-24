import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Robot } from '@/features/mascot/Robot'
import {
  ageOn,
  birthDateForAge,
  isAllowedBirthDate,
  levelForAge,
  MAX_AGE,
  MAX_PROFILE_AGE,
  MIN_AGE,
} from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import {
  DAILY_LIMIT_OPTIONS,
  DEFAULT_DAILY_LIMIT_MINUTES,
  MAX_NAME_LENGTH,
  type ChildProfile,
  type Gender,
  type MascotModel,
} from '@/store/familyStore'
import { ChoiceChips } from './ChoiceChips'

export interface ChildFormValues {
  name: string
  birthDate: string
  gender: Gender
  mascot: MascotModel
  dailyLimitMinutes: number
}

interface ChildFormProps {
  initial?: ChildProfile
  onSave: (values: ChildFormValues) => void
  onCancel: () => void
}

/** Add or edit a child: name, birthday, gender (picks the robot), robot and daily time. */
export function ChildForm({ initial, onSave, onCancel }: ChildFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [today] = useState(() => dayKey())
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '')
  const [birthError, setBirthError] = useState(false)
  // A child from 4 to 18: born between (today − 19 years + 1 day) and (today − 4 years).
  const latest = birthDateForAge(MIN_AGE, today)
  const earliest = nextDay(birthDateForAge(MAX_PROFILE_AGE + 1, today))
  const age = isAllowedBirthDate(birthDate, today) ? ageOn(birthDate, today) : null
  const [gender, setGender] = useState<Gender>(initial?.gender ?? 'girl')
  const [mascot, setMascot] = useState<MascotModel>(initial?.mascot ?? 'girl')
  const [limit, setLimit] = useState(initial?.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES)
  const [nameError, setNameError] = useState(false)

  const chooseGender = (next: Gender) => {
    // The robot follows the gender unless the parent picks the other one afterwards.
    if (mascot === gender) setMascot(next)
    setGender(next)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    const nameMissing = !trimmed
    const birthWrong = !isAllowedBirthDate(birthDate, today)
    setNameError(nameMissing)
    setBirthError(birthWrong)
    if (nameMissing || birthWrong) return
    onSave({ name: trimmed, birthDate, gender, mascot, dailyLimitMinutes: limit })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <label className="flex flex-col gap-1 font-semibold">
        {t('parent.profiles.name')}
        <input
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          aria-invalid={nameError}
          aria-describedby={nameError ? 'child-name-error' : undefined}
          onChange={(event) => {
            setName(event.target.value)
            setNameError(false)
          }}
          className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal aria-invalid:border-oops"
        />
        {nameError && (
          <span id="child-name-error" className="font-normal text-oops-ink">
            {t('parent.profiles.nameRequired')}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 font-semibold">
        {t('parent.profiles.birthDate')}
        <input
          type="date"
          value={birthDate}
          min={earliest}
          max={latest}
          aria-invalid={birthError}
          aria-describedby="child-birth-hint"
          onChange={(event) => {
            setBirthDate(event.target.value)
            setBirthError(false)
          }}
          className="h-12 rounded-2xl border-2 border-line-strong bg-cream px-4 font-normal aria-invalid:border-oops"
        />
        <span
          id="child-birth-hint"
          className={birthError ? 'font-normal text-oops-ink' : 'font-normal text-ink-soft'}
        >
          {birthError
            ? t('parent.profiles.birthDateError')
            : age !== null && age > MAX_AGE
              ? t('parent.profiles.ageAll', { count: age })
              : age !== null
                ? t('parent.profiles.ageLevel', { count: age, level: levelForAge(age) })
                : t('parent.profiles.birthDateHint')}
        </span>
      </label>

      <ChoiceChips
        label={t('parent.profiles.gender')}
        options={[
          { value: 'girl', label: t('parent.profiles.girl') },
          { value: 'boy', label: t('parent.profiles.boy') },
        ]}
        value={gender}
        onChange={chooseGender}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">{t('parent.profiles.mascot')}</legend>
        <div className="flex gap-3">
          {(['girl', 'boy'] as const).map((model) => (
            <button
              key={model}
              type="button"
              role="radio"
              aria-checked={mascot === model}
              onClick={() => setMascot(model)}
              className="flex flex-col items-center gap-1 rounded-3xl border-[3px] border-transparent bg-cream px-4 py-2 aria-checked:border-primary"
            >
              <Robot model={model} size={72} followPointer={false} />
              <span className="font-display font-bold">
                {t(model === 'girl' ? 'parent.profiles.robotGirl' : 'parent.profiles.robotBoy')}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <ChoiceChips
        label={t('parent.profiles.limit')}
        options={DAILY_LIMIT_OPTIONS.map((value) => ({
          value,
          label: t('parent.profiles.minutes', { count: value }),
        }))}
        value={limit}
        onChange={setLimit}
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="md">
          {t('parent.save')}
        </Button>
        <Button variant="soft" size="md" onClick={onCancel}>
          {t('parent.cancel')}
        </Button>
      </div>
    </form>
  )
}

function nextDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d + 1))
  return date.toISOString().slice(0, 10)
}
