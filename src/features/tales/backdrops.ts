import type { Backdrop } from './content'

/** Colours of each place, shared by the 3D scene and the flat (no-WebGL) picture. */
export interface BackdropLook {
  sky: string
  skyLow: string
  ground: string
  hill: string
  path: string
  trees: number
  water?: boolean
  stars?: boolean
  leaf: string
}

export const BACKDROPS: Record<Backdrop, BackdropLook> = {
  meadow: {
    sky: '#8FD3FF',
    skyLow: '#D9F1FF',
    ground: '#8BD17C',
    hill: '#6CC06A',
    path: '#E9D9A6',
    trees: 3,
    leaf: '#4FAE5C',
  },
  garden: {
    sky: '#9ED8FF',
    skyLow: '#E6F6FF',
    ground: '#93D483',
    hill: '#79C46E',
    path: '#D9B98C',
    trees: 2,
    leaf: '#52B15F',
  },
  pond: {
    sky: '#93D6FF',
    skyLow: '#DDF3FF',
    ground: '#86CF80',
    hill: '#6BBF6E',
    path: '#E6D7A8',
    trees: 2,
    water: true,
    leaf: '#4AA95C',
  },
  night: {
    sky: '#26305E',
    skyLow: '#4B4F8A',
    ground: '#3F7A5A',
    hill: '#33684E',
    path: '#7C8A78',
    trees: 2,
    stars: true,
    leaf: '#2F6B4A',
  },
  autumn: {
    sky: '#FFD9A0',
    skyLow: '#FFF0D6',
    ground: '#D9B45F',
    hill: '#E0A04A',
    path: '#EBD3A0',
    trees: 3,
    leaf: '#E8833A',
  },
  winter: {
    sky: '#BFE3FF',
    skyLow: '#F2FAFF',
    ground: '#F4F8FC',
    hill: '#E2EEF8',
    path: '#DCE6F0',
    trees: 2,
    leaf: '#6FA889',
  },
  rain: {
    sky: '#A9B8C9',
    skyLow: '#D5DEE8',
    ground: '#7DBA77',
    hill: '#68A66A',
    path: '#C9BC94',
    trees: 2,
    leaf: '#4D9659',
  },
  farm: {
    sky: '#A3DBFF',
    skyLow: '#E8F7FF',
    ground: '#A6D77E',
    hill: '#8BC66C',
    path: '#DDC28E',
    trees: 1,
    leaf: '#58B062',
  },
}
