import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalyticsStore } from '@/domain/analytics'
import { tashkentDay } from '@/lib/dates'
import { activeSeason, seasonOn } from '@/features/seasons/seasons'
import { homeLine } from '@/features/mascot/life'
import { clampRestHours, DEFAULT_APP_SETTINGS, isRestHour } from '@/store/appSettingsStore'
import { bulkCodes, CODE_PATTERN } from './adminPromo'
import type { AdminData } from './adminData'
import { useDeviceVoiceReviews, voiceLines } from './adminVoices'
import { teamError } from './adminTeam'
import { ContentSection } from './ContentSection'
import { RetentionTiles } from './RetentionTiles'
import { retentionOf } from './retention'
import { TeamSection } from './TeamSection'
import { VoicesSection } from './VoicesSection'

/* Phase 45: the admin's new controls. */

describe('settings the admin sets for every family', () => {
  it('rest hours stay in their ranges and cross midnight', () => {
    expect(clampRestHours({ start: 21, end: 6 })).toEqual({ start: 21, end: 6 })
    // out of range: the nearest allowed hour; not a number: the default
    expect(clampRestHours({ start: 3, end: 15 })).toEqual({ start: 18, end: 9 })
    expect(clampRestHours({ start: 17.6, end: 4.2 })).toEqual({ start: 18, end: 4 })
    expect(clampRestHours(null)).toEqual({ start: 22, end: 5 })
    const rest = { start: 21, end: 6 }
    expect([20, 21, 23, 0, 5, 6, 12].map((hour) => isRestHour(hour, rest))).toEqual([
      false,
      true,
      true,
      true,
      true,
      false,
      false,
    ])
    // the admin's hours decide the night line on Home
    const base = { hour: 21, name: null, birthday: false, homework: 0, planDone: false }
    expect(homeLine({ ...base, resting: true }).key).toBe('night')
    expect(homeLine({ ...base, resting: false }).key).toBe('evening')
    // rest hours 23–05: at 22:30 and 04:30 the robot is awake, so Home never says "time to rest"
    expect(homeLine({ ...base, hour: 22, resting: false }).key).toBe('evening')
    expect(homeLine({ ...base, hour: 4, resting: false }).key).toBe('morning')
  })

  it('day-2 / day-7 returns are counted among installs old enough for them', () => {
    const log = [
      { name: 'first_opened', install: 'old', day: '2026-11-01' },
      { name: 'returned_day2', install: 'old', day: '2026-11-02' },
      { name: 'first_opened', install: 'week', day: '2026-10-25' },
      { name: 'returned_day7', install: 'week', day: '2026-11-01' },
      { name: 'first_opened', install: 'today', day: '2026-11-10' },
      { name: 'first_opened', install: 'ancient', day: '2026-09-01' },
      { name: 'returned_day2', install: 'ancient', day: '2026-09-02' },
    ]
    expect(retentionOf(log, '2026-11-10')).toEqual({
      installs: 3,
      due2: 2,
      day2: 1,
      due7: 2,
      day7: 1,
    })
  })

  it('holidays come by the calendar, and the admin may turn them off or choose one', () => {
    expect(seasonOn(new Date(2027, 2, 21))).toBe('navruz')
    expect(seasonOn(new Date(2026, 11, 31))).toBe('newYear')
    expect(seasonOn(new Date(2027, 0, 2))).toBe('newYear')
    expect(seasonOn(new Date(2026, 8, 1))).toBe('independence')
    expect(seasonOn(new Date(2026, 8, 3))).toBe('knowledge')
    expect(seasonOn(new Date(2026, 5, 10))).toBeNull()
    expect(activeSeason('off', new Date(2027, 2, 21))).toBeNull()
    expect(activeSeason('navruz', new Date(2026, 5, 10))).toBe('navruz')
    const base = { hour: 10, name: 'Ali', birthday: false, homework: 0, planDone: false }
    expect(homeLine({ ...base, season: 'navruz' }).key).toBe('season.navruz')
    // a birthday or homework still comes first
    expect(homeLine({ ...base, season: 'navruz', homework: 1 }).key).toBe('homeworkNamed')
  })
})

