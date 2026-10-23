// relative (with .ts) so the e2e specs, built without the @ alias, can import this data too
import type { Language } from '../../../content/languages.ts'

/*
 * Content of the "My Uzbekistan" world (/worlds/uzbekistan). Data only, no
 * runtime imports, so tests, the still renderer and e2e specs can read it.
 *
 * Facts are short, kind and checked against common encyclopaedic sources
 * (Registan: three madrasas of the 15th–17th centuries; Kalta Minor: begun in
 * 1851 in Itchan Kala and never finished; the Ark: Bukhara's old citadel, now
 * a museum; Chust do‘ppi: black with four white "qalampir" patterns; Navro‘z
 * on 21 March with sumalak). No politics and no living people.
 */

export type Text = Readonly<Record<Language, string>>

// ------------------------------------------------------------------ explore

/** Explore cards: 3D landmarks and objects, plus two tradition cards without a model. */
export const LANDMARK_IDS = ['registan', 'kalta-minor', 'ark', 'yurt', 'doppi', 'tandir'] as const
export type LandmarkId = (typeof LANDMARK_IDS)[number]

export const TRADITION_IDS = ['navruz', 'mehmon'] as const
export type TraditionId = (typeof TRADITION_IDS)[number]

export type ExploreId = LandmarkId | TraditionId
export const EXPLORE_IDS: readonly ExploreId[] = [...LANDMARK_IDS, ...TRADITION_IDS]

export interface HotspotText {
  id: string
  /** Model-space position, matching models.ts. */
  position: readonly [number, number, number]
  /** One short sentence shown when the point is chosen. */
  text: Text
}

export interface ExploreItem {
  id: ExploreId
  name: Text
  /** A short line under the name: the city or what it is. */
  tag: Text
  /** Exactly three short facts. */
  facts: readonly [Text, Text, Text]
  /** 3D landmarks: 2–3 points; their labels are i18n keys `uzbekistan.hotspots.<id>.<point>`. */
  hotspots: readonly HotspotText[]
  /** Camera distance of the 3D model (landmarks only). */
  distance?: number
  /** A tradition card's picture (public/3d/<name>.webp). */
  picture?: string
}

