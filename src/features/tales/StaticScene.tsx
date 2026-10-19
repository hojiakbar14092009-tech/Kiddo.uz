import { Img3D } from '@/features/learn/Img3D'
import { BACKDROPS } from './backdrops'
import type { SceneSpec } from './content'

/**
 * The same scene as a flat picture, for devices without WebGL (or while the
 * 3D scene loads): the sky, the ground and the characters where they end up.
 */
export function StaticScene({ scene, label }: { scene: SceneSpec; label: string }) {
  const look = BACKDROPS[scene.backdrop]
  return (
    <div
      role="img"
      aria-label={label}
      data-testid="tale-static-scene"
      className="relative size-full overflow-hidden"
      style={{
        background: `linear-gradient(${look.sky} 0%, ${look.skyLow} 58%, ${look.ground} 58%)`,
      }}
    >
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
      {scene.actors.map((actor, index) => {
        const x = actor.toX ?? actor.x
        const depth = actor.z ?? 0
        const size = (actor.size ?? 1) * (15 + depth * 3)
        const bottom = 16 + (1 - depth) * 6 + (actor.y ?? 0) * 13
        return (
          <Img3D
            key={index}
            name={actor.asset}
            className="absolute -translate-x-1/2 drop-shadow-md"
            style={{
              left: `${50 + (x / 3.4) * 42}%`,
              bottom: `${bottom}%`,
              width: `${size}%`,
              zIndex: Math.round((depth + 3) * 10),
            }}
            eager
          />
        )
      })}
    </div>
  )
}
