import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LockIcon } from '@/components/icons'

/**
 * A quiet way into the parent area: small, grey and at the bottom, so children
 * are not drawn to it. The parent gate behind it does the real protecting.
 */
export function ParentAreaLink() {
  const { t } = useTranslation()
  return (
    <Link
      to="/parent"
      className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-base font-semibold text-ink-soft"
    >
      <LockIcon size={18} />
      {t('common.parentArea')}
    </Link>
  )
}
