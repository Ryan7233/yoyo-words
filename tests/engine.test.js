import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, KIWI_ITEMS, wordsByCategory } from '../js/words.js';
import {
  shuffle, pickDistractors, buildQuestion, buildQuiz,
  gradeAnswer, emptyEntry, isMastered, dueWords,
  starReward, masteredCount, summarize, wrongBookWords, wrongBookReward,
  pickPicDistractors, buildPicQuestion, buildPicQuiz, PIC_QUIZ_SIZE,
  buildKiwiSession, buildKiwiQuiz,
  spellableWords, spellingTiles, sentenceTokens, sentenceWords,
  speechScore, SPEECH_PASS,
  addSticker, updateSticker, resizeSticker, removeSticker, buildUnlockRound,
  STICKER_DEFAULT_SIZE, STICKER_MIN_SIZE, STICKER_MAX_SIZE, STICKER_SIZE_STEP,
  learnedStickerWords, availableStickerWords, buildRoomTask, isNear, ROOM_DROP_THRESHOLD,
  levelMastery, canGraduate, wordsToGraduation, nextLevelId, isGraduationPassed,
  BOX_INTERVALS_DAYS, MAX_BOX, MASTERED_BOX, WRONG_BOOK_CLEAR_STARS, QUIZ_MODES, DAY_MS,
  GRADUATION_THRESHOLD, GRADUATION_PASS_CORRECT,
} from '../js/engine.js';

// 可复现的伪随机数生成器
function seededRng(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

test('shuffle：不丢失、不新增元素', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(arr, seededRng());
  assert.deepEqual([...out].sort((a, b) => a - b), arr);
  assert.deepEqual(arr, [1, 2, 3, 4, 5, 6, 7, 8], '不应修改原数组');
});

test('pickDistractors：3 个干扰项、无重复、不含正确答案、优先同分类', () => {
  const cat = WORDS.find((w) => w.id === 'cat');
  for (let seed = 1; seed <= 20; seed++) {
    const d = pickDistractors(cat, WORDS, 3, seededRng(seed));
    assert.equal(d.length, 3);
    assert.ok(!d.some((w) => w.id === 'cat'));
    assert.equal(new Set(d.map((w) => w.id)).size, 3);
    assert.ok(d.every((w) => w.cat === 'animals'), '动物类词量充足时应全取同分类');
  }
});

test('pickDistractors：同分类不够时从其他分类补齐', () => {
  const smallPool = [
    ...wordsByCategory('colors').slice(0, 2), // 同分类只剩 1 个可用干扰项
    ...wordsByCategory('animals').slice(0, 5),
  ];
  const target = smallPool[0];
  const d = pickDistractors(target, smallPool, 3, seededRng());
  assert.equal(d.length, 3);
  assert.ok(!d.some((w) => w.id === target.id));
});

test('buildQuestion：4 个选项、正确答案恰好出现一次、题面正确', () => {
  const apple = WORDS.find((w) => w.id === 'apple');
  for (const mode of QUIZ_MODES) {
    const q = buildQuestion(apple, WORDS, mode, seededRng(7));
    assert.equal(q.options.length, 4);
    assert.equal(q.options.filter((o) => o.id === 'apple').length, 1);
    assert.equal(q.answerId, 'apple');
    if (mode === 'en2zh') {
      assert.equal(q.prompt, 'apple');
      assert.ok(q.options.some((o) => o.label === '苹果'));
    } else if (mode === 'zh2en') {
      assert.equal(q.prompt, '苹果');
      assert.ok(q.options.some((o) => o.label === 'apple'));
    } else {
      assert.equal(q.prompt, '', '听力题不显示文字题面');
    }
  }
});

test('buildQuestion：成人大词表中中文释义重复时不会生成两个同文案选项', () => {
  const pool = [
    { id: 'adult:book', en: 'book', zh: '书；预订', cat: 'common' },
    { id: 'adult:volume', en: 'volume', zh: '书；预订', cat: 'common' },
    { id: 'adult:novel', en: 'novel', zh: '小说', cat: 'common' },
    { id: 'adult:page', en: 'page', zh: '页', cat: 'common' },
    { id: 'adult:read', en: 'read', zh: '阅读', cat: 'common' },
  ];
  const question = buildQuestion(pool[0], pool, 'en2zh', seededRng(2));
  assert.equal(question.options.length, 4);
  assert.equal(new Set(question.options.map((o) => o.label)).size, 4);
});

