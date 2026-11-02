import { exitAdminPreview } from './adminPreview'

/**
 * The admin's sandbox tab (Phase 51): a bar at the top of the page, in the
 * flow (it pushes the app down instead of covering its controls). Uzbek only,
 * like the admin panel; the child never sees it in the real app. Loaded on
 * demand, so the normal first screen does not carry it.
 */
export default function PreviewBanner() {
  return (
    <section
      aria-labelledby="admin-preview-title"
      data-testid="admin-preview-banner"
      className="relative z-[45] flex flex-wrap items-center gap-x-3 gap-y-2 bg-ink px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] text-surface"
    >
      <div role="status" className="min-w-0 flex-1 leading-tight">
        <p id="admin-preview-title" className="font-display text-base font-bold">
          Admin ko‘rish rejimi
        </p>
        <p className="text-sm opacity-90">Bu sinov profili. Hech narsa saqlanmaydi.</p>
      </div>
      <button
        type="button"
        onClick={() => exitAdminPreview()}
        data-testid="admin-preview-exit"
        className="min-h-11 min-w-11 shrink-0 rounded-full bg-surface px-5 font-display font-bold text-ink transition-colors hover:bg-cream focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
      >
        Chiqish
      </button>
    </section>
  )
}
