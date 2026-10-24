import { describe, expect, it } from 'vitest'
import hardening from '../../../supabase/migrations/0010_integrity_hardening.sql?raw'
import connected from '../../../supabase/migrations/0011_connected_world.sql?raw'
import { BUILDINGS } from './world'

/** Every migration that adds buildings (0010 the first city, 0011 the connected world). */
const MIGRATIONS = [hardening, connected]
const migration = hardening

/*
 * The server checks every upgrade against its own price list (migration
 * 0010: building_levels / building_costs). That list must say exactly what
 * the city in the app says, or an honest upgrade would be refused (or a
 * cheaper one accepted). The migration writes the rule, not a table of
 * numbers, so the rule is read back here and compared level by level.
 */
function namesIn(list: string | undefined): string[] {
  return [...(list ?? '').matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]!)
}

function serverBuildings(): string[] {
  return MIGRATIONS.flatMap((sql) =>
    namesIn(/unnest\(array\[([\s\S]*?)\]\) b, generate_series\(1, 3\) l/.exec(sql)?.[1]),
  )
}

function serverWorkshops(): string[] {
  return MIGRATIONS.flatMap((sql) => namesIn(/where bl\.building in \(([^)]*)\)/.exec(sql)?.[1]))
}

/** Both migrations use the same star rule. */
it('every migration asks the same stars per level', () => {
  const rules = MIGRATIONS.map((sql) =>
    /case l when 1 then (\d+) when 2 then (\d+) else (\d+) end/.exec(sql)?.slice(1).join(','),
  )
  expect(rules[0]).toBeDefined()
  expect(new Set(rules).size).toBe(1)
})

const SERVER_STARS = (
  /case l when 1 then (\d+) when 2 then (\d+) else (\d+) end/.exec(migration) ?? []
)
  .slice(1)
  .map(Number)

describe('server building prices (0010) match the city', () => {
  it('reads the rules from the migration', () => {
    expect(serverBuildings().length).toBeGreaterThan(0)
    expect(SERVER_STARS).toHaveLength(3)
  })

  it('lists the same buildings', () => {
    expect([...serverBuildings()].sort()).toEqual(BUILDINGS.map((item) => item.id).sort())
  })

  it('asks the same crystals, parts and stars for every level', () => {
    const workshops = new Set(serverWorkshops())
    for (const building of BUILDINGS) {
      building.levels.slice(1).forEach((level, index) => {
        const number = index + 1
        const expected = {
          crystal: number,
          ...(workshops.has(building.id) ? { part: number } : {}),
        }
        expect(level.cost, `${building.id} level ${number}`).toEqual(expected)
        expect(level.starsNeeded ?? 0, `${building.id} level ${number} stars`).toBe(
          SERVER_STARS[index],
        )
      })
    }
  })
})

describe('server shop prices (0009) match the shop', () => {
  it('lists every outfit and pet at the price the app asks', async () => {
    const { default: balance } =
      await import('../../../supabase/migrations/0009_balance_authority.sql?raw')
    const { OUTFITS } = await import('@/features/shop/outfits')
    const { PET_IDS, PET_PRICE } = await import('@/features/pets/pets')
    const seed =
      /insert into public\.shop_items \(kind, item, price\) values([\s\S]*?)on conflict/.exec(
        balance,
      )?.[1]
    const server = [...(seed ?? '').matchAll(/\('(outfit|pet)', '([a-z0-9-]+)', (\d+)\)/g)].map(
      (match) => `${match[1]}|${match[2]}|${match[3]}`,
    )
    const app = [
      ...OUTFITS.map((outfit) => `outfit|${outfit.id}|${outfit.price}`),
      ...PET_IDS.map((pet) => `pet|${pet}|${PET_PRICE}`),
    ]
    expect(server.length).toBeGreaterThan(0)
    expect([...server].sort()).toEqual([...app].sort())
  })
})
