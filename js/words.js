// Yoyo & Kiwi 的英语王国 —— 分级单词库
// 每个单词: { id, en, zh, emoji, cat, lvl, sentence? }
// 级别: seed(萌芽/启蒙) < starters(剑桥 Pre-A1) < movers(剑桥 A1, 对标 Power Up 2)
// movers 级单词都带例句，供大孩子跟读

export const LEVELS = [
  { id: 'seed',     name: '萌芽',     tag: '启蒙',            emoji: '🌱' },
  { id: 'starters', name: 'Starters', tag: 'Pre-A1',          emoji: '⭐' },
  { id: 'movers',   name: 'Movers',   tag: 'A1 · Power Up 2', emoji: '🚀' },
  { id: 'flyers',   name: 'Flyers',   tag: 'A2 · 进阶',       emoji: '🏆' },
];

// 「我的世界」可切换的环境（背景全部纯 CSS 画，无图片资源）
export const SCENES = [
  { id: 'grassland', name: '草原', emoji: '🌿' },
  { id: 'desert',    name: '沙漠', emoji: '🏜️' },
  { id: 'sea',       name: '大海', emoji: '🌊' },
  { id: 'river',     name: '小河', emoji: '🏞️' },
  { id: 'forest',    name: '森林', emoji: '🌲' },
  { id: 'snow',      name: '雪地', emoji: '❄️' },
  { id: 'sunset',    name: '黄昏', emoji: '🌅' },
  { id: 'space',     name: '太空', emoji: '🌌' },
];

export const CATEGORIES = [
  { id: 'animals',    name: '动物',   emoji: '🐼' },
  { id: 'food',       name: '食物',   emoji: '🍎' },
  { id: 'colors',     name: '颜色',   emoji: '🌈' },
  { id: 'numbers',    name: '数字',   emoji: '🔢' },
  { id: 'body',       name: '身体',   emoji: '👀' },
  { id: 'family',     name: '家庭',   emoji: '👨‍👩‍👧' },
  { id: 'school',     name: '学校',   emoji: '🎒' },
  { id: 'nature',     name: '大自然', emoji: '🌞' },
  { id: 'clothes',    name: '服装',   emoji: '👕' },
  { id: 'home',       name: '家居',   emoji: '🏠' },
  { id: 'toys',       name: '玩具运动', emoji: '⚽' },
  { id: 'transport',  name: '交通',   emoji: '🚗' },
  { id: 'places',     name: '地点',   emoji: '🏙️' },
  { id: 'weather',    name: '天气',   emoji: '⛅' },
  { id: 'adjectives', name: '形容词', emoji: '✨' },
  { id: 'actions',    name: '动作',   emoji: '🏃' },
  { id: 'time',       name: '时间',   emoji: '🕐' },
  { id: 'people',     name: '人物',   emoji: '🧑‍⚕️' },
  { id: 'objects',    name: '物品',   emoji: '🧳' },
];

const SEED = [
  // 动物
  { id: 'cat',      en: 'cat',      zh: '猫',   emoji: '🐱' },
  { id: 'dog',      en: 'dog',      zh: '狗',   emoji: '🐶' },
  { id: 'bird',     en: 'bird',     zh: '鸟',   emoji: '🐦' },
  { id: 'fish',     en: 'fish',     zh: '鱼',   emoji: '🐟' },
  { id: 'rabbit',   en: 'rabbit',   zh: '兔子', emoji: '🐰', sentence: 'The rabbit can hop and run.' },
  { id: 'panda',    en: 'panda',    zh: '熊猫', emoji: '🐼', sentence: 'The panda eats green leaves.' },
  { id: 'lion',     en: 'lion',     zh: '狮子', emoji: '🦁', sentence: 'The lion can run very fast.' },
  { id: 'elephant', en: 'elephant', zh: '大象', emoji: '🐘' },
  { id: 'monkey',   en: 'monkey',   zh: '猴子', emoji: '🐵' },
  { id: 'duck',     en: 'duck',     zh: '鸭子', emoji: '🦆' },
].map((w) => ({ ...w, cat: 'animals' })).concat([
  // 食物
  { id: 'apple',      en: 'apple',      zh: '苹果', emoji: '🍎' },
  { id: 'banana',     en: 'banana',     zh: '香蕉', emoji: '🍌' },
  { id: 'orange',     en: 'orange',     zh: '橙子', emoji: '🍊' },
  { id: 'grape',      en: 'grape',      zh: '葡萄', emoji: '🍇' },
  { id: 'watermelon', en: 'watermelon', zh: '西瓜', emoji: '🍉' },
  { id: 'cake',       en: 'cake',       zh: '蛋糕', emoji: '🍰' },
  { id: 'milk',       en: 'milk',       zh: '牛奶', emoji: '🥛' },
  { id: 'egg',        en: 'egg',        zh: '鸡蛋', emoji: '🥚' },
  { id: 'rice',       en: 'rice',       zh: '米饭', emoji: '🍚' },
  { id: 'bread',      en: 'bread',      zh: '面包', emoji: '🍞' },
].map((w) => ({ ...w, cat: 'food' }))).concat([
  // 颜色
  { id: 'red',    en: 'red',    zh: '红色', emoji: '🔴' },
  { id: 'blue',   en: 'blue',   zh: '蓝色', emoji: '🔵' },
  { id: 'yellow', en: 'yellow', zh: '黄色', emoji: '🟡' },
  { id: 'green',  en: 'green',  zh: '绿色', emoji: '🟢' },
  { id: 'pink',   en: 'pink',   zh: '粉色', emoji: '🌸' },
  { id: 'purple', en: 'purple', zh: '紫色', emoji: '🟣' },
  { id: 'black',  en: 'black',  zh: '黑色', emoji: '⚫' },
  { id: 'white',  en: 'white',  zh: '白色', emoji: '⚪' },
].map((w) => ({ ...w, cat: 'colors' }))).concat([
  // 数字
  { id: 'one',   en: 'one',   zh: '一', emoji: '1️⃣' },
  { id: 'two',   en: 'two',   zh: '二', emoji: '2️⃣' },
  { id: 'three', en: 'three', zh: '三', emoji: '3️⃣' },
  { id: 'four',  en: 'four',  zh: '四', emoji: '4️⃣' },
  { id: 'five',  en: 'five',  zh: '五', emoji: '5️⃣' },
  { id: 'six',   en: 'six',   zh: '六', emoji: '6️⃣' },
  { id: 'seven', en: 'seven', zh: '七', emoji: '7️⃣' },
  { id: 'eight', en: 'eight', zh: '八', emoji: '8️⃣' },
  { id: 'nine',  en: 'nine',  zh: '九', emoji: '9️⃣' },
  { id: 'ten',   en: 'ten',   zh: '十', emoji: '🔟' },
].map((w) => ({ ...w, cat: 'numbers' }))).concat([
  // 身体
  { id: 'eye',   en: 'eye',   zh: '眼睛', emoji: '👁️' },
  { id: 'ear',   en: 'ear',   zh: '耳朵', emoji: '👂' },
  { id: 'nose',  en: 'nose',  zh: '鼻子', emoji: '👃' },
  { id: 'mouth', en: 'mouth', zh: '嘴巴', emoji: '👄' },
  { id: 'hand',  en: 'hand',  zh: '手',   emoji: '✋' },
  { id: 'foot',  en: 'foot',  zh: '脚',   emoji: '🦶' },
  { id: 'head',  en: 'head',  zh: '头',   emoji: '🙂' },
  { id: 'hair',  en: 'hair',  zh: '头发', emoji: '💇' },
].map((w) => ({ ...w, cat: 'body' }))).concat([
  // 家庭
  { id: 'mom',     en: 'mum',     zh: '妈妈', emoji: '👩' },
  { id: 'dad',     en: 'dad',     zh: '爸爸', emoji: '👨' },
  { id: 'sister',  en: 'sister',  zh: '姐妹', emoji: '👧' },
  { id: 'brother', en: 'brother', zh: '兄弟', emoji: '👦' },
  { id: 'grandma', en: 'grandma', zh: '奶奶', emoji: '👵' },
  { id: 'grandpa', en: 'grandpa', zh: '爷爷', emoji: '👴' },
  { id: 'baby',    en: 'baby',    zh: '宝宝', emoji: '👶' },
  { id: 'family',  en: 'family',  zh: '家庭', emoji: '👨‍👩‍👧' },
].map((w) => ({ ...w, cat: 'family' }))).concat([
  // 学校
  { id: 'book',    en: 'book',    zh: '书',   emoji: '📖' },
  { id: 'pen',     en: 'pen',     zh: '钢笔', emoji: '🖊️' },
  { id: 'pencil',  en: 'pencil',  zh: '铅笔', emoji: '✏️' },
  { id: 'bag',     en: 'bag',     zh: '书包', emoji: '🎒' },
  { id: 'desk',    en: 'desk',    zh: '课桌', emoji: '🪑' },
  { id: 'teacher', en: 'teacher', zh: '老师', emoji: '👩‍🏫' },
  { id: 'school',  en: 'school',  zh: '学校', emoji: '🏫' },
  { id: 'ruler',   en: 'ruler',   zh: '尺子', emoji: '📏' },
].map((w) => ({ ...w, cat: 'school' }))).concat([
  // 大自然
  { id: 'sun',    en: 'sun',    zh: '太阳', emoji: '🌞' },
  { id: 'moon',   en: 'moon',   zh: '月亮', emoji: '🌙' },
  { id: 'star',   en: 'star',   zh: '星星', emoji: '⭐' },
  { id: 'tree',   en: 'tree',   zh: '树',   emoji: '🌳', sentence: 'There is a tall tree by the river.' },
  { id: 'flower', en: 'flower', zh: '花',   emoji: '🌸' },
  { id: 'rain',   en: 'rain',   zh: '雨',   emoji: '🌧️', sentence: 'The rain makes the ground wet.' },
  { id: 'snow',   en: 'snow',   zh: '雪',   emoji: '❄️', sentence: 'The snow is cold and white.' },
  { id: 'cloud',  en: 'cloud',  zh: '云',   emoji: '☁️', sentence: 'A grey cloud is over the town.' },
].map((w) => ({ ...w, cat: 'nature' }))).map((w) => ({ ...w, lvl: 'seed' }));

