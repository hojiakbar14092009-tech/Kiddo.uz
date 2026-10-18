import '@fontsource/rubik/700.css'
import '@fontsource/rubik/800.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import { useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { COPY, type PromoLang } from './copy'
import { Promo } from './Promo'

const params = new URLSearchParams(location.search)
const lang = (params.get('lang') ?? 'en') as PromoLang
const portrait = params.get('fmt') === 'portrait'

declare global {
  interface Window {
    __setT?: (t: number) => void
    __ready?: Promise<void>
  }
}

const PICTURES = ['red-apple', 'banana', 'cat', 'watermelon', 'teddy-bear', 'kite', 'rocket']
const PETS = ['cat', 'bunny', 'parrot', 'hamster', 'guinea-pig']

/** Every picture and every glyph of the copy, loaded before the first frame. */
function Preload() {
  const all = Object.values(COPY)
    .map((c) => JSON.stringify(c))
    .join(' ')
  return (
    <div
      style={{
        position: 'absolute',
        left: -9999,
        top: 0,
        width: 10,
        height: 10,
        overflow: 'hidden',
      }}
    >
      {[700, 800].map((weight) => (
        <div key={weight}>
          <span style={{ fontFamily: 'Rubik', fontWeight: weight }}>{all} AБOʻЖЯGʻ0123456789</span>
          <span style={{ fontFamily: 'Nunito', fontWeight: weight }}>{all}</span>
        </div>
      ))}
      {PICTURES.map((name) => (
        <img key={name} src={`/pictures/${name}.svg`} alt="" />
      ))}
      {PETS.map((pet) => (
        <img key={pet} src={`/pets/${pet}/happy.webp`} alt="" />
      ))}
    </div>
  )
}

function App() {
  const [t, setT] = useState(() => Number(params.get('t') ?? 0))
  window.__setT = (next) => flushSync(() => setT(next))
  return (
    <>
      <Preload />
      <Promo t={t} lang={lang} portrait={portrait} />
    </>
  )
}

createRoot(document.getElementById('root')!).render(<App />)

window.__ready = (async () => {
  await document.fonts.ready
  await Promise.all(
    [...document.images].map((img) =>
      img.complete
        ? null
        : new Promise((resolve) => img.addEventListener('load', resolve, { once: true })),
    ),
  )
})()