test('buildQuiz：题目数量正确、单词不重复、题型轮换', () => {
  const quiz = buildQuiz(WORDS, WORDS, 8, seededRng(3));
  assert.equal(quiz.length, 8);
  const ids = quiz.map((q) => q.word.id);
  assert.equal(new Set(ids).size, 8, '一关内单词不应重复');
  quiz.forEach((q, i) => assert.equal(q.mode, QUIZ_MODES[i % QUIZ_MODES.length]));
});

test('buildQuiz：词不够时按实际数量出题', () => {
  const few = WORDS.slice(0, 3);
  assert.equal(buildQuiz(few, WORDS, 8, seededRng()).length, 3);
});

test('一词多义：题目提供语境，选项不会出现两个相同英文', () => {
  for (const id of ['cookperson', 'flyverb']) {
    const word = WORDS.find((w) => w.id === id);
    const meaningQuestion = buildQuestion(word, WORDS, 'en2zh', seededRng(11));
    assert.equal(meaningQuestion.context, word.sentence);
    const englishQuestion = buildQuestion(word, WORDS, 'zh2en', seededRng(12));
    assert.equal(new Set(englishQuestion.options.map((o) => o.label.toLowerCase())).size, 4);
    const listeningQuestion = buildQuestion(word, WORDS, 'listen', seededRng(13));
    assert.equal(listeningQuestion.audioText, word.sentence);
    assert.equal(new Set(listeningQuestion.options.map((o) => o.label.toLowerCase())).size, 4);
  }
});

test('Kiwi 首日：只引入 2 项新内容，6 题围绕这两项重复', () => {
  const session = buildKiwiSession(
    KIWI_ITEMS, {}, 1000, 2, 4, new Set(KIWI_ITEMS.slice(0, 8).map((w) => w.id))
  );
  assert.deepEqual(session.newItems.map((w) => w.id), KIWI_ITEMS.slice(0, 2).map((w) => w.id));
  assert.equal(session.reviewItems.length, 0);
  const quiz = buildKiwiQuiz(session, KIWI_ITEMS, 6, seededRng(21));
  assert.equal(quiz.length, 6);
  assert.deepEqual(new Set(quiz.map((q) => q.word.id)), new Set(session.newItems.map((w) => w.id)));
});

test('Kiwi 后续：2 项新内容配已学复习，不重新引入已学项', () => {
  const progress = Object.fromEntries(KIWI_ITEMS.slice(0, 2).map((w) => [w.id, {
    box: 1, correct: 1, wrong: 0, nextDue: 0,
  }]));
  const session = buildKiwiSession(KIWI_ITEMS, progress, 1000, 2, 4);
  assert.deepEqual(session.newItems.map((w) => w.id), KIWI_ITEMS.slice(2, 4).map((w) => w.id));
  assert.deepEqual(new Set(session.reviewItems.map((w) => w.id)), new Set(KIWI_ITEMS.slice(0, 2).map((w) => w.id)));
  assert.equal(new Set(session.items.map((w) => w.id)).size, session.items.length);
});

test('Kiwi 后续：已学复习项避让近期词，仍保持引入 2 项新内容', () => {
  const known = KIWI_ITEMS.slice(0, 8);
  const progress = Object.fromEntries(known.map((w) => [w.id, {
    box: 1, correct: 1, wrong: 0, nextDue: 0,
  }]));
  const recentIds = known.slice(0, 4).map((w) => w.id);
  const session = buildKiwiSession(KIWI_ITEMS, progress, 1000, 2, 4, recentIds);

  assert.deepEqual(session.newItems.map((w) => w.id), KIWI_ITEMS.slice(8, 10).map((w) => w.id));
  assert.deepEqual(session.reviewItems.map((w) => w.id), known.slice(4, 8).map((w) => w.id));
  assert.ok(session.reviewItems.every((w) => !recentIds.includes(w.id)));
});