const STARTERS = [
  // 动物
  { id: 'tiger',   en: 'tiger',   zh: '老虎',   emoji: '🐯', cat: 'animals' },
  { id: 'zebra',   en: 'zebra',   zh: '斑马',   emoji: '🦓', cat: 'animals' },
  { id: 'giraffe', en: 'giraffe', zh: '长颈鹿', emoji: '🦒', cat: 'animals' },
  { id: 'horse',   en: 'horse',   zh: '马',     emoji: '🐴', cat: 'animals' },
  { id: 'sheep',   en: 'sheep',   zh: '绵羊',   emoji: '🐑', cat: 'animals' },
  { id: 'cow',     en: 'cow',     zh: '奶牛',   emoji: '🐮', cat: 'animals' },
  { id: 'pig',     en: 'pig',     zh: '猪',     emoji: '🐷', cat: 'animals' },
  { id: 'frog',    en: 'frog',    zh: '青蛙',   emoji: '🐸', cat: 'animals' },
  { id: 'snake',   en: 'snake',   zh: '蛇',     emoji: '🐍', cat: 'animals' },
  { id: 'spider',  en: 'spider',  zh: '蜘蛛',   emoji: '🕷️', cat: 'animals' },
  // 食物
  { id: 'icecream',  en: 'ice cream', zh: '冰淇淋', emoji: '🍦', cat: 'food' },
  { id: 'juice',     en: 'juice',     zh: '果汁',   emoji: '🧃', cat: 'food' },
  { id: 'water',     en: 'water',     zh: '水',     emoji: '💧', cat: 'food' },
  { id: 'carrot',    en: 'carrot',    zh: '胡萝卜', emoji: '🥕', cat: 'food' },
  { id: 'potato',    en: 'potato',    zh: '土豆',   emoji: '🥔', cat: 'food' },
  { id: 'tomato',    en: 'tomato',    zh: '西红柿', emoji: '🍅', cat: 'food' },
  { id: 'pear',      en: 'pear',      zh: '梨',     emoji: '🍐', cat: 'food' },
  { id: 'lemon',     en: 'lemon',     zh: '柠檬',   emoji: '🍋', cat: 'food' },
  { id: 'mango',     en: 'mango',     zh: '芒果',   emoji: '🥭', cat: 'food' },
  { id: 'pineapple', en: 'pineapple', zh: '菠萝',   emoji: '🍍', cat: 'food' },
  { id: 'burger',    en: 'burger',    zh: '汉堡',   emoji: '🍔', cat: 'food' },
  { id: 'chocolate', en: 'chocolate', zh: '巧克力', emoji: '🍫', cat: 'food' },
  // 服装
  { id: 'tshirt',  en: 'T-shirt', zh: 'T恤',    emoji: '👕', cat: 'clothes', sentence: 'I wear a T-shirt on sunny days.' },
  { id: 'dress',   en: 'dress',   zh: '连衣裙', emoji: '👗', cat: 'clothes' },
  { id: 'hat',     en: 'hat',     zh: '帽子',   emoji: '👒', cat: 'clothes' },
  { id: 'shoes',   en: 'shoes',   zh: '鞋子',   emoji: '👟', cat: 'clothes' },
  { id: 'socks',   en: 'socks',   zh: '袜子',   emoji: '🧦', cat: 'clothes' },
  { id: 'jacket',  en: 'jacket',  zh: '夹克',   emoji: '🧥', cat: 'clothes' },
  { id: 'jeans',   en: 'jeans',   zh: '牛仔裤', emoji: '👖', cat: 'clothes' },
  { id: 'glasses', en: 'glasses', zh: '眼镜',   emoji: '👓', cat: 'clothes' },
  { id: 'boots',   en: 'boots',   zh: '靴子',   emoji: '👢', cat: 'clothes', sentence: 'Put on your boots in the rain.' },
  { id: 'watch',   en: 'watch',   zh: '手表',   emoji: '⌚', cat: 'clothes' },
  // 家居
  { id: 'bed',     en: 'bed',     zh: '床',   emoji: '🛏️', cat: 'home' },
  { id: 'chair',   en: 'chair',   zh: '椅子', emoji: '🪑', cat: 'home' },
  { id: 'door',    en: 'door',    zh: '门',   emoji: '🚪', cat: 'home' },
  { id: 'window',  en: 'window',  zh: '窗户', emoji: '🪟', cat: 'home' },
  { id: 'clock',   en: 'clock',   zh: '时钟', emoji: '⏰', cat: 'home' },
  { id: 'lamp',    en: 'lamp',    zh: '台灯', emoji: '💡', cat: 'home' },
  { id: 'phone',   en: 'phone',   zh: '电话', emoji: '📱', cat: 'home' },
  { id: 'tv',      en: 'TV',      zh: '电视', emoji: '📺', cat: 'home' },
  { id: 'bath',    en: 'bath',    zh: '浴缸', emoji: '🛁', cat: 'home' },
  { id: 'mirror',  en: 'mirror',  zh: '镜子', emoji: '🪞', cat: 'home' },
  { id: 'kitchen', en: 'kitchen', zh: '厨房', emoji: '🍳', cat: 'home' },
  { id: 'garden',  en: 'garden',  zh: '花园', emoji: '🌷', cat: 'home' },
  // 玩具运动
  { id: 'football',   en: 'football',   zh: '足球',   emoji: '⚽', cat: 'toys' },
  { id: 'basketball', en: 'basketball', zh: '篮球',   emoji: '🏀', cat: 'toys' },
  { id: 'tennis',     en: 'tennis',     zh: '网球',   emoji: '🎾', cat: 'toys' },
  { id: 'doll',       en: 'doll',       zh: '娃娃',   emoji: '🪆', cat: 'toys' },
  { id: 'kite',       en: 'kite',       zh: '风筝',   emoji: '🪁', cat: 'toys' },
  { id: 'robot',      en: 'robot',      zh: '机器人', emoji: '🤖', cat: 'toys' },
  { id: 'guitar',     en: 'guitar',     zh: '吉他',   emoji: '🎸', cat: 'toys' },
  { id: 'piano',      en: 'piano',      zh: '钢琴',   emoji: '🎹', cat: 'toys' },
  { id: 'game',       en: 'game',       zh: '游戏',   emoji: '🎮', cat: 'toys' },
  { id: 'teddybear',  en: 'teddy bear', zh: '泰迪熊', emoji: '🧸', cat: 'toys' },
  // 交通
  { id: 'car',        en: 'car',        zh: '汽车',     emoji: '🚗', cat: 'transport' },
  { id: 'bus',        en: 'bus',        zh: '公共汽车', emoji: '🚌', cat: 'transport' },
  { id: 'train',      en: 'train',      zh: '火车',     emoji: '🚆', cat: 'transport' },
  { id: 'plane',      en: 'plane',      zh: '飞机',     emoji: '✈️', cat: 'transport' },
  { id: 'boat',       en: 'boat',       zh: '小船',     emoji: '⛵', cat: 'transport' },
  { id: 'bike',       en: 'bike',       zh: '自行车',   emoji: '🚲', cat: 'transport' },
  { id: 'helicopter', en: 'helicopter', zh: '直升机',   emoji: '🚁', cat: 'transport' },
  { id: 'ship',       en: 'ship',       zh: '轮船',     emoji: '🚢', cat: 'transport' },
  // 动作
  { id: 'run',   en: 'run',   zh: '跑',   emoji: '🏃', cat: 'actions', sentence: 'The children run across the field.' },
  { id: 'jump',  en: 'jump',  zh: '跳',   emoji: '🤸', cat: 'actions', sentence: 'Kangaroos can jump very high.' },
  { id: 'swim',  en: 'swim',  zh: '游泳', emoji: '🏊', cat: 'actions', sentence: 'Dolphins swim in the sea.' },
  { id: 'sing',  en: 'sing',  zh: '唱歌', emoji: '🎤', cat: 'actions' },
  { id: 'dance', en: 'dance', zh: '跳舞', emoji: '💃', cat: 'actions' },
  { id: 'read',  en: 'read',  zh: '读书', emoji: '📖', cat: 'actions' },
  { id: 'draw',  en: 'draw',  zh: '画画', emoji: '🖍️', cat: 'actions' },
  { id: 'sleep', en: 'sleep', zh: '睡觉', emoji: '😴', cat: 'actions' },
  { id: 'eat',   en: 'eat',   zh: '吃',   emoji: '🍽️', cat: 'actions' },
  { id: 'drink', en: 'drink', zh: '喝',   emoji: '🥤', cat: 'actions' },
].map((w) => ({ ...w, lvl: 'starters' }));

