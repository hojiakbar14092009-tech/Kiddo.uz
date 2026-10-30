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
  EARLIEST_BIRTH_DATE,
  MIN_AGE,
} from '@/features/age/ageLevel'
import { tashkentDay } from '@/lib/dates'
import {
  DAILY_LIMIT_OPTIONS,
  DEFAULT_DAILY_LIMIT_MINUTES,
  MAX_NAME_LENGTH,
  type ChildProfile,
  type Gender,
  type MascotModel,
} from '@/store/familyStore'
import { ChoiceChips } from './ChoiceChips'
import {
  isStoredPhoto,
  PHOTO_TYPES,
  photoFromFile,
  type PhotoError,
} from '@/features/profiles/photo'

export interface ChildFormValues {
  name: string
  birthDate: string
  /** A small JPEG made on this device (features/profiles/photo.ts); undefined removes it. */
  photo?: string
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
  // the same day the store, the birthday and the server count ages by
  const [today] = useState(() => tashkentDay())
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '')
  const [birthError, setBirthError] = useState(false)
  // From 4, no maximum age: born on or before (today − 4 years)
  const latest = birthDateForAge(MIN_AGE, today)
  const earliest = EARLIEST_BIRTH_DATE
  const age = isAllowedBirthDate(birthDate, today) ? ageOn(birthDate, today) : null
  const [gender, setGender] = useState<Gender>(initial?.gender ?? 'girl')
  const [mascot, setMascot] = useState<MascotModel>(initial?.mascot ?? 'girl')
  const [limit, setLimit] = useState(initial?.dailyLimitMinutes ?? DEFAULT_DAILY_LIMIT_MINUTES)
  const [nameError, setNameError] = useState(false)
  const [photo, setPhoto] = useState<string | undefined>(
    isStoredPhoto(initial?.photo) ? initial?.photo : undefined,
  )
  const [photoError, setPhotoError] = useState<PhotoError | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return
    setPhotoBusy(true)
    const result = await photoFromFile(file)
    setPhotoBusy(false)
    if (result.ok) {
      setPhoto(result.dataUrl)
      setPhotoError(null)
    } else {
      setPhotoError(result.error)
    }
  }

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
    onSave({ name: trimmed, birthDate, photo, gender, mascot, dailyLimitMinutes: limit })
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-semibold">{t('parent.profiles.photo')}</legend>
        <div className="flex flex-wrap items-center gap-3">
          {photo ? (
            <img
              src={photo}
              alt={t('parent.profiles.photoAlt')}
              data-testid="child-photo-preview"
              className="size-20 rounded-full object-cover"
            />
          ) : (
            <span
              className="flex size-20 items-center justify-center rounded-full bg-cream text-3xl"
              aria-hidden="true"
            >
              📷
            </span>
          )}
          <label className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-2 border-line-strong bg-surface px-4 font-semibold focus-within:outline-2 focus-within:outline-primary">
            {photoBusy ? t('parent.profiles.photoBusy') : t('parent.profiles.photoChoose')}
            <input
              type="file"
              accept={PHOTO_TYPES.join(',')}
              className="sr-only"
              data-testid="child-photo-input"
              aria-describedby="child-photo-hint"
              onChange={(event) => {
                void choosePhoto(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          {photo && (
            <button
              type="button"
              onClick={() => setPhoto(undefined)}
              className="min-h-12 rounded-full px-3 font-semibold text-oops-ink underline"
            >
              {t('parent.profiles.photoRemove')}
            </button>
          )}
        </div>
        <p
          id="child-photo-hint"
          role={photoError ? 'alert' : undefined}
          data-testid="child-photo-hint"
          className={photoError ? 'font-semibold text-oops-ink' : 'text-sm text-ink-soft'}
        >
          {photoError
            ? t(`parent.profiles.photoError.${photoError}`)
            : t('parent.profiles.photoHint')}
        </p>
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