test('gradeAnswer：答对升级、答错回到 1 级、边界不越界', () => {
  const now = 1_000_000;
  let e = gradeAnswer(undefined, true, now);
  assert.equal(e.box, 1);
  assert.equal(e.correct, 1);
  assert.equal(e.nextDue, now + BOX_INTERVALS_DAYS[1] * DAY_MS);

  // 连续答对到顶
  for (let i = 0; i < 10; i++) e = gradeAnswer(e, true, now);
  assert.equal(e.box, MAX_BOX, '盒子不应超过最大值');

  // 答错回到 1 级
  e = gradeAnswer(e, false, now);
  assert.equal(e.box, 1);
  assert.equal(e.wrong, 1);
  assert.equal(e.nextDue, now + BOX_INTERVALS_DAYS[1] * DAY_MS);

  // 0 级答错仍是 0 级
  const e0 = gradeAnswer(emptyEntry(), false, now);
  assert.equal(e0.box, 0);
  assert.equal(e0.nextDue, now, '0 级间隔为 0 天，立即可复习');
});

test('gradeAnswer：不修改传入的原对象', () => {
  const orig = { box: 2, correct: 5, wrong: 1, nextDue: 0 };
  gradeAnswer(orig, true, 1000);
  assert.deepEqual(orig, { box: 2, correct: 5, wrong: 1, nextDue: 0 });
});

test('gradeAnswer：缺字段和坏数值会回退，不产生 NaN', () => {
  assert.deepEqual(gradeAnswer({ box: 2 }, true, 1000), {
    box: 3, correct: 1, wrong: 0, nextDue: 1000 + BOX_INTERVALS_DAYS[3] * DAY_MS,
  });
  const out = gradeAnswer({ box: 'bad', correct: NaN, wrong: -2, nextDue: Infinity }, false, NaN);
  assert.equal(out.box, 0);
  assert.equal(out.correct, 0);
  assert.equal(out.wrong, 1);
  assert.ok(Number.isFinite(out.nextDue));
  assert.ok(Object.values(out).every((value) => !Number.isNaN(value)));
});

test('isMastered：盒子达到阈值算掌握', () => {
  assert.equal(isMastered({ box: MASTERED_BOX - 1 }), false);
  assert.equal(isMastered({ box: MASTERED_BOX }), true);
  assert.equal(isMastered(undefined), false);
});

test('dueWords：到期词优先且按盒子升序，新词其次，未到期最后', () => {
  const now = 100 * DAY_MS;
  const words = WORDS.slice(0, 6);
  const progress = {
    [words[0].id]: { box: 3, correct: 3, wrong: 0, nextDue: now - 1 },   // 到期，盒子高
    [words[1].id]: { box: 1, correct: 1, wrong: 2, nextDue: now - 1 },   // 到期，盒子低
    [words[2].id]: { box: 5, correct: 9, wrong: 0, nextDue: now + DAY_MS }, // 未到期
  };
  const out = dueWords(words, progress, now, 6);
  assert.equal(out[0].id, words[1].id, '盒子低的到期词排最前');
  assert.equal(out[1].id, words[0].id);
  assert.ok(out.slice(2, 5).every((w) => !progress[w.id]), '新词排在到期词之后');
  assert.equal(out[5].id, words[2].id, '未到期的排最后');
});

test('dueWords：limit 生效', () => {
  assert.equal(dueWords(WORDS, {}, Date.now(), 8).length, 8);
  assert.equal(dueWords(WORDS.slice(0, 3), {}, Date.now(), 8).length, 3);
});

test('dueWords：同盒子的到期词按 nextDue 从早到晚排序', () => {
  const words = WORDS.slice(0, 3);
  const progress = {
    [words[0].id]: { box: 1, nextDue: 30 },
    [words[1].id]: { box: 1, nextDue: 10 },
    [words[2].id]: { box: 1, nextDue: 20 },
  };
  assert.deepEqual(dueWords(words, progress, 100, 3).map((w) => w.id),
    [words[1].id, words[2].id, words[0].id]);
});

test('dueWords：近期词整体后移，非近期词仍保持到期、新词、未到期顺序', () => {
  const now = 100;
  const words = WORDS.slice(0, 6);
  const progress = {
    [words[0].id]: { box: 1, nextDue: 10 }, // 到期，近期
    [words[1].id]: { box: 2, nextDue: 20 }, // 到期，非近期
    [words[4].id]: { box: 1, nextDue: 200 }, // 未到期，非近期
    [words[5].id]: { box: 1, nextDue: 300 }, // 未到期，近期
  };

  const out = dueWords(words, progress, now, 4, [words[0].id, words[2].id, words[5].id]);
  assert.deepEqual(out.map((w) => w.id), [
    words[1].id, // 非近期到期词
    words[3].id, // 非近期新词
    words[4].id, // 非近期未到期词
    words[0].id, // 非近期词不够时才回填近期词
  ]);
});

