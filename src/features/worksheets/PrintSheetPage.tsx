import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { isLanguage } from '@/content/languages'
import { useLanguage } from '@/store/settingsStore'
import { firstName, isSheetKind, sheetLetters } from './sheets'
import { WorksheetSvg } from './WorksheetSvg'

/*
 * Only while this page is open: the printer gets the sheet alone, at A4
 * (everything else on the page is hidden in print). Rendered as a <style>
 * element of this page, so leaving it removes the rules again.
 */
const PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body {
    background: #ffffff !important;
    height: 297mm !important;
    min-height: 0 !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  [data-print-root] { padding: 0 !important; min-height: 0 !important; }
  body * { visibility: hidden !important; }
  [data-print-sheet], [data-print-sheet] * { visibility: visible !important; }
  [data-print-sheet] {
    position: fixed !important;
    left: 0;
    top: 0;
    width: 210mm !important;
    height: 297mm !important;
    max-width: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  [data-print-sheet] svg { width: 210mm !important; height: 297mm !important; }
}
`

/**
 * `/parent/print/:sheet` (Phase 49, behind the parent gate): one A4 sheet, on
 * screen at the page's width (from 320px) and in print at exactly A4. The
 * parent prints it, or saves it as a PDF, with the browser's own print dialog;
 * no PDF library is loaded. The child's first name comes in the navigation
 * state, never in the address.
 */
export function PrintSheetPage() {
  const { t } = useTranslation()
  const { sheet } = useParams()
  const [params] = useSearchParams()
  const location = useLocation()
  const uiLanguage = useLanguage()
  if (!isSheetKind(sheet)) return <Navigate to="/parent/dashboard" replace />

  const requested = params.get('lang')
  const alphabet = isLanguage(requested) ? requested : uiLanguage
  const state = location.state as { name?: unknown } | null
  const name = firstName(typeof state?.name === 'string' ? state.name : '')

  return (
    <main data-print-root="" className="min-h-dvh px-4 py-4 sm:px-8 sm:py-6">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto flex w-full max-w-[210mm] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to="/parent/dashboard?tab=homework"
            className="inline-flex min-h-12 items-center gap-1 rounded-full bg-primary-soft pr-4 pl-2 font-display font-bold text-primary-ink"
          >
            <ChevronLeftIcon size={24} />
            {t('worksheets.back')}
          </Link>
          <Button size="md" onClick={() => window.print()} data-testid="sheet-print">
            {t('worksheets.print')}
          </Button>
        </div>
        <p className="text-sm text-ink-soft print:hidden">{t('worksheets.paper')}</p>
        <div
          data-print-sheet=""
          className="w-full overflow-hidden rounded-2xl bg-white shadow-[0_6px_0_var(--color-line)]"
        >
          <WorksheetSvg
            kind={sheet}
            letters={sheet === 'letters' ? sheetLetters(alphabet) : []}
            label={t('worksheets.label')}
            texts={{
              title: t(`worksheets.sheetTitle.${sheet}`),
              task: t(`worksheets.task.${sheet}`),
              nameLabel: t('worksheets.name'),
              name,
            }}
          />
        </div>
      </div>
    </main>
  )
}
