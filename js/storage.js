// 进度存储：localStorage 封装，测试时可注入内存后端
// v3：三人独立档案（Yoyo / Kiwi / 森蝶），各自独立的星星、进度和级别
// 注意：弟弟的档案 id 保持 'yodi' 不变（改了会丢历史进度），只改显示名

const KEY = 'yoyo-words-v1';
const CHILD_LEVEL_IDS = new Set(['seed', 'starters', 'movers', 'flyers']);
const ADULT_LEVEL_IDS = new Set(['life', 'cet4', 'cet6', 'postgrad']);
const PROFILE_LEVEL_IDS = {
  yoyo: CHILD_LEVEL_IDS,
  yodi: CHILD_LEVEL_IDS,
  mom: ADULT_LEVEL_IDS,
};
const SCENE_IDS = new Set(['grassland', 'desert', 'sea', 'river', 'forest', 'snow', 'sunset', 'space']);
const PROFILE_IDS = new Set(['yoyo', 'yodi', 'mom']);
const SPEECH_RATE_MIN = 0.5;
const SPEECH_RATE_MAX = 1.2;
const MAX_VOICE_URI_LENGTH = 240;
const STICKER_MIN_SIZE = 48;
const STICKER_MAX_SIZE = 168;
const MAX_BACKUP_CODE_LENGTH = 2_000_000;
const MAX_STORED_STATE_LENGTH = 2_000_000;
const MAX_RECORD_ENTRIES = 10_000;
const MAX_WORLD_ITEMS = 1_000;
const MAX_RECENT_WORDS = 24;
const SAFE_KEY = /^[a-z0-9][a-z0-9:_-]{0,63}$/i;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export const PROFILES = [
  { id: 'yoyo', name: 'Yoyo', title: '姐姐', emoji: '🎀', theme: 'pink', defaultLevel: 'movers' },
  // preReader：还不识字，界面走"图片 + 语音"模式（听音点图、中英双语朗读）
  { id: 'yodi', name: 'Kiwi', title: '弟弟', emoji: '🦖', theme: 'blue', defaultLevel: 'seed', preReader: true },
  { id: 'mom', name: '森蝶', title: '成人学习', emoji: '🌷', theme: 'sage', defaultLevel: 'cet4', adult: true },
];

export function findProfile(id) {
  return PROFILES.find((p) => p.id === id) || null;
}

export function memoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

export function defaultProfileState(profileId) {
  const p = findProfile(profileId);
  return {
    stars: 0,
    progress: {},
    level: p ? p.defaultLevel : 'seed',
    graduated: [],
    seen: {},     // 学过的单词（翻过卡片就算）
    learnPos: {}, // 每个分类/单元上次学到第几张卡片
    missions: {}, // 完成过的单元综合任务（句型 → 对话 → 自主表达）
    wrongbookRewarded: {}, // 已从错题本毕业并领取过奖励的单词（终身一次）
    roomRewarded: {}, // 听指令模式已领取过首次奖励的单词
    recentWords: [], // 跨刷新保留的近期出题词，用于避免短时间重复
    worlds: {},   // 「我的世界」按场景隔离的贴纸实例：{ [sceneId]: [{ id, x, y, size }] }
    worldScene: 'grassland', // 「我的世界」当前背景环境
  };
}

export function defaultState() {
  return {
    v: 3,
    current: null,     // 当前使用者，null 表示要先选人
    speechRate: 0.8,   // 全局朗读语速（慢 0.6 / 适中 0.8 / 快 1.0），可自选
    speechVoice: 'auto', // 英文音色 URI；auto 表示自动选择质量更好的英式声音
    profiles: {
      yoyo: defaultProfileState('yoyo'),
      yodi: defaultProfileState('yodi'),
      mom: defaultProfileState('mom'),
    },
  };
}