const MOVERS = [
  // 动物
  { id: 'dolphin',  en: 'dolphin',  zh: '海豚', emoji: '🐬', cat: 'animals', sentence: 'Dolphins live in the sea.' },
  { id: 'shark',    en: 'shark',    zh: '鲨鱼', emoji: '🦈', cat: 'animals', sentence: 'A shark has sharp teeth.' },
  { id: 'whale',    en: 'whale',    zh: '鲸鱼', emoji: '🐳', cat: 'animals', sentence: 'The whale is very big.' },
  { id: 'penguin',  en: 'penguin',  zh: '企鹅', emoji: '🐧', cat: 'animals', sentence: "Penguins can't fly." },
  { id: 'kangaroo', en: 'kangaroo', zh: '袋鼠', emoji: '🦘', cat: 'animals', sentence: 'A kangaroo can jump high.' },
  { id: 'bear',     en: 'bear',     zh: '熊',   emoji: '🐻', cat: 'animals', sentence: 'The bear likes honey.' },
  { id: 'bat',      en: 'bat',      zh: '蝙蝠', emoji: '🦇', cat: 'animals', sentence: 'A bat sleeps in the day.' },
  { id: 'parrot',   en: 'parrot',   zh: '鹦鹉', emoji: '🦜', cat: 'animals', sentence: 'My parrot can talk.' },
  { id: 'snail',    en: 'snail',    zh: '蜗牛', emoji: '🐌', cat: 'animals', sentence: 'A snail is very slow.' },
  { id: 'fly',      en: 'fly',      zh: '苍蝇', emoji: '🪰', cat: 'animals', sentence: 'A fly is on the window.' },
  // 地点
  { id: 'hospital',    en: 'hospital',      zh: '医院',     emoji: '🏥', cat: 'places', sentence: 'The doctor works in a hospital.' },
  { id: 'library',     en: 'library',       zh: '图书馆',   emoji: '📚', cat: 'places', sentence: 'We read books in the library.' },
  { id: 'cinema',      en: 'cinema',        zh: '电影院',   emoji: '🎬', cat: 'places', sentence: "Let's watch a film at the cinema." },
  { id: 'supermarket', en: 'supermarket',   zh: '超市',     emoji: '🛒', cat: 'places', sentence: 'Mum buys food at the supermarket.' },
  { id: 'farm',        en: 'farm',          zh: '农场',     emoji: '🌾', cat: 'places', sentence: 'There are cows on the farm.' },
  { id: 'park',        en: 'park',          zh: '公园',     emoji: '⛲', cat: 'places', sentence: 'We play in the park.' },
  { id: 'beach',       en: 'beach',         zh: '海滩',     emoji: '🏖️', cat: 'places', sentence: 'We make sandcastles on the beach.' },
  { id: 'pool',        en: 'swimming pool', zh: '游泳池',   emoji: '🏊', cat: 'places', sentence: 'I swim in the swimming pool.' },
  { id: 'city',        en: 'city',          zh: '城市',     emoji: '🏙️', cat: 'places', sentence: 'The city is big and busy.' },
  { id: 'village',     en: 'village',       zh: '村庄',     emoji: '🏘️', cat: 'places', sentence: 'My grandma lives in a village.' },
  { id: 'cafe',        en: 'cafe',          zh: '咖啡馆',   emoji: '🫖', cat: 'places', sentence: 'We drink juice at the cafe.' },
  { id: 'busstop',     en: 'bus station',   zh: '公交车站', emoji: '🚏', cat: 'places', sentence: 'The bus leaves from the bus station.' },
  // 天气
  { id: 'sunny',   en: 'sunny',   zh: '晴朗的', emoji: '☀️', cat: 'weather', sentence: "It's sunny today. Let's go out!" },
  { id: 'cloudy',  en: 'cloudy',  zh: '多云的', emoji: '⛅', cat: 'weather', sentence: 'The sky is grey and cloudy.' },
  { id: 'windy',   en: 'windy',   zh: '刮风的', emoji: '🌬️', cat: 'weather', sentence: "It's windy. My hat flew away!" },
  { id: 'rainbow', en: 'rainbow', zh: '彩虹',   emoji: '🌈', cat: 'weather', sentence: 'Look! A rainbow after the rain.' },
  { id: 'storm',   en: 'storm',   zh: '暴风雨', emoji: '⛈️', cat: 'weather', sentence: 'The storm is loud at night.' },
  { id: 'hot',     en: 'hot',     zh: '热的',   emoji: '🥵', cat: 'weather', sentence: "It's hot in summer." },
  { id: 'cold',    en: 'cold',    zh: '冷的',   emoji: '🥶', cat: 'weather', sentence: "It's cold in winter." },
  { id: 'snowy',   en: 'snowy',   zh: '下雪的', emoji: '☃️', cat: 'weather', sentence: "It's snowy. Let's make a snowman!" },
  // 形容词
  { id: 'happy',     en: 'happy',     zh: '开心的', emoji: '😄', cat: 'adjectives', sentence: "I'm happy on my birthday." },
  { id: 'sad',       en: 'sad',       zh: '难过的', emoji: '😢', cat: 'adjectives', sentence: 'He is sad because he lost his toy.' },
  { id: 'angry',     en: 'angry',     zh: '生气的', emoji: '😠', cat: 'adjectives', sentence: 'Dad is angry about the mess.' },
  { id: 'tired',     en: 'tired',     zh: '累的',   emoji: '🥱', cat: 'adjectives', sentence: "I'm tired after school." },
  { id: 'hungry',    en: 'hungry',    zh: '饿的',   emoji: '😋', cat: 'adjectives', sentence: "I'm hungry. Can I have a sandwich?" },
  { id: 'brave',     en: 'brave',     zh: '勇敢的', emoji: '🦸', cat: 'adjectives', sentence: 'The brave girl helps the cat.' },
  { id: 'clever',    en: 'clever',    zh: '聪明的', emoji: '🧠', cat: 'adjectives', sentence: 'She is clever at maths.' },
  { id: 'strong',    en: 'strong',    zh: '强壮的', emoji: '💪', cat: 'adjectives', sentence: 'An elephant is very strong.' },
  { id: 'quick',     en: 'quick',     zh: '快的',   emoji: '⚡', cat: 'adjectives', sentence: 'The rabbit is quick.' },
  { id: 'quiet',     en: 'quiet',     zh: '安静的', emoji: '🤫', cat: 'adjectives', sentence: 'Please be quiet in the library.' },
  { id: 'beautiful', en: 'beautiful', zh: '美丽的', emoji: '🌺', cat: 'adjectives', sentence: 'The flowers are beautiful.' },
  { id: 'funny',     en: 'funny',     zh: '搞笑的', emoji: '😆', cat: 'adjectives', sentence: 'The clown is funny.' },
  // 动作
  { id: 'climb',  en: 'climb',  zh: '爬',     emoji: '🧗', cat: 'actions', sentence: 'Monkeys climb trees.' },
  { id: 'ride',   en: 'ride',   zh: '骑',     emoji: '🚴', cat: 'actions', sentence: 'I ride my bike to school.' },
  { id: 'cook',   en: 'cook',   zh: '做饭',   emoji: '👩‍🍳', cat: 'actions', sentence: 'Dad cooks dinner every day.' },
  { id: 'clean',  en: 'clean',  zh: '打扫',   emoji: '🧹', cat: 'actions', sentence: 'I clean my room on Sunday.' },
  { id: 'wash',   en: 'wash',   zh: '洗',     emoji: '🧼', cat: 'actions', sentence: 'Wash your hands before lunch.' },
  { id: 'buy',    en: 'buy',    zh: '买',     emoji: '🛍️', cat: 'actions', sentence: "Let's buy some apples." },
  { id: 'build',  en: 'build',  zh: '建造',   emoji: '🧱', cat: 'actions', sentence: 'We build a sandcastle.' },
  { id: 'paint',  en: 'paint',  zh: '涂颜色', emoji: '🖌️', cat: 'actions', sentence: 'I paint a picture of my cat.' },
  { id: 'listen', en: 'listen', zh: '听',     emoji: '🎧', cat: 'actions', sentence: 'Listen to the teacher.' },
  { id: 'speak',  en: 'speak',  zh: '说',     emoji: '🗣️', cat: 'actions', sentence: 'Can you speak English?' },
  { id: 'write',  en: 'write',  zh: '写',     emoji: '✍️', cat: 'actions', sentence: 'I write my name on the book.' },
  { id: 'drive',  en: 'drive',  zh: '开车',   emoji: '🚙', cat: 'actions', sentence: 'Mum drives a blue car.' },
  // 时间
  { id: 'morning',   en: 'morning',   zh: '早上', emoji: '🌅', cat: 'time', sentence: 'I get up in the morning.' },
  { id: 'afternoon', en: 'afternoon', zh: '下午', emoji: '🌤️', cat: 'time', sentence: 'We play games in the afternoon.' },
  { id: 'evening',   en: 'evening',   zh: '傍晚', emoji: '🌇', cat: 'time', sentence: 'We have dinner in the evening.' },
  { id: 'night',     en: 'night',     zh: '夜晚', emoji: '🌃', cat: 'time', sentence: 'The stars come out at night.' },
  { id: 'week',      en: 'week',      zh: '星期', emoji: '📅', cat: 'time', sentence: 'There are seven days in a week.' },
  { id: 'weekend',   en: 'weekend',   zh: '周末', emoji: '🎉', cat: 'time', sentence: 'We go to the park at the weekend.' },
  { id: 'today',     en: 'today',     zh: '今天', emoji: '📆', cat: 'time', sentence: 'Today is my birthday!' },
  { id: 'yesterday', en: 'yesterday', zh: '昨天', emoji: '⏪', cat: 'time', sentence: 'Yesterday I went to the zoo.' },
  // 食物
  { id: 'cheese',     en: 'cheese',     zh: '奶酪',   emoji: '🧀', cat: 'food', sentence: 'The mouse likes cheese.' },
  { id: 'soup',       en: 'soup',       zh: '汤',     emoji: '🍲', cat: 'food', sentence: 'The soup is hot.' },
  { id: 'salad',      en: 'salad',      zh: '沙拉',   emoji: '🥗', cat: 'food', sentence: 'I eat salad with tomatoes.' },
  { id: 'sandwich',   en: 'sandwich',   zh: '三明治', emoji: '🥪', cat: 'food', sentence: 'I have a sandwich for lunch.' },
  { id: 'noodles',    en: 'noodles',    zh: '面条',   emoji: '🍜', cat: 'food', sentence: 'I love noodles!' },
  { id: 'pancake',    en: 'pancake',    zh: '煎饼',   emoji: '🥞', cat: 'food', sentence: 'We eat pancakes for breakfast.' },
  { id: 'tea',        en: 'tea',        zh: '茶',     emoji: '🍵', cat: 'food', sentence: 'Grandpa drinks tea.' },
  { id: 'coffee',     en: 'coffee',     zh: '咖啡',   emoji: '☕', cat: 'food', sentence: 'Mum drinks coffee in the morning.' },
  { id: 'vegetables', en: 'vegetables', zh: '蔬菜',   emoji: '🥦', cat: 'food', sentence: 'Eat your vegetables!' },
  { id: 'milkshake',  en: 'milkshake',  zh: '奶昔',   emoji: '🧋', cat: 'food', sentence: 'I like banana milkshake.' },
  // 人物
  { id: 'aunt',   en: 'aunt',   zh: '阿姨',       emoji: '👩‍🦰', cat: 'people', sentence: "My aunt is my mum's sister." },
  { id: 'uncle',  en: 'uncle',  zh: '叔叔',       emoji: '👨‍🦱', cat: 'people', sentence: "My uncle is my dad's brother." },
  { id: 'cousin', en: 'cousin', zh: '表兄弟姐妹', emoji: '🧑‍🤝‍🧑', cat: 'people', sentence: 'I play with my cousin.' },
  { id: 'doctor', en: 'doctor', zh: '医生',       emoji: '👩‍⚕️', cat: 'people', sentence: 'The doctor helps sick people.' },
  { id: 'nurse',  en: 'nurse',  zh: '护士',       emoji: '🧑‍⚕️', cat: 'people', sentence: 'The nurse works at the hospital.' },
  { id: 'farmer', en: 'farmer', zh: '农民',       emoji: '👨‍🌾', cat: 'people', sentence: 'The farmer feeds the animals.' },
  // 学校
  { id: 'dictionary', en: 'dictionary', zh: '词典', emoji: '📕', cat: 'school', sentence: 'I look up words in the dictionary.' },
  { id: 'homework',   en: 'homework',   zh: '作业', emoji: '📝', cat: 'school', sentence: 'I do my homework after school.' },
  { id: 'playground', en: 'playground', zh: '操场', emoji: '🎠', cat: 'school', sentence: 'Children play in the playground.' },
  { id: 'mistake',    en: 'mistake',    zh: '错误', emoji: '❌', cat: 'school', sentence: "It's OK to make a mistake." },
  { id: 'comic',      en: 'comic',      zh: '漫画', emoji: '🗯️', cat: 'school', sentence: 'I read a funny comic.' },
  { id: 'lesson',     en: 'lesson',     zh: '课',   emoji: '📓', cat: 'school', sentence: 'The English lesson is fun.' },
  // 大自然
  { id: 'island',   en: 'island',   zh: '岛',   emoji: '🏝️', cat: 'nature', sentence: 'The island is in the blue sea.' },
  { id: 'lake',     en: 'lake',     zh: '湖',   emoji: '🏞️', cat: 'nature', sentence: 'We row a boat on the lake.' },
  { id: 'river',    en: 'river',    zh: '河',   emoji: '🛶', cat: 'nature', sentence: 'The river is long and wide.' },
  { id: 'mountain', en: 'mountain', zh: '山',   emoji: '⛰️', cat: 'nature', sentence: 'The mountain is very high.' },
  { id: 'forest',   en: 'forest',   zh: '森林', emoji: '🌲', cat: 'nature', sentence: 'Many trees grow in the forest.' },
  { id: 'jungle',   en: 'jungle',   zh: '丛林', emoji: '🌴', cat: 'nature', sentence: 'Monkeys live in the jungle.' },
  { id: 'leaf',     en: 'leaf',     zh: '叶子', emoji: '🍃', cat: 'nature', forms: ['leaf', 'leaves'], sentence: 'One leaf falls; two leaves fall.' },
  { id: 'grass',    en: 'grass',    zh: '草',   emoji: '🌿', cat: 'nature', sentence: 'The grass is soft and green.' },
  // 服装
  { id: 'coat',     en: 'coat',     zh: '大衣', emoji: '🥼', cat: 'clothes', sentence: "Put on your coat. It's cold!" },
  { id: 'scarf',    en: 'scarf',    zh: '围巾', emoji: '🧣', cat: 'clothes', sentence: 'Grandma made a red scarf for me.' },
  { id: 'sweater',  en: 'sweater',  zh: '毛衣', emoji: '🧶', cat: 'clothes', sentence: 'I wear a warm sweater in winter.' },
  { id: 'swimsuit', en: 'swimsuit', zh: '泳衣', emoji: '🩱', cat: 'clothes', sentence: 'I wear my swimsuit at the pool.' },
  { id: 'helmet',   en: 'helmet',   zh: '头盔', emoji: '⛑️', cat: 'clothes', sentence: 'Wear a helmet when you ride a bike.' },
  { id: 'gloves',   en: 'gloves',   zh: '手套', emoji: '🧤', cat: 'clothes', sentence: 'My gloves keep my hands warm.' },
  // 交通
  { id: 'tram',      en: 'tram',      zh: '电车',   emoji: '🚊', cat: 'transport', sentence: 'We take a tram in the city.' },
  { id: 'tractor',   en: 'tractor',   zh: '拖拉机', emoji: '🚜', cat: 'transport', sentence: 'The farmer drives a tractor.' },
  { id: 'lorry',     en: 'lorry',     zh: '卡车',   emoji: '🚚', cat: 'transport', sentence: 'A big lorry carries the boxes.' },
  { id: 'driver',    en: 'driver',    zh: '司机',   emoji: '🚕', cat: 'transport', sentence: 'The bus driver says hello.' },
  { id: 'machine',   en: 'machine',   zh: '机器',   emoji: '⚙️', cat: 'transport', sentence: 'This machine washes clothes.' },
  { id: 'motorbike', en: 'motorbike', zh: '摩托车', emoji: '🏍️', cat: 'transport', sentence: 'Uncle rides a motorbike.' },
].map((w) => ({ ...w, lvl: 'movers' }));