export const EXPLORE: Readonly<Record<ExploreId, ExploreItem>> = {
  registan: {
    id: 'registan',
    name: { uz: 'Registon', ru: 'Регистан', en: 'The Registan' },
    tag: { uz: 'Samarqand', ru: 'Самарканд', en: 'Samarkand' },
    facts: [
      {
        uz: 'Registon – Samarqanddagi katta va chiroyli maydon.',
        ru: 'Регистан – большая и красивая площадь в Самарканде.',
        en: 'The Registan is a big, beautiful square in Samarkand.',
      },
      {
        uz: 'Maydon atrofida uchta madrasa turibdi. Qadimda u yerda yoshlar o‘qishgan.',
        ru: 'Вокруг площади стоят три медресе. Давным-давно в них учились.',
        en: 'Three madrasas stand around the square. Long ago, students learned there.',
      },
      {
        uz: 'Gumbazlar ko‘k va feruza rangli koshinlar bilan bezatilgan – xuddi osmondek.',
        ru: 'Купола покрыты синей и бирюзовой плиткой – как небо.',
        en: 'The domes are covered with blue and turquoise tiles, like the sky.',
      },
    ],
    hotspots: [
      {
        id: 'dome',
        position: [1.55, 0.5, -0.4],
        text: {
          uz: 'Gumbaz – madrasaning yumaloq tomi.',
          ru: 'Купол – круглая крыша медресе.',
          en: 'A dome is the round roof of a madrasa.',
        },
      },
      {
        id: 'minaret',
        position: [-1.15, 0.8, 1.1],
        text: {
          uz: 'Minora – baland va ingichka dumaloq bino.',
          ru: 'Минарет – высокая тонкая круглая башня.',
          en: 'A minaret is a tall, thin, round tower.',
        },
      },
      {
        id: 'portal',
        position: [0, 0.45, -0.85],
        text: {
          uz: 'Peshtoq – madrasaning baland kirish qismi.',
          ru: 'Портал – высокий главный вход в медресе.',
          en: 'The portal is the tall front entrance of a madrasa.',
        },
      },
    ],
    distance: 6.8,
  },
  'kalta-minor': {
    id: 'kalta-minor',
    name: { uz: 'Kalta Minor', ru: 'Кальта-Минар', en: 'Kalta Minor' },
    tag: { uz: 'Xiva', ru: 'Хива', en: 'Khiva' },
    facts: [
      {
        uz: '«Kalta minor» – «qisqa minora» degani. U past, lekin juda yo‘g‘on.',
        ru: '«Кальта-Минар» значит «короткий минарет». Он невысокий, но очень широкий.',
        en: '“Kalta Minor” means “short minaret”. It is low, but very wide.',
      },
      {
        uz: 'U juda baland bo‘lishi kerak edi, lekin uni oxirigacha qurib bitkazishmagan.',
        ru: 'Его хотели сделать очень высоким, но так и не достроили.',
        en: 'It was meant to be very tall, but it was never finished.',
      },
      {
        uz: 'Minora feruza, ko‘k va oq koshinlar bilan qoplangan. U Xivaning Ichan qal’asida turadi.',
        ru: 'Он покрыт бирюзовой, синей и белой плиткой и стоит в старом городе Хивы – Ичан-Кале.',
        en: 'It is covered with turquoise, blue and white tiles and stands in Khiva’s old town, Itchan Kala.',
      },
    ],
    hotspots: [
      {
        id: 'tiles',
        position: [0, 0.1, 0.97],
        text: {
          uz: 'Yaltiroq koshinlar quyoshda chiroyli tovlanadi.',
          ru: 'Блестящая плитка красиво сверкает на солнце.',
          en: 'The shiny tiles sparkle in the sun.',
        },
      },
      {
        id: 'top',
        position: [0, 1.65, 0],
        text: {
          uz: 'Tepasi tekis, chunki minora qurib bitkazilmagan.',
          ru: 'Верх плоский, потому что минарет не достроили.',
          en: 'The top is flat because the minaret was never finished.',
        },
      },
      {
        id: 'bands',
        position: [0.7, -0.6, 0.7],
        text: {
          uz: 'Minorani rangli naqsh belbog‘lari o‘rab turadi.',
          ru: 'Минарет опоясывают цветные узорные полосы.',
          en: 'Colourful pattern bands wrap around the minaret.',
        },
      },
    ],
    distance: 7.2,
  },
  ark: {
    id: 'ark',
    name: { uz: 'Ark qal’asi', ru: 'Крепость Арк', en: 'The Ark fortress' },
    tag: { uz: 'Buxoro', ru: 'Бухара', en: 'Bukhara' },
    facts: [
      {
        uz: 'Ark – Buxorodagi juda qadimiy qal’a.',
        ru: 'Арк – очень древняя крепость в Бухаре.',
        en: 'The Ark is a very old fortress in Bukhara.',
      },
      {
        uz: 'Uning devorlari baland va qalin – ular ichkaridagilarni himoya qilgan.',
        ru: 'Её стены высокие и толстые – они защищали тех, кто жил внутри.',
        en: 'Its walls are tall and thick to keep everyone inside safe.',
      },
      {
        uz: 'Qadimda qal’a ichida Buxoro hukmdorlari yashagan. Hozir u yerda muzey bor.',
        ru: 'Давным-давно в крепости жили правители Бухары. Сейчас там музей.',
        en: 'Long ago, the rulers of Bukhara lived inside. Today it is a museum.',
      },
    ],
    hotspots: [
      {
        id: 'walls',
        position: [-1.35, 0.1, 1.05],
        text: {
          uz: 'Devorlar g‘ishtdan qurilgan.',
          ru: 'Стены построены из кирпича.',
          en: 'The walls are made of bricks.',
        },
      },
      {
        id: 'gate',
        position: [0, -0.25, 1.5],
        text: {
          uz: 'Darvoza ikki burj orasida joylashgan.',
          ru: 'Ворота стоят между двумя башнями.',
          en: 'The gate stands between two towers.',
        },
      },
      {
        id: 'towers',
        position: [0.45, 0.8, 1.3],
        text: {
          uz: 'Burjlardan qo‘riqchilar atrofni kuzatgan.',
          ru: 'С башен стража смотрела вокруг.',
          en: 'Guards looked out from the towers.',
        },
      },
    ],
    distance: 7.2,
  },
  yurt: {
    id: 'yurt',
    name: { uz: 'O‘tov', ru: 'Юрта', en: 'The yurt' },
    tag: { uz: 'Ko‘chmanchilar uyi', ru: 'Дом кочевников', en: 'A nomad home' },
    facts: [
      {
        uz: 'O‘tov – yumaloq uy. Uni yig‘ib, ot yoki tuyada boshqa joyga olib borish mumkin.',
        ru: 'Юрта – круглый дом. Её можно разобрать и перевезти на коне или верблюде.',
        en: 'A yurt is a round house. It can be taken apart and carried on a horse or a camel.',
      },
      {
        uz: 'Yog‘och karkas kigiz bilan yopiladi. Kigiz qishda issiq, yozda salqin saqlaydi.',
        ru: 'Деревянный каркас накрывают войлоком. Зимой в юрте тепло, а летом прохладно.',
        en: 'The wooden frame is covered with felt. It keeps the yurt warm in winter and cool in summer.',
      },
      {
        uz: 'Tepadagi yumaloq tuynukdan yorug‘lik kiradi va o‘choq tutuni chiqib ketadi.',
        ru: 'Через круглое отверстие наверху входит свет и выходит дым от очага.',
        en: 'Light comes in through the round opening at the top, and smoke from the fire goes out.',
      },
    ],
    hotspots: [
      {
        id: 'door',
        position: [0, -0.45, 1.26],
        text: {
          uz: 'Eshik yog‘ochdan, ko‘pincha naqshlar bilan bezatiladi.',
          ru: 'Дверь деревянная, часто с узорами.',
          en: 'The door is made of wood and often has patterns.',
        },
      },
      {
        id: 'felt',
        position: [0.86, -0.3, 0.86],
        text: {
          uz: 'Kigiz qo‘y junidan tayyorlanadi.',
          ru: 'Войлок делают из овечьей шерсти.',
          en: 'Felt is made from sheep’s wool.',
        },
      },
      {
        id: 'top',
        position: [0, 0.87, 0],
        text: {
          uz: 'Tuynuk – o‘tovning «derazasi»: undan osmon ko‘rinadi.',
          ru: 'Отверстие наверху – «окно» юрты: через него видно небо.',
          en: 'The opening at the top is the yurt’s “window” to the sky.',
        },
      },
    ],
    distance: 5.6,
  },
  doppi: {
    id: 'doppi',
    name: { uz: 'Do‘ppi', ru: 'Тюбетейка', en: 'The do‘ppi cap' },
    tag: { uz: 'Milliy bosh kiyim', ru: 'Национальный головной убор', en: 'A traditional cap' },
    facts: [
      {
        uz: 'Do‘ppi – o‘zbek milliy bosh kiyimi. Uni bolalar ham, kattalar ham kiyadi.',
        ru: 'Тюбетейка (по-узбекски «дўппи») – узбекский национальный головной убор. Её носят и дети, и взрослые.',
        en: 'The do‘ppi is a traditional Uzbek cap. Children and grown-ups wear it.',
      },
      {
        uz: 'Mashhur Chust do‘ppisi qora rangda, unda to‘rtta oq qalampir naqshi bor.',
        ru: 'Знаменитая чустская тюбетейка – чёрная, с четырьмя белыми узорами-«перчиками».',
        en: 'The famous Chust do‘ppi is black with four white pepper-shaped patterns.',
      },
      {
        uz: 'Naqshlar ip bilan qo‘lda tikiladi – bu katta mehnat.',
        ru: 'Узоры вышивают нитками вручную – это большой труд.',
        en: 'The patterns are stitched by hand with thread. It takes a lot of work.',
      },
    ],
    hotspots: [
      {
        id: 'pattern',
        position: [0, -0.05, 0.78],
        text: {
          uz: 'Bu naqsh qalampirga o‘xshaydi, shuning uchun uni «qalampir» deyishadi.',
          ru: 'Этот узор похож на перчик, поэтому его так и называют.',
          en: 'This pattern looks like a pepper, so it is called “pepper”.',
        },
      },
      {
        id: 'sides',
        position: [0.72, 0.1, 0.72],
        text: {
          uz: 'Do‘ppining to‘rt tomoni bor – har birida bitta naqsh.',
          ru: 'У тюбетейки четыре стороны – на каждой по узору.',
          en: 'The cap has four sides, with one pattern on each.',
        },
      },
      {
        id: 'edge',
        position: [0.4, -0.45, 0.78],
        text: {
          uz: 'Jiyak – do‘ppining pastki chetidagi tasma.',
          ru: 'Кайма – полоска по нижнему краю тюбетейки.',
          en: 'The edge band runs around the bottom of the cap.',
        },
      },
    ],
    distance: 4.2,
  },
  tandir: {
    id: 'tandir',
    name: { uz: 'Tandir', ru: 'Тандыр', en: 'The tandir oven' },
    tag: { uz: 'Non yopiladigan o‘choq', ru: 'Печь для лепёшек', en: 'A clay oven for bread' },
    facts: [
      {
        uz: 'Tandir – loydan qilingan dumaloq o‘choq. Uning ichida o‘t yoqiladi.',
        ru: 'Тандыр – круглая печь из глины. Внутри разводят огонь.',
        en: 'A tandir is a round oven made of clay. A fire is lit inside it.',
      },
      {
        uz: 'Novvoy xamirni tandirning issiq ichki devoriga yopishtiradi – non shunday yopiladi.',
        ru: 'Пекарь прилепляет тесто к горячей стенке тандыра – так пекут лепёшки.',
        en: 'The baker sticks the dough onto the hot inside wall – that is how the bread bakes.',
      },
      {
        uz: 'Non o‘rtasiga chekich bilan chiroyli naqsh bosiladi.',
        ru: 'В середине лепёшки штампом-чекичем делают красивый узор.',
        en: 'A stamp called a chekich presses a pretty pattern into the middle of the bread.',
      },
    ],
    hotspots: [
      {
        id: 'mouth',
        position: [0, 0.72, 0],
        text: {
          uz: 'Tandir og‘zidan non yopiladi va olinadi.',
          ru: 'Через это отверстие лепёшки кладут и достают.',
          en: 'The bread goes in and comes out through this opening.',
        },
      },
      {
        id: 'wall',
        position: [0.62, 0.05, 0.62],
        text: {
          uz: 'Qalin loy devor issiqni uzoq saqlaydi.',
          ru: 'Толстые глиняные стенки долго держат жар.',
          en: 'Thick clay walls keep the heat for a long time.',
        },
      },
      {
        id: 'non',
        position: [0.55, -0.15, 0.5],
        text: {
          uz: 'Issiq non – dasturxon ko‘rki.',
          ru: 'Горячая лепёшка – украшение стола.',
          en: 'Warm flatbread (non) is the pride of the table.',
        },
      },
    ],
    distance: 5,
  },
  navruz: {
    id: 'navruz',
    name: { uz: 'Navro‘z', ru: 'Навруз', en: 'Navruz' },
    tag: { uz: 'Bahor bayrami', ru: 'Праздник весны', en: 'The spring festival' },
    facts: [
      {
        uz: 'Navro‘z – bahor bayrami. U har yili 21-martda nishonlanadi.',
        ru: 'Навруз – праздник весны. Его отмечают каждый год 21 марта.',
        en: 'Navruz is the spring festival. It is celebrated every year on 21 March.',
      },
      {
        uz: 'Bayramda bug‘doy maysasidan sumalak pishiriladi. U tun bo‘yi qaynaydi.',
        ru: 'На праздник варят сумаляк из ростков пшеницы. Он варится всю ночь.',
        en: 'People cook sumalak from sprouted wheat. It cooks all night long.',
      },
      {
        uz: 'Navro‘zda odamlar bir-birinikiga mehmonga boradi, daraxt ekadi va birga quvonadi.',
        ru: 'На Навруз ходят в гости, сажают деревья и радуются вместе.',
        en: 'At Navruz, people visit each other, plant trees and celebrate together.',
      },
    ],
    hotspots: [],
    picture: 'tulip',
  },
  mehmon: {
    id: 'mehmon',
    name: { uz: 'Mehmondo‘stlik', ru: 'Гостеприимство', en: 'Welcoming guests' },
    tag: { uz: 'Dasturxon odobi', ru: 'Обычаи дастархана', en: 'Table customs' },
    facts: [
      {
        uz: 'Mehmonni dasturxonga taklif qilib, avval choy va non tortiladi.',
        ru: 'Гостя приглашают к дастархану и сначала угощают чаем и лепёшкой.',
        en: 'Guests are invited to the dasturxon and first offered tea and bread.',
      },
      {
        uz: 'Nonni hurmat qilishadi: uni teskari qo‘yishmaydi va qo‘l bilan ushatishadi.',
        ru: 'Хлеб уважают: лепёшку не кладут вверх дном и ломают руками.',
        en: 'Bread is treated with respect: it is never put upside down and is broken by hand.',
      },
      {
        uz: 'Choy damlanganda uch marta qaytariladi – shunda u yaxshi damlanadi.',
        ru: 'Заваренный чай трижды переливают в пиалу и обратно в чайник – так он лучше заваривается.',
        en: 'Fresh tea is poured into a cup and back into the pot three times so it brews well.',
      },
    ],
    hotspots: [],
    picture: 'teapot',
  },
}

