/**
 * Merging a device's saved stores with the account's copy, losing nothing: the first sign-in on a
 * device, or two devices that both changed something. Children (and per-child progress, keyed
 * `byChild`) are joined by id; for a child both sides have, this device's copy wins (it holds the
 * unsent changes). Lists of records with an `id` (activity events) are joined by id.
 *
 * shortcut: the same child changed on two devices at once keeps one device's copy of that child,
 * not a field-by-field merge; per-child field merging if families report lost stars.
 */
type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value)
const hasIds = (value: unknown): value is Json[] =>
  Array.isArray(value) && value.every((item) => isObject(item) && typeof item.id === 'string')

function joinById(local: Json[], server: Json[]): Json[] {
  const byId = new Map<string, Json>()
  for (const item of server) byId.set(String(item.id), item)
  for (const item of local) byId.set(String(item.id), item)
  const joined = [...byId.values()]
  // events keep their order in time
  if (joined.every((item) => typeof item.at === 'string')) joined.sort((a, b) => String(a.at).localeCompare(String(b.at)))
  return joined
}

export function mergeState(local: Json, server: Json): Json {
  const out: Json = { ...server, ...local }
  for (const [field, mine] of Object.entries(local)) {
    const theirs = server[field]
    if (field === 'byChild' && isObject(mine) && isObject(theirs)) out[field] = { ...theirs, ...mine }
    else if (hasIds(mine) && hasIds(theirs)) out[field] = joinById(mine, theirs)
  }
  return out
}

/** A saved store as zustand persist writes it: `{ state, version }`. */
export interface Saved {
  state: Json
  version?: number
}

export function mergeSaved(local: Saved | null, server: Saved | null): Saved | null {
  if (!local) return server
  if (!server) return local
  return {
    state: mergeState(local.state, server.state),
    version: Math.max(local.version ?? 0, server.version ?? 0),
  }
}
