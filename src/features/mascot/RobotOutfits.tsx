import { outfitColors, type OutfitId, type OutfitTone } from '@/features/shop/outfits'

/*
 * Robot clothes for the 2D robot, drawn in the robot's 200×240 viewBox.
 * Each part is drawn inside the body part it belongs to, so it moves with it.
 * Colours come from outfitColors(id, tone), so the 2D and 3D robot match and
 * an older learner sees the same item in calmer colours.
 *
 * Geometry: head shell x34–166 y26–144, ears at cx 32/168 cy 88, visor x50–150
 * y48–128 (drawn after HeadOutfit, so head items stay above y≈48 in the middle),
 * eyes near (79, 88) and (121, 88), neck y136–150, body from y144.
 */

interface OutfitProps {
  id: OutfitId | undefined
  tone?: OutfitTone
}

/** Doppi motif: the white qalampir (pepper/almond) with a curled tip and a fine dark vein. */
function Qalampir({ base, pattern }: { base: string; pattern: string }) {
  return (
    <g>
      <path d="M0 -12 C9 -7 10 4 0 12 C-10 4 -9 -7 0 -12 Z" fill={pattern} />
      <path
        d="M0 -12 Q1 -18 6 -18"
        stroke={pattern}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M0 -6 Q3 0 0 7" stroke={base} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  )
}

/** On top of the head (inside the head group, after the shell). Also draws the ear slot. */
export function HeadOutfit({ id, tone = 'bright' }: OutfitProps) {
  if (id === 'cap') {
    const c = outfitColors('cap', tone)
    return (
      <g>
        <path d="M44 58 Q44 14 100 12 Q156 14 156 58 Z" fill={c.main} />
        <path
          d="M58 30 Q100 8 142 30"
          stroke="#FFFFFF"
          strokeOpacity="0.3"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="100" cy="58" rx="64" ry="9" fill={c.dark} />
        <circle cx="100" cy="12" r="6" fill={c.dark} />
      </g>
    )
  }
  if (id === 'crown') {
    const c = outfitColors('crown', tone)
    return (
      <g>
        <path
          d="M64 44 L70 6 L86 26 L100 0 L114 26 L130 6 L136 44 Z"
          fill={c.main}
          stroke={c.dark}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="32" r="5" fill={c.gem} />
        <circle cx="80" cy="35" r="3.5" fill="#FFFFFF" />
        <circle cx="120" cy="35" r="3.5" fill="#FFFFFF" />
      </g>
    )
  }
  if (id === 'flower') {
    const c = outfitColors('flower', tone)
    const petals = [0, 72, 144, 216, 288]
    return (
      <g transform="translate(62 32)">
        {petals.map((angle) => (
          <ellipse
            key={angle}
            cx="0"
            cy="-10"
            rx="7"
            ry="10"
            fill={c.petal}
            transform={`rotate(${angle})`}
          />
        ))}
        <circle r="6.5" fill={c.centre} />
      </g>
    )
  }
  if (id === 'headband') {
    const c = outfitColors('headband', tone)
    return (
      <g fill="none">
        <path d="M46 50 Q100 18 154 50" stroke={c.main} strokeWidth="13" />
        <path d="M46 50 Q100 18 154 50" stroke={c.stripe} strokeWidth="3" />
        <circle cx="128" cy="38" r="4.5" fill={c.stripe} />
      </g>
    )
  }
  if (id === 'explorer-hat') {
    const c = outfitColors('explorer-hat', tone)
    return (
      <g>
        <ellipse cx="100" cy="42" rx="66" ry="9" fill={c.dark} />
        <ellipse cx="100" cy="40" rx="63" ry="7" fill={c.main} />
        <path d="M62 40 L66 16 Q68 6 100 6 Q132 6 134 16 L138 40 Z" fill={c.main} />
        <path d="M64 30 L136 30 L138 40 L62 40 Z" fill={c.band} />
        <path
          d="M88 9 Q100 14 112 9"
          stroke={c.dark}
          strokeOpacity="0.4"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    )
  }
  if (id === 'beret') {
    const c = outfitColors('beret', tone)
    return (
      <g>
        <path d="M104 10 L109 3" stroke={c.dark} strokeWidth="4" strokeLinecap="round" />
        <path d="M42 40 Q38 12 100 10 Q166 10 158 36 Q130 46 100 44 Q66 44 42 40 Z" fill={c.main} />
        <path
          d="M48 40 Q100 50 152 38"
          stroke={c.dark}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M62 22 Q90 12 120 14"
          stroke="#FFFFFF"
          strokeOpacity="0.25"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    )
  }
  if (id === 'doppi') {
    const c = outfitColors('doppi', tone)
    return (
      <g>
        {/* four-sided cap: the front panel faces us, the side panels show at the edges */}
        <path d="M52 46 L58 18 Q100 8 142 18 L148 46 Q100 51 52 46 Z" fill={c.main} />
        <path
          d="M74 47 L77 14.5 M126 47 L123 14.5"
          stroke={c.pattern}
          strokeOpacity="0.55"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M86 46 Q86 22 100 16 Q114 22 114 46"
          stroke={c.pattern}
          strokeWidth="1.5"
          fill="none"
        />
        <g transform="translate(100 32)">
          <Qalampir base={c.main} pattern={c.pattern} />
        </g>
        <g transform="translate(64 33) rotate(-10) scale(0.62)">
          <Qalampir base={c.main} pattern={c.pattern} />
        </g>
        <g transform="translate(136 33) rotate(10) scale(-0.62 0.62)">
          <Qalampir base={c.main} pattern={c.pattern} />
        </g>
        <path
          d="M52 46 Q100 51 148 46"
          stroke={c.edge}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    )
  }
  if (id === 'winter-hat') {
    const c = outfitColors('winter-hat', tone)
    const ribs = [56, 68, 80, 92, 104, 116, 128, 140]
    return (
      <g>
        <path d="M48 42 Q48 12 100 12 Q152 12 152 42 Z" fill={c.main} />
        <path
          d="M62 26 Q100 14 138 26"
          stroke={c.band}
          strokeOpacity="0.7"
          strokeWidth="3"
          fill="none"
          strokeDasharray="6 4"
          strokeLinecap="round"
        />
        <rect x="44" y="32" width="112" height="16" rx="8" fill={c.band} />
        <path
          d={ribs.map((x) => `M${x} 35.5 L${x} 44.5`).join(' ')}
          stroke={c.main}
          strokeOpacity="0.3"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="100" cy="11" r="9" fill={c.pom} stroke={c.band} strokeWidth="2" />
      </g>
    )
  }
  if (id === 'headset') {
    const c = outfitColors('headset', tone)
    return (
      <g>
        <path
          d="M30 70 Q28 8 100 8 Q172 8 170 70"
          stroke={c.dark}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        {[32, 168].map((cx) => (
          <g key={cx}>
            <ellipse
              cx={cx}
              cy="88"
              rx="13"
              ry="19"
              fill={c.main}
              stroke={c.dark}
              strokeWidth="3"
            />
            <circle cx={cx} cy="88" r="5" fill={c.dark} fillOpacity="0.55" />
          </g>
        ))}
        {/* mic arm stays on the cheek, outside the visor */}
        <path
          d="M36 104 Q40 124 53 125"
          stroke={c.mic}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <ellipse cx="57" cy="125" rx="5" ry="4" fill={c.mic} />
      </g>
    )
  }
  if (id === 'headphones') {
    const c = outfitColors('headphones', tone)
    return (
      <g>
        <path
          d="M26 76 Q22 2 100 2 Q178 2 174 76"
          stroke={c.main}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M68 7 Q100 -3 132 7"
          stroke={c.pad}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="16" y="66" width="28" height="44" rx="12" fill={c.main} />
        <rect x="36" y="70" width="10" height="36" rx="5" fill={c.pad} />
        <circle cx="25" cy="80" r="3.5" fill={c.light} />
        <rect x="156" y="66" width="28" height="44" rx="12" fill={c.main} />
        <rect x="154" y="70" width="10" height="36" rx="5" fill={c.pad} />
        <circle cx="175" cy="80" r="3.5" fill={c.light} />
      </g>
    )
  }
  return null
}

/** Over the eyes (inside the head group, after the face). Lenses stay see-through. */
export function FaceOutfit({ id, tone = 'bright' }: OutfitProps) {
  if (id === 'glasses') {
    const c = outfitColors('glasses', tone)
    return (
      <g fill="#FFFFFF" fillOpacity="0.14" stroke={c.frame} strokeWidth="4.5">
        <circle cx="79" cy="88" r="17" />
        <circle cx="121" cy="88" r="17" />
        <path d="M96 86 Q100 81 104 86" fill="none" />
        <path d="M62 84 L52 80 M138 84 L148 80" fill="none" strokeLinecap="round" />
      </g>
    )
  }
  if (id === 'sunglasses') {
    const c = outfitColors('sunglasses', tone)
    return (
      <g>
        <g fill={c.lens} fillOpacity="0.45" stroke={c.frame} strokeWidth="4">
          <rect x="60" y="75" width="38" height="27" rx="11" />
          <rect x="102" y="75" width="38" height="27" rx="11" />
        </g>
        <g fill="none" stroke={c.frame} strokeWidth="4" strokeLinecap="round">
          <path d="M98 84 Q100 81 102 84" />
          <path d="M60 84 L51 80 M140 84 L149 80" />
        </g>
        <path
          d="M67 81 L75 79 M109 81 L117 79"
          stroke="#FFFFFF"
          strokeOpacity="0.55"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    )
  }
  if (id === 'goggles') {
    const c = outfitColors('goggles', tone)
    return (
      <g>
        <path d="M37 88 L163 88" stroke={c.strap} strokeWidth="10" strokeLinecap="round" />
        <g fill={c.lens} fillOpacity="0.4" stroke={c.frame} strokeWidth="6">
          <rect x="58" y="70" width="40" height="36" rx="15" />
          <rect x="102" y="70" width="40" height="36" rx="15" />
        </g>
        <rect x="96" y="83" width="8" height="8" rx="2" fill={c.frame} />
        <path
          d="M66 78 L74 76 M110 78 L118 76"
          stroke="#FFFFFF"
          strokeOpacity="0.6"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    )
  }
  return null
}

/** A cord around the neck down to a pendant at about (100, 167). */
function Cord({ color }: { color: string }) {
  return (
    <path
      d="M84 141 Q86 164 100 166 Q114 164 116 141"
      stroke={color}
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
  )
}

/** Around the neck (drawn after the head so it wraps over the chin). */
export function NeckOutfit({ id, tone = 'bright' }: OutfitProps) {
  if (id === 'scarf') {
    const c = outfitColors('scarf', tone)
    return (
      <g>
        <rect
          x="114"
          y="146"
          width="15"
          height="34"
          rx="6"
          fill={c.dark}
          transform="rotate(-12 121 146)"
        />
        <rect x="66" y="138" width="68" height="17" rx="8.5" fill={c.main} />
        <path
          d="M76 142 L76 151 M90 142 L90 151 M104 142 L104 151 M118 142 L118 151"
          stroke={c.dark}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    )
  }
  if (id === 'bowtie') {
    const c = outfitColors('bowtie', tone)
    return (
      <g>
        <path d="M100 150 L80 139 L80 161 Z" fill={c.main} strokeLinejoin="round" />
        <path d="M100 150 L120 139 L120 161 Z" fill={c.main} strokeLinejoin="round" />
        <rect x="93" y="144" width="14" height="12" rx="4" fill={c.dark} />
      </g>
    )
  }
  if (id === 'whistle') {
    const c = outfitColors('whistle', tone)
    return (
      <g>
        <Cord color={c.cord} />
        <circle cx="100" cy="168" r="3" fill="none" stroke={c.cord} strokeWidth="2" />
        <rect x="97" y="170" width="17" height="8" rx="2" fill={c.main} />
        <circle cx="97" cy="179" r="9" fill={c.main} />
        <circle cx="96" cy="179" r="3.2" fill="#000000" fillOpacity="0.25" />
        <path
          d="M91 174 Q94 171 98 171"
          stroke="#FFFFFF"
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    )
  }
  if (id === 'compass') {
    const c = outfitColors('compass', tone)
    return (
      <g>
        <Cord color={c.main} />
        <circle cx="100" cy="167" r="3" fill="none" stroke={c.main} strokeWidth="2" />
        <circle cx="100" cy="181" r="12" fill={c.main} />
        <circle cx="100" cy="181" r="9" fill={c.face} />
        <path d="M100 173 L103 181 L97 181 Z" fill={c.needle} />
        <path d="M100 189 L103 181 L97 181 Z" fill={c.main} />
        <circle cx="100" cy="181" r="1.5" fill={c.main} />
      </g>
    )
  }
  if (id === 'tie') {
    const c = outfitColors('tie', tone)
    return (
      <g>
        <path d="M96 155 L104 155 L110 186 L100 196 L90 186 Z" fill={c.main} />
        <path
          d="M94 168 L106 163 M93 180 L108 174"
          stroke={c.dark}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path d="M92 144 L108 144 L104 156 L96 156 Z" fill={c.knot} strokeLinejoin="round" />
      </g>
    )
  }
  return null
}