describe('promo codes in bulk', () => {
  it('makes distinct, valid codes with the prefix, skipping taken ones', () => {
    let seed = 1
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    const codes = bulkCodes('kid-do', 50, new Set(), random)
    expect(codes).toHaveLength(50)
    expect(new Set(codes).size).toBe(50)
    for (const code of codes) {
      expect(code.startsWith('KIDDO')).toBe(true)
      expect(CODE_PATTERN.test(code)).toBe(true)
      // no letters a child's parent could misread (0/O, 1/I) in the made part
      expect(code.slice('KIDDO'.length)).not.toMatch(/[O0I1]/)
    }
    expect(bulkCodes('X', 500)).toHaveLength(200)
    expect(bulkCodes('A'.repeat(30), 3).every((code) => code.length <= 20)).toBe(true)
  })
})

describe('voices', () => {
  beforeEach(() => useDeviceVoiceReviews.setState({ reviews: {} }))

  it('every spoken sentence once, with whether it is recorded', () => {
    const lines = voiceLines('uz')
    expect(lines.length).toBeGreaterThan(100)
    expect(new Set(lines.map((line) => line.key)).size).toBe(lines.length)
    expect(lines.some((line) => line.recorded)).toBe(true)
    expect(lines.some((line) => !line.recorded)).toBe(true)
  })

  it('the admin listens, approves and returns recordings (kept on this device here)', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    render(<VoicesSection source="device" />)
    expect(screen.getByTestId('voice-counts')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Yozilgan' }))
    const list = screen.getByTestId('voice-lines')
    const first = within(list).getAllByRole('listitem')[0]!
    fireEvent.click(within(first).getByRole('button', { name: 'Tinglash' }))
    expect(within(first).getByRole('button', { name: 'To‘xtatish' })).toBeInTheDocument()
    fireEvent.click(within(first).getByRole('button', { name: 'Tasdiqlash' }))
    await waitFor(() =>
      expect(Object.values(useDeviceVoiceReviews.getState().reviews)[0]?.status).toBe('approved'),
    )
    fireEvent.click(screen.getByRole('radio', { name: 'Tasdiqlangan' }))
    expect(within(screen.getByTestId('voice-lines')).getAllByRole('listitem')).toHaveLength(1)
  })
})

describe('admins and the audit log', () => {
  it('the server’s refusals are said in the admin’s words', () => {
    expect(teamError('last_admin')).toMatch(/Oxirgi admin/)
    expect(teamError('P0001: not_self')).toMatch(/O‘zingizni/)
    expect(teamError('function public.admin_list() does not exist')).toMatch(/0019/)
  })

  it('a device admin is told the list lives in the cloud', () => {
    render(<TeamSection source="device" />)
    expect(screen.getByText(/bulutli \(Supabase\) admin/)).toBeInTheDocument()
  })
})

describe('content and seasons', () => {
  it('counts the content and saves the season for every family', async () => {
    const saveSettings = vi.fn(async () => undefined)
    const data = {
      settings: { ...DEFAULT_APP_SETTINGS },
      actions: { saveSettings },
    } as unknown as AdminData
    render(<ContentSection data={data} />)
    expect(
      within(screen.getByTestId('content-counts')).getByText('O‘zbek alifbosi'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Navro‘z (hozir)' }))
    expect(screen.getByTestId('season-now')).toHaveTextContent('Navro‘z')
    fireEvent.click(screen.getByRole('button', { name: 'Saqlash' }))
    await waitFor(() =>
      expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({ season: 'navruz' })),
    )
  })
})

describe('retention tiles', () => {
  it('shows day-2 and day-7 returns as shares of new installs (this device)', () => {
    const at = new Date().toISOString()
    const day = tashkentDay()
    useAnalyticsStore.setState({
      log: [
        { id: '1', name: 'first_opened', at, day, install: 'a' },
        { id: '2', name: 'first_opened', at, day, install: 'b' },
        { id: '3', name: 'returned_day2', at, day, install: 'a' },
      ],
    })
    render(<RetentionTiles source="device" />)
    const tiles = screen.getAllByTestId('retention-tile')
    expect(tiles[0]).toHaveTextContent('2')
    // installs opened today are not yet due to come back
    expect(tiles[1]).toHaveTextContent('—')
    expect(tiles[2]).toHaveTextContent('—')
  })
})
