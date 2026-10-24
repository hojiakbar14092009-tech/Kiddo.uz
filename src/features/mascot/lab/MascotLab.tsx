import clsx from 'clsx'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { LabHooks } from '../characters/Character3D'
import { cacheStats } from '../characters/assets'
import type { ModelStats } from '../characters/controller'
import { PRIORITY, type Performance, type Shown } from '../characters/director'
import { EMOTIONS, type Emotion } from '../characters/emotions'
import { MASCOT_IDS, MASCOTS, type MascotId } from '../characters/registry'

const Character3D = lazy(() => import('../characters/Character3D'))

/*
 * Mascot Lab (development and e2e builds only, never linked from the child's
 * screens): inspect each 3D mascot from every side, play its clips and
 * emotions, see its skeleton and its numbers. Text here is for developers and
 * stays in English.
 */

const VIEWS = [
  ['Front', 0],
  ['3/4 Front', 45],
  ['Side', 90],
  ['3/4 Back', 135],
  ['Back', 180],
  ['225°', 225],
  ['270°', 270],
  ['315°', 315],
] as const

function readParams() {
  const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)
  const mascot = params.get('m')
  return {
    mascot: (MASCOT_IDS as readonly string[]).includes(mascot ?? '')
      ? (mascot as MascotId)
      : 'kidobot',
    yaw: params.has('yaw') ? Number(params.get('yaw')) : null,
    emotion: (EMOTIONS as readonly string[]).includes(params.get('e') ?? '')
      ? (params.get('e') as Emotion)
      : 'neutral',
    clean: params.has('clean'),
  }
}

