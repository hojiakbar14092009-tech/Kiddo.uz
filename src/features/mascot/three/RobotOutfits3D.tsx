import { useMemo } from 'react'
import * as THREE from 'three'
import { OUTFIT_COLORS as C, type OutfitId } from '@/features/shop/outfits'

/*
 * Robot clothes for the 3D robot. Sizes follow the head in RobotModel: the
 * head shell is a sphere of radius 0.62 scaled (1.18, 1, 0.95), centred at
 * the origin of the head group.
 */

function useMaterials() {
  return useMemo(() => {
    const plastic = (color: string) =>
      new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6 })
    return {
      cap: plastic(C.cap.main),
      capDark: plastic(C.cap.dark),
      gold: new THREE.MeshPhysicalMaterial({
        color: C.crown.main,
        metalness: 0.55,
        roughness: 0.25,
        side: THREE.DoubleSide,
      }),
      gem: plastic(C.crown.gem),
      petal: plastic(C.flower.petal),
      centre: plastic(C.flower.centre),
      frame: plastic(C.glasses.frame),
      scarf: plastic(C.scarf.main),
      scarfDark: plastic(C.scarf.dark),
      bow: plastic(C.bowtie.main),
      bowDark: plastic(C.bowtie.dark),
    }
  }, [])
}

/** Sits in the head group, so it follows every head turn and nod. */
export function HeadOutfit3D({ id }: { id: OutfitId | undefined }) {
  const m = useMaterials()
  if (id === 'cap') {
    return (
      <group>
        <mesh position={[0, 0.02, 0]} scale={[1.2, 1, 0.98]} material={m.cap}>
          <sphereGeometry args={[0.64, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        </mesh>
        <mesh
          position={[0, 0.27, 0.42]}
          rotation={[0.3, 0, 0]}
          scale={[1, 1, 0.7]}
          material={m.capDark}
        >
          <cylinderGeometry args={[0.44, 0.44, 0.03, 32]} />
        </mesh>
        <mesh position={[0, 0.67, 0]} material={m.capDark}>
          <sphereGeometry args={[0.05, 16, 12]} />
        </mesh>
      </group>
    )
  }
  if (id === 'crown') {
    const points = [0, 1, 2, 3, 4, 5, 6]
    return (
      <group position={[0, 0.62, 0]}>
        <mesh material={m.gold}>
          <cylinderGeometry args={[0.3, 0.33, 0.16, 28, 1, true]} />
        </mesh>
        {points.map((i) => {
          const angle = (i / points.length) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.sin(angle) * 0.3, 0.14, Math.cos(angle) * 0.3]}
              material={m.gold}
            >
              <coneGeometry args={[0.055, 0.13, 12]} />
            </mesh>
          )
        })}
        <mesh position={[0, 0, 0.33]} material={m.gem}>
          <sphereGeometry args={[0.045, 16, 12]} />
        </mesh>
      </group>
    )
  }
  if (id === 'flower') {
    const petals = [0, 1, 2, 3, 4]
    return (
      <group position={[-0.38, 0.5, 0.16]} rotation={[0.3, -0.35, 0.35]}>
        {petals.map((i) => {
          const angle = (i / petals.length) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * 0.075, Math.sin(angle) * 0.075, 0]}
              scale={[1, 1, 0.5]}
              material={m.petal}
            >
              <sphereGeometry args={[0.06, 16, 12]} />
            </mesh>
          )
        })}
        <mesh position={[0, 0, 0.02]} material={m.centre}>
          <sphereGeometry args={[0.05, 16, 12]} />
        </mesh>
      </group>
    )
  }
  return null
}

/** Sits in the face group, in front of the visor, around the eyes. */
export function FaceOutfit3D({ id }: { id: OutfitId | undefined }) {
  const m = useMaterials()
  if (id !== 'glasses') return null
  return (
    <group position={[0, 0.02, 0.03]}>
      {[-0.17, 0.17].map((x) => (
        <mesh key={x} position={[x, 0, 0]} material={m.frame}>
          <torusGeometry args={[0.12, 0.022, 12, 32]} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={m.frame}>
        <capsuleGeometry args={[0.016, 0.06, 4, 8]} />
      </mesh>
    </group>
  )
}

/** Sits in the neck group, under the head. */
export function NeckOutfit3D({ id }: { id: OutfitId | undefined }) {
  const m = useMaterials()
  if (id === 'scarf') {
    return (
      <group position={[0, 0.01, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.1, 1, 1]} material={m.scarf}>
          <torusGeometry args={[0.19, 0.07, 14, 32]} />
        </mesh>
        <mesh position={[0.13, -0.14, 0.31]} rotation={[0.3, 0, 0.2]} material={m.scarfDark}>
          <boxGeometry args={[0.1, 0.24, 0.04]} />
        </mesh>
      </group>
    )
  }
  if (id === 'bowtie') {
    return (
      <group position={[0, -0.03, 0.22]}>
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[0.09 * side, 0, 0]}
            rotation={[0, 0, (Math.PI / 2) * side]}
            material={m.bow}
          >
            <coneGeometry args={[0.09, 0.18, 3]} />
          </mesh>
        ))}
        <mesh material={m.bowDark}>
          <sphereGeometry args={[0.05, 16, 12]} />
        </mesh>
      </group>
    )
  }
  return null
}
