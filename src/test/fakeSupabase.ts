/**
 * A small in-memory stand-in for supabase-js table reads in tests: `from(table).select()` with
 * `eq`, `in`, `order`, `range`, `limit` and `maybeSingle`, applied to the given rows. Every
 * request is recorded (`requests`), so tests can check how much was read.
 */
export function fakeTables(tables: Record<string, readonly object[]>) {
  const requests: { table: string; filters: string[] }[] = []
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])] as Record<string, unknown>[]
    const filters: string[] = []
    requests.push({ table, filters })
    let single = false
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.push(`eq:${column}`)
        rows = rows.filter((row) => row[column] === value)
        return query
      },
      in: (column: string, values: unknown[]) => {
        filters.push(`in:${column}`)
        rows = rows.filter((row) => values.includes(row[column]))
        return query
      },
      like: (column: string, pattern: string) => {
        filters.push(`like:${column}`)
        const prefix = pattern.replace(/%$/, '')
        rows = rows.filter((row) => String(row[column]).startsWith(prefix))
        return query
      },
      order: (column: string, { ascending = true }: { ascending?: boolean } = {}) => {
        rows.sort(
          (a, b) => String(a[column]).localeCompare(String(b[column])) * (ascending ? 1 : -1),
        )
        return query
      },
      range: (start: number, end: number) => {
        filters.push(`range:${start}-${end}`)
        rows = rows.slice(start, end + 1)
        return query
      },
      limit: (count: number) => {
        rows = rows.slice(0, count)
        return query
      },
      maybeSingle: () => {
        single = true
        return query
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        resolve({ data: single ? (rows[0] ?? null) : rows, error: null }),
    }
    return query
  }
  return { client: { from }, requests }
}