export function isExploreId(value: string | undefined): value is ExploreId {
  return (EXPLORE_IDS as readonly string[]).includes(value ?? '')
}

export function isLandmark(id: ExploreId): id is LandmarkId {
  return (LANDMARK_IDS as readonly string[]).includes(id)
}

/** Still picture of a landmark model (rendered by scripts/render-uzbekistan.mjs). */
export function stillPath(id: LandmarkId): string {
  return `/3d/worlds/uz-${id}.webp`
}

/** The same picture as an Img3D name (public/3d/<name>.webp). */
export function stillName(id: LandmarkId): string {
  return `worlds/uz-${id}`
}

// ---------------------------------------------------------------------- map

export const CITY_IDS = ['toshkent', 'samarqand', 'buxoro', 'xiva', 'fargona', 'nukus'] as const
export type CityId = (typeof CITY_IDS)[number]

/** A picture: an Img3D name, a landmark still, or a pattern motif. */
export type Picture =
  { kind: 'img'; name: string } | { kind: 'still'; id: LandmarkId } | { kind: 'motif'; id: MotifId }

export interface City {
  id: CityId
  name: Text
  /** Real position (degrees). */
  lon: number
  lat: number
  /**
   * Where it is drawn on the stylised map: the real place, nudged a little
   * where two cities are close, so every tap target keeps 48 px on a phone.
   */
  mapLon: number
  mapLat: number
  /** Where its name sits next to the dot. */
  labelSide: 'above' | 'below' | 'left' | 'right'
  /** Level 1–2: "Find Samarkand!" (with the case each language needs). */
  find: Text
  /** Level 3: "Where is the Registan?" */
  where: Text
  /** Level 4–5: a clue without the city's name. */
  clue: Text
  picture: Picture
}

