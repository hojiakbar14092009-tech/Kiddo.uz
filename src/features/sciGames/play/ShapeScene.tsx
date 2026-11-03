import { motion, useReducedMotion } from 'framer-motion'
import { Img3D } from '@/components/ui/Img3D'
import type { ShapePicture } from './shapeRules'

type Id = ShapePicture['id']

/** Each picture's real world: its sky, its ground and how the thing lives in it. */
const WORLD: Record<Id, { sky: string; ground: string; picture: string; extra: string }> = {
  house: {
    sky: 'linear-gradient(#8fd3ff, #d9f1ff)',
    ground: 'linear-gradient(#7fcf6b, #4fa64a)',
    picture: 'house',
    extra: 'tree',
  },
  tree: {
    sky: 'linear-gradient(#a8e3ff, #f2fbff)',
    ground: 'linear-gradient(#8bd66f, #5aae4e)',
    picture: 'tree',
    extra: 'bird',
  },
  car: {
    sky: 'linear-gradient(#ffd8a8, #fff3e0)',
    ground: 'linear-gradient(#8a8a96, #5d5d6b)',
    picture: 'car',
    extra: 'pine',
  },
  rocket: {
    sky: 'linear-gradient(#1d2357, #4a3f8f)',
    ground: 'linear-gradient(#b9a7d8, #7f6aa8)',
    picture: 'rocket',
    extra: 'ringed-planet',
  },
}

/**
 * When the child's shapes are all in (Phase 70), the plan grows into the real
 * thing: the shapes they chose step aside into a corner and a living picture
 * takes their place – the house under a sky with a tree, the tree with a bird,
 * the car driving in, the rocket lifting off among the stars.
 */
export function ShapeScene({ id }: { id: Id }) {
  const reduceMotion = useReducedMotion() ?? false
  const world = WORLD[id]
  const night = id === 'rocket'

  const hero = (() => {
    if (reduceMotion) return {}
    switch (id) {
      case 'car':
        return { initial: { x: '-120%' }, animate: { x: 0, y: [0, -2, 0] } }
      case 'rocket':
        return { initial: { y: 30 }, animate: { y: [30, -6, -2] } }
      case 'tree':
        return { initial: { scale: 0.3 }, animate: { scale: 1, rotate: [0, -2, 2, 0] } }
      default:
        return { initial: { scale: 0.6, y: 10 }, animate: { scale: 1, y: 0 } }
    }
  })()

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[2rem]"
      style={{ background: world.sky }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: reduceMotion ? 0 : 0.5 }}
      data-testid="shape-scene"
      data-scene={id}
      aria-hidden="true"
    >
      {night &&
        [12, 30, 48, 70, 86, 22, 62].map((left, i) => (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full bg-white"
            style={{ left: `${left}%`, top: `${8 + ((i * 13) % 40)}%` }}
            animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6 + i * 0.2, repeat: Infinity }}
          />
        ))}
      {!night && (
        <motion.div
          className="absolute top-[8%] -left-1/4 w-1/3"
          animate={reduceMotion ? undefined : { x: ['0%', '360%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        >
          <Img3D name="cloud" className="w-full opacity-90" eager />
        </motion.div>
      )}
      {/* the ground */}
      <div className="absolute inset-x-0 bottom-0 h-[26%]" style={{ background: world.ground }} />
      {id === 'car' && (
        <div className="absolute inset-x-0 bottom-[11%] h-1 bg-[repeating-linear-gradient(90deg,#fff_0_14px,transparent_14px_28px)] opacity-80" />
      )}
      {/* the companion */}
      <motion.div
        className={
          id === 'tree'
            ? 'absolute top-[16%] right-[10%] w-[22%]'
            : id === 'rocket'
              ? 'absolute top-[10%] left-[8%] w-[26%]'
              : 'absolute right-[6%] bottom-[18%] w-[28%]'
        }
        animate={
          reduceMotion
            ? undefined
            : id === 'tree'
              ? { y: [0, -8, 0], x: [0, 6, 0] }
              : { rotate: [0, 3, 0] }
        }
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        <Img3D name={world.extra} className="w-full" eager />
      </motion.div>
      {/* the thing the child made, alive */}
      <motion.div
        className="absolute bottom-[12%] left-1/2 w-[58%] -translate-x-1/2"
        {...hero}
        transition={{ type: 'spring', stiffness: 90, damping: 12, delay: reduceMotion ? 0 : 0.6 }}
      >
        {id === 'rocket' && !reduceMotion && (
          <motion.span
            className="absolute -bottom-[14%] left-1/2 h-[30%] w-[22%] -translate-x-1/2 rounded-full bg-[radial-gradient(#fff6b0,#ff9a3c_55%,transparent_75%)]"
            animate={{ scaleY: [1, 1.35, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 0.25, repeat: Infinity }}
          />
        )}
        {id === 'house' && !reduceMotion && (
          <motion.span
            className="absolute top-[-6%] right-[22%] size-[16%] rounded-full bg-white/80"
            animate={{ y: [0, -40], opacity: [0.8, 0], scale: [0.6, 1.6] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}
        <Img3D name={world.picture} className="relative w-full drop-shadow-xl" eager />
      </motion.div>
    </motion.div>
  )
}
