import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { MascotModel } from '@/store/familyStore'
import type { Wearing } from '@/features/shop/outfits'
import type { MascotMood } from '../types'
import { RobotAnimator, type Gaze } from './animator'
import type { Expression } from './clips'
import { JOINTS, type JointName } from './rig'
import { FaceOutfit3D, HeadOutfit3D, NeckOutfit3D } from './RobotOutfits3D'

const POINTER_ATTENTION_MS = 3000

const COLORS = {
  shell: '#FFFFFF',
  visor: '#3A2E4D',
  joint: '#D9D3E4',
  girl: { accent: '#F27BA6', dark: '#C24C7B', glow: '#FFB8DC' },
  boy: { accent: '#13917E', dark: '#0C6B5D', glow: '#7FF0FF' },
} as const

interface RobotModelProps {
  model: MascotModel
  mood: MascotMood
  reactionKey: number
  followPointer: boolean
  reducedMotion: boolean
  wearing?: Wearing
}

function heartShape(): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.09)
  shape.bezierCurveTo(-0.13, 0, -0.1, 0.1, 0, 0.05)
  shape.bezierCurveTo(0.1, 0.1, 0.13, 0, 0, -0.09)
  return shape
}

function starShape(): THREE.Shape {
  const shape = new THREE.Shape()
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? 0.1 : 0.045
    const angle = (i / 10) * Math.PI * 2 + Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

/**
 * A fully articulated robot built from primitives: every joint of the rig is
 * a THREE.Group, and the animator drives their rotations each frame.
 */
export function RobotModel({
  model,
  mood,
  reactionKey,
  followPointer,
  reducedMotion,
  wearing,
}: RobotModelProps) {
  const palette = COLORS[model]
  const animator = useMemo(() => new RobotAnimator(), [])
  const { gl } = useThree()

  const root = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const joints = useRef<Partial<Record<JointName, THREE.Group>>>({})
  const headLook = useRef<THREE.Group>(null)
  const eyes = useRef<THREE.Group>(null)
  const wobble = useRef<THREE.Group>(null)
  const mouth = useRef<THREE.Mesh>(null)
  const [expression, setExpression] = useState<Expression>('smile')
  const expressionRef = useRef<Expression>('smile')

  /** Where the child last touched; cleared after a few seconds of no touches. */
  const gaze = useRef<Gaze | null>(null)

  useEffect(() => {
    if (!followPointer) return undefined
    let forget: ReturnType<typeof setTimeout> | undefined
    const onPointer = (event: PointerEvent) => {
      const box = gl.domElement.getBoundingClientRect()
      const x = (event.clientX - (box.left + box.width / 2)) / (window.innerWidth / 2)
      const y = (event.clientY - (box.top + box.height * 0.3)) / (window.innerHeight / 2)
      gaze.current = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) }
      clearTimeout(forget)
      forget = setTimeout(() => {
        gaze.current = null
      }, POINTER_ATTENTION_MS)
    }
    window.addEventListener('pointermove', onPointer)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      clearTimeout(forget)
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [followPointer, gl])

  const materials = useMemo(
    () => ({
      shell: new THREE.MeshPhysicalMaterial({
        color: COLORS.shell,
        roughness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
      joint: new THREE.MeshPhysicalMaterial({ color: COLORS.joint, roughness: 0.35 }),
      accent: new THREE.MeshPhysicalMaterial({
        color: palette.accent,
        roughness: 0.25,
        clearcoat: 0.8,
      }),
      accentDark: new THREE.MeshPhysicalMaterial({ color: palette.dark, roughness: 0.3 }),
      visor: new THREE.MeshPhysicalMaterial({
        color: COLORS.visor,
        roughness: 0.08,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
      glow: new THREE.MeshBasicMaterial({ color: palette.glow, toneMapped: false }),
      cheek: new THREE.MeshBasicMaterial({
        color: palette.glow,
        transparent: true,
        opacity: 0.35,
        toneMapped: false,
      }),
    }),
    [palette],
  )
  useEffect(
    () => () => Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  )

  const badge = useMemo(
    () =>
      new THREE.ExtrudeGeometry(model === 'girl' ? heartShape() : starShape(), {
        depth: 0.03,
        bevelEnabled: true,
        bevelSize: 0.012,
        bevelThickness: 0.012,
        bevelSegments: 3,
      }),
    [model],
  )
  useEffect(() => () => badge.dispose(), [badge])

  const bindJoint = (name: JointName) => (group: THREE.Group | null) => {
    if (group) joints.current[name] = group
  }

  useFrame((_, delta) => {
    const frame = animator.update(delta, {
      mood,
      reactionKey,
      gaze: followPointer ? gaze.current : null,
      reducedMotion,
    })

    for (const name of JOINTS) {
      const group = joints.current[name]
      const rotation = frame.pose.joints[name]
      if (group) group.rotation.set(rotation[0], rotation[1], rotation[2])
    }
    if (body.current) {
      body.current.position.set(frame.pose.rootX, frame.pose.rootY, 0)
    }
    if (root.current)
      root.current.scale.set(frame.pose.squashX, frame.pose.squashY, frame.pose.squashX)
    if (headLook.current) headLook.current.rotation.set(frame.headPitch, frame.headYaw, 0)
    if (eyes.current) {
      eyes.current.position.set(frame.eyeX * 0.05, -frame.eyeY * 0.03, 0)
      eyes.current.scale.y = 1 - 0.88 * frame.blink
    }
    if (wobble.current) wobble.current.rotation.z = frame.wobble
    if (mouth.current) {
      const open = frame.expression === 'happy' ? 1 : frame.pose.mouth
      mouth.current.scale.set(1, 0.25 + 0.75 * open, 1)
      mouth.current.visible = frame.expression !== 'oops' && open > 0.05
    }
    if (frame.expression !== expressionRef.current) {
      expressionRef.current = frame.expression
      setExpression(frame.expression)
    }
  })

  return (
    <group ref={root}>
      <group ref={body}>
        <group ref={bindJoint('hips')} position={[0, 0.62, 0]}>
          {[-1, 1].map((side) => (
            <group
              key={side}
              ref={bindJoint(side > 0 ? 'leftLeg' : 'rightLeg')}
              position={[0.17 * side, 0, 0]}
            >
              <mesh position={[0, -0.27, 0]} material={materials.shell} castShadow>
                <capsuleGeometry args={[0.1, 0.3, 8, 16]} />
              </mesh>
              <mesh position={[0, -0.55, 0.05]} scale={[1, 0.6, 1.3]} material={materials.accent}>
                <sphereGeometry args={[0.14, 24, 16]} />
              </mesh>
            </group>
          ))}

          <group ref={bindJoint('spine')} position={[0, 0.08, 0]}>
            <mesh position={[0, 0.24, 0]} material={materials.shell} castShadow>
              <capsuleGeometry args={[0.34, 0.2, 12, 24]} />
            </mesh>
            <group ref={bindJoint('chest')} position={[0, 0.3, 0]}>
              <mesh position={[0, -0.06, 0.27]} scale={[1, 0.85, 0.35]} material={materials.joint}>
                <sphereGeometry args={[0.2, 24, 16]} />
              </mesh>
              <mesh geometry={badge} position={[0, -0.06, 0.33]} material={materials.accent} />

              {[-1, 1].map((side) => (
                <group
                  key={side}
                  ref={bindJoint(side > 0 ? 'leftShoulder' : 'rightShoulder')}
                  position={[0.38 * side, 0.1, 0]}
                >
                  <mesh material={materials.joint}>
                    <sphereGeometry args={[0.1, 16, 12]} />
                  </mesh>
                  <mesh position={[0, -0.17, 0]} material={materials.shell} castShadow>
                    <capsuleGeometry args={[0.085, 0.18, 8, 16]} />
                  </mesh>
                  <group
                    ref={bindJoint(side > 0 ? 'leftArm' : 'rightArm')}
                    position={[0, -0.33, 0]}
                  >
                    <mesh position={[0, -0.12, 0]} material={materials.shell} castShadow>
                      <capsuleGeometry args={[0.08, 0.14, 8, 16]} />
                    </mesh>
                    <group
                      ref={bindJoint(side > 0 ? 'leftHand' : 'rightHand')}
                      position={[0, -0.26, 0]}
                    >
                      <mesh material={materials.accent}>
                        <sphereGeometry args={[0.11, 20, 16]} />
                      </mesh>
                    </group>
                  </group>
                </group>
              ))}

              <group ref={bindJoint('neck')} position={[0, 0.34, 0]}>
                <mesh position={[0, 0.05, 0]} material={materials.joint}>
                  <cylinderGeometry args={[0.12, 0.14, 0.14, 20]} />
                </mesh>
                <NeckOutfit3D id={wearing?.neck} />
                <group ref={bindJoint('head')} position={[0, 0.12, 0]}>
                  <group ref={headLook}>
                    <Head
                      model={model}
                      expression={expression}
                      materials={materials}
                      eyesRef={eyes}
                      mouthRef={mouth}
                      wobbleRef={wobble}
                      wearing={wearing}
                    />
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}

interface HeadProps {
  model: MascotModel
  expression: Expression
  materials: Record<
    'shell' | 'joint' | 'accent' | 'accentDark' | 'visor' | 'glow' | 'cheek',
    THREE.Material
  >
  eyesRef: React.RefObject<THREE.Group | null>
  mouthRef: React.RefObject<THREE.Mesh | null>
  wobbleRef: React.RefObject<THREE.Group | null>
  wearing: Wearing | undefined
}

function Head({ model, expression, materials, eyesRef, mouthRef, wobbleRef, wearing }: HeadProps) {
  return (
    <group position={[0, 0.5, 0]}>
      <mesh scale={[1.18, 1, 0.95]} material={materials.shell} castShadow>
        <sphereGeometry args={[0.62, 48, 32]} />
      </mesh>
      <mesh position={[0, -0.02, 0.31]} scale={[0.95, 0.72, 0.55]} material={materials.visor}>
        <sphereGeometry args={[0.62, 48, 32]} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={side} position={[0.74 * side, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={materials.accent}>
            <cylinderGeometry args={[0.17, 0.17, 0.12, 28]} />
          </mesh>
          <mesh position={[0, 0.07 * side, 0]} material={materials.accentDark}>
            <cylinderGeometry args={[0.1, 0.1, 0.02, 24]} />
          </mesh>
        </group>
      ))}

      {model === 'boy' ? (
        <group ref={wobbleRef} position={[0, 0.6, 0]}>
          <mesh position={[0, 0.14, 0]} material={materials.joint}>
            <cylinderGeometry args={[0.025, 0.03, 0.28, 12]} />
          </mesh>
          <mesh position={[0, 0.31, 0]} material={materials.accent}>
            <sphereGeometry args={[0.075, 20, 16]} />
          </mesh>
        </group>
      ) : (
        <group ref={wobbleRef} position={[0.36, 0.52, 0.12]} rotation={[0, 0, -0.35]}>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[0.11 * side, 0, 0]}
              rotation={[0, 0, (-Math.PI / 2) * side]}
              material={materials.accent}
            >
              <coneGeometry args={[0.12, 0.22, 24]} />
            </mesh>
          ))}
          <mesh material={materials.accentDark}>
            <sphereGeometry args={[0.065, 16, 12]} />
          </mesh>
        </group>
      )}

      <HeadOutfit3D id={wearing?.head} />

      {/* face, on the front of the visor */}
      <group position={[0, -0.02, 0.655]}>
        <FaceOutfit3D id={wearing?.face} />
        {[-1, 1].map((side) => (
          <mesh key={side} position={[0.27 * side, -0.16, 0]} material={materials.cheek}>
            <circleGeometry args={[0.06, 20]} />
          </mesh>
        ))}

        <group ref={eyesRef}>
          <Eyes model={model} expression={expression} glow={materials.glow} />
        </group>

        {expression === 'oops' ? (
          <mesh position={[0, -0.17, 0.01]} material={materials.glow}>
            <torusGeometry args={[0.045, 0.016, 10, 24]} />
          </mesh>
        ) : (
          <>
            {/* closed smile */}
            <mesh position={[0, -0.13, 0.01]} rotation={[0, 0, Math.PI]} material={materials.glow}>
              <torusGeometry args={[0.08, 0.017, 10, 24, Math.PI]} />
            </mesh>
            {/* opening mouth, scaled by the animator while talking, yawning or cheering */}
            <mesh
              ref={mouthRef}
              position={[0, -0.15, 0.012]}
              rotation={[0, 0, Math.PI]}
              material={materials.glow}
            >
              <circleGeometry args={[0.075, 24, 0, Math.PI]} />
            </mesh>
          </>
        )}
      </group>
    </group>
  )
}