const FLYERS = [
  // 动物
  { id: 'camel',     en: 'camel',     zh: '骆驼',   emoji: '🐫', cat: 'animals', sentence: 'A camel walks in the desert.' },
  { id: 'eagle',     en: 'eagle',     zh: '老鹰',   emoji: '🦅', cat: 'animals', sentence: 'An eagle flies very high.' },
  { id: 'owl',       en: 'owl',       zh: '猫头鹰', emoji: '🦉', cat: 'animals', sentence: 'An owl wakes up at night.' },
  { id: 'octopus',   en: 'octopus',   zh: '章鱼',   emoji: '🐙', cat: 'animals', sentence: 'An octopus has eight legs.' },
  { id: 'butterfly', en: 'butterfly', zh: '蝴蝶',   emoji: '🦋', cat: 'animals', sentence: 'A butterfly lands on the flower.' },
  { id: 'dinosaur',  en: 'dinosaur',  zh: '恐龙',   emoji: '🦕', cat: 'animals', sentence: 'Dinosaurs lived long, long ago.' },
  { id: 'swan',      en: 'swan',      zh: '天鹅',   emoji: '🦢', cat: 'animals', sentence: 'A white swan swims on the lake.' },
  { id: 'puppy',     en: 'puppy',     zh: '小狗',   emoji: '🐕', cat: 'animals', sentence: 'The puppy runs after the ball.' },
  { id: 'kitten',    en: 'kitten',    zh: '小猫',   emoji: '🐈', cat: 'animals', sentence: 'The kitten sleeps in a basket.' },
  { id: 'insect',    en: 'insect',    zh: '昆虫',   emoji: '🐛', cat: 'animals', sentence: 'A bee is a small insect.' },
  // 地点
  { id: 'airport',       en: 'airport',        zh: '机场',   emoji: '🛫', cat: 'places', sentence: 'We catch our plane at the airport.' },
  { id: 'castle',        en: 'castle',         zh: '城堡',   emoji: '🏰', cat: 'places', sentence: 'The king lives in a castle.' },
  { id: 'museum',        en: 'museum',         zh: '博物馆', emoji: '🏛️', cat: 'places', sentence: 'We saw dinosaur bones at the museum.' },
  { id: 'hotel',         en: 'hotel',          zh: '酒店',   emoji: '🏨', cat: 'places', sentence: 'We stayed at a hotel by the sea.' },
  { id: 'restaurant',    en: 'restaurant',     zh: '餐厅',   emoji: '🍽️', cat: 'places', sentence: 'We had dinner at a restaurant.' },
  { id: 'postoffice',    en: 'post office',    zh: '邮局',   emoji: '📮', cat: 'places', sentence: 'I send a letter at the post office.' },
  { id: 'stadium',       en: 'stadium',        zh: '体育场', emoji: '🏟️', cat: 'places', sentence: 'The football match is at the stadium.' },
  { id: 'factory',       en: 'factory',        zh: '工厂',   emoji: '🏭', cat: 'places', sentence: 'Cars are made in a factory.' },
  { id: 'bridge',        en: 'bridge',         zh: '桥',     emoji: '🌉', cat: 'places', sentence: 'The bridge goes over the river.' },
  { id: 'desert',        en: 'desert',         zh: '沙漠',   emoji: '🏜️', cat: 'places', sentence: 'The desert is hot and dry.' },
  { id: 'university',    en: 'university',     zh: '大学',   emoji: '🎓', cat: 'places', sentence: 'My cousin studies at university.' },
  { id: 'theatre',       en: 'theatre',        zh: '剧院',   emoji: '🎭', cat: 'places', sentence: 'We watched a play at the theatre.' },
  // 人物
  { id: 'pilot',         en: 'pilot',          zh: '飞行员', emoji: '👨‍✈️', cat: 'people', sentence: 'The pilot flies the plane.' },
  { id: 'policeofficer', en: 'police officer', zh: '警察',   emoji: '👮', cat: 'people', sentence: 'The police officer helps people.' },
  { id: 'firefighter',   en: 'firefighter',    zh: '消防员', emoji: '🧑‍🚒', cat: 'people', sentence: 'The firefighter is very brave.' },
  { id: 'singer',        en: 'singer',         zh: '歌手',   emoji: '👨‍🎤', cat: 'people', sentence: 'The singer has a beautiful voice.' },
  { id: 'artist',        en: 'artist',         zh: '画家',   emoji: '👩‍🎨', cat: 'people', sentence: 'The artist paints pictures.' },
  { id: 'engineer',      en: 'engineer',       zh: '工程师', emoji: '👷', cat: 'people', sentence: 'The engineer builds bridges.' },
  { id: 'king',          en: 'king',           zh: '国王',   emoji: '🤴', cat: 'people', sentence: 'The king wears a gold crown.' },
  { id: 'queen',         en: 'queen',          zh: '女王',   emoji: '👸', cat: 'people', sentence: 'The queen lives in the palace.' },
  // 大自然与太空
  { id: 'planet',    en: 'planet',    zh: '行星', emoji: '🪐', cat: 'nature', sentence: 'Mars is a red planet.' },
  { id: 'rocket',    en: 'rocket',    zh: '火箭', emoji: '🚀', cat: 'nature', sentence: 'The rocket flies to the moon.' },
  { id: 'earth',     en: 'earth',     zh: '地球', emoji: '🌍', cat: 'nature', sentence: 'The Earth is our home.' },
  { id: 'space',     en: 'space',     zh: '太空', emoji: '🌌', cat: 'nature', sentence: 'Astronauts travel into space.' },
  { id: 'lightning', en: 'lightning', zh: '闪电', emoji: '🌩️', cat: 'nature', sentence: 'Lightning lights up the sky.' },
  { id: 'fog',       en: 'fog',       zh: '雾',   emoji: '🌫️', cat: 'nature', sentence: "We can't see far in the fog." },
  { id: 'ocean',     en: 'ocean',     zh: '海洋', emoji: '🌊', cat: 'nature', sentence: 'Whales live in the ocean.' },
  { id: 'fire',      en: 'fire',      zh: '火',   emoji: '🔥', cat: 'nature', sentence: "Don't play with fire!" },
  // 食物
  { id: 'biscuit',    en: 'biscuit',    zh: '饼干', emoji: '🍪', cat: 'food', sentence: 'I have a biscuit with my milk.' },
  { id: 'butter',     en: 'butter',     zh: '黄油', emoji: '🧈', cat: 'food', sentence: 'Put some butter on the bread.' },
  { id: 'salt',       en: 'salt',       zh: '盐',   emoji: '🧂', cat: 'food', sentence: "Don't add too much salt." },
  { id: 'pepper',     en: 'pepper',     zh: '胡椒', emoji: '🌶️', cat: 'food', sentence: 'Pepper makes me sneeze!' },
  { id: 'sugar',      en: 'sugar',      zh: '糖',   emoji: '🍬', cat: 'food', sentence: 'Sugar makes the cake sweet.' },
  { id: 'snack',      en: 'snack',      zh: '零食', emoji: '🍿', cat: 'food', sentence: 'I have a snack after school.' },
  { id: 'spoon',      en: 'spoon',      zh: '勺子', emoji: '🥄', cat: 'food', sentence: 'I eat soup with a spoon.' },
  { id: 'fork',       en: 'fork',       zh: '叉子', emoji: '🍴', cat: 'food', sentence: 'Use a knife and fork.' },
  { id: 'knife',      en: 'knife',      zh: '刀',   emoji: '🔪', cat: 'food', sentence: 'Cut the apple with a knife.' },
  { id: 'chopsticks', en: 'chopsticks', zh: '筷子', emoji: '🥢', cat: 'food', sentence: 'We eat rice with chopsticks.' },
  // 物品
  { id: 'scissors',  en: 'scissors',  zh: '剪刀',   emoji: '✂️', cat: 'objects', sentence: 'Cut the paper with scissors.' },
  { id: 'map',       en: 'map',       zh: '地图',   emoji: '🗺️', cat: 'objects', sentence: 'The map shows us the way.' },
  { id: 'flag',      en: 'flag',      zh: '旗子',   emoji: '🚩', cat: 'objects', sentence: 'The flag is red and yellow.' },
  { id: 'key',       en: 'key',       zh: '钥匙',   emoji: '🔑', cat: 'objects', sentence: 'I open the door with a key.' },
  { id: 'letter',    en: 'letter',    zh: '信',     emoji: '✉️', cat: 'objects', sentence: 'I write a letter to my friend.' },
  { id: 'postcard',  en: 'postcard',  zh: '明信片', emoji: '💌', cat: 'objects', sentence: 'Send me a postcard from your trip!' },
  { id: 'newspaper', en: 'newspaper', zh: '报纸',   emoji: '🗞️', cat: 'objects', sentence: 'Dad reads the newspaper every morning.' },
  { id: 'prize',     en: 'prize',     zh: '奖品',   emoji: '🏆', cat: 'objects', sentence: 'She won first prize in the race.' },
  { id: 'drum',      en: 'drum',      zh: '鼓',     emoji: '🥁', cat: 'objects', sentence: 'He plays the drum loudly.' },
  { id: 'violin',    en: 'violin',    zh: '小提琴', emoji: '🎻', cat: 'objects', sentence: 'She plays the violin beautifully.' },
  { id: 'tent',      en: 'tent',      zh: '帐篷',   emoji: '⛺', cat: 'objects', sentence: 'We sleep in a tent outside.' },
  { id: 'suitcase',  en: 'suitcase',  zh: '行李箱', emoji: '🧳', cat: 'objects', sentence: 'Pack your suitcase for the holiday.' },
  // 形容词
  { id: 'bored',     en: 'bored',     zh: '无聊的', emoji: '😑', cat: 'adjectives', sentence: "I'm bored. Let's play a game!" },
  { id: 'brilliant', en: 'brilliant', zh: '超棒的', emoji: '🤩', cat: 'adjectives', sentence: 'Your idea is brilliant!' },
  { id: 'friendly',  en: 'friendly',  zh: '友好的', emoji: '🤗', cat: 'adjectives', sentence: 'Our new neighbour is friendly.' },
  { id: 'heavy',     en: 'heavy',     zh: '重的',   emoji: '🏋️', cat: 'adjectives', sentence: 'This box is too heavy for me.' },
  { id: 'lucky',     en: 'lucky',     zh: '幸运的', emoji: '🍀', cat: 'adjectives', sentence: "I found a coin. I'm so lucky!" },
  { id: 'nervous',   en: 'nervous',   zh: '紧张的', emoji: '😰', cat: 'adjectives', sentence: 'I feel nervous before the exam.' },
  { id: 'rich',      en: 'rich',      zh: '富有的', emoji: '💰', cat: 'adjectives', sentence: 'The rich man has a big house.' },
  { id: 'secret',    en: 'secret',    zh: '秘密',   emoji: '🤐', cat: 'adjectives', sentence: 'Can you keep a secret?' },
  // 玩具运动（爱好）
  { id: 'ski',       en: 'ski',       zh: '滑雪',     emoji: '⛷️', cat: 'toys', sentence: 'We ski down the snowy hill.' },
  { id: 'chess',     en: 'chess',     zh: '国际象棋', emoji: '♟️', cat: 'toys', sentence: 'Grandpa taught me to play chess.' },
  { id: 'golf',      en: 'golf',      zh: '高尔夫',   emoji: '⛳', cat: 'toys', sentence: 'Dad plays golf on Sundays.' },
  { id: 'juggle',    en: 'juggle',    zh: '杂耍',     emoji: '🤹', cat: 'toys', sentence: 'The clown can juggle five balls.' },
  { id: 'fireworks', en: 'fireworks', zh: '烟花',     emoji: '🎆', cat: 'toys', sentence: 'We watch fireworks at New Year.' },
  { id: 'camping',   en: 'camping',   zh: '露营',     emoji: '🏕️', cat: 'toys', sentence: 'We go camping in the forest.' },
  { id: 'fishing',   en: 'fishing',   zh: '钓鱼',     emoji: '🎣', cat: 'toys', sentence: 'We go fishing with grandpa.' },
  { id: 'sledge',    en: 'sledge',    zh: '雪橇',     emoji: '🛷', cat: 'toys', sentence: 'We ride a sledge on the snow.' },
].map((w) => ({ ...w, lvl: 'flyers' }));