test('dueWords：小词池会按原顺序回填近期词，recentIds 也支持 Set', () => {
  const words = WORDS.slice(0, 3);
  const recent = new Set([words[0].id, words[1].id]);
  const out = dueWords(words, {}, 100, 8, recent);
  assert.deepEqual(out.map((w) => w.id), [words[2].id, words[0].id, words[1].id]);
  assert.equal(out.length, words.length, '近期避让不能让小词池少出题');
});

test('starReward：普通答对 1 星，每连对 3 题得 2 星', () => {
  assert.equal(starReward(0), 0);
  assert.equal(starReward(-1), 0);
  assert.equal(starReward(NaN), 0);
  assert.equal(starReward(1), 1);
  assert.equal(starReward(2), 1);
  assert.equal(starReward(3), 2);
  assert.equal(starReward(4), 1);
  assert.equal(starReward(6), 2);
});

test('masteredCount：统计已掌握数量', () => {
  const progress = {
    a: { box: 3 }, b: { box: 5 }, c: { box: 1 }, d: { box: 0 },
  };
  assert.equal(masteredCount(progress), 2);
});

test('听音点图：4 个图片选项两两不同、含正确答案（emoji 撞车的词被排除）', () => {
  // seed 级里 pink 和 flower 都是 🌸，图片题必须避开
  const seed = WORDS.filter((w) => w.lvl === 'seed');
  const pink = seed.find((w) => w.id === 'pink');
  for (let s = 1; s <= 20; s++) {
    const q = buildPicQuestion(pink, seed, seededRng(s));
    assert.equal(q.mode, 'listen2pic');
    assert.equal(q.options.length, 4);
    assert.equal(q.options.filter((o) => o.id === 'pink').length, 1);
    const emojis = q.options.map((o) => o.emoji);
    assert.equal(new Set(emojis).size, 4, `图片有重复: ${emojis.join(' ')}`);
    assert.ok(!q.options.some((o) => o.id === 'flower'), 'flower 和 pink 同图，不能做干扰项');
  }
});

test('听音点图：整关题目数量和模式正确', () => {
  const seed = WORDS.filter((w) => w.lvl === 'seed');
  const quiz = buildPicQuiz(seed, seed, PIC_QUIZ_SIZE, seededRng(9));
  assert.equal(quiz.length, PIC_QUIZ_SIZE);
  assert.ok(quiz.every((q) => q.mode === 'listen2pic'));
  assert.ok(quiz.every((q) => new Set(q.options.map((o) => o.emoji)).size === 4));
});

test('拼一拼：只挑纯字母 3~10 位的词，字母块是原词的乱序排列', () => {
  const pool = [
    { en: 'cat' }, { en: 'T-shirt' }, { en: 'ice cream' }, { en: 'go' },
    { en: 'elephant' }, { en: 'watermelon' }, // 10 位，收
  ];
  assert.deepEqual(spellableWords(pool).map((w) => w.en), ['cat', 'elephant', 'watermelon']);
  for (let s = 1; s <= 10; s++) {
    const tiles = spellingTiles({ en: 'panda' }, seededRng(s));
    assert.deepEqual([...tiles].sort(), ['a', 'a', 'd', 'n', 'p'], '必须是原字母的重排');
    assert.notEqual(tiles.join(''), 'panda', '不能和原词顺序一样，否则没有挑战');
  }
});

test('组句子：分词能还原句子，例句筛选 3~9 个词', () => {
  assert.deepEqual(sentenceTokens('Dolphins live in the sea.'), ['Dolphins', 'live', 'in', 'the', 'sea.']);
  assert.equal(sentenceTokens('Dolphins live in the sea.').join(' '), 'Dolphins live in the sea.');
  const pool = [
    { en: 'a', sentence: 'Too short.' },                       // 2 词，排除
    { en: 'b', sentence: 'Dolphins live in the sea.' },        // 5 词，收
    { en: 'c' },                                               // 没例句，排除
    { en: 'd', sentence: 'One two three four five six seven eight nine ten.' }, // 10 词，排除
  ];
  assert.deepEqual(sentenceWords(pool).map((w) => w.en), ['b']);
});

