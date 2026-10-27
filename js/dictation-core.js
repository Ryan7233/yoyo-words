// ✍️ 手写默写：词单解析、每个词走哪几步、结果汇总。纯逻辑，便于在 Node 里测试。
// 新词：看 → 读 → 盖住 → 写 → 对照；复习词：只听读音 → 写 → 对照。
// 写错了就回到“看”再写一次，不扣分；写两次还不对可以先跳过，下次再练。

export const DICTATION_MAX_WORDS = 15;
export const DICTATION_SKIP_AFTER = 2;

// 花园 ↔ 默写页之间的消息类型（同源 iframe + postMessage）
export const MSG_READY = 'yoyo-dictation:ready';
export const MSG_START = 'yoyo-dictation:start';
export const MSG_RESULT = 'yoyo-dictation:result';
export const MSG_CLOSE = 'yoyo-dictation:close';

const WORD_RE = /^[a-z][a-z'-]{0,19}$/i;
const KINDS = new Set(['new', 'review']);

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/** 校验并去重词单，最多 15 个；不合法的词直接丢掉 */
export function normalizeItems(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of raw) {
    const item = typeof entry === 'string' ? { word: entry } : entry;
    if (!item || typeof item !== 'object') continue;
    const word = cleanText(item.word, 20).toLowerCase();
    if (!WORD_RE.test(word) || seen.has(word)) continue;
    seen.add(word);
    out.push({
      word,
      kind: KINDS.has(item.kind) ? item.kind : 'new',
      zh: cleanText(item.zh, 24),
      emoji: cleanText(item.emoji, 8),
    });
    if (out.length >= DICTATION_MAX_WORDS) break;
  }
  return out;
}

/** 从地址里读词单：#new=sunny,hot&review=the,said */
export function parseHashItems(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  const list = (key, kind) => (params.get(key) || '')
    .split(',').map((word) => ({ word, kind }));
  return normalizeItems([...list('new', 'new'), ...list('review', 'review')]);
}

/** 每个词从哪一步开始：新词先看，复习词直接听写 */
export function firstStage(item) {
  return item.kind === 'review' ? 'write' : 'look';
}

/** 记一次对照结果；返回新的结果数组，不改原数组 */
export function recordCheck(results, word, ok) {
  const prev = results.find((r) => r.word === word.word);
  const attempts = (prev?.attempts || 0) + 1;
  const entry = {
    word: word.word,
    kind: word.kind,
    attempts,
    firstTry: prev ? prev.firstTry : ok,
    done: ok,
    skipped: false,
  };
  return [...results.filter((r) => r.word !== word.word), entry];
}

/** 写了两次还没写对，可以先跳过 */
export function canSkip(results, word) {
  const entry = results.find((r) => r.word === word.word);
  return !!entry && !entry.done && entry.attempts >= DICTATION_SKIP_AFTER;
}

export function markSkipped(results, word) {
  return results.map((r) => (r.word === word.word ? { ...r, skipped: true } : r));
}

export function summarizeDictation(items, results) {
  const byWord = new Map(results.map((r) => [r.word, r]));
  const words = items.map((item) => {
    const r = byWord.get(item.word);
    return {
      word: item.word,
      kind: item.kind,
      firstTry: !!r?.firstTry,
      done: !!r?.done,
      attempts: r?.attempts || 0,
    };
  });
  return {
    total: words.length,
    firstTry: words.filter((w) => w.firstTry).length,
    done: words.filter((w) => w.done).length,
    words,
  };
}
