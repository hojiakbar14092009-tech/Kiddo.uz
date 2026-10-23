import type { ReactNode } from 'react'
import {
  Ball,
  Blocks,
  BreathRings,
  Bubble,
  BubbleHeart,
  Clock,
  Cloth,
  Elder,
  Flying,
  Heart,
  Kid,
  Question,
  Slide,
  Somsa,
  Sparkle,
  Spill,
  Teddy,
  Tv,
} from './choicePieces'
import { FACE_INK } from './faceArt'

/*
 * One picture per answer of every situation (Kiddo's own simple SVG scenes,
 * no emoji, no characters), so a child who cannot read yet can choose by the
 * picture while the speaker reads the answers. Pieces: choicePieces.tsx.
 */

const SHIRT = {
  me: '#4FC3F7',
  friend: '#FF8A80',
  other: '#B39DDB',
  third: '#FFD54F',
} as const

const limb = { stroke: FACE_INK, strokeWidth: 3.5, strokeLinecap: 'round', fill: 'none' } as const

/** One picture per answer of every situation, keyed by the answer's id. */
export const CHOICE_ART: Readonly<Record<string, ReactNode>> = {
  // a friend fell
  ask: (
    <>
      <Kid x={34} shirt={SHIRT.friend} mood="cry" pose="sit" />
      <Kid x={80} shirt={SHIRT.me} mood="talk" pose="reach" />
      <Bubble x={86} y={4}>
        <Question x={86} y={4} />
      </Bubble>
    </>
  ),
  'grown-up': (
    <>
      <Kid x={22} shirt={SHIRT.friend} mood="cry" pose="sit" />
      <Kid x={62} shirt={SHIRT.me} mood="talk" pose="wave" />
      <Elder x={98} who="grandma" />
    </>
  ),
  'keep-playing': (
    <>
      <Kid x={24} shirt={SHIRT.friend} mood="cry" pose="sit" />
      <Kid x={84} shirt={SHIRT.me} pose="run" />
      <Ball x={108} y={76} />
    </>
  ),
  // another child wants your toy
  together: (
    <>
      <Kid x={30} shirt={SHIRT.me} mood="grin" />
      <Teddy x={60} y={64} />
      <Kid x={90} shirt={SHIRT.other} mood="grin" />
      <Heart x={60} y={24} s={1.6} />
    </>
  ),
  later: (
    <>
      <Kid x={30} shirt={SHIRT.me} mood="talk" />
      <Teddy x={48} y={62} />
      <Kid x={90} shirt={SHIRT.other} mood="smile" />
      <Clock x={62} y={18} />
    </>
  ),
  hide: (
    <>
      <rect
        x={14}
        y={60}
        width="30"
        height="22"
        rx="3"
        fill="#BCAAA4"
        stroke={FACE_INK}
        strokeWidth="2"
      />
      <circle cx={23} cy={58} r="3.5" fill="#A1887F" />
      <circle cx={35} cy={58} r="3.5" fill="#A1887F" />
      <Kid x={62} shirt={SHIRT.me} mood="plain" />
      <Kid x={98} shirt={SHIRT.other} mood="sad" />
    </>
  ),
  // your tower fell and you feel angry
  breathe: (
    <>
      <Kid x={50} shirt={SHIRT.me} mood="calm" />
      <BreathRings x={50} />
      <Blocks x={82} scattered />
    </>
  ),
  tell: (
    <>
      <Blocks x={8} scattered />
      <Kid x={52} shirt={SHIRT.me} mood="talk" />
      <Elder x={94} who="grandma" />
      <Bubble x={14} y={4} flip>
        <path d="M21 12 L26 14 M37 12 L32 14 M24 19 H34" {...limb} strokeWidth={2} />
      </Bubble>
    </>
  ),
  throw: (
    <>
      <Kid x={40} shirt={SHIRT.me} mood="cross" pose="run" />
      <Flying x={70} />
      <Blocks x={86} scattered />
    </>
  ),
  // a new child stands alone
  invite: (
    <>
      <Kid x={30} shirt={SHIRT.me} mood="talk" pose="wave" />
      <Kid x={88} shirt={SHIRT.other} mood="smile" />
      <Ball x={59} y={75} />
      <Bubble x={36} y={2}>
        <Ball x={49} y={11} r={5} />
      </Bubble>
    </>
  ),
  smile: (
    <>
      <Kid x={34} shirt={SHIRT.me} mood="grin" />
      <Kid x={88} shirt={SHIRT.other} mood="smile" />
      <Sparkle x={60} y={22} />
      <Sparkle x={52} y={40} />
    </>
  ),
  'own-game': (
    <>
      <Kid x={26} shirt={SHIRT.me} mood="smile" pose="sit" />
      <Blocks x={40} />
      <Kid x={100} shirt={SHIRT.other} mood="sad" />
    </>
  ),
  // you spilt your friend's juice
  'sorry-help': (
    <>
      <Kid x={28} shirt={SHIRT.me} mood="talk" pose="reach" />
      <Spill x={62} />
      <Cloth x={46} />
      <Kid x={98} shirt={SHIRT.friend} mood="smile" />
      <BubbleHeart x={36} y={2} />
    </>
  ),
  sorry: (
    <>
      <Kid x={30} shirt={SHIRT.me} mood="talk" />
      <Spill x={60} />
      <Kid x={98} shirt={SHIRT.friend} mood="smile" />
      <BubbleHeart x={36} y={2} />
    </>
  ),
  'walk-away': (
    <>
      <Kid x={26} shirt={SHIRT.friend} mood="sad" />
      <Spill x={52} />
      <Kid x={96} shirt={SHIRT.me} pose="away" />
    </>
  ),
  // grandma baked somsa
  thank: (
    <>
      <Elder x={28} who="grandma" />
      <Somsa x={58} y={70} />
      <Kid x={92} shirt={SHIRT.me} mood="talk" />
      <BubbleHeart x={64} y={2} flip />
    </>
  ),
  'smile-eat': (
    <>
      <Elder x={28} who="grandma" />
      <Kid x={84} shirt={SHIRT.me} mood="grin" />
      <Somsa x={60} y={68} />
    </>
  ),
  'run-off': (
    <>
      <Elder x={24} who="grandma" mood="plain" />
      <Somsa x={52} y={72} />
      <Kid x={92} shirt={SHIRT.me} pose="run" />
    </>
  ),
  // the line for the slide
  wait: (
    <>
      <Kid x={14} shirt={SHIRT.me} mood="smile" />
      <Kid x={40} shirt={SHIRT.other} mood="smile" />
      <Kid x={66} shirt={SHIRT.third} mood="smile" />
      <Slide x={84} />
    </>
  ),
  'come-back': (
    <>
      <Kid x={22} shirt={SHIRT.me} mood="grin" />
      <Ball x={44} y={75} />
      <Kid x={70} shirt={SHIRT.other} mood="smile" />
      <Slide x={84} />
      <Clock x={44} y={16} />
    </>
  ),
  'go-first': (
    <>
      <Kid x={14} shirt={SHIRT.other} mood="sad" />
      <Kid x={38} shirt={SHIRT.third} mood="sad" />
      <Kid x={70} shirt={SHIRT.me} pose="run" />
      <Slide x={86} />
    </>
  ),
  // a friend is crying
  'sit-ask': (
    <>
      <Kid x={30} shirt={SHIRT.friend} mood="cry" pose="sit" />
      <Kid x={62} shirt={SHIRT.me} mood="talk" pose="sit" />
      <Bubble x={80} y={8}>
        <Question x={80} y={8} />
      </Bubble>
    </>
  ),
  'give-toy': (
    <>
      <Kid x={30} shirt={SHIRT.me} mood="smile" pose="reach" />
      <Teddy x={54} y={60} />
      <Kid x={86} shirt={SHIRT.friend} mood="cry" pose="sit" />
    </>
  ),
  'go-play': (
    <>
      <Kid x={24} shirt={SHIRT.friend} mood="cry" pose="sit" />
      <Kid x={80} shirt={SHIRT.me} pose="run" />
      <Ball x={108} y={76} />
    </>
  ),
  // grandpa comes home
  greet: (
    <>
      <Elder x={86} who="grandpa" mood="grin" />
      <Kid x={44} shirt={SHIRT.me} mood="talk" />
      <BubbleHeart x={4} y={4} />
    </>
  ),
  wave: (
    <>
      <Tv x={6} />
      <Kid x={48} shirt={SHIRT.me} mood="smile" pose="wave" />
      <Elder x={92} who="grandpa" mood="smile" />
    </>
  ),
  'keep-watching': (
    <>
      <Tv x={8} />
      <Kid x={52} shirt={SHIRT.me} pose="sit" mood="plain" />
      <Elder x={98} who="grandpa" mood="plain" />
    </>
  ),
}
