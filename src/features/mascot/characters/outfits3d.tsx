import { useMemo } from 'react'
import * as THREE from 'three'
import { outfitColors, type OutfitId, type OutfitTone } from '@/features/shop/outfits'

/*
 * KidoBot's clothes from the shop, placed on the model's sockets
 * (Socket_Head at the head's centre, Socket_Face on the visor, Socket_Neck).
 * Sizes follow KidoBot's head: a sphere of radius 0.62 scaled (1.18, 1, 0.95).
 * Axes after the socket offset: +y up, +z forward (towards the viewer), +x the
 * robot's left. Eyes sit at x ±0.17 on the face socket; ears at x ≈ ±0.73.
 * Colours come from outfitColors(id, tone), the same as the 2D robot.
 */

const plastic = (color: string, extra?: THREE.MeshPhysicalMaterialParameters) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.6, ...extra })

const metal = (color: string) =>
  new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.55,
    roughness: 0.25,
    side: THREE.DoubleSide,
  })

const lens = (color: string, opacity: number) =>
  plastic(color, { transparent: true, opacity, depthWrite: false })

function buildMaterials(tone: OutfitTone) {
  const cap = outfitColors('cap', tone)
  const crown = outfitColors('crown', tone)
  const flower = outfitColors('flower', tone)
  const glasses = outfitColors('glasses', tone)
  const scarf = outfitColors('scarf', tone)
  const bowtie = outfitColors('bowtie', tone)
  const sunglasses = outfitColors('sunglasses', tone)
  const headband = outfitColors('headband', tone)
  const whistle = outfitColors('whistle', tone)
  const goggles = outfitColors('goggles', tone)
  const headset = outfitColors('headset', tone)
  const explorer = outfitColors('explorer-hat', tone)
  const compass = outfitColors('compass', tone)
  const beret = outfitColors('beret', tone)
  const doppi = outfitColors('doppi', tone)
  const headphones = outfitColors('headphones', tone)
  const tie = outfitColors('tie', tone)
  const winter = outfitColors('winter-hat', tone)
  return {
    cap: plastic(cap.main),
    capDark: plastic(cap.dark),
    gold: metal(crown.main),
    gem: plastic(crown.gem),
    petal: plastic(flower.petal),
    centre: plastic(flower.centre),
    frame: plastic(glasses.frame),
    scarf: plastic(scarf.main),
    scarfDark: plastic(scarf.dark),
    bow: plastic(bowtie.main),
    bowDark: plastic(bowtie.dark),
    sunFrame: plastic(sunglasses.frame),
    sunLens: lens(sunglasses.lens, 0.55),
    band: plastic(headband.main, { roughness: 0.7, clearcoat: 0 }),
    bandStripe: plastic(headband.stripe, { roughness: 0.7, clearcoat: 0 }),
    whistle: metal(whistle.main),
    whistleCord: plastic(whistle.cord),
    gogFrame: plastic(goggles.frame),
    gogLens: lens(goggles.lens, 0.45),
    gogStrap: plastic(goggles.strap, { roughness: 0.6 }),
    setMain: plastic(headset.main),
    setDark: plastic(headset.dark),
    setMic: plastic(headset.mic),
    hat: plastic(explorer.main, { roughness: 0.7, clearcoat: 0.2 }),
    hatDark: plastic(explorer.dark, { roughness: 0.7, clearcoat: 0.2 }),
    hatBand: plastic(explorer.band, { roughness: 0.6 }),
    compass: metal(compass.main),
    compassFace: plastic(compass.face),
    needle: plastic(compass.needle),
    beret: plastic(beret.main, { roughness: 0.8, clearcoat: 0 }),
    beretDark: plastic(beret.dark, { roughness: 0.8, clearcoat: 0 }),
    doppi: plastic(doppi.main, { roughness: 0.6, clearcoat: 0.2, flatShading: true }),
    doppiPattern: plastic(doppi.pattern, { roughness: 0.6, clearcoat: 0.2 }),
    doppiEdge: plastic(doppi.edge, { roughness: 0.6, clearcoat: 0.2, flatShading: true }),
    phones: plastic(headphones.main),
    phonesPad: plastic(headphones.pad, { roughness: 0.7, clearcoat: 0 }),
    phonesLight: new THREE.MeshStandardMaterial({
      color: headphones.light,
      emissive: headphones.light,
      emissiveIntensity: 0.9,
    }),
    tie: plastic(tie.main),
    tieDark: plastic(tie.dark),
    tieKnot: plastic(tie.knot),
    knit: plastic(winter.main, { roughness: 0.85, clearcoat: 0 }),
    knitBand: plastic(winter.band, { roughness: 0.85, clearcoat: 0 }),
    pom: plastic(winter.pom, { roughness: 0.95, clearcoat: 0 }),
  }
}