// Power Up 2 全量对齐补充词（Movers 级），按课本单元学习
const MOVERS_PU2 = [
  // Welcome: 日常起居 + 星期
  { id: 'getdressed',    en: 'get dressed',    zh: '穿衣服',   emoji: '👕', cat: 'actions', sentence: 'I get dressed after breakfast.' },
  { id: 'getup',         en: 'get up',         zh: '起床',     emoji: '⏫', cat: 'actions', sentence: 'I get up at seven.' },
  { id: 'haveshower',    en: 'have a shower',  zh: '洗澡',     emoji: '🚿', cat: 'actions', sentence: 'I have a shower every evening.' },
  { id: 'havebreakfast', en: 'have breakfast', zh: '吃早饭',   emoji: '🥐', cat: 'actions', sentence: 'We have breakfast at eight.' },
  { id: 'wakeup',        en: 'wake up',        zh: '醒来',     emoji: '⏰', cat: 'actions', sentence: "Wake up! It's Monday." },
  { id: 'brushteeth',    en: 'brush my teeth', zh: '刷牙',     emoji: '🪥', cat: 'actions', sentence: 'I brush my teeth every day.' },
  { id: 'cleanteeth',    en: 'clean my teeth', zh: '清洁牙齿', emoji: '😁', cat: 'actions', sentence: 'I clean my teeth at night.' },
  { id: 'catchbus',      en: 'catch the bus',  zh: '赶公交车', emoji: '🚌', cat: 'actions', sentence: 'We run to catch the bus.' },
  { id: 'walkschool',    en: 'walk to school', zh: '步行上学', emoji: '🚶', cat: 'actions', sentence: 'I walk to school with dad.' },
  { id: 'monday',    en: 'Monday',    zh: '星期一', emoji: '🌙', cat: 'time', sentence: 'On Monday I have a piano lesson.' },
  { id: 'tuesday',   en: 'Tuesday',   zh: '星期二', emoji: '🔥', cat: 'time', sentence: 'We play football on Tuesday.' },
  { id: 'wednesday', en: 'Wednesday', zh: '星期三', emoji: '💧', cat: 'time', sentence: 'Wednesday is the middle of the week.' },
  { id: 'thursday',  en: 'Thursday',  zh: '星期四', emoji: '🌳', cat: 'time', sentence: 'On Thursday we go swimming.' },
  { id: 'friday',    en: 'Friday',    zh: '星期五', emoji: '✨', cat: 'time', sentence: 'Friday is my favourite day!' },
  { id: 'saturday',  en: 'Saturday',  zh: '星期六', emoji: '🪐', cat: 'time', sentence: 'On Saturday we visit grandma.' },
  { id: 'sunday',    en: 'Sunday',    zh: '星期日', emoji: '☀️', cat: 'time', sentence: 'We rest at home on Sunday.' },
  { id: 'always', en: 'always', zh: '总是', emoji: '🔁', cat: 'time', sentence: 'I always wash my hands.' },
  { id: 'never',  en: 'never',  zh: '从不', emoji: '🚫', cat: 'time', sentence: 'I never go to bed late.' },
  // Unit 1: 回归自然
  { id: 'field',   en: 'field',   zh: '田野',   emoji: '🌻', cat: 'nature', sentence: 'Sheep eat grass in the field.' },
  { id: 'ground',  en: 'ground',  zh: '地面',   emoji: '🟫', cat: 'nature', sentence: 'The ball is on the ground.' },
  { id: 'rock',    en: 'rock',    zh: '岩石',   emoji: '🪨', cat: 'nature', sentence: 'A crab hides under the rock.' },
  { id: 'blanket', en: 'blanket', zh: '毯子',   emoji: '🛌', cat: 'home',   sentence: 'The baby sleeps under a blanket.' },
  { id: 'picnic',  en: 'picnic',  zh: '野餐',   emoji: '🧺', cat: 'food',   sentence: 'We have a picnic by the lake.' },
  { id: 'loud',    en: 'loud',    zh: '大声的', emoji: '📢', cat: 'adjectives', sentence: 'The music is too loud!' },
  { id: 'slow',    en: 'slow',    zh: '慢的',   emoji: '🐢', cat: 'adjectives', sentence: 'A snail is very slow.' },
  { id: 'path',    en: 'path',    zh: '小路',   emoji: '🛤️', cat: 'nature', sentence: 'We walk along the path.' },
  { id: 'plant',   en: 'plant',   zh: '植物',   emoji: '🪴', cat: 'nature', sentence: 'I water my plant every day.' },
  // Unit 2: 休闲时光
  { id: 'goshopping',  en: 'go shopping',     zh: '去购物',     emoji: '🛍️', cat: 'actions', sentence: 'We go shopping at the weekend.' },
  { id: 'goskating',   en: 'go skating',      zh: '去滑冰',     emoji: '⛸️', cat: 'actions', sentence: "Let's go skating on the ice!" },
  { id: 'listenmusic', en: 'listen to music', zh: '听音乐',     emoji: '🎵', cat: 'actions', sentence: 'I listen to music in my room.' },
  { id: 'listencd',    en: 'listen to a CD',  zh: '听CD',       emoji: '💿', cat: 'actions', sentence: 'We listen to a CD in the car.' },
  { id: 'watchdvd',    en: 'watch a DVD',     zh: '看DVD',      emoji: '📀', cat: 'actions', sentence: "Let's watch a DVD tonight." },
  { id: 'watchfilm',   en: 'watch a film',    zh: '看电影',     emoji: '🎥', cat: 'actions', sentence: 'We watch a film at the cinema.' },
  { id: 'readcomic',   en: 'read a comic',    zh: '看漫画',     emoji: '💭', cat: 'actions', sentence: 'I read a comic in bed.' },
  { id: 'writeemail',  en: 'write an email',  zh: '写电子邮件', emoji: '📧', cat: 'actions', sentence: 'I write an email to my cousin.' },
  { id: 'playgames',   en: 'play games',      zh: '玩游戏',     emoji: '🕹️', cat: 'actions', sentence: 'We play games after dinner.' },
  { id: 'often',     en: 'often',     zh: '经常',   emoji: '📈', cat: 'time', sentence: 'I often help my mum.' },
  { id: 'sometimes', en: 'sometimes', zh: '有时',   emoji: '🎲', cat: 'time', sentence: 'Sometimes we eat pizza.' },
  { id: 'hobby',     en: 'hobby',     zh: '爱好',   emoji: '🧩', cat: 'objects', sentence: 'Drawing is my hobby.' },
  { id: 'camera',    en: 'camera',    zh: '照相机', emoji: '📷', cat: 'objects', sentence: 'Dad takes photos with his camera.' },
  { id: 'photo',     en: 'photo',     zh: '照片',   emoji: '🖼️', cat: 'objects', sentence: 'This is a photo of my cat.' },
  // Unit 3: 人物与外貌
  { id: 'clown',     en: 'clown',     zh: '小丑',     emoji: '🤡', cat: 'people', sentence: 'The clown makes everyone laugh.' },
  { id: 'cookperson', en: 'cook',      zh: '厨师',     emoji: '🧑‍🍳', cat: 'people', pos: 'noun', sentence: 'The cook makes soup in the kitchen.' },
  { id: 'dentist',   en: 'dentist',   zh: '牙医',     emoji: '🦷', cat: 'people', sentence: 'The dentist looks at my teeth.' },
  { id: 'filmstar',  en: 'film star', zh: '电影明星', emoji: '🎬', cat: 'people', sentence: 'The film star waves to everyone.' },
  { id: 'pirate',    en: 'pirate',    zh: '海盗',     emoji: '🏴‍☠️', cat: 'people', sentence: 'The pirate looks for treasure.' },
  { id: 'popstar',   en: 'pop star',  zh: '流行歌手', emoji: '🎤', cat: 'people', sentence: 'The pop star sings on stage.' },
  { id: 'beard',     en: 'beard',     zh: '胡子',     emoji: '🧔', cat: 'people', sentence: 'Santa has a long white beard.' },
  { id: 'moustache', en: 'moustache', zh: '八字胡',   emoji: '🥸', cat: 'people', sentence: 'Grandpa has a funny moustache.' },
  { id: 'blonde',   en: 'blonde',   zh: '金发的', emoji: '👱', cat: 'adjectives', sentence: 'My friend has blonde hair.' },
  { id: 'curly',    en: 'curly',    zh: '卷曲的', emoji: '🌀', cat: 'adjectives', sentence: 'The baby has curly hair.' },
  { id: 'fair',     en: 'fair',     zh: '浅色的', emoji: '🤍', cat: 'adjectives', sentence: 'She has fair hair.' },
  { id: 'fat',      en: 'fat',      zh: '胖的',   emoji: '🍩', cat: 'adjectives', sentence: 'The cat is fat and fluffy.' },
  { id: 'short',    en: 'short',    zh: '矮的',   emoji: '🍄', cat: 'adjectives', sentence: 'The mouse is short and small.' },
  { id: 'straight', en: 'straight', zh: '直的',   emoji: '📏', cat: 'adjectives', sentence: 'Her hair is long and straight.' },
  { id: 'tall',     en: 'tall',     zh: '高的',   emoji: '🗼', cat: 'adjectives', sentence: 'The giraffe is very tall.' },
  { id: 'thin',     en: 'thin',     zh: '瘦的',   emoji: '🪡', cat: 'adjectives', sentence: 'The snake is long and thin.' },
  { id: 'naughty',  en: 'naughty',  zh: '调皮的', emoji: '😈', cat: 'adjectives', sentence: 'The naughty monkey took my hat!' },
  { id: 'present',  en: 'present',  zh: '礼物',   emoji: '🎁', cat: 'objects', sentence: 'This present is for you!' },
  { id: 'treasure', en: 'treasure', zh: '宝藏',   emoji: '💎', cat: 'objects', sentence: 'The treasure is in the cave.' },
  // Unit 4: 我们的家
  { id: 'daughter',      en: 'daughter',      zh: '女儿',   emoji: '👧', cat: 'people', sentence: 'Their daughter loves to dance.' },
  { id: 'son',           en: 'son',           zh: '儿子',   emoji: '👦', cat: 'people', sentence: 'Their son plays football.' },
  { id: 'grandson',      en: 'grandson',      zh: '孙子',   emoji: '🧒', cat: 'people', sentence: 'Grandpa reads to his grandson.' },
  { id: 'granddaughter', en: 'granddaughter', zh: '孙女',   emoji: '👧', cat: 'people', sentence: 'Grandma hugs her granddaughter.' },
  { id: 'grandparents',  en: 'grandparents',  zh: '祖父母', emoji: '👵', cat: 'people', sentence: 'My grandparents live in a village.' },
  { id: 'parents',       en: 'parents',       zh: '父母',   emoji: '👫', cat: 'people', sentence: 'My parents work in the city.' },
  { id: 'balcony',     en: 'balcony',      zh: '阳台',   emoji: '🏠', cat: 'home', sentence: 'We grow flowers on the balcony.' },
  { id: 'basement',    en: 'basement',     zh: '地下室', emoji: '🕳️', cat: 'home', sentence: 'The bikes are in the basement.' },
  { id: 'downstairs',  en: 'downstairs',   zh: '楼下',   emoji: '⬇️', cat: 'home', sentence: 'The kitchen is downstairs.' },
  { id: 'upstairs',    en: 'upstairs',     zh: '楼上',   emoji: '⬆️', cat: 'home', sentence: 'My bedroom is upstairs.' },
  { id: 'inside',      en: 'inside',       zh: '在里面', emoji: '📥', cat: 'home', sentence: "Come inside! It's raining." },
  { id: 'outside',     en: 'outside',      zh: '在外面', emoji: '📤', cat: 'home', sentence: 'The dog plays outside.' },
  { id: 'roof',        en: 'roof',         zh: '屋顶',   emoji: '🛖', cat: 'home', sentence: 'A bird sits on the roof.' },
  { id: 'stairs',      en: 'stairs',       zh: '楼梯',   emoji: '🪜', cat: 'home', sentence: "Don't run on the stairs." },
  { id: 'lift',        en: 'lift',         zh: '电梯',   emoji: '🛗', cat: 'home', sentence: 'Take the lift to the fifth floor.' },
  { id: 'address',     en: 'address',      zh: '地址',   emoji: '📍', cat: 'home', sentence: 'Write your address here.' },
  { id: 'home',        en: 'home',         zh: '家',     emoji: '🏡', cat: 'home', sentence: "There's no place like home." },
  { id: 'groundfloor', en: 'ground floor', zh: '一楼',   emoji: '0️⃣', cat: 'home', sentence: 'The shop is on the ground floor.' },
  { id: 'firstfloor',  en: 'first floor',  zh: '二楼',   emoji: '1️⃣', cat: 'home', sentence: 'We live on the first floor.' },
  { id: 'secondfloor', en: 'second floor', zh: '三楼',   emoji: '2️⃣', cat: 'home', sentence: 'The library is on the second floor.' },
  // Unit 5: 动物与动作
  { id: 'cage', en: 'cage', zh: '笼子',   emoji: '⛓️', cat: 'animals', sentence: "The parrot's cage is open!" },
  { id: 'pet',  en: 'pet',  zh: '宠物',   emoji: '🐹', cat: 'animals', sentence: 'My pet is a little hamster.' },
  { id: 'fall', en: 'fall', zh: '落下',   emoji: '🪂', cat: 'actions', sentence: 'Leaves fall in autumn.' },
  { id: 'hide', en: 'hide', zh: '躲藏',   emoji: '🙈', cat: 'actions', sentence: "Let's hide behind the tree!" },
  { id: 'lose', en: 'lose', zh: '丢失',   emoji: '🔍', cat: 'actions', sentence: "Don't lose your keys." },
  { id: 'move', en: 'move', zh: '移动',   emoji: '↔️', cat: 'actions', sentence: 'Robots can move fast.' },
  { id: 'hop',  en: 'hop',  zh: '单脚跳', emoji: '🦵', cat: 'actions', sentence: 'Rabbits hop in the garden.' },
  { id: 'skip', en: 'skip', zh: '蹦跳',   emoji: '🪢', cat: 'actions', sentence: 'The girls skip in the playground.' },
  { id: 'walk', en: 'walk', zh: '走',     emoji: '🚶‍♀️', cat: 'actions', sentence: 'We walk in the park.' },
  { id: 'flyverb', en: 'fly', zh: '飞',   emoji: '🪽', cat: 'actions', pos: 'verb', sentence: 'Birds can fly over the trees.' },
  // Unit 6: 天气与衣物
  { id: 'wind',    en: 'wind',     zh: '风',   emoji: '💨', cat: 'weather', sentence: 'The wind blows my kite high.' },
  { id: 'weather', en: 'weather',  zh: '天气', emoji: '🌦️', cat: 'weather', sentence: "What's the weather like today?" },
  { id: 'dry',     en: 'dry',      zh: '干的', emoji: '🌵', cat: 'weather', sentence: 'The desert is very dry.' },
  { id: 'wet',     en: 'wet',      zh: '湿的', emoji: '💦', cat: 'weather', sentence: 'My socks are wet!' },
  { id: 'shorts',  en: 'shorts',   zh: '短裤', emoji: '🩳', cat: 'clothes', sentence: 'I wear shorts in summer.' },
  { id: 'puton',   en: 'put on',   zh: '穿上', emoji: '🧥', cat: 'actions', sentence: 'Put on your coat!' },
  { id: 'takeoff', en: 'take off', zh: '脱下', emoji: '🎽', cat: 'actions', sentence: 'Take off your wet shoes.' },
  { id: 'wear',    en: 'wear',     zh: '穿着', emoji: '🧢', cat: 'actions', sentence: 'I wear a hat in the sun.' },
  // Unit 7: 烹饪时间
  { id: 'bottle',  en: 'bottle',  zh: '瓶子',     emoji: '🍼', cat: 'food', sentence: 'The bottle is full of juice.' },
  { id: 'bowl',    en: 'bowl',    zh: '碗',       emoji: '🥣', cat: 'food', sentence: 'I eat rice from a bowl.' },
  { id: 'cup',     en: 'cup',     zh: '杯子',     emoji: '☕', cat: 'food', sentence: 'A cup of tea for grandma.' },
  { id: 'glass',   en: 'glass',   zh: '玻璃杯',   emoji: '🥛', cat: 'food', sentence: 'A glass of milk, please.' },
  { id: 'pasta',   en: 'pasta',   zh: '意大利面', emoji: '🍝', cat: 'food', sentence: 'We eat pasta on Fridays.' },
  { id: 'plate',   en: 'plate',   zh: '盘子',     emoji: '🍽️', cat: 'food', sentence: 'Put the cake on a plate.' },
  { id: 'meal',    en: 'meal',    zh: '一餐',     emoji: '🍱', cat: 'food', sentence: 'Dinner is my favourite meal.' },
  { id: 'boil',    en: 'boil',    zh: '煮沸',     emoji: '♨️', cat: 'actions', sentence: 'Boil the water for the eggs.' },
  { id: 'carry',   en: 'carry',   zh: '搬运',     emoji: '👜', cat: 'actions', sentence: 'I carry my bag to school.' },
  { id: 'cut',     en: 'cut',     zh: '切',       emoji: '🔪', cat: 'actions', sentence: 'Cut the banana into pieces.' },
  { id: 'cry',     en: 'cry',     zh: '哭泣',     emoji: '😭', cat: 'actions', sentence: 'Babies cry when they are hungry.' },
  { id: 'drop',    en: 'drop',    zh: '掉落',     emoji: '📉', cat: 'actions', sentence: "Don't drop the eggs!" },
  { id: 'fry',     en: 'fry',     zh: '煎炸',     emoji: '🍳', cat: 'actions', sentence: 'We fry eggs for breakfast.' },
  { id: 'thirsty', en: 'thirsty', zh: '渴的',     emoji: '🚰', cat: 'adjectives', sentence: "I'm thirsty. Water, please!" },
  // Unit 8: 城镇生活
  { id: 'carpark',        en: 'car park',        zh: '停车场',   emoji: '🅿️', cat: 'places', sentence: 'Dad leaves the car in the car park.' },
  { id: 'citycentre',     en: 'city centre',     zh: '市中心',   emoji: '🏬', cat: 'places', sentence: 'The shops are in the city centre.' },
  { id: 'funfair',        en: 'funfair',         zh: '游乐场',   emoji: '🎡', cat: 'places', sentence: 'The funfair has a big wheel.' },
  { id: 'market',         en: 'market',          zh: '市场',     emoji: '🏪', cat: 'places', sentence: 'We buy fruit at the market.' },
  { id: 'shoppingcentre', en: 'shopping centre', zh: '购物中心', emoji: '🛍️', cat: 'places', sentence: 'The shopping centre is busy today.' },
  { id: 'sportscentre',   en: 'sports centre',   zh: '体育中心', emoji: '🏸', cat: 'places', sentence: 'I swim at the sports centre.' },
  { id: 'square',         en: 'square',          zh: '广场',     emoji: '⬜', cat: 'places', sentence: 'People dance in the square.' },
  { id: 'station',        en: 'station',         zh: '车站',     emoji: '🚉', cat: 'places', sentence: 'The train leaves the station.' },
  { id: 'road',           en: 'road',            zh: '道路',     emoji: '🛣️', cat: 'places', sentence: 'Look both ways before crossing the road.' },
  { id: 'town',           en: 'town',            zh: '城镇',     emoji: '🌆', cat: 'places', sentence: 'Our town has a nice park.' },
  { id: 'ticket',         en: 'ticket',          zh: '票',       emoji: '🎟️', cat: 'objects', sentence: 'Show your ticket to the driver.' },
  { id: 'trip',           en: 'trip',            zh: '旅行',     emoji: '🧭', cat: 'objects', sentence: 'Our school trip is on Friday!' },
  // Unit 9: 感受与情绪
  { id: 'afraid',     en: 'afraid',     zh: '害怕的',     emoji: '😨', cat: 'adjectives', sentence: "Don't be afraid of the dark." },
  { id: 'boring',     en: 'boring',     zh: '令人厌烦的', emoji: '😪', cat: 'adjectives', sentence: 'This film is boring.' },
  { id: 'busy',       en: 'busy',       zh: '忙碌的',     emoji: '🐝', cat: 'adjectives', sentence: 'Mum is busy in the kitchen.' },
  { id: 'careful',    en: 'careful',    zh: '小心的',     emoji: '⚠️', cat: 'adjectives', sentence: 'Be careful on the stairs!' },
  { id: 'dangerous',  en: 'dangerous',  zh: '危险的',     emoji: '☠️', cat: 'adjectives', sentence: 'Sharks are dangerous.' },
  { id: 'difficult',  en: 'difficult',  zh: '困难的',     emoji: '😤', cat: 'adjectives', sentence: 'This puzzle is difficult.' },
  { id: 'easy',       en: 'easy',       zh: '容易的',     emoji: '👌', cat: 'adjectives', sentence: 'The homework is easy today.' },
  { id: 'exciting',   en: 'exciting',   zh: '令人兴奋的', emoji: '🎢', cat: 'adjectives', sentence: 'The rollercoaster is so exciting!' },
  { id: 'frightened', en: 'frightened', zh: '受惊吓的',   emoji: '😱', cat: 'adjectives', sentence: 'The frightened cat ran away.' },
  { id: 'surprised',  en: 'surprised',  zh: '惊讶的',     emoji: '😲', cat: 'adjectives', sentence: 'I was surprised by the party!' },
  { id: 'terrible',   en: 'terrible',   zh: '糟糕的',     emoji: '💥', cat: 'adjectives', sentence: 'What a terrible storm!' },
  { id: 'round',      en: 'round',      zh: '圆的',       emoji: '⭕', cat: 'adjectives', sentence: 'The moon is big and round.' },
  { id: 'adventure',  en: 'adventure',  zh: '冒险',       emoji: '⚔️', cat: 'objects', sentence: 'Our camping trip was an adventure.' },
].map((w) => ({ ...w, lvl: 'movers' }));