test('跟读评分：全读对 1 分、部分对按比例、通过线 0.7', () => {
  assert.equal(speechScore('dolphins live in the sea', 'Dolphins live in the sea.'), 1);
  assert.equal(speechScore('DOLPHIN', 'dolphin'), 1, '大小写和标点不影响');
  assert.equal(speechScore('the cat', 'Dolphins live in the sea.'), 0.2, '5 个词只中 1 个');
  assert.equal(speechScore('', 'cat'), 0);
  assert.ok(speechScore('dolphins live in sea', 'Dolphins live in the sea.') >= SPEECH_PASS,
    '5 个词中 4 个 = 0.8，应该通过');
});

test('跟读评分：乱序、重复和额外词都会扣分', () => {
  const target = 'dolphins live in the sea';
  assert.ok(speechScore('sea the in live dolphins', target) < SPEECH_PASS, '倒序不能通过');
  assert.equal(speechScore('cat', 'cat cat'), 0.5, '重复目标词不能被 Set 去重');
  assert.equal(speechScore('cat cat', 'cat'), 0.5, '额外重复词也要扣分');
  assert.ok(speechScore('dolphins really live in the blue sea', target) < 1, '额外词不能满分');
});

test('我的世界：addSticker 追加实例、尺寸夹范围、不改原数组', () => {
  const w0 = [];
  const w1 = addSticker(w0, 'cat', 50, 52);
  assert.equal(w0.length, 0, '不改原数组');
  assert.deepEqual(w1, [{ id: 'cat', x: 50, y: 52, size: STICKER_DEFAULT_SIZE }]);
  assert.equal(addSticker(w1, 'dog', 1, 2, 9999)[1].size, STICKER_MAX_SIZE, '超大夹到上限');
  assert.equal(addSticker(w1, 'dog', 1, 2, 1)[1].size, STICKER_MIN_SIZE, '过小夹到下限');
});

test('我的世界：updateSticker 局部更新、越界原样返回、不改原数组', () => {
  const world = [{ id: 'cat', x: 1, y: 2, size: 80 }];
  assert.deepEqual(updateSticker(world, 0, { x: 40, y: 60 }),
    [{ id: 'cat', x: 40, y: 60, size: 80 }]);
  assert.equal(world[0].x, 1, '原数组不变');
  assert.deepEqual(updateSticker(world, 9, { x: 0 }), world, '越界原样返回');
});

test('我的世界：resizeSticker 按步进增减且夹范围，removeSticker 按下标删除', () => {
  let world = [{ id: 'cat', x: 1, y: 2, size: STICKER_DEFAULT_SIZE }];
  world = resizeSticker(world, 0, STICKER_SIZE_STEP);
  assert.equal(world[0].size, STICKER_DEFAULT_SIZE + STICKER_SIZE_STEP);
  for (let i = 0; i < 20; i++) world = resizeSticker(world, 0, -STICKER_SIZE_STEP);
  assert.equal(world[0].size, STICKER_MIN_SIZE, '连续缩小不越下限');
  assert.deepEqual(resizeSticker(world, 5, 10), world, '越界原样返回');
  const two = addSticker(world, 'dog', 3, 4);
  assert.deepEqual(removeSticker(two, 0), [two[1]]);
  assert.equal(removeSticker(two, 0).length, 1);
});

test('我的世界：buildUnlockRound 是 3 图（1 对 + 2 干扰）、含正确答案、图两两不同', () => {
  const seed = WORDS.filter((w) => w.lvl === 'seed');
  const cat = seed.find((w) => w.id === 'cat');
  for (let s = 1; s <= 20; s++) {
    const round = buildUnlockRound(cat, seed, seededRng(s));
    assert.equal(round.options.length, 3);
    assert.equal(round.answerId, 'cat');
    assert.equal(round.options.filter((o) => o.id === 'cat').length, 1);
    assert.equal(new Set(round.options.map((o) => o.emoji)).size, 3, '3 图不重复');
  }
});

