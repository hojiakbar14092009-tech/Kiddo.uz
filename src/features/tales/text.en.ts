import type { TaleText } from './content'

/** The tales in English (scenes and questions in the same order as content.ts). */
export const TALE_TEXT_EN: Record<string, TaleText> = {
  'rabbit-carrot': {
    title: 'Little Rabbit and the Carrot',
    scenes: [
      {
        lines: [
          'Once upon a time, a little Rabbit lived in a green meadow.',
          'One morning, Little Rabbit felt hungry.',
        ],
      },
      {
        lines: [
          'Little Rabbit hopped to the garden and met Hedgehog there.',
          '“I’m looking for a sweet carrot,” said Little Rabbit.',
        ],
        task: { prompt: 'Find the carrot!', options: ['Carrot', 'Apple', 'Mushroom'] },
      },
      {
        lines: [
          'Little Rabbit found a big carrot! He shared it with his friend Hedgehog.',
          'They were both very happy.',
        ],
      },
      {
        lines: [
          'In the evening, the two friends fell asleep under a big tree.',
          'The moon smiled down at them.',
        ],
      },
    ],
    checks: [
      { prompt: 'Who was looking for a carrot?', options: ['Little Rabbit', 'A cat', 'A duck'] },
      { prompt: 'What did Little Rabbit find?', options: ['A carrot', 'A ball', 'An apple'] },
      { prompt: 'Who did Little Rabbit share with?', options: ['Hedgehog', 'A cow', 'A fish'] },
      {
        prompt: 'Where did the friends fall asleep?',
        options: ['Under a tree', 'In a car', 'In a boat'],
      },
    ],
  },
  'chick-ball': {
    title: 'Little Chick’s Ball',
    scenes: [
      {
        lines: [
          'Yellow Chick was playing with a ball in the yard.',
          'The ball rolled and rolled far away.',
        ],
      },
      {
        lines: [
          'Chick looked for the ball and came to the pond.',
          'Little Duck was swimming there.',
        ],
      },
      {
        lines: [
          '“Where is my ball?” asked Chick.',
          '“Here it is, among the flowers!” said Little Duck.',
        ],
        task: { prompt: 'Find the ball!', options: ['Ball', 'Flower', 'Apple'] },
      },
      {
        lines: [
          'Chick and Little Duck played ball together until evening.',
          'It is so much fun to play with a friend!',
        ],
      },
    ],
    checks: [
      { prompt: 'Who lost the ball?', options: ['Chick', 'A rabbit', 'A cow'] },
      { prompt: 'What was Chick looking for?', options: ['A ball', 'A kite', 'A teddy bear'] },
      { prompt: 'Who helped Chick?', options: ['Little Duck', 'A cat', 'A horse'] },
      { prompt: 'Where was the ball?', options: ['Among the flowers', 'In a car', 'In a house'] },
    ],
  },
  'kitten-stars': {
    title: 'Kitten and the Stars',
    scenes: [
      {
        lines: [
          'One night, a little Kitten could not fall asleep.',
          'She looked out of the window at the sky.',
        ],
      },
      {
        lines: ['Wise Owl was sitting in a tree.', '“Look up at the sky,” Owl said kindly.'],
      },
      {
        lines: ['A bright moon and shining stars were in the sky.'],
        task: { prompt: 'Find the star!', options: ['Star', 'Ball', 'Apple'] },
      },
      {
        lines: [
          'Kitten said to the stars, “Good night!”',
          'Then she hugged her teddy bear and fell fast asleep.',
        ],
      },
    ],
    checks: [
      { prompt: 'Who could not fall asleep?', options: ['Kitten', 'A puppy', 'A piglet'] },
      { prompt: 'Who helped Kitten?', options: ['Owl', 'A frog', 'A cow'] },
      { prompt: 'What was in the sky?', options: ['The moon', 'A car', 'A carrot'] },
      {
        prompt: 'What did Kitten hug at bedtime?',
        options: ['A teddy bear', 'A drum', 'An umbrella'],
      },
    ],
  },
  'chipmunk-autumn': {
    title: 'Little Chipmunk Gets Ready',
    scenes: [
      {
        lines: [
          'Autumn came. Yellow leaves began to fall from the trees.',
          'Little Chipmunk started to get ready for winter.',
        ],
      },
      {
        lines: ['First, he gathered chestnuts in the forest.', 'He put them in his little basket.'],
        task: {
          prompt: 'What did Little Chipmunk gather?',
          options: ['Chestnuts', 'A ball', 'A fish'],
        },
      },
      {
        lines: [
          'Then, on the way, he met Hedgehog. Hedgehog was carrying heavy apples.',
          'Little Chipmunk helped him carry the apples home.',
        ],
      },
      {
        lines: [
          'After that, Little Chipmunk hid all his chestnuts in his cosy home inside a tree.',
        ],
      },
      {
        lines: [
          'Winter came, and white snow covered everything.',
          'Little Chipmunk’s home was warm, and he had enough chestnuts for the whole winter.',
        ],
      },
    ],
    checks: [
      {
        prompt: 'What did Little Chipmunk do first?',
        options: ['Gathered chestnuts', 'Played in the snow', 'Caught a fish'],
      },
      { prompt: 'Who did he meet on the way?', options: ['Hedgehog', 'Owl', 'Frog'] },
      {
        prompt: 'How did he help Hedgehog?',
        options: ['Carried the apples', 'Gave him a ball', 'Gave him an umbrella'],
      },
      {
        prompt: 'Where did he hide the chestnuts?',
        options: ['In the tree', 'In a bucket', 'In a car'],
      },
      {
        prompt: 'What happened at the end?',
        options: ['Winter came', 'Flowers bloomed', 'Summer came'],
      },
    ],
  },
  'turtle-pond': {
    title: 'Little Turtle’s Trip',
    scenes: [
      {
        lines: [
          'Little Turtle wanted to go to the pond and meet the fish.',
          'She set off slowly, step by step.',
        ],
      },
      {
        lines: [
          'On the way, she met Snail.',
          '“Going slowly is good too,” said Snail, and showed her the way.',
        ],
      },
      {
        lines: ['Then Frog jumped out of the grass.', '“The pond is right here!” she croaked.'],
        task: { prompt: 'Find Frog!', options: ['Frog', 'Fish', 'Bee'] },
      },
      {
        lines: [
          'Little Turtle dived into the water and met the colourful fish.',
          'They swam and played together.',
        ],
      },
      {
        lines: [
          'In the evening, Little Turtle went back home.',
          'She thought about her new friends and fell asleep smiling.',
        ],
      },
    ],
    checks: [
      {
        prompt: 'Where did Little Turtle go?',
        options: ['To the pond', 'To the mountains', 'To a castle'],
      },
      { prompt: 'Who did she meet first?', options: ['Snail', 'Frog', 'Fish'] },
      { prompt: 'Who showed Little Turtle the pond?', options: ['Frog', 'A cow', 'An owl'] },
      {
        prompt: 'Who did she meet in the pond?',
        options: ['The fish', 'Some horses', 'Some bees'],
      },
      {
        prompt: 'How did Little Turtle walk?',
        options: ['Slowly, step by step', 'Fast like a rocket', 'She flew on a plane'],
      },
    ],
  },
  'duck-rain': {
    title: 'Rain and the Rainbow',
    scenes: [
      { lines: ['On a sunny day, Little Duck was walking in the meadow.'] },
      {
        lines: [
          'Suddenly, a cloud covered the sky, and it started to rain.',
          'Little Duck opened her big umbrella.',
        ],
      },
      {
        lines: [
          'Rabbit and Mouse were getting wet in the rain.',
          '“Come under my umbrella!” called Little Duck.',
        ],
        task: {
          prompt: 'What did Little Duck do?',
          options: ['Shared her umbrella', 'Played ball', 'Went to sleep'],
        },
      },
      {
        lines: [
          'The rain stopped, and the sun came out.',
          'A colourful rainbow appeared in the sky!',
        ],
      },
      {
        lines: [
          'The friends jumped in the puddles and laughed.',
          '“Thank you, Little Duck!” they said.',
        ],
      },
    ],
    checks: [
      {
        prompt: 'What was the weather like at first?',
        options: ['Sunny', 'Snowy', 'It was night'],
      },
      {
        prompt: 'What happened next?',
        options: ['It started to rain', 'It started to snow', 'A rainbow appeared'],
      },
      { prompt: 'What did Little Duck open?', options: ['An umbrella', 'A box', 'A book'] },
      { prompt: 'Who came under the umbrella?', options: ['Rabbit and Mouse', 'A cow', 'A fish'] },
      {
        prompt: 'What appeared in the sky after the rain?',
        options: ['A rainbow', 'A rocket', 'A kite'],
      },
    ],
  },
  'seed-sunflower': {
    title: 'How the Sunflower Grew',
    scenes: [
      {
        lines: [
          'In spring, Little Rabbit planted a tiny seed in the garden.',
          '“You will grow big,” he said.',
        ],
      },
      {
        lines: ['Every day, Little Rabbit watered the seed, and the sun kept it warm.'],
        task: {
          prompt: 'What does a seed need to grow?',
          options: ['Water and sun', 'A sweet', 'A toy'],
        },
      },
      {
        lines: [
          'One day, a green sprout came up out of the ground!',
          'Little Rabbit jumped for joy.',
        ],
      },
      {
        lines: ['The sprout grew a little more every day.'],
        task: {
          prompt: 'What do you think will happen next?',
          options: ['A big flower will open', 'A rocket will fly', 'A snowman will appear'],
        },
      },
      {
        lines: [
          'In summer, a big yellow sunflower opened!',
          'Bees flew to it, and Little Rabbit smiled proudly.',
        ],
        task: {
          prompt: 'Put the pictures in order: first, next, last.',
          options: ['Watered the seed', 'A sprout came up', 'The flower opened'],
        },
      },
    ],
    checks: [
      {
        prompt: 'Why did the seed grow?',
        options: ['It got water and sun', 'Someone played ball nearby', 'The moon came out'],
      },
      {
        prompt: 'What came out of the ground first?',
        options: ['A green sprout', 'A big flower', 'An apple'],
      },
      { prompt: 'Who flew to the sunflower?', options: ['Bees', 'Fish', 'Cows'] },
      {
        prompt: 'What did Little Rabbit do every day?',
        options: ['Watered the seed', 'Slept', 'Drove a car'],
      },
      { prompt: 'When did the sunflower open?', options: ['In summer', 'In winter', 'In autumn'] },
      { prompt: 'What colour was the sunflower?', options: ['Yellow', 'Red', 'Blue'] },
    ],
  },
  'fox-kite': {
    title: 'Little Fox and the Kite',
    scenes: [
      {
        lines: [
          'Little Fox made a new kite.',
          'He took it out to the meadow, but there was no wind at all.',
        ],
      },
      {
        lines: ['Little Fox waited and waited.', 'Then, suddenly, the wind began to blow!'],
        task: {
          prompt: 'What do you think will happen to the kite now?',
          options: ['The kite will fly up', 'The kite will fall asleep', 'The kite will swim'],
        },
      },
      {
        lines: [
          'The wind caught the kite and lifted it high, high up.',
          'Little Fox held the string tight and ran happily.',
        ],
      },
      {
        lines: [
          'When the wind stopped, the kite came down and got stuck on a branch.',
          '“What shall I do now?” said Little Fox.',
        ],
        task: { prompt: 'Who can help Little Fox?', options: ['Little Bird', 'A fish', 'A snail'] },
      },
      {
        lines: [
          'Little Bird flew up and carefully set the kite free.',
          'Now the friends take turns flying the kite.',
        ],
        task: {
          prompt: 'Put the pictures in order: first, next, last.',
          options: ['The kite flew', 'It got stuck in a tree', 'Little Bird helped'],
        },
      },
    ],
    checks: [
      {
        prompt: 'Why didn’t the kite fly at first?',
        options: ['There was no wind', 'It was raining', 'It was night'],
      },
      {
        prompt: 'Why did the kite go up into the sky?',
        options: ['The wind blew', 'A rocket pushed it', 'It started to rain'],
      },
      {
        prompt: 'What happened when the wind stopped?',
        options: ['The kite got stuck in a tree', 'A rainbow appeared', 'The kite flew home'],
      },
      { prompt: 'Who helped Little Fox?', options: ['Little Bird', 'A fish', 'A snail'] },
      {
        prompt: 'Why could Little Bird help?',
        options: ['She can fly', 'She walks slowly', 'She can swim'],
      },
      {
        prompt: 'What did the friends do at the end?',
        options: ['Took turns flying the kite', 'Went to sleep', 'Went fishing'],
      },
    ],
  },
  'egg-chick': {
    title: 'Who Came Out of the Egg?',
    scenes: [
      {
        lines: [
          'Mother Hen was sitting in her nest on a white egg.',
          'She kept the egg warm with her wings.',
        ],
      },
      {
        lines: [
          '“Why are you keeping the egg warm?” asked Little Goat.',
          '“A baby is growing inside, and it needs warmth,” said Mother Hen.',
        ],
        task: {
          prompt: 'Why did Mother Hen keep the egg warm?',
          options: ['A chick was growing inside', 'She thought it was a ball', 'She was tired'],
        },
      },
      {
        lines: ['One day, the egg began to wobble. Tap, tap, tap!'],
        task: {
          prompt: 'What do you think will happen next?',
          options: ['A chick will hatch', 'A kitten will come out', 'The egg will fly away'],
        },
      },
      {
        lines: ['The shell cracked, and a tiny Chick came out!', '“Cheep, cheep!” he said.'],
      },
      {
        lines: [
          'Mother Hen hugged the Chick, and Little Goat jumped with joy.',
          'Now there is a new friend in the yard!',
        ],
        task: {
          prompt: 'Put the pictures in order: first, next, last.',
          options: ['The egg', 'The egg cracked', 'The chick walks'],
        },
      },
    ],
    checks: [
      { prompt: 'What was Mother Hen sitting on?', options: ['An egg', 'A ball', 'An apple'] },
      {
        prompt: 'Why did Mother Hen keep the egg warm?',
        options: ['A chick was growing inside', 'She thought it was a ball', 'It was winter'],
      },
      {
        prompt: 'What happened when the egg wobbled?',
        options: ['A chick hatched', 'A rainbow appeared', 'A kitten came out'],
      },
      { prompt: 'Who talked with Mother Hen?', options: ['Little Goat', 'A penguin', 'A whale'] },
      {
        prompt: 'Who appeared in the yard at the end?',
        options: ['A little chick', 'A puppy', 'A horse'],
      },
      {
        prompt: 'What happened first?',
        options: ['Mother Hen kept the egg warm', 'The egg cracked', 'The chick went for a walk'],
      },
    ],
  },
}
