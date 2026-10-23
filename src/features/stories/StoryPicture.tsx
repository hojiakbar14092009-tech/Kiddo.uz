import { motion, useReducedMotion } from 'framer-motion'
import { Img3D } from '@/components/ui/Img3D'
import { STORY_BACKDROPS } from './backdrops'
import type { PagePicture } from './types'

const left = (x: number) => `${50 + (x / 3.4) * 42}%`

/**
 * A page's picture: the place (sky, hills, ground, path) and its characters,
 * drawn flat like the tales' still scenes. A character with `toX` walks to
 * its place and one with `hop` bounces gently – both only without reduced
 * motion; otherwise everything simply stands where it ends up.
 */
export function StoryPicture({ picture, label }: { picture: PagePicture; label: string }) {
  const reduceMotion = useReducedMotion() ?? false
  const look = STORY_BACKDROPS[picture.backdrop]
  return (
    <div
      role="img"
      aria-label={label}
      data-testid="story-picture"
      className="relative size-full overflow-hidden"
      style={{
        background: `linear-gradient(${look.sky} 0%, ${look.skyLow} 58%, ${look.ground} 58%)`,
      }}
    >
      {look.stars &&
        [
          [12, 10],
          [30, 22],
          [52, 8],
          [70, 18],
          [88, 9],
          [42, 30],
          [80, 32],
        ].map(([x, y], index) => (
          <span
            key={index}
            aria-hidden="true"
            className="absolute size-1.5 rounded-full bg-white/80"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        ))}
      {look.peaks && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          className="absolute inset-x-0 top-[26%] h-[34%] w-full"
        >
          <path d="M0 40 L18 8 L30 26 L46 2 L62 24 L76 10 L100 34 L100 40 Z" fill={look.peaks} />
          <path d="M42 9 L46 2 L50 9 Z M15 13 L18 8 L21 13 Z" fill="#ffffff" opacity="0.9" />
        </svg>
      )}
      {look.awnings && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 flex h-[16%]">
          {['#E8604C', '#F5C04A', '#4FAE8C', '#E8604C', '#F5C04A', '#4FAE8C'].map((color, i) => (
            <span
              key={i}
              className="h-full flex-1 rounded-b-[40%]"
              style={{ background: i % 2 === 0 ? color : '#FFF6E6' }}
            />
          ))}
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-x-[-10%] top-[48%] h-[22%] rounded-[50%]"
        style={{ background: look.hill }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[58%] bottom-0"
        style={{ background: look.ground }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[8%] top-[72%] h-[14%] rounded-[50%]"
        style={{ background: look.path }}
      />
      {look.water && (
        <div
          aria-hidden="true"
          className="absolute top-[62%] right-[8%] h-[12%] w-[38%] rounded-[50%] bg-[#6EC6F0]"
        />
      )}
      {picture.actors.map((actor, index) => {
        const depth = actor.z ?? 0
        // a little larger than the tales' scenes: the picture is the page's main thing
        const size = (actor.size ?? 1) * (19 + depth * 4)
        const bottom = 16 + (1 - depth) * 6 + (actor.y ?? 0) * 13
        const walks = actor.toX !== undefined && !reduceMotion
        const end = left(actor.toX ?? actor.x)
        return (
          <motion.div
            key={index}
            className="absolute -translate-x-1/2"
            initial={walks ? { left: left(actor.x) } : false}
            animate={actor.hop && !reduceMotion ? { left: end, y: [0, -8, 0] } : { left: end }}
            transition={
              actor.hop && !reduceMotion
                ? { y: { duration: 0.9, repeat: Infinity, repeatDelay: 1.2, ease: 'easeInOut' } }
                : { left: { duration: 1.6, ease: 'easeOut' } }
            }
            style={{
              left: end,
              bottom: `${bottom}%`,
              width: `${size}%`,
              zIndex: Math.round((depth + 3) * 10),
            }}
          >
            <Img3D name={actor.asset} className="w-full drop-shadow-md" eager />
          </motion.div>
        )
      })}
    </div>
  )
}