export function MascotLab() {
  const [initial] = useState(readParams)
  const [mascot, setMascot] = useState<MascotId>(initial.mascot)
  const [yaw, setYaw] = useState<number | null>(initial.yaw)
  const [spin, setSpin] = useState(false)
  const [size, setSize] = useState(420)
  const [emotion, setEmotion] = useState<Emotion>(initial.emotion)
  const [skeleton, setSkeleton] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [quality, setQuality] = useState<'high' | 'low'>('high')
  const [stats, setStats] = useState<{ stats: ModelStats; clips: string[] } | null>(null)
  const [frame, setFrame] = useState<{ shown: Shown; clip: string } | null>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [play, setPlay] = useState<((perf: Performance) => void) | null>(null)
  const [bytes, setBytes] = useState<number | null>(null)

  // turntable
  useEffect(() => {
    if (!spin) return undefined
    let frameId = 0
    let last = performance.now()
    const step = (now: number) => {
      setYaw((y) => ((y ?? 0) + (now - last) * 0.03) % 360)
      last = now
      frameId = requestAnimationFrame(step)
    }
    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [spin])

  // asset size of the GLB on the wire
  useEffect(() => {
    let alive = true
    void fetch(MASCOTS[mascot].model, { method: 'HEAD' })
      .then((r) => Number(r.headers.get('content-length')) || null)
      .catch(() => null)
      .then((n) => alive && setBytes(n))
    return () => {
      alive = false
    }
  }, [mascot])

  const lab: LabHooks = useMemo(
    () => ({
      bind: (fn) => setPlay(() => fn),
      onStats: (s, clips) => setStats({ stats: s, clips: [...clips].sort() }),
      onFrame: (shown, clip) =>
        setFrame((prev) =>
          prev &&
          prev.shown.serial === shown.serial &&
          prev.clip === clip &&
          prev.shown.emotion === shown.emotion
            ? prev
            : { shown, clip },
        ),
      yaw,
      showSkeleton: skeleton,
      speaking,
      emotion,
    }),
    [yaw, skeleton, speaking, emotion],
  )

  const pick = (id: MascotId) => {
    if (id === mascot) return
    setMascot(id)
    setReady(false)
    setFailed(false)
    setStats(null)
  }

  return (
    <main className="min-h-dvh bg-[#EEF1F7] p-4 text-[#1B2033]" data-testid="mascot-lab">
      {!initial.clean && <h1 className="mb-3 text-2xl font-bold">Mascot Lab</h1>}
      {!initial.clean && (
        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Mascots">
          {MASCOT_IDS.map((id) => (
            <button
              key={id}
              type="button"
              data-testid={`lab-mascot-${id}`}
              aria-pressed={id === mascot}
              onClick={() => pick(id)}
              className={clsx(
                'rounded-lg border px-3 py-1.5',
                id === mascot ? 'bg-[#1E7BF0] text-white' : 'bg-white',
              )}
            >
              {id}
            </button>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start gap-4">
        <div
          className="relative rounded-2xl bg-white"
          style={{ width: size }}
          data-testid="lab-stage"
          data-ready={ready ? 'true' : 'false'}
          data-failed={failed ? 'true' : 'false'}
          data-clip={frame?.clip ?? ''}
        >
          <Suspense fallback={null}>
            <Character3D
              key={`${mascot}-${quality}`}
              mascot={mascot}
              context={MASCOTS[mascot].contexts[0] ?? 'home'}
              mood="idle"
              reactionKey={0}
              followPointer={false}
              reducedMotion={reduced}
              lively={false}
              quality={quality}
              className="w-full"
              onReady={() => setReady(true)}
              onFail={() => setFailed(true)}
              lab={lab}
            />
          </Suspense>
        </div>
        {!initial.clean && (
          <section className="flex max-w-xl flex-col gap-3 text-sm">
            <div className="flex flex-wrap gap-2" aria-label="Camera">
              {VIEWS.map(([name, deg]) => (
                <button
                  key={name}
                  type="button"
                  className="rounded border bg-white px-2 py-1"
                  data-testid={`lab-view-${deg}`}
                  onClick={() => {
                    setSpin(false)
                    setYaw(deg)
                  }}
                >
                  {name}
                </button>
              ))}
              <button
                type="button"
                className="rounded border bg-white px-2 py-1"
                onClick={() => setSpin((s) => !s)}
              >
                {spin ? 'Stop turntable' : '360° turntable'}
              </button>
              <button
                type="button"
                className="rounded border bg-white px-2 py-1"
                onClick={() => {
                  setSpin(false)
                  setYaw(null)
                  setSize(420)
                }}
              >
                Reset camera
              </button>
            </div>
            <label className="flex items-center gap-2">
              Rotate
              <input
                type="range"
                min={0}
                max={359}
                value={Math.round(yaw ?? 0)}
                onChange={(e) => setYaw(Number(e.target.value))}
              />
            </label>
            <label className="flex items-center gap-2">
              Zoom
              <input
                type="range"
                min={200}
                max={900}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                ['Skeleton', skeleton, setSkeleton],
                ['Speaking', speaking, setSpeaking],
                ['Reduced motion', reduced, setReduced],
              ].map(([name, value, set]) => (
                <label key={name as string} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={value as boolean}
                    onChange={(e) => (set as (v: boolean) => void)(e.target.checked)}
                  />
                  {name as string}
                </label>
              ))}
              <label className="flex items-center gap-1">
                Quality (LOD)
                <select
                  value={quality}
                  onChange={(e) => setQuality(e.target.value as 'high' | 'low')}
                >
                  <option value="high">high</option>
                  <option value="low">low</option>
                </select>
              </label>
            </div>
            <fieldset className="flex flex-wrap gap-1">
              <legend className="font-bold">Emotions</legend>
              {EMOTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  data-testid={`lab-emotion-${e}`}
                  aria-pressed={e === emotion}
                  onClick={() => setEmotion(e)}
                  className={clsx(
                    'rounded border px-2 py-0.5',
                    e === emotion ? 'bg-[#FFE27A]' : 'bg-white',
                  )}
                >
                  {e}
                </button>
              ))}
            </fieldset>
            <fieldset className="flex flex-wrap gap-1">
              <legend className="font-bold">Animations</legend>
              {(stats?.clips ?? []).map((clip) => (
                <button
                  key={clip}
                  type="button"
                  data-testid={`lab-clip-${clip}`}
                  onClick={() =>
                    play?.({ gesture: clip, emotion, priority: PRIORITY.critical, rank: 9 })
                  }
                  className="rounded border bg-white px-2 py-0.5"
                >
                  {clip}
                </button>
              ))}
            </fieldset>
            <table className="w-full border-collapse text-left" data-testid="lab-stats">
              <tbody>
                {stats &&
                  Object.entries({
                    ...stats.stats,
                    'asset size': bytes ? `${Math.round(bytes / 1024)} KB` : '–',
                    rig: MASCOTS[mascot].rigFamily,
                    'playing clip': frame?.clip ?? '–',
                    emotion: frame?.shown.emotion ?? '–',
                    'models in memory': cacheStats().filter((c) => c.loaded).length,
                  }).map(([k, v]) => (
                    <tr key={k} className="border-b">
                      <th className="py-0.5 pr-3 font-semibold">{k}</th>
                      <td data-stat={k}>{String(v)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  )
}