// v1（单档案）/ v2（姐弟双档案）→ v3（三档案）。
// KEY 故意保持不变，让旧设备在升级后能找到原存档。
function migrate(data) {
  if (isRecord(data) && (data.v === 2 || data.v === 3)) {
    return normalizeState(data);
  }
  const state = defaultState();
  if (isRecord(data) && (data.v === undefined || data.v === 1)) {
    // 早期单档存档的字段位于顶层，完整归入 Yoyo 的白名单字段。
    state.profiles.yoyo = normalizeProfile(data, 'yoyo');
    state.speechRate = finiteNumber(data.speechRate, state.speechRate, SPEECH_RATE_MIN, SPEECH_RATE_MAX);
    state.speechVoice = normalizeVoiceURI(data.speechVoice);
  }
  return state;
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value, fallback, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

function nonNegativeInteger(value, fallback = 0, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(max, Math.trunc(value)));
}

function safeEntries(value) {
  if (!isRecord(value)) return [];
  return Object.entries(value).slice(0, MAX_RECORD_ENTRIES);
}

function isSafeKey(value) {
  return SAFE_KEY.test(value) && !UNSAFE_OBJECT_KEYS.has(value.toLowerCase());
}

function normalizeProgress(value) {
  const out = {};
  for (const [id, entry] of safeEntries(value)) {
    if (!isSafeKey(id) || !isRecord(entry)) continue;
    out[id] = {
      box: nonNegativeInteger(entry.box, 0, 5),
      correct: nonNegativeInteger(entry.correct),
      wrong: nonNegativeInteger(entry.wrong),
      nextDue: nonNegativeInteger(entry.nextDue),
    };
  }
  return out;
}

function normalizeSeen(value) {
  const out = {};
  for (const [id, seen] of safeEntries(value)) {
    if (isSafeKey(id) && typeof seen === 'boolean') out[id] = seen;
  }
  return out;
}

function normalizeRewarded(value) {
  const out = {};
  for (const [id, rewarded] of safeEntries(value)) {
    if (isSafeKey(id) && rewarded === true) out[id] = true;
  }
  return out;
}

