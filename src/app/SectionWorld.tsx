import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { sectionOf } from '@/features/hubs/sections'

/**
 * The world of the page's section on <html data-world> (Phase 40): each
 * section has its own calm background and colour (styles/index.css). The
 * parent and admin areas and the first screens have none.
 */
export function SectionWorld() {
  const { pathname } = useLocation()
  const world = sectionOf(pathname)
  useEffect(() => {
    const root = document.documentElement
    if (world) root.dataset.world = world
    else delete root.dataset.world
  }, [world])
  return null
}
