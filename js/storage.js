// 进度存储：localStorage 封装，测试时可注入内存后端
// v2：姐弟双档案（Yoyo / Kiwi），各自独立的星星、进度和级别
// 注意：弟弟的档案 id 保持 'yodi' 不变（改了会丢历史进度），只改显示名

const KEY = 'yoyo-words-v1';

export const PROFILES = [
  { id: 'yoyo', name: 'Yoyo', title: '姐姐', emoji: '🎀', theme: 'pink', defaultLevel: 'movers' },
  // preReader：还不识字，界面走"图片 + 语音"模式（听音点图、中英双语朗读）
  { id: 'yodi', name: 'Kiwi', title: '弟弟', emoji: '🦖', theme: 'blue', defaultLevel: 'seed', preReader: true },
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
    world: [],    // 「我的世界」贴纸场景实例：{ id, x, y, size }（仅姐姐使用）
    worldScene: 'grassland', // 「我的世界」当前背景环境
  };
}

export function defaultState() {
  return {
    v: 2,
    current: null,     // 当前使用者，null 表示要先选人
    speechRate: 0.8,   // 全局朗读语速（慢 0.6 / 适中 0.8 / 快 1.0），可自选
    profiles: {
      yoyo: defaultProfileState('yoyo'),
      yodi: defaultProfileState('yodi'),
    },
  };
}

// v1（单档案）→ v2（双档案）：旧的星星和进度归 Yoyo
function migrate(data) {
  if (data.v === 2 && data.profiles) {
    const base = defaultState();
    return {
      ...base,
      current: data.current ?? null,
      speechRate: typeof data.speechRate === 'number' ? data.speechRate : base.speechRate,
      profiles: {
        yoyo: { ...base.profiles.yoyo, ...data.profiles.yoyo },
        yodi: { ...base.profiles.yodi, ...data.profiles.yodi },
      },
    };
  }
  const state = defaultState();
  if (typeof data.stars === 'number') state.profiles.yoyo.stars = data.stars;
  if (data.progress && typeof data.progress === 'object') {
    state.profiles.yoyo.progress = data.progress;
  }
  return state;
}

// —— 存档备份：导出为一串备份码，可粘贴到另一台设备恢复 ——
export function encodeBackup(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function decodeBackup(code) {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(String(code).trim()))));
    if (typeof data !== 'object' || data === null || data.v !== 2 || !data.profiles) return null;
    return data;
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
      const data = JSON.parse(raw);
      if (typeof data !== 'object' || data === null) return defaultState();
      return migrate(data);
    } catch {
      return defaultState();
    }
  }

  function save(state) {
    be.setItem(KEY, JSON.stringify(state));
  }

  function reset() {
    be.removeItem(KEY);
  }

  return { load, save, reset };
}
