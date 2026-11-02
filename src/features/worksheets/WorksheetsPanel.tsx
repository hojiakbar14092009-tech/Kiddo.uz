import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { LANGUAGE_INFO, LANGUAGES, type Language } from '@/content/languages'
import { ChoiceChips } from '@/features/parent/dashboard/ChoiceChips'
import { Panel } from '@/features/parent/dashboard/Panel'
import { useLanguage } from '@/store/settingsStore'
import type { ChildProfile } from '@/store/familyStore'
import { firstName, SHEET_KINDS, type SheetKind } from './sheets'

/**
 * "Printable sheets" in the parent area (Phase 49): the parent picks a sheet
 * (letters of an alphabet, numbers 1–20, count and circle) and opens it as an
 * A4 page to print or save as a PDF from the browser's print dialog.
 */
export function WorksheetsPanel({ child }: { child: ChildProfile | null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const uiLanguage = useLanguage()
  const [kind, setKind] = useState<SheetKind>('letters')
  const [alphabet, setAlphabet] = useState<Language>(uiLanguage)
  const [withName, setWithName] = useState(true)
  const name = child ? firstName(child.name) : ''

  const open = () => {
    const query = kind === 'letters' ? `?lang=${alphabet}` : ''
    // the name travels in the navigation state, never in the address
    navigate(`/parent/print/${kind}${query}`, { state: { name: withName ? name : '' } })
  }

  return (
    <Panel title={t('worksheets.title')} id="worksheets">
      <p className="text-ink-soft">{t('worksheets.text')}</p>
      <ChoiceChips
        label={t('worksheets.kind')}
        options={SHEET_KINDS.map((value) => ({ value, label: t(`worksheets.kinds.${value}`) }))}
        value={kind}
        onChange={setKind}
      />
      {kind === 'letters' && (
        <ChoiceChips
          label={t('worksheets.alphabet')}
          options={LANGUAGES.map((value) => ({ value, label: LANGUAGE_INFO[value].nativeName }))}
          value={alphabet}
          onChange={setAlphabet}
        />
      )}
      {name && (
        <label className="flex min-h-12 cursor-pointer items-center gap-3 font-semibold">
          <input
            type="checkbox"
            className="size-6 accent-[var(--color-primary)]"
            checked={withName}
            onChange={(event) => setWithName(event.target.checked)}
          />
          {t('worksheets.showName')}
        </label>
      )}
      <Button size="md" className="self-start" onClick={open} data-testid="worksheet-open">
        {t('worksheets.open')}
      </Button>
    </Panel>
  )
}