type Materials = ReturnType<typeof buildMaterials>

// One shared set per tone: every robot on the page reuses it.
const materialCache = new Map<OutfitTone, Materials>()

function useMaterials(tone: OutfitTone): Materials {
  return useMemo(() => {
    let set = materialCache.get(tone)
    if (!set) {
      set = buildMaterials(tone)
      materialCache.set(tone, set)
    }
    return set
  }, [tone])
}

type Vec3 = readonly [number, number, number]

/** A thin capsule from a to b (cords, mic arms). */
function Rod({
  from,
  to,
  radius,
  material,
}: {
  from: Vec3
  to: Vec3
  radius: number
  material: THREE.Material
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const dir = b.clone().sub(a)
    const len = dir.length()
    return {
      position: a.add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize(),
      ),
      length: len,
    }
  }, [from, to])
  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <capsuleGeometry args={[radius, length, 4, 8]} />
    </mesh>
  )
}

// constant points so Rod's memo holds
const MIC_ARM: readonly [Vec3, Vec3, Vec3] = [
  [-0.78, -0.05, 0.05],
  [-0.7, -0.25, 0.35],
  [-0.44, -0.32, 0.5],
]
const CORD: readonly [Vec3, Vec3, Vec3] = [
  [-0.16, 0.01, 0.1],
  [0, -0.17, 0.3],
  [0.16, 0.01, 0.1],
]

/** Four white qalampir (pepper) motifs, one on each side of the doppi. */
const DOPPI_SIDES = [
  { position: [0, 0.58, 0.405] as Vec3, rotation: [-0.31, 0, 0] as Vec3, flat: 'z' },
  { position: [0, 0.58, -0.405] as Vec3, rotation: [0.31, Math.PI, 0] as Vec3, flat: 'z' },
  { position: [0.475, 0.58, 0] as Vec3, rotation: [0, 0, 0.3] as Vec3, flat: 'x' },
  { position: [-0.475, 0.58, 0] as Vec3, rotation: [0, 0, -0.3] as Vec3, flat: 'x' },
] as const

