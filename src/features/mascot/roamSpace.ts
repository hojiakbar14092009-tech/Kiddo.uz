/** Where the roaming robots are, so two of them are never in one place. */

export interface Point {
  x: number
  y: number
}

/**
 * Which card each robot is on or heading to. Two robots never share a card:
 * one waits or picks another, and a robot never hops across a card another
 * robot is standing on, so they never meet in one place.
 */
const claimed = new Map<Element, symbol>()

export function claim(target: Element, me: symbol) {
  for (const [element, owner] of claimed) if (owner === me) claimed.delete(element)
  claimed.set(target, me)
}

export function release(me: symbol) {
  for (const [element, owner] of claimed) if (owner === me) claimed.delete(element)
}

/** Cards no other robot has claimed; the robot's own card only if nothing else is free. */
export function freeTargets(all: Element[], me: symbol): Element[] {
  const open = all.filter((element) => {
    const owner = claimed.get(element)
    return owner === undefined || owner === me
  })
  const elsewhere = open.filter((element) => claimed.get(element) !== me)
  return elsewhere.length > 0 ? elsewhere : open
}

/** Where each robot is standing (page coordinates, top-left of the robot). */
const standing = new Map<symbol, Point>()

export function setStanding(me: symbol, point: Point) {
  standing.set(me, point)
}

export function clearStanding(me: symbol) {
  standing.delete(me)
}

/** Each other robot's trip: from where it stands to the card it claimed (or just where it stands). */
export function othersTrips(me: symbol, spot: (card: Element) => Point): Trip[] {
  const trips: Trip[] = []
  for (const [owner, point] of standing) {
    if (owner === me) continue
    const card = [...claimed].find(([, who]) => who === owner)?.[0]
    trips.push([point, card ? spot(card) : point])
  }
  return trips
}

export type Trip = [Point, Point]

/** Distance from point p to the segment a–b. */
function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = dx * dx + dy * dy
  const k =
    length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length))
  return Math.hypot(p.x - (a.x + k * dx), p.y - (a.y + k * dy))
}

function intersects([a, b]: Trip, [c, d]: Trip): boolean {
  const cross = (o: Point, p: Point, q: Point) =>
    (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x)
  const d1 = cross(c, d, a)
  const d2 = cross(c, d, b)
  const d3 = cross(a, b, c)
  const d4 = cross(a, b, d)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** The closest two trips ever get. */
function tripDistance(one: Trip, other: Trip): number {
  if (intersects(one, other)) return 0
  return Math.min(
    pointToSegment(one[0], other[0], other[1]),
    pointToSegment(one[1], other[0], other[1]),
    pointToSegment(other[0], one[0], one[1]),
    pointToSegment(other[1], one[0], one[1]),
  )
}

/**
 * Would hopping from `from` to `to` pass by, cross the path of, or end at
 * another robot? Then it picks another card or waits, so two robots are never
 * in one place.
 */
export function crossesAnother(from: Point, to: Point, others: Trip[], size: number): boolean {
  return others.some((trip) => tripDistance([from, to], trip) < size * 0.9)
}