export const CITIES: Readonly<Record<CityId, City>> = {
  toshkent: {
    id: 'toshkent',
    name: { uz: 'Toshkent', ru: 'Ташкент', en: 'Tashkent' },
    lon: 69.24,
    lat: 41.3,
    mapLon: 69.3,
    mapLat: 41.3,
    labelSide: 'above',
    find: { uz: 'Toshkentni top!', ru: 'Найди Ташкент!', en: 'Find Tashkent!' },
    where: {
      uz: 'O‘zbekistonning poytaxti qayerda?',
      ru: 'Где столица Узбекистана?',
      en: 'Where is the capital of Uzbekistan?',
    },
    clue: {
      uz: 'Bu – O‘zbekistonning poytaxti. Uning chiroyli metrosi bor.',
      ru: 'Это столица Узбекистана. Здесь красивое метро.',
      en: 'This is the capital of Uzbekistan. It has a beautiful metro.',
    },
    picture: { kind: 'img', name: 'train' },
  },
  samarqand: {
    id: 'samarqand',
    name: { uz: 'Samarqand', ru: 'Самарканд', en: 'Samarkand' },
    lon: 66.96,
    lat: 39.65,
    mapLon: 67.1,
    mapLat: 39.6,
    labelSide: 'below',
    find: { uz: 'Samarqandni top!', ru: 'Найди Самарканд!', en: 'Find Samarkand!' },
    where: { uz: 'Registon qayerda?', ru: 'Где Регистан?', en: 'Where is the Registan?' },
    clue: {
      uz: 'Bu shaharda uchta madrasali Registon maydoni bor.',
      ru: 'В этом городе есть площадь Регистан с тремя медресе.',
      en: 'This city has the Registan square with three madrasas.',
    },
    picture: { kind: 'still', id: 'registan' },
  },
  buxoro: {
    id: 'buxoro',
    name: { uz: 'Buxoro', ru: 'Бухара', en: 'Bukhara' },
    lon: 64.42,
    lat: 39.77,
    mapLon: 64.0,
    mapLat: 39.8,
    labelSide: 'left',
    find: { uz: 'Buxoroni top!', ru: 'Найди Бухару!', en: 'Find Bukhara!' },
    where: {
      uz: 'Ark qal’asi qayerda?',
      ru: 'Где крепость Арк?',
      en: 'Where is the Ark fortress?',
    },
    clue: {
      uz: 'Bu shaharda qalin devorli qadimiy Ark qal’asi bor.',
      ru: 'В этом городе есть древняя крепость Арк с толстыми стенами.',
      en: 'This city has the old Ark fortress with thick walls.',
    },
    picture: { kind: 'still', id: 'ark' },
  },
  xiva: {
    id: 'xiva',
    name: { uz: 'Xiva', ru: 'Хива', en: 'Khiva' },
    lon: 60.36,
    lat: 41.38,
    mapLon: 60.6,
    mapLat: 41.1,
    labelSide: 'below',
    find: { uz: 'Xivani top!', ru: 'Найди Хиву!', en: 'Find Khiva!' },
    where: { uz: 'Kalta Minor qayerda?', ru: 'Где Кальта-Минар?', en: 'Where is Kalta Minor?' },
    clue: {
      uz: 'Bu shaharda past va yo‘g‘on feruza minora – Kalta Minor bor.',
      ru: 'В этом городе есть невысокий широкий бирюзовый минарет – Кальта-Минар.',
      en: 'This city has a short, wide turquoise minaret called Kalta Minor.',
    },
    picture: { kind: 'still', id: 'kalta-minor' },
  },
  fargona: {
    id: 'fargona',
    name: { uz: 'Farg‘ona', ru: 'Фергана', en: 'Fergana' },
    lon: 71.78,
    lat: 40.39,
    mapLon: 72.2,
    mapLat: 40.35,
    labelSide: 'below',
    find: { uz: 'Farg‘onani top!', ru: 'Найди Фергану!', en: 'Find Fergana!' },
    where: {
      uz: 'Atlas to‘qiladigan vodiydagi shahar qayerda?',
      ru: 'Где город в долине, где ткут атлас?',
      en: 'Where is the city in the valley where atlas silk is woven?',
    },
    clue: {
      uz: 'Bu shahar vodiyda joylashgan. Vodiyda chiroyli atlas matosi to‘qiladi.',
      ru: 'Этот город стоит в долине, где ткут красивый атлас.',
      en: 'This city is in a valley where beautiful atlas silk is woven.',
    },
    picture: { kind: 'motif', id: 'ikat' },
  },
  nukus: {
    id: 'nukus',
    name: { uz: 'Nukus', ru: 'Нукус', en: 'Nukus' },
    lon: 59.6,
    lat: 42.46,
    mapLon: 59.2,
    mapLat: 43.2,
    labelSide: 'right',
    find: { uz: 'Nukusni top!', ru: 'Найди Нукус!', en: 'Find Nukus!' },
    where: {
      uz: 'Qoraqalpog‘iston poytaxti qayerda?',
      ru: 'Где столица Каракалпакстана?',
      en: 'Where is the capital of Karakalpakstan?',
    },
    clue: {
      uz: 'Bu – Qoraqalpog‘istonning poytaxti. U Amudaryo bo‘yida joylashgan.',
      ru: 'Это столица Каракалпакстана. Он стоит на реке Амударья.',
      en: 'This is the capital of Karakalpakstan. It stands on the Amu Darya river.',
    },
    picture: { kind: 'img', name: 'wave' },
  },
}

