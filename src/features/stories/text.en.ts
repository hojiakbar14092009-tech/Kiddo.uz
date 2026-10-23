// with its extension and from a file without imports: the e2e tests read these words too
import type { StoryText } from './storyText.ts'

/** The stories in English (written for English, not translated word for word). */
export const STORY_TEXT_EN: Record<string, StoryText> = {
  'lost-lamb': {
    title: 'The Lost Lamb',
    blurb: 'Oppoq follows a butterfly high in the mountains.',
    pages: {
      p1: [
        'High in the mountains, near a white yurt, lived a little lamb called Oppoq.',
        'Every morning she went to the green pasture with her mother and Olapar, the shepherd’s dog.',
      ],
      p2: [
        'One sunny day, Oppoq saw a bright butterfly.',
        'She skipped after it, further and further, and forgot to look back.',
      ],
      p3: [
        'The butterfly flew up and away, and Oppoq looked around.',
        'Her mother, the flock and Olapar were nowhere to be seen.',
        '“Maa-aa,” she called softly.',
      ],
      p4: ['A steep, stony path led down the mountain.', 'What should Oppoq do?'],
      stay1: [
        'Oppoq stood next to the big rock, where anyone could see her.',
        '“Maa-aa! I’m here!” she called, as loudly as she could.',
      ],
      stay2: [
        'Far below, Olapar pricked up his ears.',
        'He ran up the hill, wagging his tail: “Woof! There you are! Well done for staying in one place and calling!”',
      ],
      down1: [
        'Oppoq took one careful step, and little stones rolled away under her hooves.',
        '“Wait, little one!” called the shepherd’s old goat. “This path is for big goats. Let’s stay here and call together.”',
      ],
      down2: [
        '“Maa-aa! Mee-ee!” they called together.',
        'Olapar heard them and came running up the hill, wagging his tail.',
      ],
      home: [
        'Olapar led Oppoq back to the flock just as the sun was setting.',
        'Her mother nuzzled her softly: “I missed you, my little sunshine. When you’re lost, stay where you are and call.”',
        'What would Oppoq like to say?',
      ],
      'end-thank': [
        'Oppoq pressed her nose into Olapar’s warm fur: “Thank you for finding me!”',
        'That night the stars twinkled over the yurt, and everyone slept soundly.',
      ],
      'end-close': [
        '“From now on I’ll stay where you can see me, Mum,” said Oppoq.',
        'She curled up beside her mother, and the round moon watched over the sleeping flock.',
      ],
    },
    choices: {
      stay: 'Stay by the rock and call',
      down: 'Go down the steep path alone',
      thank: 'Thank you, Olapar!',
      close: 'Mum, I’ll stay close',
    },
    questions: {
      'who-lost': {
        prompt: 'Who got lost in the mountains?',
        options: ['Oppoq the lamb', 'A goat', 'A cow'],
      },
      'what-chased': {
        prompt: 'What did Oppoq run after?',
        options: ['A butterfly', 'A bird', 'A ball'],
      },
      'who-found': {
        prompt: 'Who brought Oppoq back to the flock?',
        options: ['Olapar the dog', 'An eagle', 'A horse'],
      },
      first: {
        prompt: 'What happened first?',
        options: ['Oppoq chased a butterfly', 'Olapar found her', 'Everyone went to sleep'],
      },
      'why-lost': {
        prompt: 'Why did Oppoq get lost?',
        options: [
          'She followed a butterfly and forgot to look back',
          'It started to rain',
          'She hid behind a tree',
        ],
      },
      'mother-felt': {
        prompt: 'How did Mother feel when Oppoq came back?',
        options: ['Happy', 'Angry', 'Sad'],
      },
      'next-time': {
        prompt: 'Next time Oppoq goes to the pasture, what will she do?',
        options: ['Stay close to the flock', 'Chase every butterfly', 'Climb the highest mountain'],
      },
    },
  },

  'grandma-garden': {
    title: 'Grandma’s Garden',
    blurb: 'Tikon the hedgehog helps his grandma on a sunny day.',
    pages: {
      p1: [
        'On Saturday, little hedgehog Tikon came to visit his grandma.',
        'Her garden was full of red cherries, round tomatoes and tall sunflowers.',
      ],
      p2: [
        '“Welcome, my dear!” said Grandma, and gave him a big hug.',
        '“Today you will be my little helper.”',
      ],
      p3: [
        'The sun was hot, the seedlings were thirsty, and the cherries were ripe.',
        'What should Tikon do first?',
      ],
      water1: [
        'Tikon filled a small bucket and watered the seedlings one by one.',
        'Their leaves lifted up, as if they were saying thank you.',
      ],
      water2: [
        'Then he helped Grandma pick the cherries.',
        'The low branches were just right for a little hedgehog.',
      ],
      cherry1: [
        'Tikon and Grandma picked the ripe cherries together.',
        'The low branches were just right for a little hedgehog.',
      ],
      cherry2: [
        'Then Tikon carried water to the seedlings.',
        '“Drink up, little ones,” he whispered, and the leaves lifted up.',
      ],
      snail: [
        'Under a big leaf, Tikon found a slow little snail.',
        '“Grandma, look! It carries its house on its back!”',
        'What should Tikon do?',
      ],
      watch: [
        'Tikon lay down on his tummy and watched very quietly.',
        'The snail stretched out its tiny horns and slowly went on its way.',
      ],
      carry: [
        'Tikon gently put the snail on a leaf and carried it to the shady grass.',
        '“Here you’ll be cool and safe,” he said.',
      ],
      tea: [
        'In the evening they drank tea under the cherry tree with warm flatbread (non) and cherry jam.',
        '“You are a real gardener,” smiled Grandma, and Tikon felt very proud.',
      ],
    },
    choices: {
      water: 'Water the seedlings',
      cherries: 'Pick cherries with Grandma',
      watch: 'Watch it quietly',
      carry: 'Carry it to the cool grass',
    },
    questions: {
      'who-visit': {
        prompt: 'Who did Tikon visit?',
        options: ['His grandma', 'A rabbit', 'An owl'],
      },
      'what-found': {
        prompt: 'What did Tikon find under a leaf?',
        options: ['A snail', 'A ladybird', 'A worm'],
      },
      'what-grew': {
        prompt: 'What grew in Grandma’s garden?',
        options: ['Cherries', 'Bananas', 'Pineapples'],
      },
      first: {
        prompt: 'What happened first?',
        options: ['Tikon came to Grandma’s house', 'He found a snail', 'They drank tea'],
      },
      'why-water': {
        prompt: 'Why were the seedlings thirsty?',
        options: ['The sun was hot', 'It was snowing', 'It was raining'],
      },
      'tikon-felt': {
        prompt: 'How did Tikon feel when Grandma praised him?',
        options: ['Proud', 'Angry', 'Scared'],
      },
      'next-time': {
        prompt: 'Next summer the cherries are ripe again. Who will help Grandma?',
        options: ['Tikon', 'A fish', 'A whale'],
      },
    },
  },

  'navruz-sumalak': {
    title: 'Sumalak for Navruz',
    blurb: 'The whole mahalla cooks sumalak together all night.',
    pages: {
      p1: [
        'Spring came to the mahalla: the tulips opened and the apricot trees blossomed.',
        '“Navruz is coming!” Mother Hen told her little chick, Sariq.',
      ],
      p2: [
        'Mother Hen soaked wheat in water and kept it somewhere warm.',
        'A few days later, soft green sprouts grew, like a tiny meadow.',
      ],
      p3: [
        'In the evening, the neighbours gathered around a big pot over the fire.',
        'Sumalak cooks all night long, so everyone took turns stirring it and singing songs.',
      ],
      sleepy: ['It grew late, and Sariq’s eyes began to close.', 'What should Sariq do?'],
      nap: [
        'Sariq snuggled under Mother’s warm wing.',
        'He dreamed that the big pot was full of shining stars.',
      ],
      sing1: [
        'Sariq sang his best song: “Sumalak, sumalak, sweet and brown!”',
        'Everyone smiled and stirred a little faster.',
      ],
      sing2: [
        'Grandpa Goat stirred with the long paddle while Sariq, safely back from the fire, made a wish.',
        '“May your wish come true!” smiled Grandpa Goat.',
      ],
      morning: [
        'In the morning the sumalak was ready, sweet and warm, and the sun rose over the mahalla.',
        '“Who shall we share it with?” asked Mother Hen.',
      ],
      'end-granny': [
        'Sariq carried a bowl to Granny Duck, who could not come out at night.',
        '“Happy Navruz!” said Sariq, and Granny Duck smiled her warmest smile.',
      ],
      'end-friends': [
        'Sariq shared the sumalak with all his friends under the blossoming tree.',
        '“Happy Navruz!” they sang, and the spring sun smiled on everyone.',
      ],
    },
    choices: {
      nap: 'Nap by Mother',
      sing: 'Sing by the pot',
      granny: 'Granny Duck next door',
      friends: 'All his friends',
    },
    questions: {
      'who-soaked': {
        prompt: 'Who soaked the wheat?',
        options: ['Mother Hen', 'A cow', 'A cat'],
      },
      'what-grew': {
        prompt: 'What grew from the wheat?',
        options: ['Green sprouts', 'Mushrooms', 'A cactus'],
      },
      'what-flowers': {
        prompt: 'Which flowers opened in spring?',
        options: ['Tulips', 'A cactus', 'Snowflakes'],
      },
      first: {
        prompt: 'What happened first?',
        options: ['The wheat sprouted', 'Everyone stirred the pot', 'The sun rose'],
      },
      'why-turns': {
        prompt: 'Why did the neighbours take turns stirring?',
        options: ['Sumalak cooks all night long', 'They wanted to play ball', 'To make it cold'],
      },
      'all-felt': {
        prompt: 'How did everyone feel when the sumalak was ready?',
        options: ['Happy', 'Angry', 'Scared'],
      },
      'next-spring': {
        prompt: 'What will Sariq do next spring?',
        options: ['Help sprout the wheat', 'Build a snowman', 'Sail a boat'],
      },
    },
  },

  'bazaar-kindness': {
    title: 'A Kind Deed at the Bazaar',
    blurb: 'Little Bear goes to the bazaar and finds a way to help.',
    pages: {
      p1: [
        'On Sunday, Little Bear went to the bazaar with his father.',
        'There were melons, grapes and warm round flatbread (non) everywhere!',
      ],
      p2: [
        '“We need apples and one big melon,” said Father.',
        'Little Bear carried the basket proudly.',
      ],
      p3: [
        'Suddenly an old turtle’s bag tore, and red apples rolled across the ground.',
        'Grandpa Turtle could not bend down quickly.',
        'How can Little Bear help?',
      ],
      pick: [
        'Little Bear ran and picked up the apples one by one.',
        'Father helped with the ones that rolled far away.',
      ],
      basket: [
        'Little Bear held out his basket: “Please take mine, Grandpa Turtle!”',
        'Together they put all the apples in it.',
      ],
      thanks: [
        '“Thank you, kind heart,” said Grandpa Turtle.',
        '“A kind deed is never forgotten.”',
      ],
      honey: [
        'Grandpa Turtle sold honey, and he gave Little Bear a small jar: “This is for your good heart.”',
        'What will Little Bear do with the honey?',
      ],
      'end-home': [
        'At home the family drank tea with honey.',
        'Little Bear told them about the apples, and Father said, “I’m proud of you.”',
      ],
      'end-friend': [
        'Little Bear took the honey to his friend Bunny, who had a cough.',
        '“Warm tea with honey will help you,” he said, and Bunny smiled.',
      ],
    },
    choices: {
      pick: 'Pick up the apples',
      basket: 'Give his own basket',
      home: 'Share with the family',
      friend: 'Take some to Bunny',
    },
    questions: {
      'whose-bag': {
        prompt: 'Whose bag tore?',
        options: ['Grandpa Turtle’s', 'A cow’s', 'A cat’s'],
      },
      'what-rolled': {
        prompt: 'What rolled across the ground?',
        options: ['Apples', 'A ball', 'Eggs'],
      },
      'what-gift': {
        prompt: 'What did Grandpa Turtle give Little Bear?',
        options: ['A jar of honey', 'Ice cream', 'Sweets'],
      },
      first: {
        prompt: 'What happened first?',
        options: ['Little Bear took the basket', 'Apples rolled away', 'He got honey'],
      },
      'why-honey': {
        prompt: 'Why did Grandpa Turtle give him honey?',
        options: ['Little Bear was kind', 'It was late', 'It was raining'],
      },
      'turtle-felt': {
        prompt: 'How did Grandpa Turtle feel when his apples rolled away?',
        options: ['Worried', 'Happy', 'Angry'],
      },
      'next-time': {
        prompt: 'If someone drops something tomorrow, what will Little Bear do?',
        options: ['Help them', 'Go to sleep', 'Play ball'],
      },
    },
  },

  'star-night': {
    title: 'A Starry Night',
    blurb: 'Little camel Botajon looks at the sky with a wise owl.',
    pages: {
      p1: [
        'In the wide steppe stood a white yurt.',
        'Little camel Botajon lived beside it with his mother.',
      ],
      p2: [
        'That night the sky was full of stars.',
        '“How many are there?” wondered Botajon. “I can’t count them all!”',
      ],
      p3: [
        'A wise owl landed on the yurt with a telescope.',
        '“Would you like to look closer?” asked Owl.',
        'What should Botajon look at first?',
      ],
      moon: [
        'Through the telescope, the Moon looked huge!',
        'It had round dips called craters, like footprints in the sand.',
      ],
      planet: [
        'Owl found a planet with a wide ring around it.',
        '“That is Saturn,” said Owl. “It is very, very far away.”',
      ],
      shooting: [
        'Suddenly a bright light flew across the sky.',
        '“A shooting star!” whispered Botajon, his eyes wide open.',
      ],
      travellers: [
        '“Long ago, travellers with camels crossed the desert at night,” said Owl.',
        '“They found their way by the stars.”',
      ],
      sleepy: ['Botajon gave a big camel yawn.', 'What should he do now?'],
      'end-thank': [
        '“Thank you, Owl!” said Botajon, and lay down beside his mother.',
        'He dreamed of rings, moons and shooting stars.',
      ],
      'end-count': [
        'Botajon and his mother counted: “One, two, three!”',
        'Then they fell asleep under the big, friendly sky.',
      ],
    },
    choices: {
      moon: 'The big round Moon',
      planet: 'A faraway planet',
      thank: 'Thank Owl and sleep',
      count: 'Count three more stars',
    },
    questions: {
      'who-telescope': {
        prompt: 'Who had the telescope?',
        options: ['The owl', 'A fish', 'A cow'],
      },
      'what-flew': {
        prompt: 'What flew across the sky?',
        options: ['A shooting star', 'A kite', 'A balloon'],
      },
      'where-live': {
        prompt: 'Where did Botajon live?',
        options: ['By a yurt', 'In a castle', 'On a boat'],
      },
      first: {
        prompt: 'What happened first?',
        options: ['Stars filled the sky', 'A shooting star flew', 'Botajon went to sleep'],
      },
      'why-stars': {
        prompt: 'Why did travellers look at the stars?',
        options: ['To find their way', 'To find cookies', 'To hide from the rain'],
      },
      'felt-shooting': {
        prompt: 'How did Botajon feel when he saw the shooting star?',
        options: ['Surprised', 'Angry', 'Sad'],
      },
      tomorrow: {
        prompt: 'What will Botajon look for tomorrow night?',
        options: ['Another shooting star', 'A fish', 'A snowman'],
      },
    },
  },

  'mahalla-hashar': {
    title: 'Hashar Day',
    blurb: 'The whole mahalla works together, and Mosh the kitten helps.',
    pages: {
      p1: [
        'On Saturday the whole mahalla came out for hashar.',
        'Neighbours worked together to make their street clean and green.',
      ],
      p2: ['Mosh the kitten took a little bucket.', '“I’ll water the new trees!” he said.'],
      p3: [
        'Grandpa Dog dug the holes, and the neighbours planted young trees.',
        'Mosh watered each one carefully.',
      ],
      nest: [
        'Under the old mulberry tree, Mosh heard a tiny “cheep-cheep”.',
        'A nest had fallen into the grass!',
        'What should Mosh do?',
      ],
      call: [
        'Mosh ran to Grandpa Dog: “Please come quickly, a nest fell down!”',
        'Grandpa Dog took his ladder and hurried after him.',
      ],
      guard: [
        'Mosh sat beside the nest and shaded it from the sun with a big leaf.',
        'Soon Grandpa Dog walked by with his ladder.',
      ],
      ladder: [
        'Grandpa Dog climbed the ladder and put the nest back on a strong branch.',
        'Mother Bird sang a happy thank-you song.',
      ],
      table: [
        'In the evening the street was green and clean, and the neighbours shared flatbread (non), grapes and tea.',
        '“Hashar makes our mahalla a happy home,” purred Mosh.',
      ],
    },
    choices: {
      call: 'Call Grandpa Dog',
      guard: 'Stay and guard the nest',
    },
    questions: {
      'who-fixed': {
        prompt: 'Who put the nest back?',
        options: ['Grandpa Dog', 'A cow', 'A fish'],
      },
      'what-fell': {
        prompt: 'What fell into the grass?',
        options: ['A nest', 'An apple', 'A ball'],
      },
      'what-carried': {
        prompt: 'What did Mosh carry?',
        options: ['A bucket', 'An umbrella', 'A drum'],
      },
      first: {
        prompt: 'What happened first?',
        options: ['They planted trees', 'The nest went back up', 'They drank tea'],
      },
      'why-ladder': {
        prompt: 'Why did Grandpa Dog need a ladder?',
        options: ['To put the nest back up high', 'To pick apples', 'To get a kite'],
      },
      'bird-felt': {
        prompt: 'How did Mother Bird feel at the end?',
        options: ['Happy', 'Angry', 'Scared'],
      },
      'next-hashar': {
        prompt: 'What will Mosh do on the next hashar day?',
        options: ['Help again', 'Sleep all day', 'Drive a car'],
      },
    },
  },
}