test('贴纸库：学过 = 翻过卡(seen) 或 做过题(progress)', () => {
  const seed = WORDS.filter((w) => w.lvl === 'seed');
  const lib = learnedStickerWords(seed, { cat: true }, { dog: { box: 1 } });
  assert.deepEqual(lib.map((w) => w.id).sort(), ['cat', 'dog'], 'seen 和 progress 都算学过');
  assert.deepEqual(learnedStickerWords(seed, {}, {}), [], '没学过 → 空');
});

test('可加进世界的词：学过的、且没摆进世界的（不重复）', () => {
  const seed = WORDS.filter((w) => w.lvl === 'seed');
  const seen = { cat: true, dog: true, fish: true };
  // fish 已经在世界里 → 不再出现在可加列表，保证不重复
  const avail = availableStickerWords(seed, seen, {}, ['fish']);
  assert.deepEqual(avail.map((w) => w.id).sort(), ['cat', 'dog']);
  // 全都摆过了 → 没有可加的
  assert.deepEqual(availableStickerWords(seed, seen, {}, ['cat', 'dog', 'fish']), []);
});

test('听指令：从场景词挑目标、从学过词挑要放的东西 + 2 干扰，指令格式正确', () => {
  const seed = WORDS.filter((w) => w.lvl === 'seed');
  const sceneWords = [seed.find((w) => w.id === 'cat')];       // 场景里有 cat 当参照物
  const learned = seed.filter((w) => ['apple', 'dog', 'sun', 'egg'].includes(w.id));
  for (let s = 1; s <= 20; s++) {
    const task = buildRoomTask(sceneWords, learned, [], seededRng(s));
    assert.equal(task.target.id, 'cat');
    assert.notEqual(task.item.id, 'cat', '要放的东西不能是参照物本身');
    assert.ok(task.choices.some((c) => c.id === task.answerId), '候选里必有正确项');
    assert.equal(new Set(task.choices.map((c) => c.emoji)).size, task.choices.length, '候选图不重复');
    assert.equal(task.prompt, `Put the ${task.item.en} next to the cat.`);
  }
});

test('听指令：要放的东西排除已在世界里的词（不重复）', () => {
  const seed = WORDS.filter((w) => w.lvl === 'seed');
  const sceneWords = [seed.find((w) => w.id === 'cat')];
  const learned = seed.filter((w) => ['apple', 'dog', 'sun', 'egg'].includes(w.id));
  for (let s = 1; s <= 20; s++) {
    // 其他词都已在世界里 → item 只能是 dog；它们仍可作为不落地的干扰选项
    const task = buildRoomTask(sceneWords, learned, ['cat', 'apple', 'sun', 'egg'], seededRng(s));
    assert.equal(task.item.id, 'dog', '其他词已摆过，只能放 dog');
  }
});

test('听指令：场景空或没有可放的词时返回 null（引导先摆/去学）', () => {
  const seed = WORDS.filter((w) => w.lvl === 'seed');
  assert.equal(buildRoomTask([], seed), null, '场景空 → null');
  const onlyCat = [seed.find((w) => w.id === 'cat')];
  assert.equal(buildRoomTask(onlyCat, []), null, '没学过词 → null');
  assert.equal(buildRoomTask(onlyCat, onlyCat), null, '学过的只有参照物自己 → null');
  const learned = seed.filter((w) => ['cat', 'dog'].includes(w.id));
  assert.equal(buildRoomTask(onlyCat, learned, ['cat', 'dog']), null, '能放的都摆过了 → null');
});

test('听指令：凑不齐两个不同图片干扰项时返回 null', () => {
  const cat = WORDS.find((w) => w.id === 'cat');
  const dog = WORDS.find((w) => w.id === 'dog');
  const apple = WORDS.find((w) => w.id === 'apple');
  assert.equal(buildRoomTask([cat], [dog, apple], [], seededRng(1)), null);
});

test('听指令：落点判定 isNear 按阈值内外区分', () => {
  assert.equal(isNear(50, 50, 55, 55), true, '很近 → 命中');
  assert.equal(isNear(10, 10, 90, 90), false, '很远 → 不命中');
  assert.equal(isNear(0, 0, ROOM_DROP_THRESHOLD, 0), true, '恰好等于阈值 → 命中');
  assert.equal(isNear(0, 0, ROOM_DROP_THRESHOLD + 1, 0), false, '超过阈值 → 不命中');
});

