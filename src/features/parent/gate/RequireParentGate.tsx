import { Outlet } from 'react-router-dom'

/**
 * `/parent` opens without the grown-ups question (it annoyed parents on every visit). The
 * question is asked only before buying Pro and before deleting an account or data
 * (useAdultCheck in ProSection, AccountPanel, ProfilesSection); switching a child's profile
 * still asks (ChildSelectPage).
 */
export function RequireParentGate() {
  return <Outlet />
}
