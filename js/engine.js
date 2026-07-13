// 核心学习引擎：出题、判分、间隔重复、奖励。全部为纯函数，便于单元测试。

export const BOX_INTERVALS_DAYS = [0, 1, 2, 4, 7, 15];
export const MAX_BOX = BOX_INTERVALS_DAYS.length - 1;
export const MASTERED_BOX = 3;
export const QUIZ_MODES = ['en2zh', 'zh2en', 'listen'];
export const DAY_MS = 24 * 60 * 60 * 1000;

export function shuffle(arr, rng = Math.random) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// 选干扰项：优先同分类，不够再从全库补，绝不包含正确答案、绝不重复
export function pickDistractors(word, pool, n = 3, rng = Math.random) {
  const sameForm = (w) => String(w.en).toLowerCase() === String(word.en).toLowerCase();
  // cook（厨师/做饭）、fly（苍蝇/飞）这类一词多义不能互相成为干扰项，
  // 否则选项会出现两个完全相同的英文。
  const eligible = (w) => w.id !== word.id && !sameForm(w);
  const sameCat = pool.filter((w) => eligible(w) && w.cat === word.cat);
  const others = pool.filter((w) => eligible(w) && w.cat !== word.cat);
  const picked = shuffle(sameCat, rng).slice(0, n);
  if (picked.length < n) {
    picked.push(...shuffle(others, rng).slice(0, n - picked.length));
  }
  return picked;
}

// 构造一道题：{ word, mode, options: [{id, label}], answerId, prompt }
export function buildQuestion(word, pool, mode, rng = Math.random) {
  const distractors = pickDistractors(word, pool, 3, rng);
  const ambiguous = pool.some((w) =>
    w.id !== word.id && String(w.en).toLowerCase() === String(word.en).toLowerCase()
  );
  const labelOf = (w) => (mode === 'en2zh' ? w.zh : mode === 'zh2en' ? w.en : w.en);
  const options = shuffle(
    [word, ...distractors].map((w) => ({ id: w.id, label: labelOf(w), emoji: w.emoji })),
    rng
  );
  const prompt = mode === 'en2zh' ? word.en : mode === 'zh2en' ? word.zh : '';
  return {
    word,
    mode,
    options,
    answerId: word.id,
    prompt,
    context: ambiguous && mode === 'en2zh' ? word.sentence : '',
    audioText: ambiguous && mode === 'listen' ? word.sentence : word.en,
  };
}

// 构造一关测验：count 道题，题型轮换
export function buildQuiz(words, pool, count, rng = Math.random) {
  const chosen = shuffle(words, rng).slice(0, Math.min(count, words.length));
  return chosen.map((w, i) => buildQuestion(w, pool, QUIZ_MODES[i % QUIZ_MODES.length], rng));
}

export function emptyEntry() {
  return { box: 0, correct: 0, wrong: 0, nextDue: 0 };
}

// 答题后更新一个单词的记忆状态（Leitner 间隔重复）
export function gradeAnswer(entry, isCorrect, now = Date.now()) {
  const source = entry && typeof entry === 'object' ? entry : {};
  const count = (value) => (Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0);
  const e = {
    box: Math.min(count(source.box), MAX_BOX),
    correct: count(source.correct),
    wrong: count(source.wrong),
    nextDue: count(source.nextDue),
  };
  const safeNow = Number.isFinite(now) ? now : Date.now();
  if (isCorrect) {
    e.box = Math.min(e.box + 1, MAX_BOX);
    e.correct += 1;
  } else {
    e.box = Math.min(e.box, 1);
    e.wrong += 1;
  }
  e.nextDue = safeNow + BOX_INTERVALS_DAYS[e.box] * DAY_MS;
  return e;
}

export function isMastered(entry) {
  return !!entry && entry.box >= MASTERED_BOX;
}

// 挑选本关要考的单词：到期的优先（按盒子低→高），不够再补新词
export function dueWords(words, progress, now = Date.now(), limit = 8) {
  const entries = progress && typeof progress === 'object' ? progress : {};
  const entryOf = (w) => entries[w.id];
  const due = words
    .filter((w) => entryOf(w) && entryOf(w).nextDue <= now)
    .sort((a, b) => entryOf(a).box - entryOf(b).box || entryOf(a).nextDue - entryOf(b).nextDue);
  const fresh = words.filter((w) => !entryOf(w));
  const rest = words.filter((w) => entryOf(w) && entryOf(w).nextDue > now);
  return [...due, ...fresh, ...rest].slice(0, Math.min(limit, words.length));
}

// 星星奖励：答对 1 颗，连击 3 的倍数额外 +1
export function starReward(combo) {
  if (!Number.isFinite(combo) || combo <= 0) return 0;
  return combo % 3 === 0 ? 2 : 1;
}