export const WORDS = [...SEED, ...STARTERS, ...MOVERS, ...MOVERS_PU2, ...FLYERS];

// Kiwi 的首批听说启蒙内容：不是考试词表，而是能在家庭生活中立刻听懂、执行和表达的 24 项。
// 每组 6 项，包含具体名词、动作和完整口语块；id 独立，避免改动旧的 seed 学习记录。
export const KIWI_ITEMS = [
  // 1. 身体动起来
  { id: 'kiwi_nose', en: 'nose', zh: '鼻子', emoji: '👃', cat: 'kiwi_body' },
  { id: 'kiwi_hands', en: 'hands', zh: '双手', emoji: '🙌', cat: 'kiwi_body' },
  { id: 'kiwi_feet', en: 'feet', zh: '双脚', emoji: '🦶', cat: 'kiwi_body' },
  { id: 'kiwi_jump', en: 'Jump!', zh: '跳起来', emoji: '🤸', cat: 'kiwi_body', kind: 'command' },
  { id: 'kiwi_clap', en: 'Clap your hands!', zh: '拍拍手', emoji: '👏', cat: 'kiwi_body', kind: 'command' },
  { id: 'kiwi_sit', en: 'Sit down!', zh: '坐下来', emoji: '🪑', cat: 'kiwi_body', kind: 'command' },
  // 2. 我的家人
  { id: 'kiwi_mum', en: 'Mummy', zh: '妈妈', emoji: '👩', cat: 'kiwi_family' },
  { id: 'kiwi_dad', en: 'Daddy', zh: '爸爸', emoji: '👨', cat: 'kiwi_family' },
  { id: 'kiwi_yoyo', en: 'Yoyo', zh: '姐姐 Yoyo', emoji: '🎀', cat: 'kiwi_family' },
  { id: 'kiwi_me', en: 'Kiwi', zh: '我 Kiwi', emoji: '🦖', cat: 'kiwi_family' },
  { id: 'kiwi_hello', en: 'Hello!', zh: '你好', emoji: '👋', cat: 'kiwi_family', kind: 'chunk' },
  { id: 'kiwi_bye', en: 'Bye-bye!', zh: '再见', emoji: '🚪', cat: 'kiwi_family', kind: 'chunk' },
  // 3. 我想要
  { id: 'kiwi_water', en: 'water', zh: '水', emoji: '💧', cat: 'kiwi_needs' },
  { id: 'kiwi_milk', en: 'milk', zh: '牛奶', emoji: '🥛', cat: 'kiwi_needs' },
  { id: 'kiwi_apple', en: 'apple', zh: '苹果', emoji: '🍎', cat: 'kiwi_needs' },
  { id: 'kiwi_banana', en: 'banana', zh: '香蕉', emoji: '🍌', cat: 'kiwi_needs' },
  { id: 'kiwi_more', en: 'More, please.', zh: '请再给我一点', emoji: '➕', cat: 'kiwi_needs', kind: 'chunk' },
  { id: 'kiwi_done', en: 'All done!', zh: '我吃完了', emoji: '✅', cat: 'kiwi_needs', kind: 'chunk' },
  // 4. 玩具和指令
  { id: 'kiwi_ball', en: 'ball', zh: '球', emoji: '⚽', cat: 'kiwi_play' },
  { id: 'kiwi_car', en: 'car', zh: '小汽车', emoji: '🚗', cat: 'kiwi_play' },
  { id: 'kiwi_book', en: 'book', zh: '书', emoji: '📖', cat: 'kiwi_play' },
  { id: 'kiwi_open', en: 'Open it.', zh: '把它打开', emoji: '📬', cat: 'kiwi_play', kind: 'command' },
  { id: 'kiwi_give', en: 'Give it to me.', zh: '把它给我', emoji: '🤲', cat: 'kiwi_play', kind: 'command' },
  { id: 'kiwi_putin', en: 'Put it in.', zh: '把它放进去', emoji: '📥', cat: 'kiwi_play', kind: 'command' },
].map((item) => ({ ...item, lvl: 'kiwi' }));

