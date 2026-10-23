import type { Language } from '@/content/languages'

/*
 * Content of the Emotions & Social Skills section (/feelings). Data only, no
 * runtime imports, so tests and e2e specs can read it.
 *
 * Sources of the approach: emotion words first for the four basic feelings
 * (happy, sad, angry, scared), then surprised and calm, then the "social"
 * feelings (proud, shy, worried, disappointed), as in common preschool SEL
 * programmes (e.g. CASEL's self-awareness / social-awareness strands,
 * "PATHS" feeling faces). Every feeling is shown as acceptable; only actions
 * are discussed, and always kindly.
 */

export type Text = Readonly<Record<Language, string>>

export const BASIC_FEELINGS = ['happy', 'sad', 'angry', 'scared'] as const
export const MORE_FEELINGS = ['surprised', 'calm'] as const
export const SUBTLE_FEELINGS = ['proud', 'shy', 'worried', 'disappointed'] as const
export const FEELINGS = [...BASIC_FEELINGS, ...MORE_FEELINGS, ...SUBTLE_FEELINGS] as const
export type FeelingId = (typeof FEELINGS)[number]

export interface FeelingText {
  /** The feeling's name on an answer button. */
  label: Text
  /** "Find the … face!" */
  find: Text
  /** Said kindly when another face was chosen: what that face shows. */
  looks: Text
  /** Level 4–5: how to recognise it. */
  clue: Text
}

export const FEELING_TEXT: Readonly<Record<FeelingId, FeelingText>> = {
  happy: {
    label: { uz: 'Xursand', ru: 'Радость', en: 'Happy' },
    find: { uz: 'Xursand yuzni top!', ru: 'Найди радостное лицо!', en: 'Find the happy face!' },
    looks: {
      uz: 'Bu yuz xursand ko‘rinyapti.',
      ru: 'Это радостное лицо.',
      en: 'This face looks happy.',
    },
    clue: {
      uz: 'Xursand odam keng jilmayadi, ko‘zlari porlab turadi.',
      ru: 'Радостный человек широко улыбается, а глаза у него сияют.',
      en: 'A happy person smiles wide, and their eyes shine.',
    },
  },
  sad: {
    label: { uz: 'Xafa', ru: 'Грусть', en: 'Sad' },
    find: { uz: 'Xafa yuzni top!', ru: 'Найди грустное лицо!', en: 'Find the sad face!' },
    looks: { uz: 'Bu yuz xafa ko‘rinyapti.', ru: 'Это грустное лицо.', en: 'This face looks sad.' },
    clue: {
      uz: 'Xafa bo‘lganda lab burchaklari pastga tushadi, ba’zan ko‘z yoshi oqadi.',
      ru: 'Когда грустно, уголки губ опускаются вниз, иногда катится слезинка.',
      en: 'When we are sad, the corners of the mouth go down, and sometimes a tear rolls.',
    },
  },
  angry: {
    label: { uz: 'Jahli chiqqan', ru: 'Злость', en: 'Angry' },
    find: {
      uz: 'Jahli chiqqan yuzni top!',
      ru: 'Найди сердитое лицо!',
      en: 'Find the angry face!',
    },
    looks: {
      uz: 'Bu yuzning jahli chiqqan.',
      ru: 'Это сердитое лицо.',
      en: 'This face looks angry.',
    },
    clue: {
      uz: 'Jahl chiqqanda qoshlar pastga tushib, bir-biriga yaqinlashadi, tishlar qisiladi.',
      ru: 'Когда злимся, брови сдвигаются вниз, а зубы сжимаются.',
      en: 'When we are angry, the eyebrows pull down together and the teeth press tight.',
    },
  },
  scared: {
    label: { uz: 'Qo‘rqqan', ru: 'Страх', en: 'Scared' },
    find: { uz: 'Qo‘rqqan yuzni top!', ru: 'Найди испуганное лицо!', en: 'Find the scared face!' },
    looks: {
      uz: 'Bu yuz qo‘rqqan ko‘rinyapti.',
      ru: 'Это испуганное лицо.',
      en: 'This face looks scared.',
    },
    clue: {
      uz: 'Qo‘rqqanda ko‘zlar katta ochiladi, qoshlar ko‘tariladi, og‘iz titraydi.',
      ru: 'Когда страшно, глаза широко открываются, брови поднимаются, а рот дрожит.',
      en: 'When we are scared, the eyes open wide, the eyebrows go up and the mouth wobbles.',
    },
  },
  surprised: {
    label: { uz: 'Hayratlangan', ru: 'Удивление', en: 'Surprised' },
    find: {
      uz: 'Hayratlangan yuzni top!',
      ru: 'Найди удивлённое лицо!',
      en: 'Find the surprised face!',
    },
    looks: {
      uz: 'Bu yuz hayratlangan ko‘rinyapti.',
      ru: 'Это удивлённое лицо.',
      en: 'This face looks surprised.',
    },
    clue: {
      uz: 'Hayratlanganda og‘iz “O” bo‘lib ochiladi, qoshlar baland ko‘tariladi.',
      ru: 'Когда удивляемся, рот открывается буквой «О», а брови поднимаются высоко.',
      en: 'When we are surprised, the mouth makes an “O” and the eyebrows go up high.',
    },
  },
  calm: {
    label: { uz: 'Xotirjam', ru: 'Спокойствие', en: 'Calm' },
    find: { uz: 'Xotirjam yuzni top!', ru: 'Найди спокойное лицо!', en: 'Find the calm face!' },
    looks: {
      uz: 'Bu yuz xotirjam ko‘rinyapti.',
      ru: 'Это спокойное лицо.',
      en: 'This face looks calm.',
    },
    clue: {
      uz: 'Xotirjam odamning ko‘zlari yumshoq yumilgan, yuzida kichik tabassum bor.',
      ru: 'У спокойного человека мягко прикрыты глаза и лёгкая улыбка.',
      en: 'A calm person has softly closed eyes and a small, gentle smile.',
    },
  },
  proud: {
    label: { uz: 'Faxrlangan', ru: 'Гордость', en: 'Proud' },
    find: { uz: 'Faxrlangan yuzni top!', ru: 'Найди гордое лицо!', en: 'Find the proud face!' },
    looks: {
      uz: 'Bu yuz faxrlanib turibdi.',
      ru: 'Это гордое лицо.',
      en: 'This face looks proud.',
    },
    clue: {
      uz: 'Faxrlanganda boshni tik tutamiz, ko‘zlar quvonchdan qisiladi, tabassum keng bo‘ladi.',
      ru: 'Когда гордимся, держим голову высоко, глаза жмурятся от радости, улыбка широкая.',
      en: 'When we feel proud, we hold our head high, our eyes crinkle and we smile wide.',
    },
  },
  shy: {
    label: { uz: 'Uyalgan', ru: 'Смущение', en: 'Shy' },
    find: { uz: 'Uyalgan yuzni top!', ru: 'Найди смущённое лицо!', en: 'Find the shy face!' },
    looks: {
      uz: 'Bu yuz uyalib turibdi.',
      ru: 'Это смущённое лицо.',
      en: 'This face looks shy.',
    },
    clue: {
      uz: 'Uyalganda yonoqlar qizaradi, ko‘zlar pastga yoki chetga qaraydi.',
      ru: 'Когда смущаемся, щёки розовеют, а глаза смотрят вниз или в сторону.',
      en: 'When we feel shy, our cheeks go pink and our eyes look down or away.',
    },
  },
  worried: {
    label: { uz: 'Xavotirda', ru: 'Тревога', en: 'Worried' },
    find: {
      uz: 'Xavotirdagi yuzni top!',
      ru: 'Найди встревоженное лицо!',
      en: 'Find the worried face!',
    },
    looks: {
      uz: 'Bu yuz xavotirda ko‘rinyapti.',
      ru: 'Это встревоженное лицо.',
      en: 'This face looks worried.',
    },
    clue: {
      uz: 'Xavotirda qoshlar o‘rtasi ko‘tariladi, lablar egri bo‘ladi, peshonada ter paydo bo‘lishi mumkin.',
      ru: 'Когда тревожно, брови поднимаются домиком, губы кривятся, на лбу может выступить капелька пота.',
      en: 'When we are worried, the middle of the eyebrows goes up, the mouth goes wiggly and a drop of sweat may appear.',
    },
  },
  disappointed: {
    label: { uz: 'Hafsalasi pir bo‘lgan', ru: 'Разочарование', en: 'Disappointed' },
    find: {
      uz: 'Hafsalasi pir bo‘lgan yuzni top!',
      ru: 'Найди разочарованное лицо!',
      en: 'Find the disappointed face!',
    },
    looks: {
      uz: 'Bu yuzning hafsalasi pir bo‘lgan.',
      ru: 'Это разочарованное лицо.',
      en: 'This face looks disappointed.',
    },
    clue: {
      uz: 'Hafsala pir bo‘lganda ko‘zlar yarim yumiladi, og‘iz to‘g‘ri chiziq bo‘lib pastga egiladi.',
      ru: 'При разочаровании глаза наполовину прикрыты, а рот ровный и чуть опущен.',
      en: 'When we are disappointed, the eyes are half closed and the mouth is flat and droops a little.',
    },
  },
}

