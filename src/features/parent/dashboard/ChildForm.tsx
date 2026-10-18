import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Robot } from '@/features/mascot/Robot'
import {
  DAILY_LIMIT_OPTIONS,
  DEFAULT_DAILY_LIMIT_MINUTES,
  MAX_CHILD_AGE,
  MAX_NAME_LENGTH,
  MIN_CHILD_AGE,
  type ChildProfile,
  type Gender,
  type MascotModel,
} from '@/store/familyStore'
import { ChoiceChips } from './ChoiceChips'

export interface ChildFormValues {
  name: string
  age: number
  gender: Gender
  mascot: MascotModel
  dailyLimitMinutes: number
}

interface ChildFormProps {
  initial?: ChildProfile
  onSave: (values: ChildFormValues) => void
  onCancel: () => void
}

const AGES = Array.from({ length: MAX_CHILD_AGE - MIN_CHILD_AGE + 1 }, (_, i) => MIN_CHILD_AGE + i)

/** Add or edit a child: name, age, gender (picks the robot), robot and daily time. */
export function ChildForm({ initial, onSave, onCancel }: ChildFormProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? '')
  const [age, setAge] = useState(initial?.age ?? 5)
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
    if (!trimmed) {
      setNameError(true)
      return
    }
    onSave({ name: trimmed, age, gender, mascot, dailyLimitMinutes: limit })
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

      <ChoiceChips
        label={t('parent.profiles.age')}
        options={AGES.map((value) => ({ value, label: value }))}
        value={age}
        onChange={setAge}
      />

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
                {t(model === 'girl' ? 'parent.profiles.lola' : 'parent.profiles.bobo')}
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
