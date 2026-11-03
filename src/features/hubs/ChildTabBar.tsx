import clsx from 'clsx'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { Img3D } from '@/components/ui/Img3D'
import { SECTION_TABS, SECTIONS } from './sections'
import { FitWords } from '@/components/ui/FitWords'

/**
 * The child's four sections as a bar at the bottom of the hub pages (Phase
 * 40): Bugun, O‘rgan, Kashf et, Mening dunyom. Big targets with a picture and
 * a word, the current one marked; the parent area stays apart, behind its gate.
 */
export function ChildTabBar() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('tabs.label')}
      data-testid="child-tabs"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-surface/95 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-3xl grid-cols-4">
        {SECTIONS.map((section) => {
          const tab = SECTION_TABS[section]
          return (
            <li key={section}>
              <NavLink
                to={tab.route}
                end
                data-section={section}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center font-display text-sm leading-tight font-bold transition-colors sm:min-h-[4.5rem] sm:text-base short:min-h-12 short:flex-row short:gap-1.5',
                    isActive ? 'text-primary-ink' : 'text-ink-soft',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'flex size-10 shrink-0 items-center justify-center rounded-2xl transition-transform short:size-8',
                        isActive && 'scale-110 bg-primary-soft',
                      )}
                    >
                      <Img3D name={tab.icon} className="size-8 short:size-6" eager />
                    </span>
                    {/* a phone held sideways sets the label beside the icon, with room to spare:
                        there it keeps its own width (no size container) */}
                    <FitWords
                      text={t(`tabs.${section}`)}
                      className="short:w-auto short:[container-type:normal]"
                    />
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