/**
 * Feelings that are easy to mix up in a story (a present can make you happy
 * and surprised): never offered together as answers to one scene.
 */
export const CLOSE_FEELINGS: readonly (readonly [FeelingId, FeelingId])[] = [
  ['happy', 'proud'],
  ['happy', 'calm'],
  ['happy', 'surprised'],
  ['sad', 'disappointed'],
  ['sad', 'worried'],
  ['scared', 'worried'],
  ['scared', 'surprised'],
  ['shy', 'worried'],
  ['shy', 'scared'],
  ['angry', 'disappointed'],
]

export function areClose(a: FeelingId, b: FeelingId): boolean {
  return CLOSE_FEELINGS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

// ------------------------------------------------------------ "What happened?"

export interface Scene {
  id: string
  feeling: FeelingId
  /** public/3d/<picture>.webp */
  picture: string
  /** The child in the story, in each language (the question uses it). */
  name: Text
  /** One or two short sentences. */
  text: Text
  /** Level 4–5: why this feeling fits. */
  why: Text
}

export const SCENES: readonly Scene[] = [
  {
    id: 'grandma-gift',
    feeling: 'happy',
    picture: 'gift',
    name: { uz: 'Malika', ru: 'Малика', en: 'Malika' },
    text: {
      uz: 'Buvisi Malikaga sovg‘a olib keldi.',
      ru: 'Бабушка принесла Малике подарок.',
      en: 'Grandma brought Malika a present.',
    },
    why: {
      uz: 'Yaqin insondan sovg‘a olsak, xursand bo‘lamiz va jilmayamiz.',
      ru: 'Когда близкий человек дарит подарок, нам радостно, и мы улыбаемся.',
      en: 'A present from someone we love makes us happy, and we smile.',
    },
  },
  {
    id: 'ball-friends',
    feeling: 'happy',
    picture: 'ball',
    name: { uz: 'Sardor', ru: 'Сардор', en: 'Sardor' },
    text: {
      uz: 'Sardor do‘stlari bilan hovlida to‘p o‘ynayapti.',
      ru: 'Сардор играет с друзьями в мяч во дворе.',
      en: 'Sardor is playing ball with his friends in the yard.',
    },
    why: {
      uz: 'Do‘stlar bilan birga o‘ynash qiziqarli, shuning uchun Sardor xursand.',
      ru: 'Играть вместе с друзьями весело, поэтому Сардору радостно.',
      en: 'Playing together with friends is fun, so Sardor is happy.',
    },
  },
  {
    id: 'balloon-away',
    feeling: 'sad',
    picture: 'balloon',
    name: { uz: 'Aziz', ru: 'Азиз', en: 'Aziz' },
    text: {
      uz: 'Azizning shari osmonga uchib ketdi.',
      ru: 'У Азиза улетел воздушный шарик.',
      en: 'Aziz’s balloon flew away into the sky.',
    },
    why: {
      uz: 'Yaxshi ko‘rgan narsamiz yo‘qolsa, xafa bo‘lamiz. Xafa bo‘lish ham tabiiy.',
      ru: 'Когда теряем то, что любим, нам грустно. Грустить — это нормально.',
      en: 'When we lose something we love, we feel sad. It is okay to feel sad.',
    },
  },
  {
    id: 'friend-moved',
    feeling: 'sad',
    picture: 'teddy',
    name: { uz: 'Madina', ru: 'Мадина', en: 'Madina' },
    text: {
      uz: 'Madinaning eng yaqin dugonasi boshqa shaharga ko‘chib ketdi.',
      ru: 'Лучшая подруга Мадины переехала в другой город.',
      en: 'Madina’s best friend moved to another city.',
    },
    why: {
      uz: 'Uzoqqa ketgan odamni sog‘inamiz. Sog‘inch bizni xafa qiladi.',
      ru: 'Мы скучаем по тем, кто уехал далеко. От этого бывает грустно.',
      en: 'We miss people who go far away. Missing someone makes us sad.',
    },
  },
  {
    id: 'sand-castle',
    feeling: 'angry',
    picture: 'bucket',
    name: { uz: 'Jasur', ru: 'Джасур', en: 'Jasur' },
    text: {
      uz: 'Jasur qumdan qasr qurdi. Bir bola uni ataylab buzib qo‘ydi.',
      ru: 'Джасур построил замок из песка. Другой мальчик нарочно его сломал.',
      en: 'Jasur built a sand castle. Another boy knocked it down on purpose.',
    },
    why: {
      uz: 'Kimdir ishimizni ataylab buzsa, jahlimiz chiqadi. Buni so‘z bilan aytish mumkin.',
      ru: 'Когда кто-то нарочно портит нашу работу, мы злимся. Об этом можно сказать словами.',
      en: 'When someone spoils our work on purpose, we feel angry. We can say so with words.',
    },
  },
  {
    id: 'crayon-taken',
    feeling: 'angry',
    picture: 'crayon',
    name: { uz: 'Nilufar', ru: 'Нилуфар', en: 'Nilufar' },
    text: {
      uz: 'Nilufar rasm chizayotgan edi. Ukasi so‘ramasdan uning qalamini olib qo‘ydi.',
      ru: 'Нилуфар рисовала. Младший брат без спроса взял её карандаш.',
      en: 'Nilufar was drawing. Her little brother took her crayon without asking.',
    },
    why: {
      uz: 'Narsamizni so‘ramasdan olishsa, jahlimiz chiqishi mumkin. Avval so‘rash kerak.',
      ru: 'Когда наши вещи берут без спроса, можно рассердиться. Сначала нужно спрашивать.',
      en: 'When someone takes our things without asking, we can feel angry. It is better to ask first.',
    },
  },
  {
    id: 'thunder-night',
    feeling: 'scared',
    picture: 'rain-cloud',
    name: { uz: 'Bobur', ru: 'Бобур', en: 'Bobur' },
    text: {
      uz: 'Kechasi qattiq momaqaldiroq gumburladi va Bobur uyg‘onib ketdi.',
      ru: 'Ночью громко прогремел гром, и Бобур проснулся.',
      en: 'At night loud thunder boomed, and Bobur woke up.',
    },
    why: {
      uz: 'Qorong‘ida to‘satdan chiqqan baland ovoz qo‘rqitadi. Onaning yoki dadaning quchog‘i yordam beradi.',
      ru: 'Громкий внезапный звук в темноте пугает. Помогают объятия мамы или папы.',
      en: 'A loud, sudden sound in the dark is scary. A hug from mum or dad helps.',
    },
  },
  {
    id: 'big-dog',
    feeling: 'scared',
    picture: 'dog',
    name: { uz: 'Zarina', ru: 'Зарина', en: 'Zarina' },
    text: {
      uz: 'Notanish katta it Zarinaga qarab baland ovozda hurdi.',
      ru: 'Большая незнакомая собака громко залаяла на Зарину.',
      en: 'A big dog Zarina did not know barked loudly at her.',
    },
    why: {
      uz: 'Notanish katta it qo‘rqinchli tuyulishi mumkin. Shunda kattalarning yonida turgan yaxshi.',
      ru: 'Большая незнакомая собака может напугать. Тогда лучше встать рядом со взрослым.',
      en: 'A big dog we do not know can feel scary. It is good to stay close to a grown-up.',
    },
  },
  {
    id: 'first-snow',
    feeling: 'surprised',
    picture: 'snowflake',
    name: { uz: 'Otabek', ru: 'Отабек', en: 'Otabek' },
    text: {
      uz: 'Otabek ertalab derazadan qaradi: hamma yoq oppoq qor!',
      ru: 'Утром Отабек выглянул в окно, а там всё белое от снега!',
      en: 'In the morning Otabek looked out of the window: everything was white with snow!',
    },
    why: {
      uz: 'Kutmagan narsani ko‘rsak, ko‘zimiz va og‘zimiz katta ochiladi: biz hayratlanamiz.',
      ru: 'Когда видим то, чего не ждали, глаза и рот широко открываются: мы удивляемся.',
      en: 'When we see something we did not expect, our eyes and mouth open wide: we are surprised.',
    },
  },
  {
    id: 'chick-hatch',
    feeling: 'surprised',
    picture: 'hatching-chick',
    name: { uz: 'Shahzoda', ru: 'Шахзода', en: 'Shahzoda' },
    text: {
      uz: 'Shahzoda tuxumga qarab turgan edi. Birdan undan jo‘ja chiqdi!',
      ru: 'Шахзода смотрела на яйцо. Вдруг из него вылупился цыплёнок!',
      en: 'Shahzoda was looking at an egg. Suddenly a chick came out!',
    },
    why: {
      uz: '“Birdan” bo‘lgan narsa bizni hayratga soladi.',
      ru: 'То, что происходит «вдруг», нас удивляет.',
      en: 'Things that happen “suddenly” surprise us.',
    },
  },
  {
    id: 'tree-birds',
    feeling: 'calm',
    picture: 'tree',
    name: { uz: 'Malika', ru: 'Малика', en: 'Malika' },
    text: {
      uz: 'Malika daraxt soyasida yotib, qushlarning sayrashini tinglayapti.',
      ru: 'Малика лежит в тени дерева и слушает пение птиц.',
      en: 'Malika is lying in the shade of a tree, listening to the birds sing.',
    },
    why: {
      uz: 'Sokin tovushlar va dam olish tanamizni tinchlantiradi.',
      ru: 'Тихие звуки и отдых помогают телу успокоиться.',
      en: 'Quiet sounds and a gentle rest help our body feel calm.',
    },
  },
  {
    id: 'tea-grandpa',
    feeling: 'calm',
    picture: 'teapot',
    name: { uz: 'Aziz', ru: 'Азиз', en: 'Aziz' },
    text: {
      uz: 'Kechqurun Aziz bobosi bilan choy ichib, ertak tinglayapti.',
      ru: 'Вечером Азиз пьёт чай с дедушкой и слушает сказку.',
      en: 'In the evening Aziz drinks tea with Grandpa and listens to a story.',
    },
    why: {
      uz: 'Oila davrasidagi sokin oqshom bizga xotirjamlik beradi.',
      ru: 'Тихий вечер в кругу семьи дарит спокойствие.',
      en: 'A quiet evening with family helps us feel calm and safe.',
    },
  },
  {
    id: 'own-drawing',
    feeling: 'proud',
    picture: 'paintbrush',
    name: { uz: 'Sardor', ru: 'Сардор', en: 'Sardor' },
    text: {
      uz: 'Sardor rasmini hech kimning yordamisiz o‘zi chizib tugatdi.',
      ru: 'Сардор сам, без помощи, дорисовал свой рисунок.',
      en: 'Sardor finished his drawing all by himself.',
    },
    why: {
      uz: 'Qiyin ishni o‘zimiz bajarsak, o‘zimizdan faxrlanamiz.',
      ru: 'Когда сами справляемся с трудным делом, мы гордимся собой.',
      en: 'When we finish something hard by ourselves, we feel proud.',
    },
  },
  {
    id: 'first-ride',
    feeling: 'proud',
    picture: 'bicycle',
    name: { uz: 'Madina', ru: 'Мадина', en: 'Madina' },
    text: {
      uz: 'Madina birinchi marta velosipedni o‘zi haydadi!',
      ru: 'Мадина впервые сама проехала на велосипеде!',
      en: 'Madina rode her bicycle by herself for the first time!',
    },
    why: {
      uz: 'Ko‘p urinib, yangi narsani o‘rgansak, faxrlanamiz.',
      ru: 'Когда после многих попыток учимся новому, мы гордимся.',
      en: 'Learning something new after trying many times makes us proud.',
    },
  },
  {
    id: 'new-kindergarten',
    feeling: 'shy',
    picture: 'school',
    name: { uz: 'Jasur', ru: 'Джасур', en: 'Jasur' },
    text: {
      uz: 'Jasur yangi bog‘chaga keldi. Hamma bolalar unga qarab turibdi.',
      ru: 'Джасур пришёл в новый детский сад. Все дети смотрят на него.',
      en: 'Jasur came to a new kindergarten. All the children are looking at him.',
    },
    why: {
      uz: 'Ko‘p notanish odamlar qarab tursa, uyalamiz va biroz yashiringimiz keladi.',
      ru: 'Когда на нас смотрит много незнакомых людей, мы смущаемся и хотим немного спрятаться.',
      en: 'When many new people look at us, we may feel shy and want to hide a little.',
    },
  },
  {
    id: 'guests-song',
    feeling: 'shy',
    picture: 'drum',
    name: { uz: 'Nilufar', ru: 'Нилуфар', en: 'Nilufar' },
    text: {
      uz: 'Mehmonlar Nilufardan qo‘shiq aytib berishni so‘rashdi.',
      ru: 'Гости попросили Нилуфар спеть им песню.',
      en: 'The guests asked Nilufar to sing a song for them.',
    },
    why: {
      uz: 'Ko‘pchilik oldida biror narsa qilganda yonoqlarimiz qizaradi: biz uyalamiz.',
      ru: 'Когда что-то делаем перед многими людьми, щёки розовеют: мы смущаемся.',
      en: 'Doing something in front of others can make our cheeks go pink: we feel shy.',
    },
  },
  {
    id: 'mum-late',
    feeling: 'worried',
    picture: 'clock',
    name: { uz: 'Bobur', ru: 'Бобур', en: 'Bobur' },
    text: {
      uz: 'Bog‘chadan hamma bolalarni olib ketishdi, Boburning onasi esa hali kelmadi.',
      ru: 'Всех детей уже забрали из садика, а мама Бобура ещё не пришла.',
      en: 'All the other children have gone home from kindergarten, but Bobur’s mum has not come yet.',
    },
    why: {
      uz: 'Kutib turib, nima bo‘lishini bilmasak, xavotirlanamiz. Tarbiyachi yordam beradi.',
      ru: 'Когда ждём и не знаем, что будет, мы тревожимся. Воспитатель поможет.',
      en: 'When we wait and do not know what will happen, we feel worried. A teacher can help.',
    },
  },
  {
    id: 'cat-missing',
    feeling: 'worried',
    picture: 'cat',
    name: { uz: 'Zarina', ru: 'Зарина', en: 'Zarina' },
    text: {
      uz: 'Zarinaning mushugi ertalabdan beri ko‘rinmayapti.',
      ru: 'Кошку Зарины не видно с самого утра.',
      en: 'Zarina’s cat has been missing since the morning.',
    },
    why: {
      uz: 'Yaxshi ko‘rganimiz qayerdaligini bilmasak, xavotirga tushamiz.',
      ru: 'Когда не знаем, где тот, кого мы любим, мы тревожимся.',
      en: 'Not knowing where someone we love is makes us worried.',
    },
  },
  {
    id: 'zoo-rain',
    feeling: 'disappointed',
    picture: 'umbrella',
    name: { uz: 'Otabek', ru: 'Отабек', en: 'Otabek' },
    text: {
      uz: 'Otabek hayvonot bog‘iga borishni intiqlik bilan kutgan edi, lekin yomg‘ir sabab sayohat qoldirildi.',
      ru: 'Отабек очень ждал поездки в зоопарк, но из-за дождя её отложили.',
      en: 'Otabek was looking forward to the zoo, but the trip was put off because of rain.',
    },
    why: {
      uz: 'Kutgan narsamiz bo‘lmasa, hafsalamiz pir bo‘ladi. Keyingi safar albatta boramiz!',
      ru: 'Когда то, чего мы ждали, не случается, мы разочарованы. В следующий раз получится!',
      en: 'When something we waited for does not happen, we feel disappointed. Maybe next time!',
    },
  },
  {
    id: 'no-ice-cream',
    feeling: 'disappointed',
    picture: 'ice-cream',
    name: { uz: 'Shahzoda', ru: 'Шахзода', en: 'Shahzoda' },
    text: {
      uz: 'Shahzoda muzqaymoq olmoqchi edi, lekin do‘konda muzqaymoq qolmagan ekan.',
      ru: 'Шахзода хотела мороженое, но в магазине оно закончилось.',
      en: 'Shahzoda wanted an ice cream, but the shop had none left.',
    },
    why: {
      uz: 'Xohlagan narsamizni ololmasak, hafsalamiz pir bo‘ladi. Boshqa narsani tanlash mumkin.',
      ru: 'Когда не получаем того, что хотели, мы разочарованы. Можно выбрать что-то другое.',
      en: 'Wanting something and not getting it is disappointing. We can choose something else.',
    },
  },
]

// ------------------------------------------------------------ "What could you do?"

/**
 * - `best`: the kindest idea, praised.
 * - `good`: a kind idea too; the explanation adds what could make it even better.
 * - `other`: a choice many children would make; explained gently with another idea.
 */
export type ChoiceKind = 'best' | 'good' | 'other'

export interface SituationChoice {
  id: string
  kind: ChoiceKind
  text: Text
  explain: Text
}

export interface Situation {
  id: string
  picture: string
  text: Text
  choices: readonly SituationChoice[]
}

export const SITUATIONS: readonly Situation[] = [
  {
    id: 'friend-fell',
    picture: 'ball',
    text: {
      uz: 'Do‘sting yugurib ketayotib yiqilib tushdi.',
      ru: 'Твой друг бежал и упал.',
      en: 'Your friend tripped and fell while running.',
    },
    choices: [
      {
        id: 'ask',
        kind: 'best',
        text: {
          uz: 'Yoniga borib, “Qayering og‘riyapti?” deb so‘rayman',
          ru: 'Подойду и спрошу: «Тебе больно?»',
          en: 'Go over and ask, “Are you hurt?”',
        },
        explain: {
          uz: 'G‘amxo‘rlik qilsang, do‘sting yolg‘iz emasligini his qiladi.',
          ru: 'Когда ты заботишься, друг чувствует, что он не один.',
          en: 'When you care, your friend knows they are not alone.',
        },
      },
      {
        id: 'grown-up',
        kind: 'good',
        text: {
          uz: 'Kattalarni chaqiraman',
          ru: 'Позову взрослого',
          en: 'Call a grown-up',
        },
        explain: {
          uz: 'Bu ham yaxshi fikr: kattalar yordam beradi. Undan oldin do‘stingdan holini so‘rasang, unga tezroq yengil bo‘ladi.',
          ru: 'Это тоже хорошая мысль: взрослые помогут. А если сначала спросить друга, как он, ему станет легче ещё быстрее.',
          en: 'That is a good idea too: grown-ups can help. Asking your friend how they are first helps them feel better even sooner.',
        },
      },
      {
        id: 'keep-playing',
        kind: 'other',
        text: {
          uz: 'O‘yinni davom ettiraman',
          ru: 'Продолжу играть',
          en: 'Keep on playing',
        },
        explain: {
          uz: 'Do‘sting og‘riqda yolg‘iz qolishi mumkin. O‘yinni biroz to‘xtatib, unga yordam bersang bo‘ladi.',
          ru: 'Другу может быть больно и одиноко. Можно ненадолго остановить игру и помочь ему.',
          en: 'Your friend might feel alone while it hurts. You could pause the game and help them.',
        },
      },
    ],
  },
  {
    id: 'wants-toy',
    picture: 'teddy',
    text: {
      uz: 'Bir bola sening o‘yinchog‘ing bilan o‘ynagisi kelyapti.',
      ru: 'Другой ребёнок хочет поиграть твоей игрушкой.',
      en: 'Another child wants to play with your toy.',
    },
    choices: [
      {
        id: 'together',
        kind: 'best',
        text: {
          uz: 'Birga yoki navbat bilan o‘ynaymiz',
          ru: 'Поиграем вместе или по очереди',
          en: 'Play together or take turns',
        },
        explain: {
          uz: 'Bo‘lishsak, o‘yin yanada qiziqarli bo‘ladi va yangi do‘st orttiramiz.',
          ru: 'Когда делимся, играть веселее, и появляются новые друзья.',
          en: 'Sharing makes the game more fun, and we make new friends.',
        },
      },
      {
        id: 'later',
        kind: 'good',
        text: {
          uz: '“Hozir o‘zim o‘ynayapman, keyin senga beraman” deyman',
          ru: 'Скажу: «Я ещё играю, потом дам тебе»',
          en: 'Say, “I am still playing. You can have it next.”',
        },
        explain: {
          uz: 'So‘z bilan aytish to‘g‘ri. Birga o‘ynashni taklif qilsang, ikkalang hozirning o‘zida xursand bo‘lasiz.',
          ru: 'Сказать словами — правильно. А если позвать играть вместе, обоим будет весело уже сейчас.',
          en: 'Using words is kind. Inviting them to play together could make you both happy right now.',
        },
      },
      {
        id: 'hide',
        kind: 'other',
        text: {
          uz: 'O‘yinchoqni yashirib qo‘yaman',
          ru: 'Спрячу игрушку',
          en: 'Hide the toy',
        },
        explain: {
          uz: 'Yashirsak, bola xafa bo‘lishi mumkin. Navbat bilan o‘ynashni taklif qilsang bo‘ladi.',
          ru: 'Если спрятать, другой ребёнок может расстроиться. Можно предложить играть по очереди.',
          en: 'If we hide it, the other child may feel sad. You could offer to take turns.',
        },
      },
    ],
  },
  {
    id: 'feel-angry',
    picture: 'volcano',
    text: {
      uz: 'Kubiklardan qurgan minorang qulab tushdi va jahling chiqdi.',
      ru: 'Твоя башня из кубиков упала, и ты злишься.',
      en: 'Your block tower fell down, and you feel angry.',
    },
    choices: [
      {
        id: 'breathe',
        kind: 'best',
        text: {
          uz: 'To‘xtab, sekin chuqur nafas olaman',
          ru: 'Остановлюсь и медленно глубоко подышу',
          en: 'Stop and take slow, deep breaths',
        },
        explain: {
          uz: 'Chuqur nafas jahlni tinchlantiradi. Keyin minorani yana qurish mumkin.',
          ru: 'Глубокое дыхание помогает злости утихнуть. Потом можно построить башню снова.',
          en: 'Deep breaths help anger calm down. Then you can build the tower again.',
        },
      },
      {
        id: 'tell',
        kind: 'good',
        text: {
          uz: 'Kattalarga “Jahlim chiqdi” deb aytaman',
          ru: 'Скажу взрослому: «Я злюсь»',
          en: 'Tell a grown-up, “I feel angry”',
        },
        explain: {
          uz: 'Tuyg‘uni so‘z bilan aytish juda to‘g‘ri. Avval bir-ikki chuqur nafas olsang, gapirish osonroq bo‘ladi.',
          ru: 'Назвать чувство словами — очень правильно. Если сначала пару раз глубоко вдохнуть, говорить станет легче.',
          en: 'Naming your feeling is very wise. Taking a couple of deep breaths first makes talking easier.',
        },
      },
      {
        id: 'throw',
        kind: 'other',
        text: {
          uz: 'Kubiklarni uloqtiraman',
          ru: 'Брошу кубики',
          en: 'Throw the blocks',
        },
        explain: {
          uz: 'Jahl chiqishi tabiiy, lekin uloqtirilgan kubik kimgadir tegishi mumkin. Avval to‘xtab, nafas olsang bo‘ladi.',
          ru: 'Злиться — нормально, но брошенный кубик может кого-то задеть. Можно сначала остановиться и подышать.',
          en: 'Feeling angry is okay, but a thrown block could hurt someone. You could stop and breathe first.',
        },
      },
    ],
  },
  {
    id: 'new-child',
    picture: 'school',
    text: {
      uz: 'Bog‘changizga yangi bola keldi. U bir chetda yolg‘iz turibdi.',
      ru: 'В ваш садик пришёл новый ребёнок. Он стоит один в сторонке.',
      en: 'A new child came to your kindergarten. They are standing alone at the side.',
    },
    choices: [
      {
        id: 'invite',
        kind: 'best',
        text: {
          uz: 'Salom berib, birga o‘ynashga chaqiraman',
          ru: 'Поздороваюсь и позову играть',
          en: 'Say hello and invite them to play',
        },
        explain: {
          uz: 'Yangi joyda do‘st topish oson emas. Sen unga katta yordam berding.',
          ru: 'В новом месте непросто найти друзей. Ты очень помог.',
          en: 'Making friends in a new place is not easy. You helped a lot.',
        },
      },
      {
        id: 'smile',
        kind: 'good',
        text: {
          uz: 'Unga jilmayib qo‘yaman',
          ru: 'Улыбнусь ему',
          en: 'Smile at them',
        },
        explain: {
          uz: 'Jilmayish — yaxshi boshlanish! “Salom, biz bilan o‘ynaysanmi?” desang, u tezroq do‘st topadi.',
          ru: 'Улыбка — хорошее начало! А если сказать: «Привет, играй с нами!», он быстрее найдёт друга.',
          en: 'A smile is a lovely start! Saying, “Hi, want to play with us?” helps them find a friend even faster.',
        },
      },
      {
        id: 'own-game',
        kind: 'other',
        text: {
          uz: 'O‘z o‘yinimni davom ettiraman',
          ru: 'Продолжу свою игру',
          en: 'Keep playing my own game',
        },
        explain: {
          uz: 'Yangi bola o‘zini yolg‘iz his qilishi mumkin. Uni o‘yiningga chaqirsang bo‘ladi.',
          ru: 'Новенькому может быть одиноко. Можно позвать его в свою игру.',
          en: 'The new child may feel lonely. You could invite them into your game.',
        },
      },
    ],
  },
  {
    id: 'spilled-juice',
    picture: 'cup',
    text: {
      uz: 'Sen bilmasdan do‘stingning sharbatini to‘kib yubording.',
      ru: 'Ты нечаянно задеваешь стакан друга, и сок проливается.',
      en: 'By accident, you knock over your friend’s juice.',
    },
    choices: [
      {
        id: 'sorry-help',
        kind: 'best',
        text: {
          uz: '“Kechirasan” deb, artishga yordam beraman',
          ru: 'Скажу «Прости» и помогу вытереть',
          en: 'Say “Sorry” and help wipe it up',
        },
        explain: {
          uz: '“Kechirasan” degan so‘z va yordam do‘stlikni mustahkamlaydi.',
          ru: '«Прости» и помощь делают дружбу крепче.',
          en: 'Saying sorry and helping keeps a friendship strong.',
        },
      },
      {
        id: 'sorry',
        kind: 'good',
        text: {
          uz: '“Kechirasan” deyman',
          ru: 'Скажу «Прости»',
          en: 'Say “Sorry”',
        },
        explain: {
          uz: 'Kechirim so‘rash juda muhim. Artishga ham yordam bersang, do‘sting yana xursand bo‘ladi.',
          ru: 'Попросить прощения очень важно. А если ещё помочь вытереть, друг снова обрадуется.',
          en: 'Saying sorry is very important. Helping to wipe it up too makes your friend happy again.',
        },
      },
      {
        id: 'walk-away',
        kind: 'other',
        text: {
          uz: 'Indamay boshqa joyga ketaman',
          ru: 'Тихо уйду',
          en: 'Walk away quietly',
        },
        explain: {
          uz: 'Do‘sting nima bo‘lganini tushunmay qolishi mumkin. “Kechirasan” desang, hammasi joyiga tushadi.',
          ru: 'Друг может не понять, что случилось. Скажи «Прости», и всё наладится.',
          en: 'Your friend may not understand what happened. Saying “Sorry” makes things right again.',
        },
      },
    ],
  },
  {
    id: 'grandma-somsa',
    picture: 'pie',
    text: {
      uz: 'Buving senga mazali somsa pishirib berdi.',
      ru: 'Бабушка испекла тебе вкусную самсу.',
      en: 'Grandma baked tasty somsa for you.',
    },
    choices: [
      {
        id: 'thank',
        kind: 'best',
        text: {
          uz: '“Rahmat, buvijon!” deyman',
          ru: 'Скажу: «Спасибо, бабушка!»',
          en: 'Say, “Thank you, Grandma!”',
        },
        explain: {
          uz: '“Rahmat” degan so‘z buvingni juda xursand qiladi.',
          ru: '«Спасибо» очень обрадует бабушку.',
          en: 'Saying thank you makes Grandma very happy.',
        },
      },
      {
        id: 'smile-eat',
        kind: 'good',
        text: {
          uz: 'Jilmayib, somsani yeyman',
          ru: 'Улыбнусь и съем самсу',
          en: 'Smile and eat the somsa',
        },
        explain: {
          uz: 'Jilmayish yoqimli! “Rahmat” ham desang, buving mehnatini qadrlaganingni biladi.',
          ru: 'Улыбка — это приятно! А если ещё сказать «Спасибо», бабушка поймёт, что ты ценишь её труд.',
          en: 'A smile is nice! Saying “Thank you” too lets Grandma know you value her work.',
        },
      },
      {
        id: 'run-off',
        kind: 'other',
        text: {
          uz: 'Indamay yeb, o‘ynashga ketaman',
          ru: 'Молча съем и убегу играть',
          en: 'Eat it quickly and run off to play',
        },
        explain: {
          uz: 'Buving “Rahmat” so‘zini eshitishni yaxshi ko‘radi. Ketishdan oldin aytib qo‘ysang bo‘ladi.',
          ru: 'Бабушке приятно слышать «Спасибо». Можно сказать его, прежде чем убежать.',
          en: 'Grandma loves to hear “Thank you”. You could say it before you go.',
        },
      },
    ],
  },
  {
    id: 'slide-line',
    picture: 'kite',
    text: {
      uz: 'Maydonchada bolalar sirpanchiqdan tushish uchun navbatda turibdi.',
      ru: 'На площадке дети стоят в очереди на горку.',
      en: 'At the playground, children are waiting in line for the slide.',
    },
    choices: [
      {
        id: 'wait',
        kind: 'best',
        text: {
          uz: 'Navbatimni kutaman',
          ru: 'Подожду своей очереди',
          en: 'Wait for my turn',
        },
        explain: {
          uz: 'Navbat bilan hamma xavfsiz va xursand o‘ynaydi. Kutayotganda o‘ngacha sanash mumkin.',
          ru: 'По очереди все играют безопасно и весело. Пока ждёшь, можно сосчитать до десяти.',
          en: 'Taking turns keeps everyone safe and happy. You can count to ten while you wait.',
        },
      },
      {
        id: 'come-back',
        kind: 'good',
        text: {
          uz: 'Boshqa o‘yin o‘ynab, keyin qaytaman',
          ru: 'Поиграю в другое и потом вернусь',
          en: 'Play something else and come back later',
        },
        explain: {
          uz: 'Bu ham bo‘ladi! Faqat qaytganingda navbatning oxiriga turasan.',
          ru: 'Так тоже можно! Только когда вернёшься, встанешь в конец очереди.',
          en: 'That works too! When you come back, you join the end of the line.',
        },
      },
      {
        id: 'go-first',
        kind: 'other',
        text: {
          uz: 'Hammadan oldinga o‘tib olaman',
          ru: 'Пройду вперёд всех',
          en: 'Go to the front of the line',
        },
        explain: {
          uz: 'Oldinga o‘tsak, boshqa bolalar xafa bo‘lishi mumkin. Navbatda turish adolatli.',
          ru: 'Если пройти вперёд, другие дети могут расстроиться. Ждать очереди — честно.',
          en: 'If we go to the front, others may feel upset. Waiting in line is fair.',
        },
      },
    ],
  },
  {
    id: 'friend-crying',
    picture: 'rain-cloud',
    text: {
      uz: 'Do‘sting bir chetda yig‘lab o‘tiribdi.',
      ru: 'Твой друг сидит в сторонке и плачет.',
      en: 'Your friend is sitting alone and crying.',
    },
    choices: [
      {
        id: 'sit-ask',
        kind: 'best',
        text: {
          uz: 'Yoniga o‘tirib, “Nima bo‘ldi?” deb so‘rayman',
          ru: 'Сяду рядом и спрошу: «Что случилось?»',
          en: 'Sit next to them and ask, “What happened?”',
        },
        explain: {
          uz: 'Yonida bo‘lsang, do‘sting yolg‘iz emasligini his qiladi.',
          ru: 'Когда ты рядом, друг чувствует, что он не один.',
          en: 'When you are close by, your friend knows they are not alone.',
        },
      },
      {
        id: 'give-toy',
        kind: 'good',
        text: {
          uz: 'Unga o‘yinchog‘imni beraman',
          ru: 'Дам ему свою игрушку',
          en: 'Give them my toy',
        },
        explain: {
          uz: 'Mehribon fikr! Avval nima bo‘lganini so‘rasang, unga qanday yordam berishni bilib olasan.',
          ru: 'Добрая мысль! Если сначала спросить, что случилось, узнаешь, как лучше помочь.',
          en: 'A kind idea! Asking what happened first tells you how to help best.',
        },
      },
      {
        id: 'go-play',
        kind: 'other',
        text: {
          uz: 'Uni tinch qo‘yib, o‘ynashga ketaman',
          ru: 'Оставлю его и пойду играть',
          en: 'Leave them and go play',
        },
        explain: {
          uz: 'Ba’zan do‘stimizga yonimizda bo‘lishimiz kerak bo‘ladi. Yoniga borib, holini so‘rasang bo‘ladi.',
          ru: 'Иногда другу нужно, чтобы мы были рядом. Можно подойти и спросить, как он.',
          en: 'Sometimes a friend needs us close by. You could go over and ask how they are.',
        },
      },
    ],
  },
  {
    id: 'grandpa-home',
    picture: 'house',
    text: {
      uz: 'Bobong uyga kirib keldi, sen esa multfilm ko‘ryapsan.',
      ru: 'Дедушка пришёл домой, а ты смотришь мультфильм.',
      en: 'Grandpa comes home while you are watching cartoons.',
    },
    choices: [
      {
        id: 'greet',
        kind: 'best',
        text: {
          uz: 'O‘rnimdan turib, “Assalomu alaykum, bobojon!” deyman',
          ru: 'Встану и скажу: «Ассалому алейкум, дедушка!»',
          en: 'Stand up and say, “Assalomu alaykum, Grandpa!”',
        },
        explain: {
          uz: 'Kattalarni o‘rnimizdan turib kutib olish — hurmat belgisi. Bobong juda xursand bo‘ladi.',
          ru: 'Встать и поприветствовать старших — знак уважения. Дедушка очень обрадуется.',
          en: 'Standing up to greet elders shows respect. Grandpa will be very happy.',
        },
      },
      {
        id: 'wave',
        kind: 'good',
        text: {
          uz: 'Qo‘l silkitib qo‘yaman',
          ru: 'Помашу ему рукой',
          en: 'Wave to him',
        },
        explain: {
          uz: 'Yaxshi! O‘rningdan turib salom bersang, bobong hurmatingni yanada his qiladi.',
          ru: 'Хорошо! А если встать и поздороваться, дедушка ещё сильнее почувствует уважение.',
          en: 'Nice! Standing up to say hello shows Grandpa your respect even more.',
        },
      },
      {
        id: 'keep-watching',
        kind: 'other',
        text: {
          uz: 'Multfilmni ko‘rishda davom etaman',
          ru: 'Продолжу смотреть мультфильм',
          en: 'Keep watching cartoons',
        },
        explain: {
          uz: 'Bobong seni ko‘rishni kutayotgan bo‘lishi mumkin. Bir daqiqa to‘xtab, salom bersang bo‘ladi.',
          ru: 'Дедушка, наверное, ждёт встречи с тобой. Можно на минутку остановиться и поздороваться.',
          en: 'Grandpa may be looking forward to seeing you. You could pause for a moment and say hello.',
        },
      },
    ],
  },
]