export function masteredCount(progress) {
  return Object.values(progress).filter((e) => isMastered(e)).length;
}

// —— 无字图片题（给不识字的小朋友）：听音选图，选项两两不同图 ——
export const PIC_QUIZ_SIZE = 6;

export function pickPicDistractors(word, pool, n = 3, rng = Math.random) {
  const ok = (w) => w.id !== word.id && w.emoji !== word.emoji;
  const sameCat = pool.filter((w) => ok(w) && w.cat === word.cat);
  const others = pool.filter((w) => ok(w) && w.cat !== word.cat);
  const picked = [];
  for (const cand of [...shuffle(sameCat, rng), ...shuffle(others, rng)]) {
    if (picked.length >= n) break;
    if (picked.some((p) => p.emoji === cand.emoji)) continue;
    picked.push(cand);
  }
  return picked;
}

export function buildPicQuestion(word, pool, rng = Math.random) {
  const distractors = pickPicDistractors(word, pool, 3, rng);
  const options = shuffle(
    [word, ...distractors].map((w) => ({ id: w.id, label: w.zh, emoji: w.emoji })),
    rng
  );
  return { word, mode: 'listen2pic', options, answerId: word.id, prompt: '' };
}

export function buildPicQuiz(words, pool, count, rng = Math.random) {
  const chosen = shuffle(words, rng).slice(0, Math.min(count, words.length));
  return chosen.map((w) => buildPicQuestion(w, pool, rng));
}

// Kiwi 每次只引入 2 项新内容，配 4 项已学内容；第一轮还没有旧内容时，
// 只围绕两项新内容重复练习，不一次塞进更多新词。
export function buildKiwiSession(words, progress, now = Date.now(), newLimit = 2, reviewLimit = 4) {
  const entries = progress && typeof progress === 'object' ? progress : {};
  const newItems = words.filter((w) => !entries[w.id]).slice(0, newLimit);
  const known = words.filter((w) => entries[w.id]);
  const reviewItems = dueWords(known, entries, now, reviewLimit);
  return { newItems, reviewItems, items: [...newItems, ...reviewItems] };
}

export function buildKiwiQuiz(session, pool, count = PIC_QUIZ_SIZE, rng = Math.random) {
  const base = [...session.newItems, ...session.reviewItems];
  if (!base.length) return [];
  const targets = [];
  for (let i = 0; i < count; i++) targets.push(base[i % base.length]);
  return targets.map((word) => buildPicQuestion(word, pool, rng));
}

// —— 写：拼单词（字母块）。只挑纯字母、3~10 位的词 ——
export function spellableWords(words) {
  return words.filter((w) => /^[a-zA-Z]{3,10}$/.test(w.en));
}

export function spellingTiles(word, rng = Math.random) {
  const letters = word.en.toLowerCase().split('');
  let out = shuffle(letters, rng);
  if (out.join('') === letters.join('') && letters.length > 2) {
    out = [...letters.slice(1), letters[0]];
  }
  return out;
}

// —— 读：组句子（把例句拆成乱序词块）——
export function sentenceTokens(sentence) {
  return String(sentence).split(/\s+/).filter(Boolean);
}

export function sentenceWords(words) {
  return words.filter((w) => {
    if (!w.sentence) return false;
    const n = sentenceTokens(w.sentence).length;
    return n >= 3 && n <= 9;
  });
}

// —— 说：跟读评分。用词级编辑距离同时衡量顺序、重复、漏词和多词 ——
export const SPEECH_PASS = 0.7;

export function speechScore(transcript, target) {
  const norm = (s) => String(s).toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const targetWords = norm(target);
  if (!targetWords.length) return 0;
  const heardWords = norm(transcript);
  const rows = targetWords.length + 1;
  const cols = heardWords.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const substitution = dp[i - 1][j - 1] + (targetWords[i - 1] === heardWords[j - 1] ? 0 : 1);
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, substitution);
    }
  }
  const scale = Math.max(targetWords.length, heardWords.length);
  return scale ? Math.max(0, (scale - dp[targetWords.length][heardWords.length]) / scale) : 0;
}

// —— 「我的世界」贴纸场景（仅姐姐）：全部纯函数，实例形如 { id, x, y, size } ——
export const STICKER_MIN_SIZE = 48;
export const STICKER_MAX_SIZE = 168;
export const STICKER_DEFAULT_SIZE = 84;
export const STICKER_SIZE_STEP = 24;

export function clampStickerSize(size) {
  return Math.max(STICKER_MIN_SIZE, Math.min(STICKER_MAX_SIZE, Math.round(size)));
}

export function addSticker(world, wordId, x, y, size = STICKER_DEFAULT_SIZE) {
  return [...world, { id: wordId, x, y, size: clampStickerSize(size) }];
}

