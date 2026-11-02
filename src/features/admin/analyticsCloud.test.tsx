import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const rpc = vi.fn(async (name: string) => {
  if (name === 'admin_analytics_funnel') {
    return { data: [{ name: 'first_opened', installs: 4 }], error: null }
  }
  if (name === 'admin_analytics_exits') {
    return { data: [{ screen: '/math-lab', closes: 3 }], error: null }
  }
  return { data: '2026-11-02T09:05:00Z', error: null }
})
vi.mock('@/services/supabase/client', () => ({ getAdminSupabase: () => ({ rpc }) }))

/* Phase 53: the cloud exits come from a view refreshed every 10 minutes; the panel says when. */
describe('admin analytics from the cloud (Phase 53)', () => {
  it('shows the server numbers and when the exits were last brought up to date', async () => {
    const { AnalyticsSection } = await import('./AnalyticsSection')
    render(<AnalyticsSection source="cloud" />)
    expect(await screen.findByTestId('admin-exits-refreshed')).toHaveTextContent(
      'Oxirgi yangilanish: 14:05.',
    )
    expect(screen.getByTestId('admin-exits')).toHaveTextContent('/math-lab')
    expect(rpc).toHaveBeenCalledWith('admin_stats_refreshed_at')
  })
})