test('错题本：只收答错过且未掌握的词，按错误次数排序，掌握后自动移出', () => {
  const words = WORDS.slice(0, 5);
  const progress = {
    [words[0].id]: { box: 1, correct: 1, wrong: 3, nextDue: 0 }, // 错 3 次
    [words[1].id]: { box: 0, correct: 0, wrong: 1, nextDue: 0 }, // 错 1 次
    [words[2].id]: { box: 3, correct: 5, wrong: 2, nextDue: 0 }, // 错过但已掌握 → 移出
    [words[3].id]: { box: 2, correct: 2, wrong: 0, nextDue: 0 }, // 没错过
    // words[4] 没学过
  };
  const book = wrongBookWords(words, progress);
  assert.deepEqual(book.map((w) => w.id), [words[0].id, words[1].id]);
  assert.deepEqual(wrongBookWords(words, {}), []);
});

test('错题本奖励：仅正确作答并首次练到掌握时奖励 3 星', () => {
  const almostMastered = { box: MASTERED_BOX - 1, wrong: 2 };
  const mastered = { box: MASTERED_BOX, wrong: 2 };

  assert.equal(WRONG_BOOK_CLEAR_STARS, 3);
  assert.equal(wrongBookReward(almostMastered, mastered, true), 3, '首次掌握奖励 3 星');
  assert.equal(wrongBookReward(almostMastered, mastered, false), 0, '答错不能领奖');
  assert.equal(wrongBookReward(almostMastered, almostMastered, true), 0, '尚未掌握不能领奖');
  assert.equal(wrongBookReward(mastered, { ...mastered, box: MASTERED_BOX + 1 }, true), 0,
    '已经掌握的词不能重复领奖');
  assert.equal(wrongBookReward(undefined, mastered, true), 3, '缺少旧状态但首次达到掌握仍算毕业');
  assert.equal(wrongBookReward(almostMastered, mastered, true, true), 0,
    '已领过毕业奖励的词再次达到掌握也不能重复领奖');
});

test('毕业机制：levelMastery 统计掌握比例', () => {
  const words = WORDS.slice(0, 10);
  const progress = {};
  words.slice(0, 7).forEach((w) => { progress[w.id] = { box: 3 }; });
  const m = levelMastery(words, progress);
  assert.deepEqual(m, { mastered: 7, total: 10, ratio: 0.7 });
  assert.deepEqual(levelMastery([], {}), { mastered: 0, total: 0, ratio: 0 });
});

test('毕业机制：掌握 80% 才能解锁毕业挑战（边界）', () => {
  const words = WORDS.slice(0, 10);
  const progress = {};
  words.slice(0, 7).forEach((w) => { progress[w.id] = { box: 3 }; });
  assert.equal(canGraduate(words, progress), false, '70% 不够');
  assert.equal(wordsToGraduation(words, progress), 1);
  progress[words[7].id] = { box: 4 };
  assert.equal(canGraduate(words, progress), true, '80% 刚好解锁');
  assert.equal(wordsToGraduation(words, progress), 0);
  assert.ok(GRADUATION_THRESHOLD === 0.8);
});

test('毕业机制：nextLevelId 逐级向上，最高级返回 null', () => {
  const levels = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.equal(nextLevelId(levels, 'a'), 'b');
  assert.equal(nextLevelId(levels, 'b'), 'c');
  assert.equal(nextLevelId(levels, 'c'), null);
  assert.equal(nextLevelId(levels, 'nope'), null);
});

test('毕业机制：12 题答对 10 题才算通过（边界）', () => {
  assert.equal(isGraduationPassed(GRADUATION_PASS_CORRECT - 1), false);
  assert.equal(isGraduationPassed(GRADUATION_PASS_CORRECT), true);
  assert.equal(isGraduationPassed(12), true);
});

test('summarize：正确统计星星、正确率', () => {
  const s = summarize([
    { isCorrect: true, starsEarned: 1 },
    { isCorrect: true, starsEarned: 1 },
    { isCorrect: true, starsEarned: 2 },
    { isCorrect: false, starsEarned: 0 },
  ]);
  assert.deepEqual(s, { stars: 4, correct: 3, total: 4, accuracy: 75 });
  assert.deepEqual(summarize([]), { stars: 0, correct: 0, total: 0, accuracy: 0 });
});
