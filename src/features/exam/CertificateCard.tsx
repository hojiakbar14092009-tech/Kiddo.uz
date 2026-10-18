import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import type { Language } from '@/content/languages'
import { formatDayMonth } from '@/lib/dates'
import { CERTIFICATE_HEIGHT, CERTIFICATE_WIDTH, drawCertificate } from './certificate'
import { EXAM_ROUNDS } from './exam'

interface CertificateCardProps {
  name: string
  language: Language
  correct: number
  /** When the test was passed (ISO string, so the effect runs once). */
  passedAt: string
}

/** Draws the certificate once, shows it, and offers it as a PNG download. */
export function CertificateCard({ name, language, correct, passedAt }: CertificateCardProps) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const draw = async () => {
      // Wait for Rubik/Nunito, otherwise the canvas falls back to a system font.
      if (document.fonts) {
        await Promise.all([
          document.fonts.load(`800 40px Rubik`),
          document.fonts.load(`700 40px Nunito`),
        ]).catch(() => undefined)
      }
      const date = new Date(passedAt)
      const canvas = document.createElement('canvas')
      canvas.width = CERTIFICATE_WIDTH
      canvas.height = CERTIFICATE_HEIGHT
      const context = canvas.getContext('2d')
      if (!context || cancelled) return
      drawCertificate(context, {
        heading: t('exam.certificate.heading'),
        name,
        body: t(`exam.certificate.body.${language}`),
        score: t('exam.certificate.score', { correct, total: EXAM_ROUNDS }),
        date: `${formatDayMonth(date)}.${date.getFullYear()}`,
        footer: 'Kiddo',
      })
      setUrl(canvas.toDataURL('image/png'))
    }
    void draw()
    return () => {
      cancelled = true
    }
  }, [correct, language, name, passedAt, t])

  if (!url) return null

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-4">
      <img
        src={url}
        alt={t('exam.certificate.alt', { name })}
        className="w-full rounded-3xl shadow-[0_8px_0_var(--color-line)]"
      />
      <Button variant="coin" size="md" onClick={() => download(url, name)}>
        {t('exam.certificate.download')}
      </Button>
    </div>
  )
}

function download(url: string, name: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = `kiddo-${name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() || 'sertifikat'}.png`
  link.click()
}