// ---------------------------------------------------------------- dasturxon

export const FOOD_IDS = ['non', 'palov', 'somsa', 'choy', 'anor', 'qovun', 'uzum', 'olma'] as const
export type FoodId = (typeof FOOD_IDS)[number]
export const OTHER_IDS = ['koptok', 'paypoq', 'qalam', 'mashina', 'ayiqcha'] as const
export type OtherId = (typeof OTHER_IDS)[number]
export type TableItemId = FoodId | OtherId

export type FoodGroup = 'fruit' | 'tandir' | 'dish' | 'drink'

export interface Food {
  id: FoodId
  /** On the card. */
  label: Text
  /** Inside a sentence: "Put non, tea and a pomegranate…" (Russian in the accusative). */
  inList: Text
  group: FoodGroup
  /** Drawn by FoodArt (svg) or a 3D picture (public/3d). */
  img?: string
}

export const FOODS: Readonly<Record<FoodId, Food>> = {
  non: {
    id: 'non',
    label: { uz: 'Non', ru: 'Лепёшка', en: 'Non bread' },
    inList: { uz: 'non', ru: 'лепёшку', en: 'the bread' },
    group: 'tandir',
  },
  palov: {
    id: 'palov',
    label: { uz: 'Palov', ru: 'Плов', en: 'Plov' },
    inList: { uz: 'palov', ru: 'плов', en: 'the plov' },
    group: 'dish',
  },
  somsa: {
    id: 'somsa',
    label: { uz: 'Somsa', ru: 'Самса', en: 'Somsa' },
    inList: { uz: 'somsa', ru: 'самсу', en: 'a somsa' },
    group: 'tandir',
  },
  choy: {
    id: 'choy',
    label: { uz: 'Choy', ru: 'Чай', en: 'Tea' },
    inList: { uz: 'choy', ru: 'чай', en: 'the tea' },
    group: 'drink',
  },
  anor: {
    id: 'anor',
    label: { uz: 'Anor', ru: 'Гранат', en: 'Pomegranate' },
    inList: { uz: 'anor', ru: 'гранат', en: 'a pomegranate' },
    group: 'fruit',
  },
  qovun: {
    id: 'qovun',
    label: { uz: 'Qovun', ru: 'Дыня', en: 'Melon' },
    inList: { uz: 'qovun', ru: 'дыню', en: 'a melon' },
    group: 'fruit',
  },
  uzum: {
    id: 'uzum',
    label: { uz: 'Uzum', ru: 'Виноград', en: 'Grapes' },
    inList: { uz: 'uzum', ru: 'виноград', en: 'the grapes' },
    group: 'fruit',
    img: 'grapes',
  },
  olma: {
    id: 'olma',
    label: { uz: 'Olma', ru: 'Яблоко', en: 'Apple' },
    inList: { uz: 'olma', ru: 'яблоко', en: 'an apple' },
    group: 'fruit',
    img: 'apple',
  },
}

