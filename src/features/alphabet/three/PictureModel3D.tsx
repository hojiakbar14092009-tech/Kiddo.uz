import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

export interface PictureModel3DProps {
  /** File name in /pictures, without “.svg”. */
  file: string
  label: string
  reducedMotion: boolean
  onFail: () => void
}

/** Average colour of a gradient, so each layer of the picture gets one solid toy colour. */
function gradientColors(doc: Document): Map<string, string> {
  const colors = new Map<string, string>()
  doc.querySelectorAll('linearGradient, radialGradient').forEach((gradient) => {
    const stops = [...gradient.querySelectorAll('stop')]
    if (stops.length === 0 || !gradient.id) return
    const mix = new THREE.Color(0, 0, 0)
    let weight = 0
    for (const stop of stops) {
      const value = stop.getAttribute('stop-color') ?? '#000'
      const opacity = Number(stop.getAttribute('stop-opacity') ?? '1')
      if (opacity <= 0.05) continue
      const color = new THREE.Color().setStyle(value)
      mix.r += color.r * opacity
      mix.g += color.g * opacity
      mix.b += color.b * opacity
      weight += opacity
    }
    if (weight > 0) colors.set(gradient.id, `#${mix.multiplyScalar(1 / weight).getHexString()}`)
  })
  return colors
}

/**
 * Keeps the solid shapes of a picture and drops soft highlights (filtered
 * layers) and thin outlines, which do not make sense as 3D parts.
 */
function solidShapes(svgText: string): string {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const colors = gradientColors(doc)
  doc.querySelectorAll('[filter], mask, clipPath, defs').forEach((node) => node.remove())
  doc.querySelectorAll('path, rect, circle, ellipse, polygon').forEach((node) => {
    const fill = node.getAttribute('fill') ?? node.closest('[fill]')?.getAttribute('fill') ?? ''
    const url = /url\(#([^)]+)\)/.exec(fill)
    if (url) {
      const color = colors.get(url[1] ?? '')
      if (color) node.setAttribute('fill', color)
      else node.remove()
    } else if (!fill || fill === 'none') {
      node.remove()
    }
  })
  return new XMLSerializer().serializeToString(doc)
}

interface Layer {
  geometry: THREE.ExtrudeGeometry
  color: string
}

interface Built {
  layers: Layer[]
  /** The full drawing, painted on the front and the back of the toy. */
  texture: THREE.CanvasTexture
  /** SVG view box: x, y, width, height. */
  view: [number, number, number, number]
}

/** Thickness of the toy, in SVG units (the drawings are 32 units wide). */
const DEPTH = 3.2
const BEVEL = 0.45

function buildLayers(svgText: string): Layer[] {
  const data = new SVGLoader().parse(solidShapes(svgText))
  const layers: Layer[] = []
  for (const path of data.paths) {
    const style = (path.userData?.style ?? {}) as { fill?: string; fillOpacity?: number }
    if (!style.fill || style.fill === 'none' || (style.fillOpacity ?? 1) < 0.5) continue
    const shapes = path.toShapes()
    if (shapes.length === 0) continue
    // Every part has the same thickness: together they form the toy's body,
    // and their colours show on its rounded sides.
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: 0.3,
      bevelSegments: 4,
      curveSegments: 14,
    })
    layers.push({ geometry, color: style.fill })
  }
  return layers
}

/** The drawing as a texture, at a resolution sharp enough for a tablet screen. */
function paint(svgText: string): Promise<THREE.CanvasTexture> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }))
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 1024
      canvas.height = 1024
      canvas.getContext('2d')?.drawImage(image, 0, 0, 1024, 1024)
      URL.revokeObjectURL(url)
      const texture = new THREE.CanvasTexture(canvas)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 4
      resolve(texture)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('picture'))
    }
    image.src = url
  })
}

function viewBox(svgText: string): [number, number, number, number] {
  const match = /viewBox="([^"]+)"/.exec(svgText)
  const values = (match?.[1] ?? '0 0 32 32').split(/[\s,]+/).map(Number)
  return [values[0] ?? 0, values[1] ?? 0, values[2] ?? 32, values[3] ?? 32]
}

function Model({ built }: { built: Built }) {
  const { layers, texture, view } = built
  const [vx, vy, vw, vh] = view
  // Centre the drawing and fit it into a 3.9-unit box; SVG y points down.
  const scale = 3.9 / Math.max(vw, vh)
  const cx = vx + vw / 2
  const cy = vy + vh / 2
  const face = (DEPTH / 2 + BEVEL) * scale + 0.004

  useEffect(
    () => () => {
      layers.forEach((layer) => layer.geometry.dispose())
      texture.dispose()
    },
    [layers, texture],
  )

  return (
    <group>
      <group scale={[scale, -scale, scale]}>
        <group position={[-cx, -cy, -DEPTH / 2]}>
          {layers.map((layer, index) => (
            <mesh key={index} geometry={layer.geometry} castShadow>
              <meshStandardMaterial color={layer.color} roughness={0.45} metalness={0.02} />
            </mesh>
          ))}
        </group>
      </group>
      {/* the drawing itself, on both faces */}
      <mesh position={[0, 0, face]}>
        <planeGeometry args={[vw * scale, vh * scale]} />
        <meshStandardMaterial map={texture} transparent alphaTest={0.02} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, -face]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[vw * scale, vh * scale]} />
        <meshStandardMaterial map={texture} transparent alphaTest={0.02} roughness={0.35} />
      </mesh>
    </group>
  )
}

/**
 * The letter’s picture as a real 3D toy: built from the same drawing, given
 * thickness and rounded edges, and turned with a finger (or the mouse).
 */
export default function PictureModel3D({
  file,
  label,
  reducedMotion,
  onFail,
}: PictureModel3DProps) {
  const [model, setModel] = useState<{ file: string; built: Built } | null>(null)

  useEffect(() => {
    let alive = true
    fetch(`/pictures/${file}.svg`)
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error('missing'))))
      .then(async (text) => {
        const layers = buildLayers(text)
        if (layers.length === 0) throw new Error('empty')
        const built: Built = { layers, texture: await paint(text), view: viewBox(text) }
        if (alive) setModel({ file, built })
      })
      .catch(() => alive && onFail())
    return () => {
      alive = false
    }
  }, [file, onFail])

  return (
    <div role="img" aria-label={label} className="size-full touch-none">
      <Canvas
        camera={{ position: [0, 0.4, 6.2], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', onFail, { once: true })
        }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 5, 6]} intensity={1.6} castShadow />
        <directionalLight position={[-4, -2, -5]} intensity={0.6} />
        <Environment resolution={64} frames={1}>
          <Lightformer intensity={2} position={[0, 3, 4]} scale={[6, 2, 1]} />
          <Lightformer intensity={1} position={[-4, 1, 2]} scale={[2, 4, 1]} color="#FFF0C2" />
          <Lightformer intensity={1} position={[4, 1, 2]} scale={[2, 4, 1]} color="#DDEEFC" />
        </Environment>
        {model?.file === file && <Model built={model.built} />}
        <ContactShadows position={[0, -1.9, 0]} opacity={0.3} scale={6} blur={2.4} far={3} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={!reducedMotion}
          autoRotateSpeed={2.2}
          enableDamping
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(Math.PI * 3) / 4}
        />
      </Canvas>
    </div>
  )
}