function Eyes({
  model,
  expression,
  glow,
}: {
  model: MascotModel
  expression: Expression
  glow: THREE.Material
}) {
  const positions = [-0.17, 0.17]

  if (expression === 'happy') {
    return positions.map((x) => (
      <mesh key={x} position={[x, 0.04, 0]} material={glow}>
        <torusGeometry args={[0.065, 0.018, 10, 24, Math.PI]} />
      </mesh>
    ))
  }
  if (expression === 'sleepy') {
    return positions.map((x) => (
      <mesh key={x} position={[x, 0.04, 0]} rotation={[0, 0, Math.PI]} material={glow}>
        <torusGeometry args={[0.06, 0.016, 10, 24, Math.PI]} />
      </mesh>
    ))
  }
  if (expression === 'oops') {
    return positions.map((x) => (
      <group key={x}>
        <mesh position={[x, 0.02, 0]} material={glow}>
          <circleGeometry args={[0.055, 24]} />
        </mesh>
        <mesh position={[x, 0.13, 0]} rotation={[0, 0, x > 0 ? -0.25 : 0.25]} material={glow}>
          <capsuleGeometry args={[0.012, 0.08, 4, 8]} />
        </mesh>
      </group>
    ))
  }
  return positions.map((x) => (
    <group key={x}>
      <mesh position={[x, 0.02, 0]} material={glow}>
        <capsuleGeometry args={[0.042, 0.07, 6, 16]} />
      </mesh>
      {model === 'girl' && (
        <mesh
          position={[x + (x > 0 ? 0.06 : -0.06), 0.1, 0]}
          rotation={[0, 0, x > 0 ? -0.6 : 0.6]}
          material={glow}
        >
          <capsuleGeometry args={[0.01, 0.05, 4, 8]} />
        </mesh>
      )}
    </group>
  ))
}