export interface OtherThing {
  id: OtherId
  label: Text
  /** Said kindly when it is put on the table. */
  why: Text
  img: string
}

export const OTHERS: Readonly<Record<OtherId, OtherThing>> = {
  koptok: {
    id: 'koptok',
    label: { uz: 'Koptok', ru: 'Мяч', en: 'Ball' },
    why: {
      uz: 'Koptok bilan o‘ynaymiz, uni yemaymiz.',
      ru: 'Мячом играют, его не едят.',
      en: 'We play with a ball; we don’t eat it.',
    },
    img: 'ball',
  },
  paypoq: {
    id: 'paypoq',
    label: { uz: 'Paypoq', ru: 'Носки', en: 'Socks' },
    why: {
      uz: 'Paypoqni oyoqqa kiyamiz, uning joyi dasturxonda emas.',
      ru: 'Носки надевают на ноги, им не место на дастархане.',
      en: 'Socks go on our feet, not on the dasturxon.',
    },
    img: 'socks',
  },
  qalam: {
    id: 'qalam',
    label: { uz: 'Qalam', ru: 'Карандаш', en: 'Pencil' },
    why: {
      uz: 'Qalam bilan rasm chizamiz, uni yemaymiz.',
      ru: 'Карандашом рисуют, его не едят.',
      en: 'We draw with a pencil; we don’t eat it.',
    },
    img: 'pencil',
  },
  mashina: {
    id: 'mashina',
    label: { uz: 'Mashinacha', ru: 'Машинка', en: 'Toy car' },
    why: {
      uz: 'Mashinacha – o‘yinchoq, uni yemaymiz.',
      ru: 'Машинка – игрушка, её не едят.',
      en: 'A toy car is for playing, not for eating.',
    },
    img: 'car',
  },
  ayiqcha: {
    id: 'ayiqcha',
    label: { uz: 'Ayiqcha', ru: 'Мишка', en: 'Teddy bear' },
    why: {
      uz: 'Ayiqcha bilan o‘ynaymiz, u ovqat emas.',
      ru: 'С мишкой играют, он не еда.',
      en: 'A teddy is for hugs, not for eating.',
    },
    img: 'teddy',
  },
}