export const KIWI_PACKS = [
  { id: 'body', name: '身体动起来', zh: '听指令做动作', emoji: '🤸', ids: KIWI_ITEMS.slice(0, 6).map((x) => x.id) },
  { id: 'family', name: '我的家人', zh: '打招呼认家人', emoji: '👨‍👩‍👧', ids: KIWI_ITEMS.slice(6, 12).map((x) => x.id) },
  { id: 'needs', name: '我想要', zh: '吃喝和表达需要', emoji: '🥛', ids: KIWI_ITEMS.slice(12, 18).map((x) => x.id) },
  { id: 'play', name: '玩具和指令', zh: '拿、给、放进去', emoji: '⚽', ids: KIWI_ITEMS.slice(18, 24).map((x) => x.id) },
];

export function kiwiPackItems(packId) {
  const pack = KIWI_PACKS.find((x) => x.id === packId);
  return pack ? pack.ids.map((id) => KIWI_ITEMS.find((x) => x.id === id)).filter(Boolean) : [];
}

// —— Power Up 2 课本单元（Movers 级按单元学习，可跨级引用已有单词）——
const UNIT_DEFS = [
  { id: 'welcome', name: 'Welcome', zh: '认识家人 · 日常', emoji: '👋',
    ids: ['getdressed', 'getup', 'haveshower', 'havebreakfast', 'wakeup', 'brushteeth', 'cleanteeth', 'catchbus', 'walkschool', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'always', 'never'] },
  { id: 'u1', name: 'Unit 1', zh: '回归自然', emoji: '🌳',
    ids: ['field', 'forest', 'grass', 'ground', 'lake', 'leaf', 'mountain', 'river', 'rock', 'tractor', 'blanket', 'picnic', 'loud', 'quiet', 'quick', 'slow', 'path', 'plant', 'tree'] },
  { id: 'u2', name: 'Unit 2', zh: '休闲时光', emoji: '🎮',
    ids: ['goshopping', 'goskating', 'listencd', 'listenmusic', 'readcomic', 'watchdvd', 'watchfilm', 'writeemail', 'playgames', 'often', 'sometimes', 'weekend', 'hobby', 'camera', 'photo'] },
  { id: 'u3', name: 'Unit 3', zh: '人物与外貌', emoji: '🧑‍🎤',
    ids: ['clown', 'cookperson', 'dentist', 'doctor', 'farmer', 'filmstar', 'nurse', 'pirate', 'popstar', 'beard', 'blonde', 'curly', 'fair', 'fat', 'moustache', 'short', 'straight', 'tall', 'thin', 'present', 'treasure', 'clever', 'naughty'] },
  { id: 'u4', name: 'Unit 4', zh: '我们的家', emoji: '🏡',
    ids: ['aunt', 'cousin', 'daughter', 'granddaughter', 'grandparents', 'grandson', 'parents', 'son', 'uncle', 'balcony', 'basement', 'downstairs', 'groundfloor', 'firstfloor', 'secondfloor', 'inside', 'lift', 'outside', 'roof', 'stairs', 'upstairs', 'address', 'home'] },
  { id: 'u5', name: 'Unit 5', zh: '动物与动作', emoji: '🦘',
    ids: ['bat', 'bear', 'cage', 'dolphin', 'kangaroo', 'lion', 'panda', 'parrot', 'penguin', 'rabbit', 'whale', 'pet', 'climb', 'fall', 'flyverb', 'hide', 'jump', 'lose', 'move', 'run', 'walk', 'hop', 'skip', 'swim'] },
  { id: 'u6', name: 'Unit 6', zh: '天气与衣物', emoji: '🌦️',
    ids: ['cloud', 'cloudy', 'cold', 'hot', 'rain', 'rainbow', 'snow', 'sunny', 'wind', 'windy', 'boots', 'coat', 'scarf', 'shorts', 'sweater', 'tshirt', 'puton', 'takeoff', 'wear', 'weather', 'dry', 'wet'] },
  { id: 'u7', name: 'Unit 7', zh: '烹饪时间', emoji: '🍳',
    ids: ['bottle', 'bowl', 'cheese', 'cup', 'glass', 'pasta', 'plate', 'salad', 'sandwich', 'soup', 'vegetables', 'boil', 'carry', 'cook', 'cry', 'cut', 'drop', 'fry', 'wash', 'hungry', 'thirsty', 'meal'] },
  { id: 'u8', name: 'Unit 8', zh: '城镇生活', emoji: '🏙️',
    ids: ['busstop', 'cafe', 'carpark', 'cinema', 'citycentre', 'funfair', 'hospital', 'library', 'market', 'shoppingcentre', 'sportscentre', 'square', 'station', 'supermarket', 'pool', 'map', 'ride', 'road', 'ticket', 'trip', 'town'] },
  { id: 'u9', name: 'Unit 9', zh: '感受与情绪', emoji: '😊',
    ids: ['afraid', 'bored', 'boring', 'busy', 'careful', 'dangerous', 'difficult', 'easy', 'exciting', 'frightened', 'hungry', 'thirsty', 'tired', 'surprised', 'terrible', 'happy', 'sad', 'angry', 'adventure', 'round'] },
];