/** Sits in the head group, so it follows every head turn and nod. Also wears the ear slot. */
export function HeadOutfit3D({
  id,
  tone = 'bright',
}: {
  id: OutfitId | undefined
  tone?: OutfitTone
}) {
  const m = useMaterials(tone)
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
  if (id === 'headband') {
    // a sweatband ring around the forehead with a white stripe
    return (
      <group position={[0, 0.38, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.18, 0.95, 1]} material={m.band}>
          <torusGeometry args={[0.5, 0.06, 14, 48]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.18, 0.95, 1]} material={m.bandStripe}>
          <torusGeometry args={[0.545, 0.02, 10, 48]} />
        </mesh>
      </group>
    )
  }
  if (id === 'explorer-hat') {
    return (
      <group position={[0, 0.49, 0]}>
        <mesh scale={[1, 1, 0.92]} material={m.hat}>
          <cylinderGeometry args={[0.8, 0.8, 0.035, 40]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.92, 1]} material={m.hatDark}>
          <torusGeometry args={[0.8, 0.02, 8, 48]} />
        </mesh>
        <mesh position={[0, 0.15, 0]} scale={[1.12, 1, 1]} material={m.hat}>
          <cylinderGeometry args={[0.34, 0.42, 0.3, 32]} />
        </mesh>
        <mesh position={[0, 0.3, 0]} scale={[1.12, 0.3, 1]} material={m.hat}>
          <sphereGeometry args={[0.34, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, 0.045, 0]} scale={[1.12, 1, 1]} material={m.hatBand}>
          <cylinderGeometry args={[0.418, 0.43, 0.08, 32]} />
        </mesh>
      </group>
    )
  }
  if (id === 'beret') {
    return (
      <group position={[0.04, 0, 0]} rotation={[0, 0, -0.12]}>
        <mesh position={[0, 0.52, 0]} scale={[1.18, 0.35, 1]} material={m.beret}>
          <sphereGeometry args={[0.6, 40, 20]} />
        </mesh>
        <mesh
          position={[0, 0.42, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.18, 0.95, 1]}
          material={m.beretDark}
        >
          <torusGeometry args={[0.46, 0.035, 10, 40]} />
        </mesh>
        <mesh position={[0, 0.74, 0]} material={m.beretDark}>
          <cylinderGeometry args={[0.02, 0.03, 0.08, 10]} />
        </mesh>
      </group>
    )
  }
  if (id === 'doppi') {
    // the square Uzbek skullcap: a four-sided crown, a low peaked top and a trim
    return (
      <group>
        <mesh position={[0, 0.58, 0]} rotation={[0, Math.PI / 4, 0]} material={m.doppi}>
          <cylinderGeometry args={[0.5, 0.62, 0.26, 4]} />
        </mesh>
        <mesh position={[0, 0.75, 0]} rotation={[0, Math.PI / 4, 0]} material={m.doppi}>
          <coneGeometry args={[0.5, 0.08, 4]} />
        </mesh>
        <mesh position={[0, 0.47, 0]} rotation={[0, Math.PI / 4, 0]} material={m.doppiEdge}>
          <cylinderGeometry args={[0.625, 0.635, 0.04, 4, 1, true]} />
        </mesh>
        {DOPPI_SIDES.map((side) => (
          <group key={side.position.join()} position={side.position} rotation={side.rotation}>
            <mesh
              scale={side.flat === 'z' ? [0.55, 1.25, 0.2] : [0.2, 1.25, 0.55]}
              material={m.doppiPattern}
            >
              <sphereGeometry args={[0.07, 16, 12]} />
            </mesh>
            <mesh
              position={side.flat === 'z' ? [0.025, 0.1, 0] : [0, 0.1, 0.025]}
              material={m.doppiPattern}
            >
              <sphereGeometry args={[0.018, 10, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }
  if (id === 'winter-hat') {
    return (
      <group>
        <mesh position={[0, 0.1, 0]} scale={[1.2, 1, 0.98]} material={m.knit}>
          <sphereGeometry args={[0.64, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2.3]} />
        </mesh>
        <mesh
          position={[0, 0.5, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.2, 0.98, 1]}
          material={m.knitBand}
        >
          <torusGeometry args={[0.5, 0.02, 8, 48]} />
        </mesh>
        <mesh
          position={[0, 0.26, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.21, 0.99, 1]}
          material={m.knitBand}
        >
          <torusGeometry args={[0.62, 0.075, 14, 48]} />
        </mesh>
        <mesh position={[0, 0.82, 0]} material={m.pom}>
          <sphereGeometry args={[0.13, 20, 16]} />
        </mesh>
      </group>
    )
  }
  if (id === 'headset') {
    // astronaut headset: thin band, white ear cups with a purple rim, mic arm on the left
    return (
      <group>
        <mesh scale={[1, 0.92, 1]} material={m.setDark}>
          <torusGeometry args={[0.76, 0.025, 8, 48, Math.PI]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[0.77 * side, 0, 0]}>
            <mesh scale={[0.6, 1, 1]} material={m.setMain}>
              <sphereGeometry args={[0.17, 24, 16]} />
            </mesh>
            <mesh
              rotation={[0, Math.PI / 2, 0]}
              position={[0.03 * side, 0, 0]}
              material={m.setDark}
            >
              <torusGeometry args={[0.14, 0.025, 10, 32]} />
            </mesh>
          </group>
        ))}
        <Rod from={MIC_ARM[0]} to={MIC_ARM[1]} radius={0.018} material={m.setMic} />
        <Rod from={MIC_ARM[1]} to={MIC_ARM[2]} radius={0.018} material={m.setMic} />
        <mesh position={MIC_ARM[2]} material={m.setMic}>
          <sphereGeometry args={[0.045, 16, 12]} />
        </mesh>
      </group>
    )
  }
  if (id === 'headphones') {
    // over-ear headphones: thick band, big cups with soft pads and a small light
    return (
      <group>
        <mesh scale={[1, 0.92, 1]} material={m.phones}>
          <torusGeometry args={[0.78, 0.045, 10, 48, Math.PI]} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[0.79 * side, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={m.phones}>
              <cylinderGeometry args={[0.2, 0.2, 0.12, 32]} />
            </mesh>
            <mesh
              position={[0.71 * side, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
              material={m.phonesPad}
            >
              <cylinderGeometry args={[0.17, 0.17, 0.06, 32]} />
            </mesh>
            <mesh position={[0.855 * side, 0.08, 0]} material={m.phonesLight}>
              <sphereGeometry args={[0.035, 12, 10]} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }
  return null
}

/** Sits in the face group, in front of the visor, around the eyes. Lenses stay see-through. */
export function FaceOutfit3D({
  id,
  tone = 'bright',
}: {
  id: OutfitId | undefined
  tone?: OutfitTone
}) {
  const m = useMaterials(tone)
  if (id === 'glasses') {
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
  if (id === 'sunglasses') {
    return (
      <group position={[0, 0.02, 0.03]}>
        {[-0.17, 0.17].map((x) => (
          <group key={x} position={[x, 0, 0]} scale={[1.1, 0.85, 1]}>
            <mesh material={m.sunFrame}>
              <torusGeometry args={[0.13, 0.022, 12, 32]} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={m.sunLens}>
              <cylinderGeometry args={[0.125, 0.125, 0.012, 32]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} material={m.sunFrame}>
          <capsuleGeometry args={[0.016, 0.03, 4, 8]} />
        </mesh>
      </group>
    )
  }
  if (id === 'goggles') {
    return (
      <group position={[0, 0.02, 0]}>
        {/* strap around the head at eye height (the head's centre is ~0.655 behind) */}
        <mesh
          position={[0, 0, -0.62]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.07, 0.88, 1]}
          material={m.gogStrap}
        >
          <torusGeometry args={[0.7, 0.03, 8, 48]} />
        </mesh>
        {[-0.18, 0.18].map((x) => (
          <group key={x} position={[x, 0, 0.06]}>
            <mesh material={m.gogFrame}>
              <torusGeometry args={[0.13, 0.035, 12, 32]} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={m.gogLens}>
              <cylinderGeometry args={[0.12, 0.12, 0.015, 32]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 0, 0.06]} material={m.gogFrame}>
          <boxGeometry args={[0.06, 0.04, 0.04]} />
        </mesh>
      </group>
    )
  }
  return null
}

/** Sits in the neck group, under the head. */
export function NeckOutfit3D({
  id,
  tone = 'bright',
}: {
  id: OutfitId | undefined
  tone?: OutfitTone
}) {
  const m = useMaterials(tone)
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
  if (id === 'whistle') {
    return (
      <group>
        <Rod from={CORD[0]} to={CORD[1]} radius={0.012} material={m.whistleCord} />
        <Rod from={CORD[1]} to={CORD[2]} radius={0.012} material={m.whistleCord} />
        <group position={[0, -0.23, 0.31]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={m.whistle}>
            <cylinderGeometry args={[0.05, 0.05, 0.07, 24]} />
          </mesh>
          <mesh position={[0.06, 0.025, 0]} material={m.whistle}>
            <boxGeometry args={[0.08, 0.035, 0.045]} />
          </mesh>
          <mesh position={[-0.01, 0.055, 0]} material={m.whistleCord}>
            <torusGeometry args={[0.018, 0.006, 6, 16]} />
          </mesh>
        </group>
      </group>
    )
  }
  if (id === 'compass') {
    return (
      <group>
        <Rod from={CORD[0]} to={CORD[1]} radius={0.012} material={m.compass} />
        <Rod from={CORD[1]} to={CORD[2]} radius={0.012} material={m.compass} />
        <group position={[0, -0.25, 0.31]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={m.compass}>
            <cylinderGeometry args={[0.08, 0.08, 0.03, 32]} />
          </mesh>
          <mesh position={[0, 0, 0.016]} rotation={[Math.PI / 2, 0, 0]} material={m.compassFace}>
            <cylinderGeometry args={[0.065, 0.065, 0.01, 32]} />
          </mesh>
          <mesh position={[0, 0.025, 0.026]} material={m.needle}>
            <coneGeometry args={[0.015, 0.05, 4]} />
          </mesh>
          <mesh position={[0, -0.025, 0.026]} rotation={[0, 0, Math.PI]} material={m.compass}>
            <coneGeometry args={[0.015, 0.05, 4]} />
          </mesh>
          <mesh position={[0, 0.09, 0]} material={m.compass}>
            <torusGeometry args={[0.015, 0.006, 6, 16]} />
          </mesh>
        </group>
      </group>
    )
  }
  if (id === 'tie') {
    return (
      <group position={[0, 0, 0.27]} rotation={[0.1, 0, 0]}>
        <mesh position={[0, -0.04, 0]} rotation={[Math.PI, Math.PI / 4, 0]} material={m.tieKnot}>
          <coneGeometry args={[0.055, 0.07, 4]} />
        </mesh>
        <mesh position={[0, -0.19, 0]} material={m.tie}>
          <boxGeometry args={[0.1, 0.22, 0.025]} />
        </mesh>
        <mesh position={[0, -0.3, 0]} rotation={[0, 0, Math.PI / 4]} material={m.tie}>
          <boxGeometry args={[0.071, 0.071, 0.025]} />
        </mesh>
        {[-0.15, -0.23].map((y) => (
          <mesh key={y} position={[0, y, 0.004]} rotation={[0, 0, 0.45]} material={m.tieDark}>
            <boxGeometry args={[0.1, 0.016, 0.025]} />
          </mesh>
        ))}
      </group>
    )
  }
  return null
}
