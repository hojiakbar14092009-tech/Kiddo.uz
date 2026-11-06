/*
 * The robot's hello on Home ("Xayrli tong! Bugun nima o‘rganamiz?") is said once each
 * time the app is opened: coming back to Home from a game does not say it again. Kept in
 * memory only, so a new launch (or a reload) greets again.
 */

let greeted = false

export function hasGreeted(): boolean {
  return greeted
}

export function markGreeted(): void {
  greeted = true
}

/** For tests: as if the app had just been opened. */
export function resetGreeted(): void {
  greeted = false
}
