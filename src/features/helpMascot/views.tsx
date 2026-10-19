import clsx from 'clsx'
import type { Language } from '@/content/languages'
import { Img3D } from '@/features/learn/Img3D'
import { COPY } from './copy'
import { showValue, type Claim } from './generate'

/** What the mascot answered, and – once fixed – the right answer in its place. */
export function ClaimView({
  claim,
  language,
  corrected = false,
  size = 'lg',
}: {
  claim: Claim
  language: Language
  corrected?: boolean
  size?: 'lg' | 'md'
}) {
  const big = size === 'lg'
  const answer = <AnswerSlot claim={claim} language={language} corrected={corrected} big={big} />
  if (claim.type === 'sum') {
    return (
      <p
        className={clsx(
          'flex flex-wrap items-center justify-center gap-2 font-display font-extrabold',
          big ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl',
        )}
      >
        <span>{claim.a}</span>
        <span>{claim.op === '+' ? '+' : '−'}</span>
        <span>{claim.b}</span>
        <span>=</span>
        {answer}
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Img3D
        name={claim.word.picture}
        className={big ? 'size-24 max-h-[20vh] sm:size-32' : 'size-14 sm:size-16'}
        eager
      />
      <span
        aria-hidden="true"
        className={clsx('font-display font-extrabold text-ink-soft', big ? 'text-4xl' : 'text-2xl')}
      >
        →
      </span>
      {answer}
    </div>
  )
}

function AnswerSlot({
  claim,
  language,
  corrected,
  big,
}: {
  claim: Claim
  language: Language
  corrected: boolean
  big: boolean
}) {
  const copy = COPY[language]
  const text = big
    ? claim.type === 'spelling'
      ? 'text-4xl sm:text-5xl'
      : 'text-5xl sm:text-6xl'
    : claim.type === 'spelling'
      ? 'text-2xl sm:text-3xl'
      : 'text-3xl sm:text-4xl'
  const wrong = claim.shown !== claim.right
  if (!corrected || !wrong) {
    return (
      <span
        className={clsx(
          'inline-flex min-w-[1.6em] justify-center rounded-[20px] bg-lilac-soft px-3 py-1 font-display font-extrabold',
          text,
        )}
        lang={language}
      >
        {showValue(claim, claim.shown, language)}
      </span>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-testid="help-corrected">
      <span className="sr-only">{copy.mascotSaid}:</span>
      <s
        className={clsx(
          'rounded-[20px] bg-oops-soft px-3 py-1 font-display font-extrabold text-oops-ink decoration-4',
          text,
        )}
        lang={language}
        data-testid="help-wrong"
      >
        {showValue(claim, claim.shown, language)}
      </s>
      <span aria-hidden="true" className="font-display text-3xl font-extrabold text-primary-ink">
        ➜
      </span>
      <span className="sr-only">{copy.fixed}:</span>
      <span
        className={clsx(
          'rounded-[20px] bg-primary-soft px-3 py-1 font-display font-extrabold text-primary-ink ring-4 ring-primary',
          text,
        )}
        lang={language}
        data-testid="help-right"
      >
        {showValue(claim, claim.right, language)}
      </span>
    </span>
  )
}

/** A sum shown with pictures to count; taken-away pictures are crossed out. */
export function Counters({ claim, counter }: { claim: Claim; counter: string }) {
  if (claim.type !== 'sum') return null
  const items =
    claim.op === '+'
      ? [
          ...Array.from({ length: claim.a }, () => 'a'),
          'plus',
          ...Array.from({ length: claim.b }, () => 'b'),
        ]
      : Array.from({ length: claim.a }, (_, index) => (index >= claim.a - claim.b ? 'gone' : 'a'))
  return (
    <div className="flex max-w-md flex-wrap items-center justify-center gap-1" aria-hidden="true">
      {items.map((item, index) =>
        item === 'plus' ? (
          <span key={index} className="px-1 font-display text-3xl font-extrabold">
            +
          </span>
        ) : (
          <span key={index} className="relative">
            <Img3D
              name={counter}
              className={clsx('size-9 sm:size-10', item === 'gone' && 'opacity-40')}
            />
            {item === 'gone' && (
              <span className="absolute inset-0 flex items-center justify-center font-display text-3xl font-extrabold text-oops-ink">
                ✕
              </span>
            )}
          </span>
        ),
      )}
    </div>
  )
}
