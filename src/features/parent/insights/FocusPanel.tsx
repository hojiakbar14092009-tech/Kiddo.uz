import { useTranslation } from 'react-i18next'
import { useChildPlan } from '@/domain/adaptive'
import { tDynamic } from '@/lib/tDynamic'
import { childAge, type ChildProfile } from '@/store/familyStore'
import { Panel } from '../dashboard/Panel'
import { parentSkillNameKey } from './skillLabel'

/**
 * Learning focus (Phase 15): what the adaptive service plans for the child's
 * maths and why, in the words of skills and reasons, never a label for the
 * child. Read-only; the same deterministic plan the Math Lab uses.
 */
export function FocusPanel({ child }: { child: ChildProfile }) {
  const { t } = useTranslation()
  const plan = useChildPlan(child.id, childAge(child), 'number', 'math')
  const names = (skills: readonly string[]) => [
    ...new Set(skills.map((skill) => tDynamic(t, parentSkillNameKey(skill)))),
  ]
  const groups = [
    { id: 'needs', items: names(plan.focus) },
    { id: 'reviewSoon', items: names([...plan.reviews, ...plan.reviewSoon]) },
    { id: 'mastered', items: names(plan.mastered) },
  ] as const

  return (
    <Panel title={t('parent.insights.focus.title')} id="focus">
      <p className="text-ink-soft">{t('parent.insights.focus.intro')}</p>
      <div className="flex flex-col gap-1" data-testid="focus-current">
        <h3 className="font-display text-lg font-bold">{t('parent.insights.focus.current')}</h3>
        <p className="font-semibold">{t('parent.insights.focus.level', { level: plan.level })}</p>
        <p className="text-sm text-ink-soft">
          {t('parent.insights.focus.band', { band: plan.band })}
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.id}
            data-testid={`focus-${group.id}`}
            className="rounded-2xl border-2 border-line px-4 py-3"
          >
            <dt className="font-display text-lg font-bold">
              {tDynamic(t, `parent.insights.focus.${group.id}`)}
            </dt>
            {group.items.length === 0 ? (
              <dd className="text-ink-soft">{t('parent.insights.focus.none')}</dd>
            ) : (
              group.items.map((item) => <dd key={item}>{item}</dd>)
            )}
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-bold">{t('parent.insights.focus.why')}</h3>
        <ul className="list-disc pl-5" data-testid="focus-reasons">
          {plan.reasons.map((reason) => (
            <li key={reason}>{tDynamic(t, `parent.insights.focus.reasons.${reason}`)}</li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}