export function isFood(id: TableItemId): id is FoodId {
  return (FOOD_IDS as readonly string[]).includes(id)
}

export function tableItemLabel(id: TableItemId): Text {
  return isFood(id) ? FOODS[id].label : OTHERS[id].label
}

/** "a, b and c" in each language. */
export function joinList(items: readonly string[], language: Language): string {
  if (items.length <= 1) return items[0] ?? ''
  const and = language === 'uz' ? 'va' : language === 'ru' ? 'и' : 'and'
  return `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}`
}

/** Prompts of the table rounds. */
export const TABLE_TEXT = {
  allFood: {
    uz: 'Dasturxonga taomlarni qo‘y!',
    ru: 'Положи на дастархан угощения!',
    en: 'Put the food on the dasturxon!',
  },
  /** {{list}}: the foods asked for. */
  named: {
    uz: 'Dasturxonga {{list}} qo‘y!',
    ru: 'Положи на дастархан {{list}}!',
    en: 'Put {{list}} on the dasturxon!',
  },
  fruit: {
    uz: 'Dasturxonga hamma mevalarni qo‘y!',
    ru: 'Положи на дастархан все фрукты!',
    en: 'Put all the fruit on the dasturxon!',
  },
  tandir: {
    uz: 'Tandirda pishadigan taomlarni qo‘y!',
    ru: 'Положи то, что пекут в тандыре!',
    en: 'Put the things baked in the tandir!',
  },
  notNow: {
    uz: 'Bu ham mazali! Lekin hozir boshqasi kerak.',
    ru: 'Это тоже вкусно! Но сейчас нужно другое.',
    en: 'That’s tasty too! But we need something else now.',
  },
} as const satisfies Record<string, Text>

// ----------------------------------------------------------------- patterns

/** Motifs of suzani embroidery and atlas silk, each with its own shape and colour. */
export const MOTIF_IDS = ['rosette', 'leaf', 'pomegranate', 'pepper', 'ikat', 'star'] as const
export type MotifId = (typeof MOTIF_IDS)[number]

export const MOTIF_NAMES: Readonly<Record<MotifId, Text>> = {
  rosette: { uz: 'Gul', ru: 'Цветок', en: 'Flower' },
  leaf: { uz: 'Barg', ru: 'Листок', en: 'Leaf' },
  pomegranate: { uz: 'Anor', ru: 'Гранат', en: 'Pomegranate' },
  pepper: { uz: 'Qalampir', ru: 'Перчик', en: 'Pepper' },
  ikat: { uz: 'Atlas naqshi', ru: 'Узор атласа', en: 'Atlas diamond' },
  star: { uz: 'Yulduz', ru: 'Звезда', en: 'Star' },
}
