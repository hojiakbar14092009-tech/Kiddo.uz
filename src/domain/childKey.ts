/**
 * Per-child data is kept under the child's id; before any profile exists the
 * one playing is a guest. A leaf module (no imports), so stores that depend
 * on each other can share it without an import cycle at load time.
 */
export const GUEST_KEY = 'guest'
