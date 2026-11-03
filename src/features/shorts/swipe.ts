/** Has this device's child swiped to a next cartoon once? Then the hand stops showing. */
const KEY = 'kiddo.shorts.swiped'

export function learnedSwipe(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function markSwipeLearned(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // a private window: it shows again next time
  }
}