// 第一批“从词到使用”的 Power Up 2 单元内容包。后续按同一结构扩展 Unit 2–9。
export const UNIT_CONTENT = {
  u1: {
    title: 'Nature Explorer 自然探险任务',
    goal: '听懂并用 3–4 句话描述一个自然场景',
    chunks: [
      { en: 'What can you see?', zh: '你能看到什么？' },
      { en: 'I can see a river and some trees.', zh: '我能看到一条河和一些树。' },
      { en: 'There is a path by the lake.', zh: '湖边有一条小路。' },
      { en: 'The forest is quiet.', zh: '森林很安静。' },
    ],
    dialogue: [
      { speaker: 'A', en: 'Look at the field! What can you see?', zh: '看看田野！你能看到什么？' },
      { speaker: 'B', en: 'I can see a river and some trees.', zh: '我能看到一条河和一些树。' },
      { speaker: 'A', en: 'Is the forest loud?', zh: '森林吵吗？' },
      { speaker: 'B', en: "No, it isn't. The forest is quiet.", zh: '不吵，森林很安静。' },
    ],
    mission: {
      instruction: 'Look at a nature picture or look out of the window. Say four sentences.',
      zh: '看一张自然图片，或者看看窗外，用英语说四句话。',
      prompts: ['I can see ...', 'There is ...', 'It is ...', 'I like ... because ...'],
    },
  },
};

export function findUnitContent(unitId) {
  return UNIT_CONTENT[unitId] || null;
}

// 拓展单元：未进入课本单元的 Movers 词自动归入，保证每个词都有学习入口
const assignedIds = new Set(UNIT_DEFS.flatMap((u) => u.ids));
export const UNITS = [
  ...UNIT_DEFS,
  {
    id: 'extra', name: '拓展', zh: '课外拓展词汇', emoji: '🧩',
    ids: WORDS.filter((w) => w.lvl === 'movers' && !assignedIds.has(w.id)).map((w) => w.id),
  },
];

export function unitWords(unitId) {
  const u = UNITS.find((x) => x.id === unitId);
  return u ? u.ids.map((id) => findWord(id)).filter(Boolean) : [];
}

export function wordsForLevel(lvlId) {
  return WORDS.filter((w) => w.lvl === lvlId);
}

export function categoriesForLevel(lvlId) {
  const cats = new Set(wordsForLevel(lvlId).map((w) => w.cat));
  return CATEGORIES.filter((c) => cats.has(c.id));
}

export function wordsByCategory(catId, lvlId) {
  return WORDS.filter((w) => w.cat === catId && (!lvlId || w.lvl === lvlId));
}

export function findWord(id) {
  return WORDS.find((w) => w.id === id) || null;
}

export function findLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}