export function updateSticker(world, index, patch) {
  if (index < 0 || index >= world.length) return world;
  return world.map((s, i) => (i === index ? { ...s, ...patch } : s));
}

export function resizeSticker(world, index, delta) {
  if (index < 0 || index >= world.length) return world;
  return world.map((s, i) => (i === index ? { ...s, size: clampStickerSize(s.size + delta) } : s));
}

export function removeSticker(world, index) {
  return world.filter((_, i) => i !== index);
}

// 解锁回合：1 个正确 + 2 个干扰图（复用听音点图的干扰项逻辑），共 3 张图
export function buildUnlockRound(word, pool, rng = Math.random) {
  const distractors = pickPicDistractors(word, pool, 2, rng);
  const options = shuffle(
    [word, ...distractors].map((w) => ({ id: w.id, emoji: w.emoji, label: w.zh })),
    rng
  );
  return { word, options, answerId: word.id };
}

// 学过的词：智能闯关做过题（有 progress）或翻过卡片（seen）都算
export function learnedStickerWords(pool, seen = {}, progress = {}) {
  return pool.filter((w) => (seen && seen[w.id]) || (progress && progress[w.id]));
}

// 可加进世界的词：学过的、且还没摆进世界的（保证世界里单词不重复）
export function availableStickerWords(pool, seen = {}, progress = {}, worldIds = []) {
  const inWorld = new Set(worldIds);
  return learnedStickerWords(pool, seen, progress).filter((w) => !inWorld.has(w.id));
}

// 听指令布置房间：从场景现有贴纸挑一个当参照物(target)，
// 从学过的词里挑要放的东西(item，排除已在世界里的以免重复) + 2 个干扰
export const ROOM_DROP_THRESHOLD = 24; // 落点与目标的百分比距离阈值

export function isNear(ax, ay, bx, by, threshold = ROOM_DROP_THRESHOLD) {
  return Math.hypot(ax - bx, ay - by) <= threshold;
}

export function buildRoomTask(sceneWords, learnedPool, worldIds = [], rng = Math.random) {
  if (!sceneWords.length || !learnedPool.length) return null;
  const target = shuffle(sceneWords, rng)[0];
  const exclude = new Set([target.id, ...worldIds]);
  const itemCandidates = learnedPool.filter((w) => !exclude.has(w.id) && w.emoji !== target.emoji);
  if (!itemCandidates.length) return null;
  const item = shuffle(itemCandidates, rng)[0];
  const decoyPool = learnedPool.filter((w) => w.id !== target.id);
  const distractors = pickPicDistractors(item, decoyPool, 2, rng);
  if (distractors.length < 2) return null;
  const choices = shuffle([item, ...distractors], rng);
  return {
    target,
    item,
    choices,
    answerId: item.id,
    prompt: `Put the ${item.en} next to the ${target.en}.`,
  };
}

// 错题本：答错过且尚未掌握的词，按错误次数从多到少排；练到掌握自动移出
export function wrongBookWords(words, progress) {
  return words
    .filter((w) => {
      const e = progress[w.id];
      return e && e.wrong > 0 && !isMastered(e);
    })
    .sort((a, b) => progress[b.id].wrong - progress[a.id].wrong);
}

// —— 词汇通关：掌握本级 80% 解锁挑战，12 题答对 10 题进入下一词汇级别 ——
export const GRADUATION_THRESHOLD = 0.8;
export const GRADUATION_QUIZ_SIZE = 12;
export const GRADUATION_PASS_CORRECT = 10;
export const GRADUATION_BONUS_STARS = 20;

export function levelMastery(words, progress) {
  const mastered = words.filter((w) => isMastered(progress[w.id])).length;
  return {
    mastered,
    total: words.length,
    ratio: words.length ? mastered / words.length : 0,
  };
}

export function canGraduate(words, progress) {
  return levelMastery(words, progress).ratio >= GRADUATION_THRESHOLD;
}

// 距离解锁词汇通关挑战还差几个单词
export function wordsToGraduation(words, progress) {
  const m = levelMastery(words, progress);
  return Math.max(0, Math.ceil(m.total * GRADUATION_THRESHOLD) - m.mastered);
}

export function nextLevelId(levels, id) {
  const i = levels.findIndex((l) => l.id === id);
  return i >= 0 && i < levels.length - 1 ? levels[i + 1].id : null;
}

export function isGraduationPassed(correctCount) {
  return correctCount >= GRADUATION_PASS_CORRECT;
}

// 结算一关：返回 { stars, correct, total, accuracy }
export function summarize(results) {
  const correct = results.filter((r) => r.isCorrect).length;
  const stars = results.reduce((s, r) => s + (r.starsEarned || 0), 0);
  const total = results.length;
  return { stars, correct, total, accuracy: total ? Math.round((correct / total) * 100) : 0 };
}