function normalizeRecentWords(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  const seen = new Set();
  for (const id of value.slice(0, MAX_RECORD_ENTRIES)) {
    if (typeof id !== 'string' || !isSafeKey(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_RECENT_WORDS) break;
  }
  return out;
}

function normalizeLearnPos(value) {
  const out = {};
  for (const [scope, position] of safeEntries(value)) {
    if (isSafeKey(scope) && Number.isInteger(position) && position >= 0) {
      out[scope] = Math.min(position, 1_000_000);
    }
  }
  return out;
}

function normalizeGraduated(value, profileId) {
  if (!Array.isArray(value)) return [];
  const allowedLevels = PROFILE_LEVEL_IDS[profileId] || CHILD_LEVEL_IDS;
  return [...new Set(value.filter((id) => typeof id === 'string' && allowedLevels.has(id)))];
}

function normalizeVoiceURI(value) {
  if (typeof value !== 'string' || !value || value.length > MAX_VOICE_URI_LENGTH) return 'auto';
  if (/[\u0000-\u001f\u007f]/.test(value)) return 'auto';
  return value;
}

function normalizeWorld(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const sticker of value.slice(0, MAX_WORLD_ITEMS)) {
    if (!isRecord(sticker) || typeof sticker.id !== 'string' || !isSafeKey(sticker.id)) continue;
    if (![sticker.x, sticker.y, sticker.size].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    out.push({
      id: sticker.id,
      x: finiteNumber(sticker.x, 50, 0, 100),
      y: finiteNumber(sticker.y, 50, 0, 100),
      size: Math.round(finiteNumber(sticker.size, 84, STICKER_MIN_SIZE, STICKER_MAX_SIZE)),
    });
  }
  return out;
}

function normalizeWorlds(value) {
  const out = {};
  for (const [sceneId, world] of safeEntries(value)) {
    if (!SCENE_IDS.has(sceneId)) continue;
    out[sceneId] = normalizeWorld(world);
  }
  return out;
}

function mergeWorldByStickerId(currentWorld, legacyWorld) {
  const out = [];
  const seenIds = new Set();
  // 新 worlds 排在前面：同一贴纸在新旧结构中都有时，保留新结构的布局。
  for (const sticker of [...currentWorld, ...legacyWorld]) {
    if (seenIds.has(sticker.id)) continue;
    seenIds.add(sticker.id);
    out.push(sticker);
    if (out.length >= MAX_WORLD_ITEMS) break;
  }
  return out;
}

function normalizeProfile(value, profileId) {
  const base = defaultProfileState(profileId);
  const input = isRecord(value) ? value : {};
  const allowedLevels = PROFILE_LEVEL_IDS[profileId] || CHILD_LEVEL_IDS;
  const worldScene = typeof input.worldScene === 'string' && SCENE_IDS.has(input.worldScene)
    ? input.worldScene
    : base.worldScene;
  const worlds = normalizeWorlds(input.worlds);
  // v2 / 早期 v3 使用单一 world 数组：按当时选中的场景迁入新结构。
  // 若过渡期数据同时含 world 和 worlds，则合并而非覆盖，确保旧贴纸不丢。
  const legacyWorld = normalizeWorld(input.world);
  if (legacyWorld.length > 0) {
    worlds[worldScene] = mergeWorldByStickerId(worlds[worldScene] || [], legacyWorld);
  }
  return {
    stars: nonNegativeInteger(input.stars, base.stars),
    progress: normalizeProgress(input.progress),
    level: typeof input.level === 'string' && allowedLevels.has(input.level) ? input.level : base.level,
    graduated: normalizeGraduated(input.graduated, profileId),
    seen: normalizeSeen(input.seen),
    learnPos: normalizeLearnPos(input.learnPos),
    missions: normalizeSeen(input.missions),
    wrongbookRewarded: normalizeRewarded(input.wrongbookRewarded),
    roomRewarded: normalizeRewarded(input.roomRewarded),
    recentWords: normalizeRecentWords(input.recentWords),
    worlds,
    worldScene,
  };
}

function normalizeState(data) {
  const input = isRecord(data) ? data : {};
  const profiles = isRecord(input.profiles) ? input.profiles : {};
  const base = defaultState();
  return {
    v: 3,
    current: typeof input.current === 'string' && PROFILE_IDS.has(input.current) ? input.current : null,
    speechRate: finiteNumber(input.speechRate, base.speechRate, SPEECH_RATE_MIN, SPEECH_RATE_MAX),
    speechVoice: normalizeVoiceURI(input.speechVoice),
    profiles: {
      yoyo: normalizeProfile(profiles.yoyo, 'yoyo'),
      yodi: normalizeProfile(profiles.yodi, 'yodi'),
      mom: normalizeProfile(profiles.mom, 'mom'),
    },
  };
}

// —— 存档备份：导出为一串备份码，可粘贴到另一台设备恢复 ——
export function encodeBackup(state) {
  // 导出只负责忠实编码；所有不可信输入统一在 decodeBackup 中校验和规范化。
  // 这样结构不完整的“备份”不会被悄悄洗成一份看似有效的默认存档。
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function decodeBackup(code) {
  try {
    if (typeof code !== 'string') return null;
    const trimmed = code.trim();
    if (!trimmed || trimmed.length > MAX_BACKUP_CODE_LENGTH) return null;
    const data = JSON.parse(decodeURIComponent(escape(atob(trimmed))));
    if (!isRecord(data) || (data.v !== 2 && data.v !== 3) || !isRecord(data.profiles)) return null;
    return normalizeState(data);
  } catch {
    return null;
  }
}

export function createStorage(backend) {
  const be = backend || (typeof localStorage !== 'undefined' ? localStorage : memoryBackend());

  function load() {
    try {
      const raw = be.getItem(KEY);
      if (!raw) return defaultState();
      if (typeof raw !== 'string' || raw.length > MAX_STORED_STATE_LENGTH) return defaultState();
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return defaultState();
      return migrate(data);
    } catch {
      return defaultState();
    }
  }

  function save(state) {
    try {
      const raw = JSON.stringify(normalizeState(state));
      if (raw.length > MAX_STORED_STATE_LENGTH) return false;
      be.setItem(KEY, raw);
      return true;
    } catch {
      return false;
    }
  }

  function reset() {
    be.removeItem(KEY);
  }

  return { load, save, reset };
}
