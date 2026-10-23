import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import { summaryAsOfNow, useChildMemory } from '@/domain/learningMemory'
import { tDynamic } from '@/lib/tDynamic'
import type { ChildProfile } from '@/store/familyStore'
import { Panel } from '../dashboard/Panel'
import { skillFamily } from './activityNames'

/**
 * What Kiddo remembers about a child's learning (Phase 10): skills that need
 * more practice and skills the child got past, in the words of the skill,
 * never a label for the child. No answers, no conversations.
 */
export function MemoryPanel({ child }: { child: ChildProfile }) {
  const { t } = useTranslation()
  const memory = useChildMemory(child.id)
  const summary = useMemo(() => summaryAsOfNow(memory.skills), [memory.skills])
  const name = (skill: string) =>
    tDynamic(t, `parent.insights.skillNames.${skillFamily(skill.replace(/^math:/, ''))}`)
  // one line per skill name (add within 10 and within 20 are both "adding")
  const needs = dedupe(summary.needsPractice.map((item) => ({ ...item, label: name(item.skill) })))
  // a skill name still being practised is not also listed as improved
  const practising = new Set(needs.map((item) => item.label))
  const improved = dedupe(
    summary.improved.map((item) => ({ ...item, label: name(item.skill) })),
  ).filter((item) => !practising.has(item.label))

  return (
    <Panel title={t('parent.insights.memory.title')} id="memory">
      <p className="text-ink-soft">{t('parent.insights.memory.intro')}</p>
      {needs.length === 0 && improved.length === 0 ? (
        <p className="text-ink-soft" data-testid="memory-empty">
          {t('parent.insights.memory.none')}
        </p>
      ) : (
        <>
          {needs.length > 0 && (
            <>
              <h3 className="font-display text-lg font-bold">
                {t('parent.insights.memory.needs')}
              </h3>
              <ul className="flex flex-col gap-2" data-testid="memory-needs">
                {needs.map((item) => (
                  <li key={item.label}>
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-ink-soft">
                      {' · '}
                      {tDynamic(t, `parent.insights.memory.status.${item.status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {improved.length > 0 && (
            <>
              <h3 className="font-display text-lg font-bold">
                {t('parent.insights.memory.improved')}
              </h3>
              <ul className="flex flex-col gap-2" data-testid="memory-improved">
                {improved.map((item) => (
                  <li key={item.label} className="flex items-start gap-2">
                    <CheckIcon size={20} className="mt-0.5 shrink-0 text-primary-ink" />
                    <span>
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-ink-soft">
                        {' · '}
                        {tDynamic(t, `parent.insights.memory.why.${item.why}`)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </Panel>
  )
}

function dedupe<T extends { label: string }>(list: readonly T[]): T[] {
  const seen = new Set<string>()
  return list.filter((item) => (seen.has(item.label) ? false : (seen.add(item.label), true)))
}
