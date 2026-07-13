import {
  LEVELS, WORDS, UNITS, SCENES, KIWI_ITEMS, KIWI_PACKS,
  wordsForLevel, categoriesForLevel, wordsByCategory,
  findLevel, findWord, unitWords, kiwiPackItems, findUnitContent,
} from './words.js';
import {
  buildQuiz, gradeAnswer, dueWords, starReward, summarize, isMastered,
  wrongBookWords, buildPicQuiz, buildKiwiSession, buildKiwiQuiz, PIC_QUIZ_SIZE,
  spellableWords, spellingTiles, sentenceWords, sentenceTokens, shuffle,
  speechScore, SPEECH_PASS,
  buildUnlockRound, addSticker, resizeSticker, removeSticker, STICKER_SIZE_STEP,
  learnedStickerWords, availableStickerWords, buildRoomTask, isNear,
  levelMastery, canGraduate, wordsToGraduation, nextLevelId, isGraduationPassed,
  GRADUATION_QUIZ_SIZE, GRADUATION_PASS_CORRECT, GRADUATION_BONUS_STARS, GRADUATION_THRESHOLD,
} from './engine.js';
import {
  createStorage, PROFILES, findProfile, encodeBackup, decodeBackup,
} from './storage.js';

const storage = createStorage();
let state = storage.load();

const app = document.getElementById('app');

// 每次换页都取消上一页尚未完成的延时任务和语音识别，避免旧回调把界面拉回去，
// 或误操作后来新开的测验。
let viewGeneration = 0;
const pendingViewTimers = new Set();
let activeRecognition = null;

function clearViewAsync() {
  for (const id of pendingViewTimers) clearTimeout(id);
  pendingViewTimers.clear();
  if (activeRecognition) {
    try { activeRecognition.abort(); } catch { /* 已经结束 */ }
    activeRecognition = null;
  }
}

function later(fn, delay) {
  const generation = viewGeneration;
  const id = setTimeout(() => {
    pendingViewTimers.delete(id);
    if (generation === viewGeneration) fn();
  }, delay);
  pendingViewTimers.add(id);
  return id;
}

// 版本号：每次发布跟着 sw.js 的 CACHE 一起改，方便确认是否更新到最新
const APP_VERSION = 'v18';

// 强制更新：只注销当前应用的 Service Worker、清理本应用缓存，再带时间戳重载。
async function forceUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const appScope = new URL('./', location.href).href;
      await Promise.all(
        regs.filter((r) => r.scope === appScope).map((r) => r.unregister())
      );
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith('yoyo-words-')).map((k) => caches.delete(k))
      );
    }
  } catch { /* 忽略，继续硬刷新 */ }
  location.replace(`${location.pathname}?_=${Date.now()}`);
}

function profile() {
  return findProfile(state.current);
}

function pdata() {
  return state.profiles[state.current];
}

function levelWords() {
  return wordsForLevel(pdata().level);
}

// —— 语音朗读（iOS Safari 原生支持，需要用户点击触发）——
export const SPEEDS = [
  { id: 'slow', label: '🐢 慢', rate: 0.6 },
  { id: 'mid',  label: '🐇 适中', rate: 0.8 },
  { id: 'fast', label: '⚡ 快', rate: 1.0 },
];

function rateFor(lang) {
  const base = state.speechRate || 0.8;
  // 中文比英文略快一点点，但不超过 1.1，读起来更自然
  return (lang || '').startsWith('zh') ? Math.min(base + 0.15, 1.1) : base;
}

// 切换下一题的停顿：语速越慢，留给孩子看/听的时间越长
function gap(base) {
  return Math.round(base + (0.85 - (state.speechRate || 0.8)) * 1600);
}

function speak(text, lang = 'en-GB') {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rateFor(lang);
  speechSynthesis.speak(u);
}

// 连续朗读多段（如英文单词 + 中文释义），给不识字的小朋友"听懂"用
function speakSeq(parts) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  for (const p of parts) {
    const u = new SpeechSynthesisUtterance(p.text);
    u.lang = p.lang || 'en-GB';
    u.rate = rateFor(p.lang);
    speechSynthesis.speak(u);
  }
}

// 语速选择行：一处全局设置，点了立即生效并保存
function speedRow() {
  const row = el('<div class="speed-row"><span class="speed-label">🔊 读得多快</span></div>');
  for (const sp of SPEEDS) {
    const active = Math.abs((state.speechRate || 0.8) - sp.rate) < 0.001;
    const chip = el(`<button class="speed-chip${active ? ' active' : ''}" aria-pressed="${active}">${sp.label}</button>`);
    chip.addEventListener('click', () => {
      state.speechRate = sp.rate;
      saveState();
      row.querySelectorAll('.speed-chip').forEach((c) => c.classList.remove('active'));
      row.querySelectorAll('.speed-chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');
      speak('OK'); // 立刻用新语速示范一下
    });
    row.appendChild(chip);
  }
  return row;
}

function saveState() {
  storage.save(state);
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function render(node) {
  clearViewAsync();
  viewGeneration += 1;
  app.innerHTML = '';
  app.appendChild(node);
  window.scrollTo(0, 0);
  const heading = node.querySelector('h1, h2, .topbar .title');
  if (heading) {
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }
}

function applyTheme() {
  const p = profile();
  document.body.dataset.theme = p ? p.theme : 'pink';
  document.title = p ? `${p.name} 的英语王国` : '英语王国';
}

// ————— 选人页：今天谁来学习？ —————
function showProfileSelect() {
  document.body.dataset.theme = 'pink';
  const node = el(`
    <div>
      <div class="mascot"><div class="yoyo"></div></div>
      <h1 style="text-align:center">英语王国 👑</h1>
      <p class="subtitle" style="text-align:center">今天谁来学习呀？</p>
      <div class="profile-grid" id="profiles"></div>
      <p class="footer-note">姐姐和弟弟的星星分开数，谁都不吃亏 💖</p>
      <button class="btn ghost" id="backup">💾 备份 / 恢复进度</button>
      <button class="btn ghost" id="force-update">🔄 更新到最新版（清缓存）</button>
      <p class="footer-note" id="ver">版本 ${APP_VERSION}</p>
    </div>
  `);
  node.querySelector('#backup').addEventListener('click', showBackup);
  node.querySelector('#force-update').addEventListener('click', () => {
    node.querySelector('#ver').textContent = '正在更新，请稍候…';
    forceUpdate();
  });
  const grid = node.querySelector('#profiles');
  for (const p of PROFILES) {
    const d = state.profiles[p.id];
    const lvl = findLevel(d.level);
    const routeLabel = p.preReader ? '🎧 听说启蒙' : `${lvl.emoji} ${lvl.name}`;
    const card = el(`
      <button class="profile-card theme-${p.theme}">
        <span class="avatar">${p.emoji}</span>
        <span class="pname">${p.name}</span>
        <span class="ptitle">${p.title} · ${routeLabel}</span>
        <span class="pstars">⭐ ${d.stars}</span>
      </button>
    `);
    card.addEventListener('click', () => {
      state.current = p.id;
      saveState();
      applyTheme();
      showHome();
    });
    grid.appendChild(card);
  }
  render(node);
}

// ————— Kiwi 首页：未识字儿童独立走“听说启蒙”，不展示考试级别 —————
function showKiwiHome() {
  const p = profile();
  const d = pdata();
  applyTheme();
  const learned = KIWI_ITEMS.filter((w) => d.seen[w.id] || d.progress[w.id]).length;
  const understood = KIWI_ITEMS.filter((w) => isMastered(d.progress[w.id])).length;
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="switch-user" aria-label="切换学习者">${p.emoji}</button>
        <div class="title">Kiwi 的听说小岛</div>
        <div style="width:44px"></div>
      </div>
      <div class="mascot"><div class="yoyo"></div></div>
      <p class="subtitle" style="text-align:center">先听懂，再开口；不用认识字 👂🗣️</p>
      <div class="stats">
        <div class="stat"><div class="num">⭐ ${d.stars}</div><div class="label">Kiwi 收集的星星</div></div>
        <div class="stat">
          <div class="num">${understood}/${KIWI_ITEMS.length}</div>
          <div class="label">已经听懂</div>
          <div class="progress-track" role="progressbar" aria-label="Kiwi 听说启蒙进度" aria-valuemin="0" aria-valuemax="${KIWI_ITEMS.length}" aria-valuenow="${understood}"><div class="progress-fill" style="width:${Math.round((understood / KIWI_ITEMS.length) * 100)}%"></div></div>
        </div>
      </div>
      <button class="btn kiwi-daily" id="kiwi-daily">▶️ 今日听说 · 只学 2 个新的</button>
      <p class="counter">已经接触 ${learned} / ${KIWI_ITEMS.length} 项 · 其余都是复习</p>
      <div id="speed-anchor"></div>
      <div class="cat-grid" id="kiwi-packs"></div>
      <p class="footer-note">为 Kiwi 特别制作 · 听声音、看图片、做动作 💙</p>
    </div>
  `);
  node.querySelector('#speed-anchor').replaceWith(speedRow());
  const grid = node.querySelector('#kiwi-packs');
  for (const pack of KIWI_PACKS) {
    const items = kiwiPackItems(pack.id);
    const packLearned = items.filter((w) => d.seen[w.id] || d.progress[w.id]).length;
    const card = el(`
      <button class="cat-card kiwi-pack" data-pack="${pack.id}">
        <span class="emoji">${pack.emoji}</span>${pack.name}
        <div class="sub">${pack.zh}</div>
        <div class="done">接触 ${packLearned}/${items.length}</div>
      </button>
    `);
    card.addEventListener('click', () => showCollection({
      key: `kiwi:${pack.id}`,
      title: pack.name,
      emoji: pack.emoji,
      words: items,
      pool: KIWI_ITEMS,
    }));
    grid.appendChild(card);
  }
  const wrongWords = wrongBookWords(KIWI_ITEMS, d.progress);
  if (wrongWords.length) {
    const wrongBtn = el(`<button class="btn wrong-book">📕 再听一听 · ${wrongWords.length} 项</button>`);
    wrongBtn.addEventListener('click', () => showCollection({
      key: 'kiwi:wrongbook', title: '再听一听', emoji: '📕', words: wrongWords,
      pool: KIWI_ITEMS, wrongbook: true,
    }));
    node.querySelector('#kiwi-daily').after(wrongBtn);
  }
  node.querySelector('#switch-user').addEventListener('click', showProfileSelect);
  node.querySelector('#kiwi-daily').addEventListener('click', startKiwiDaily);
  render(node);
}

function startKiwiDaily() {
  const session = buildKiwiSession(KIWI_ITEMS, pdata().progress, Date.now(), 2, 4);
  const questions = buildKiwiQuiz(session, KIWI_ITEMS, PIC_QUIZ_SIZE);
  if (!questions.length) return showKiwiHome();
  if (session.newItems.length) showKiwiIntro(session, questions, 0);
  else startQuiz(session.items, '今天的听说', { pool: KIWI_ITEMS, questions, kiwiDaily: true });
}

function showKiwiIntro(session, questions, idx) {
  const w = session.newItems[idx];
  const node = el(`
    <div class="kiwi-intro">
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="退出今日听说">✕</button>
        <div class="title">👂 新朋友 ${idx + 1}/${session.newItems.length}</div>
        <button class="icon-btn" id="replay" aria-label="再听一遍">🔊</button>
      </div>
      <div class="kid-stage">
        <div class="kid-stage-emoji">${w.emoji}</div>
        <div class="kid-stage-word">${w.en}</div>
        <p>${w.kind === 'command' ? '听一听，跟着做动作' : '听一听，指一指，再跟着说'}</p>
      </div>
      <button class="btn" id="next">${idx + 1 < session.newItems.length ? '➡️ 下一个' : '👂 开始听音点图'}</button>
    </div>
  `);
  const say = () => speakSeq([{ text: w.en }, { text: w.zh, lang: 'zh-CN' }, { text: w.en }]);
  node.querySelector('#back').addEventListener('click', showKiwiHome);
  node.querySelector('#replay').addEventListener('click', say);
  node.querySelector('#next').addEventListener('click', () => {
    if (idx + 1 < session.newItems.length) showKiwiIntro(session, questions, idx + 1);
    else startQuiz(session.items, '今天的听说', { pool: KIWI_ITEMS, questions, kiwiDaily: true });
  });
  render(node);
  say();
}

// ————— 首页 —————
function showHome() {
  const p = profile();
  if (!p) return showProfileSelect();
  applyTheme();
  if (p.preReader) return showKiwiHome();
  const d = pdata();
  const words = levelWords();
  const mastered = words.filter((w) => isMastered(d.progress[w.id])).length;
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="switch-user" title="换人" aria-label="切换学习者">${p.emoji}</button>
        <div class="title">${p.name} 的英语王国</div>
        <div style="width:44px"></div>
      </div>
      <div class="mascot"><div class="yoyo"></div></div>
      <p class="subtitle" style="text-align:center">Hi, ${p.name}! 👋 <span class="badge">${p.name} 专属</span></p>
      <div class="levels" id="levels"></div>
      <div class="stats">
        <div class="stat"><div class="num">⭐ ${d.stars}</div><div class="label">${p.name} 收集的星星</div></div>
        <div class="stat">
          <div class="num">${mastered}/${words.length}</div>
          <div class="label">本级已掌握</div>
          <div class="progress-track" role="progressbar" aria-label="本级掌握进度" aria-valuemin="0" aria-valuemax="${words.length}" aria-valuenow="${mastered}"><div class="progress-fill" style="width:${Math.round((mastered / words.length) * 100)}%"></div></div>
        </div>
      </div>
      <button class="btn" id="smart-quiz">🚀 智能闯关（复习 + 新词）</button>
      ${p.id === 'yoyo' ? '<button class="btn world-entry" id="world">🌍 我的世界（把单词摆出来）</button>' : ''}
      <div id="grad"></div>
      <div class="cat-grid" id="cats"></div>
      <p class="footer-note">为 ${p.name} 特别制作 💖</p>
    </div>
  `);
  const worldBtn = node.querySelector('#world');
  if (worldBtn) worldBtn.addEventListener('click', showWorld);
  node.querySelector('#cats').before(speedRow());

  const levelsBox = node.querySelector('#levels');
  for (const lvl of LEVELS) {
    const gradMark = d.graduated.includes(lvl.id) ? ' 🎓' : '';
    const chip = el(`
      <button class="level-chip ${lvl.id === d.level ? 'active' : ''}" aria-pressed="${lvl.id === d.level}">
        ${lvl.emoji} ${lvl.name}${gradMark}<span class="tag">${lvl.tag}</span>
      </button>
    `);
    chip.addEventListener('click', () => {
      d.level = lvl.id;
      saveState();
      showHome();
    });
    levelsBox.appendChild(chip);
  }

  // 这里仅表示应用内核心词汇通关，不等同于 Cambridge 真实等级考试通过。
  const gradBox = node.querySelector('#grad');
  const lvlInfo = findLevel(d.level);
  if (d.graduated.includes(d.level)) {
    const next = nextLevelId(LEVELS, d.level);
    gradBox.appendChild(el(`
      <div class="grad-card done">🎓 ${lvlInfo.name} 核心词汇已通关！${next ? '' : `${p.name} 已经是单词大王啦 👑`}</div>
    `));
  } else if (canGraduate(words, d.progress)) {
    const btn = el(`
      <button class="btn gold" id="grad-quiz">
        🎓 词汇通关挑战：${GRADUATION_QUIZ_SIZE} 题答对 ${GRADUATION_PASS_CORRECT} 题
      </button>
    `);
    btn.addEventListener('click', () => {
      startQuiz(words, `${lvlInfo.name} 词汇通关挑战`, { graduation: true });
    });
    gradBox.appendChild(btn);
  } else {
    const m = levelMastery(words, d.progress);
    const need = wordsToGraduation(words, d.progress);
    const pct = Math.min(100, Math.round((m.ratio / GRADUATION_THRESHOLD) * 100));
    gradBox.appendChild(el(`
      <div class="grad-card">
        <div class="grad-text">🎓 词汇通关挑战 · 再掌握 <b>${need}</b> 个单词解锁</div>
        <div class="progress-track" role="progressbar" aria-label="词汇通关挑战解锁进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="progress-fill gold" style="width:${pct}%"></div></div>
      </div>
    `));
  }

  // 错题本入口：有错题才显示
  const wrongWords = wrongBookWords(WORDS, d.progress);
  if (wrongWords.length > 0) {
    const wrongBtn = el(`
      <button class="btn wrong-book">📕 错题本 · ${wrongWords.length} 个词等着复习</button>
    `);
    wrongBtn.addEventListener('click', () => showCollection({
      key: 'wrongbook',
      title: '错题本',
      emoji: '📕',
      words: wrongBookWords(WORDS, pdata().progress),
      wrongbook: true,
    }));
    node.querySelector('#grad').after(wrongBtn);
  }

  // 分类/单元网格：Movers 级按 Power Up 2 课本单元学习，其他级别按主题分类
  const grid = node.querySelector('#cats');
  const cardFor = (info, words) => {
    const done = words.filter((w) => isMastered(d.progress[w.id])).length;
    const seen = words.filter((w) => d.seen[w.id]).length;
    const card = el(`
      <button class="cat-card" data-cat="${info.id}">
        <span class="emoji">${info.emoji}</span>${info.name}
        ${info.sub ? `<div class="sub">${info.sub}</div>` : ''}
        <div class="done">学过 ${seen} · 掌握 ${done}/${words.length}</div>
      </button>
    `);
    grid.appendChild(card);
    return card;
  };
  if (d.level === 'movers') {
    for (const u of UNITS) {
      const words = unitWords(u.id);
        cardFor({ id: u.id, emoji: u.emoji, name: u.name, sub: u.zh }, words)
        .addEventListener('click', () => showCollection({
          key: `unit:${u.id}`,
          unitId: u.id,
          title: `${u.name} ${u.zh}`,
          emoji: u.emoji,
          words,
        }));
    }
  } else {
    for (const c of categoriesForLevel(d.level)) {
      const words = wordsByCategory(c.id, d.level);
      cardFor(c, words).addEventListener('click', () => showCollection({
        key: `${d.level}:${c.id}`,
        title: c.name,
        emoji: c.emoji,
        words,
      }));
    }
  }

  node.querySelector('#switch-user').addEventListener('click', showProfileSelect);
  node.querySelector('#smart-quiz').addEventListener('click', () => {
    startQuiz(dueWords(levelWords(), pdata().progress, Date.now(), 8), '智能闯关');
  });
  render(node);
}

// ————— 分类 / 单元 / 错题本页 —————
function showCollection(scope) {
  const d = pdata();
  const preReader = !!profile().preReader;
  const savedIdx = Math.min(d.learnPos[scope.key] || 0, scope.words.length - 1);
  const learnLabel = preReader
    ? '🖼️ 看图学一学'
    : (savedIdx > 0 ? `📖 学一学（继续第 ${savedIdx + 1} 个）` : '📖 学一学（翻卡片）');
  const quizLabel = preReader ? '👂 听音点图（6 题）' : '🎯 考一考（8 道题闯关）';
  const unitContent = !preReader && scope.unitId ? findUnitContent(scope.unitId) : null;

  // 姐姐版四技能扩展模式：写（拼单词）、读（组句子）、说（跟读）
  const canSpell = !preReader && spellableWords(scope.words).length >= 4;
  const canBuild = !preReader && sentenceWords(scope.words).length >= 3;
  const modeGridHtml = preReader ? '' : `
    <div class="mode-grid">
      ${canSpell ? '<button class="mode-btn" id="spell">✍️ 拼一拼<span>看图拼单词</span></button>' : ''}
      ${canBuild ? '<button class="mode-btn" id="build">🧩 组句子<span>把句子拼回来</span></button>' : ''}
      <button class="mode-btn" id="speak-mode">🎙️ 跟读<span>大声读出来</span></button>
    </div>`;

  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回首页">←</button>
        <div class="title">${scope.emoji} ${scope.title}</div>
        <div style="width:44px"></div>
      </div>
      <div class="mascot"><div class="yoyo"></div></div>
      <p class="subtitle" style="text-align:center">${scope.wrongbook
        ? `${preReader ? '这些声音还需要再听一听' : '这些词答错过，多练几次就会啦'}！`
        : preReader
          ? `这里有 ${scope.words.length} 个声音、图片和动作等着 ${profile().name}！`
          : `这里有 ${scope.words.length} 个单词等着 ${profile().name}！`}</p>
      <button class="btn" id="learn">${learnLabel}</button>
      ${!preReader && savedIdx > 0 ? '<button class="btn ghost" id="restart">↺ 从第 1 个重新学</button>' : ''}
      <button class="btn secondary" id="quiz">${quizLabel}</button>
      ${unitContent ? `<button class="btn unit-mission" id="unit-mission">🌟 ${unitContent.title}${d.missions?.[scope.key] ? ' ✅' : ''}<span>${unitContent.goal}</span></button>` : ''}
      ${modeGridHtml}
      ${scope.wrongbook ? '<div class="wrong-list" id="wrong-list"></div>' : ''}
    </div>
  `);
  const spellBtn = node.querySelector('#spell');
  if (spellBtn) spellBtn.addEventListener('click', () => showSpelling(scope));
  const buildBtn = node.querySelector('#build');
  if (buildBtn) buildBtn.addEventListener('click', () => showSentenceBuilder(scope));
  const speakBtn = node.querySelector('#speak-mode');
  if (speakBtn) speakBtn.addEventListener('click', () => showSpeaking(scope));
  const missionBtn = node.querySelector('#unit-mission');
  if (missionBtn) missionBtn.addEventListener('click', () => showUnitMission(scope, unitContent, 0));
  if (scope.wrongbook) {
    const list = node.querySelector('#wrong-list');
    for (const w of scope.words) {
      list.appendChild(el(`
        <div class="wrong-item"><span>${w.emoji} ${w.en}</span><span>${w.zh} · 错 ${d.progress[w.id].wrong} 次</span></div>
      `));
    }
  }
  node.querySelector('#back').addEventListener('click', showHome);
  node.querySelector('#learn').addEventListener('click', () => showLearn(scope, scope.words, savedIdx));
  const restart = node.querySelector('#restart');
  if (restart) restart.addEventListener('click', () => showLearn(scope, scope.words, 0));
  node.querySelector('#quiz').addEventListener('click', () => {
    const quizWords = scope.wrongbook
      ? scope.words
      : dueWords(scope.words, d.progress, Date.now(), 8);
    startQuiz(quizWords, `${scope.title}闯关`, {
      pool: scope.pool || (scope.wrongbook ? (preReader ? KIWI_ITEMS : WORDS) : undefined),
      sourceScope: scope,
    });
  });
  render(node);
}

// Power Up 2 单元综合任务：句型输入 → 对话理解 → 自主输出。
function showUnitMission(scope, content, step) {
  const totalSteps = 3;
  const body = step === 0
    ? `<p class="subtitle" style="text-align:center">先把四个能直接使用的句型听熟</p>
       <div class="chunk-list" id="chunk-list">${content.chunks.map((x, i) => `
         <button class="chunk-card" data-index="${i}"><b>${x.en}</b><span>${x.zh}</span><i>🔊</i></button>
       `).join('')}</div>`
    : step === 1
      ? `<p class="subtitle" style="text-align:center">听完整对话，再分别点每一句跟读</p>
         <button class="btn secondary" id="play-all">▶️ 播放完整对话</button>
         <div class="dialogue-list" id="dialogue-list">${content.dialogue.map((x, i) => `
           <button class="dialogue-line" data-index="${i}"><span class="speaker-tag">${x.speaker}</span><b>${x.en}</b><small>${x.zh}</small></button>
         `).join('')}</div>`
      : `<div class="mission-card">
           <div class="big-emoji">🔭</div>
           <h2>${content.title}</h2>
           <p>${content.mission.zh}</p>
           <button class="btn secondary" id="hear-mission">🔊 听任务说明</button>
           <div class="mission-prompts">${content.mission.prompts.map((x) => `<div>💬 ${x}</div>`).join('')}</div>
           <p class="counter">不用逐字照读；看一张自然图片或窗外，自己选内容说出来。</p>
         </div>`;
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回单元">←</button>
        <div class="title">🌟 Unit 1 综合任务</div>
        <div style="width:44px"></div>
      </div>
      <div class="mission-progress">第 ${step + 1} 步 / 共 ${totalSteps} 步</div>
      ${body}
      <div class="learn-nav">
        <button class="btn secondary" id="prev" ${step === 0 ? 'disabled' : ''}>上一步</button>
        <button class="btn" id="next">${step === totalSteps - 1 ? '✅ 我完成四句话了' : '下一步'}</button>
      </div>
    </div>
  `);
  node.querySelector('#back').addEventListener('click', () => showCollection(scope));
  node.querySelector('#prev').addEventListener('click', () => showUnitMission(scope, content, step - 1));
  node.querySelector('#next').addEventListener('click', () => {
    if (step < totalSteps - 1) return showUnitMission(scope, content, step + 1);
    const d = pdata();
    d.missions ||= {};
    d.missions[scope.key] = true;
    saveState();
    speak('Brilliant! You finished the mission.');
    showCollection(scope);
  });
  node.querySelectorAll('.chunk-card').forEach((button) => {
    button.addEventListener('click', () => speak(content.chunks[Number(button.dataset.index)].en));
  });
  node.querySelectorAll('.dialogue-line').forEach((button) => {
    button.addEventListener('click', () => speak(content.dialogue[Number(button.dataset.index)].en));
  });
  const playAll = node.querySelector('#play-all');
  if (playAll) playAll.addEventListener('click', () => speakSeq(content.dialogue.map((line) => ({ text: line.en }))));
  const hearMission = node.querySelector('#hear-mission');
  if (hearMission) hearMission.addEventListener('click', () => speakSeq([
    { text: content.mission.instruction },
    ...content.mission.prompts.map((text) => ({ text })),
  ]));
  render(node);
}

// ————— 小结算页（拼一拼 / 组句子 / 跟读共用）—————
function showMiniResult(scope, title, results, retryFn) {
  const s = summarize(results);
  const praise = s.accuracy >= 80 ? '太厉害啦！🏆' : s.accuracy >= 50 ? '很不错，继续加油！💪' : '多练几次就熟啦！🌱';
  const node = el(`
    <div class="result">
      <div class="big-emoji">${s.accuracy >= 80 ? '🥳' : '🤗'}</div>
      <h2>${title}完成！</h2>
      <p class="subtitle">${praise}</p>
      <div class="stars-earned">收获 ⭐ × ${s.stars}</div>
      <div class="accuracy">首次答对 ${s.correct} / ${s.total}</div>
      <div style="margin-top:30px">
        <button class="btn" id="again">🔁 再来一轮</button>
        <button class="btn ghost" id="back-col">返回</button>
      </div>
    </div>
  `);
  node.querySelector('#again').addEventListener('click', retryFn);
  node.querySelector('#back-col').addEventListener('click', () => showCollection(scope));
  render(node);
  if (s.accuracy >= 80) confetti();
}

// ————— ✍️ 写：拼一拼（字母块拼单词）—————
function showSpelling(scope) {
  const words = shuffle(spellableWords(scope.words)).slice(0, 6);
  runSpelling(scope, words, 0, []);
}

function runSpelling(scope, words, idx, results, hadMistake = false) {
  if (idx >= words.length) return showMiniResult(scope, '拼一拼', results, () => showSpelling(scope));
  const w = words[idx];
  const letters = w.en.toLowerCase().split('');
  const tiles = spellingTiles(w);
  const built = [];
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="退出拼写练习">✕</button>
        <div class="title">✍️ 拼一拼</div>
        <div style="width:44px"></div>
      </div>
      <p class="counter">第 ${idx + 1} 个 / 共 ${words.length} 个</p>
      <div class="quiz-prompt compact">
        <div class="big">${w.emoji}</div>
        <div class="task">${w.zh} <button class="speaker small" id="replay" aria-label="重听单词">🔊</button></div>
      </div>
      <div class="slots" id="slots"></div>
      <div class="tiles" id="tiles"></div>
      <button class="btn ghost" id="undo">⌫ 退一格</button>
    </div>
  `);
  const slotsBox = node.querySelector('#slots');
  const tilesBox = node.querySelector('#tiles');
  const undoBtn = node.querySelector('#undo');
  let settled = false;

  function paint() {
    slotsBox.innerHTML = letters.map((_, i) =>
      `<span class="slot ${i < built.length ? 'filled' : ''}">${i < built.length ? tiles[built[i]] : ''}</span>`
    ).join('');
    [...tilesBox.children].forEach((btn, i) => { btn.disabled = built.includes(i); });
  }

  function finish(isCorrect) {
    if (settled) return;
    settled = true;
    undoBtn.disabled = true;
    [...tilesBox.children].forEach((btn) => { btn.disabled = true; });
    const d = pdata();
    d.progress[w.id] = gradeAnswer(d.progress[w.id], isCorrect);
    speak(w.en);
    if (isCorrect) {
      d.stars += 1;
      results.push({ isCorrect: !hadMistake, starsEarned: 1 });
      saveState();
      slotsBox.classList.add('ok');
      later(() => runSpelling(scope, words, idx + 1, results), gap(1300));
    } else {
      saveState();
      // 答错不跳走：填出正确拼法当提示、读一遍，稍后重拼同一个词
      slotsBox.classList.add('no');
      slotsBox.innerHTML = letters.map((ch) => `<span class="slot filled">${ch}</span>`).join('');
      slotsBox.after(el('<p class="counter redo-tip">看一看正确拼法，我们再拼一次 💪</p>'));
      later(() => runSpelling(scope, words, idx, results, true), gap(2400));
    }
  }

  tiles.forEach((ch, i) => {
    const t = el(`<button class="tile">${ch}</button>`);
    t.addEventListener('click', () => {
      if (built.length >= letters.length || built.includes(i)) return;
      built.push(i);
      paint();
      if (built.length === letters.length) {
        finish(built.map((j) => tiles[j]).join('') === letters.join(''));
      }
    });
    tilesBox.appendChild(t);
  });
  undoBtn.addEventListener('click', () => { built.pop(); paint(); });
  node.querySelector('#back').addEventListener('click', () => showCollection(scope));
  node.querySelector('#replay').addEventListener('click', () => speak(w.en));
  paint();
  render(node);
  speak(w.en);
}

// ————— 🧩 读：组句子（乱序词块拼回例句）—————
function showSentenceBuilder(scope) {
  const words = shuffle(sentenceWords(scope.words)).slice(0, 5);
  runSentence(scope, words, 0, []);
}

function runSentence(scope, words, idx, results, hadMistake = false) {
  if (idx >= words.length) return showMiniResult(scope, '组句子', results, () => showSentenceBuilder(scope));
  const w = words[idx];
  const tokens = sentenceTokens(w.sentence);
  const tiles = shuffle(tokens.map((t, i) => ({ t, i })));
  const built = [];
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="退出组句练习">✕</button>
        <div class="title">🧩 组句子</div>
        <div style="width:44px"></div>
      </div>
      <p class="counter">第 ${idx + 1} 句 / 共 ${words.length} 句</p>
      <div class="quiz-prompt compact">
        <div class="big">${w.emoji}</div>
        <div class="task">${w.en} · ${w.zh} <button class="speaker small" id="replay" aria-label="重听句子">🔊</button></div>
      </div>
      <div class="built-line" id="built"></div>
      <div class="tiles words" id="tiles"></div>
      <button class="btn ghost" id="undo">⌫ 退一个词</button>
    </div>
  `);
  const builtBox = node.querySelector('#built');
  const tilesBox = node.querySelector('#tiles');
  const undoBtn = node.querySelector('#undo');
  let settled = false;

  function paint() {
    builtBox.textContent = built.map((k) => tiles[k].t).join(' ') || '👇 点下面的词，把句子拼出来';
    builtBox.classList.toggle('empty', built.length === 0);
    [...tilesBox.children].forEach((btn, k) => { btn.disabled = built.includes(k); });
  }

  function finish(isCorrect) {
    if (settled) return;
    settled = true;
    undoBtn.disabled = true;
    [...tilesBox.children].forEach((btn) => { btn.disabled = true; });
    const d = pdata();
    d.progress[w.id] = gradeAnswer(d.progress[w.id], isCorrect);
    speak(w.sentence);
    if (isCorrect) {
      d.stars += 2;
      results.push({ isCorrect: !hadMistake, starsEarned: 2 });
      saveState();
      builtBox.classList.add('ok');
      later(() => runSentence(scope, words, idx + 1, results), gap(1900));
    } else {
      saveState();
      // 答错不跳走：给出正确句子当提示，稍后重拼同一句
      builtBox.classList.add('no');
      builtBox.innerHTML = `<div class="reveal">正确句子：<b>${w.sentence}</b><br>我们再拼一次 💪</div>`;
      later(() => runSentence(scope, words, idx, results, true), gap(2800));
    }
  }

  tiles.forEach((tk, k) => {
    const t = el(`<button class="tile word">${tk.t}</button>`);
    t.addEventListener('click', () => {
      if (built.includes(k)) return;
      built.push(k);
      paint();
      if (built.length === tokens.length) {
        finish(built.map((j) => tiles[j].t).join(' ') === w.sentence);
      }
    });
    tilesBox.appendChild(t);
  });
  undoBtn.addEventListener('click', () => { built.pop(); paint(); });
  node.querySelector('#back').addEventListener('click', () => showCollection(scope));
  node.querySelector('#replay').addEventListener('click', () => speak(w.sentence));
  paint();
  render(node);
  speak(w.sentence);
}

// ————— 🎙️ 说：跟读（语音识别打分，不支持时自评）—————
function showSpeaking(scope) {
  const pick = sentenceWords(scope.words).length >= 3 ? sentenceWords(scope.words) : scope.words;
  const words = shuffle(pick).slice(0, 5);
  runSpeaking(scope, words, 0, []);
}

function runSpeaking(scope, words, idx, results) {
  if (idx >= words.length) return showMiniResult(scope, '跟读', results, () => showSpeaking(scope));
  const w = words[idx];
  const target = w.sentence || w.en;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="退出跟读练习">✕</button>
        <div class="title">🎙️ 跟读</div>
        <div style="width:44px"></div>
      </div>
      <p class="counter">第 ${idx + 1} 个 / 共 ${words.length} 个</p>
      <div class="flashcard" id="card">
        <div class="emoji">${w.emoji}</div>
        <div class="en">${w.en}</div>
        ${w.sentence ? `<div class="sentence">💬 ${w.sentence}</div>` : `<div class="zh">${w.zh}</div>`}
        <div class="hint">👆 点卡片听示范，然后大声读出来</div>
      </div>
      ${SR
        ? '<button class="mic-btn" id="mic" aria-label="开始录音跟读">🎙️</button><p class="counter" id="status" aria-live="polite">点麦克风开始跟读</p>'
        : `<p class="counter">这台设备不支持语音识别，听完自己大声读，读完自己打分：</p>
           <button class="btn gold" id="self-ok">🌟 我读出来啦</button>
           <button class="btn ghost" id="self-retry">🔁 再听一遍</button>`}
    </div>
  `);
  const say = () => speak(target);
  node.querySelector('#card').addEventListener('click', say);
  node.querySelector('#back').addEventListener('click', () => showCollection(scope));
  let settled = false;

  function pass(starsEarned) {
    if (settled) return;
    settled = true;
    node.querySelectorAll('#mic, #self-ok, #self-retry, #skip').forEach((button) => { button.disabled = true; });
    if (activeRecognition) {
      try { activeRecognition.stop(); } catch { /* 已经结束 */ }
      activeRecognition = null;
    }
    const d = pdata();
    d.stars += starsEarned;
    saveState();
    results.push({ isCorrect: true, starsEarned });
    later(() => runSpeaking(scope, words, idx + 1, results), gap(1600));
  }

  if (SR) {
    const status = node.querySelector('#status');
    const mic = node.querySelector('#mic');
    mic.addEventListener('click', () => {
      if (settled || activeRecognition) return;
      if ('speechSynthesis' in window) speechSynthesis.cancel();
      const rec = new SR();
      activeRecognition = rec;
      rec.lang = 'en-US';
      rec.interimResults = false;
      mic.disabled = true;
      mic.classList.add('recording');
      status.textContent = '🎙️ 大声读出来吧…';
      rec.onresult = (e) => {
        if (settled) return;
        activeRecognition = null;
        mic.classList.remove('recording');
        const transcript = e.results[0][0].transcript;
        const score = speechScore(transcript, target);
        if (score >= SPEECH_PASS) {
          status.textContent = `⭐ 读得真棒！（听到："${transcript}"）`;
          speakSeq([{ text: 'Great job!' }]);
          pass(2);
        } else {
          status.textContent = `我听到："${transcript}"，再试一次！`;
          mic.disabled = false;
        }
      };
      rec.onerror = () => {
        activeRecognition = null;
        if (settled) return;
        mic.classList.remove('recording');
        mic.disabled = false;
        status.textContent = '没听清，再点麦克风试一次（或跳过）';
      };
      rec.onend = () => {
        if (activeRecognition === rec) activeRecognition = null;
        mic.classList.remove('recording');
        if (!settled) mic.disabled = false;
      };
      try {
        rec.start();
      } catch {
        activeRecognition = null;
        mic.disabled = false;
        status.textContent = '麦克风启动失败，再试一次';
      }
    });
    // 允许跳过，防止卡住
    const skip = el('<button class="btn ghost" id="skip">下一个 →</button>');
    skip.addEventListener('click', () => {
      if (settled) return;
      settled = true;
      if (activeRecognition) {
        try { activeRecognition.abort(); } catch { /* 已经结束 */ }
        activeRecognition = null;
      }
      results.push({ isCorrect: false, starsEarned: 0 });
      runSpeaking(scope, words, idx + 1, results);
    });
    node.appendChild(skip);
  } else {
    node.querySelector('#self-ok').addEventListener('click', () => pass(1));
    node.querySelector('#self-retry').addEventListener('click', say);
  }
  render(node);
  say();
}

// ————— 🌍 我的世界：贴纸场景（仅姐姐 Yoyo）—————
let worldSel = null; // 当前选中的贴纸下标

function clampPct(v) {
  return Math.max(4, Math.min(96, v));
}

// 学过的词都摆完了 / 还没学过 —— 引导去智能闯关
function showNeedLearn(title) {
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回我的世界">←</button>
        <div class="title">${title}</div>
        <div style="width:44px"></div>
      </div>
      <div class="mascot"><div class="yoyo"></div></div>
      <p class="subtitle" style="text-align:center">先去"🚀 智能闯关"学几个单词，<br>学会的词就能来"我的世界"摆啦！<br>（同一个单词只会有一个，不重复）</p>
      <button class="btn" id="quiz">🚀 去智能闯关</button>
      <button class="btn ghost" id="back2">← 回我的世界</button>
    </div>
  `);
  node.querySelector('#quiz').addEventListener('click', () => {
    startQuiz(dueWords(levelWords(), pdata().progress, Date.now(), 8), '智能闯关');
  });
  const toWorld = () => showWorld();
  node.querySelector('#back').addEventListener('click', toWorld);
  node.querySelector('#back2').addEventListener('click', toWorld);
  render(node);
}

// Story 1：听音找它，答对解锁一个贴纸飞进场景（只从"学过且没摆过"的词里出）
function showUnlock() {
  const d = pdata();
  const available = availableStickerWords(WORDS, d.seen, d.progress, d.world.map((s) => s.id));
  if (!available.length) return showNeedLearn('➕ 加一个');
  // 在学过的词里，交给 SRS 调度优先挑到期复习的
  const word = dueWords(available, d.progress, Date.now(), 1)[0];
  const round = buildUnlockRound(word, levelWords());
  const ask = () => speak(`Where is the ${word.en}?`);
  let solved = false;

  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回我的世界">←</button>
        <div class="title">➕ 加一个</div>
        <button class="icon-btn" id="replay" aria-label="重听问题">🔊</button>
      </div>
      <p class="unlock-q">👂 Where is the <b>${word.en}</b>?<br><span>${word.zh} 在哪里呀？点一点 👇</span></p>
      <div class="unlock-choices" id="choices"></div>
    </div>
  `);
  const choices = node.querySelector('#choices');
  round.options.forEach((opt) => {
    const b = el(`<button class="unlock-pic" data-id="${opt.id}" aria-label="${opt.label}">${opt.emoji}</button>`);
    b.addEventListener('click', () => {
      if (solved) return;
      if (opt.id === round.answerId) {
        solved = true;
        // 复用现有 SRS "答对"（不新写记忆算法）
        d.progress[word.id] = gradeAnswer(d.progress[word.id], true);
        d.seen[word.id] = true; // 解锁即"学过"，进贴纸库
        // 贴纸落进场景，中心附近轻微错开避免完全重叠
        const spawn = [[50, 52], [40, 44], [60, 58], [46, 64], [58, 40], [34, 60]][d.world.length % 6];
        d.world = addSticker(d.world, word.id, spawn[0], spawn[1]);
        saveState();
        b.classList.add('correct', 'fly');
        speakSeq([{ text: word.en }, { text: '真棒！', lang: 'zh-CN' }]);
        later(showWorld, 900);
      } else {
        b.classList.add('shake');
        later(() => b.classList.remove('shake'), 500);
        ask();
      }
    });
    choices.appendChild(b);
  });
  node.querySelector('#back').addEventListener('click', showWorld);
  node.querySelector('#replay').addEventListener('click', ask);
  render(node);
  ask();
}

// Story 2 + 3：自由摆放（拖/放大/缩小/删除），每次改动自动存
function showWorld() {
  worldSel = null;
  const d = pdata();
  // 同一个单词在世界里只保留一个（"不要重复"，顺手清掉历史重复）
  const seenIds = new Set();
  const deduped = d.world.filter((s) => (seenIds.has(s.id) ? false : seenIds.add(s.id)));
  if (deduped.length !== d.world.length) { d.world = deduped; saveState(); }
  const curScene = SCENES.find((s) => s.id === (d.worldScene || 'grassland')) || SCENES[0];
  const node = el(`
    <div class="world-page">
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回首页">←</button>
        <div class="title">🌍 ${profile().name} 的世界</div>
        <button class="icon-btn" id="add-top" aria-label="添加贴纸">➕</button>
      </div>
      <button class="btn secondary scene-open" id="scene-open">🖼️ 换背景（现在：${curScene.emoji} ${curScene.name}）</button>
      <div class="scene scene--${d.worldScene || 'grassland'}" id="scene">
        <div class="stickers" id="stickers"></div>
        <div class="scene-hint" id="hint"></div>
      </div>
      <div class="sticker-tools" id="tools" hidden>
        <button class="tool" id="bigger">➕ 大</button>
        <button class="tool" id="smaller">➖ 小</button>
        <button class="tool danger" id="del">🗑️ 删除</button>
      </div>
      <button class="btn add-btn" id="add">➕ 加一个（听音解锁）</button>
      <div class="world-actions">
        <button class="btn secondary" id="library">📖 贴纸库</button>
        <button class="btn secondary" id="room">🎧 听指令</button>
      </div>
    </div>
  `);
  const scene = node.querySelector('#scene');
  const layer = node.querySelector('#stickers');
  const tools = node.querySelector('#tools');
  const hint = node.querySelector('#hint');
  node.querySelector('#scene-open').addEventListener('click', showScenePicker);

  function paint() {
    layer.innerHTML = '';
    d.world.forEach((s, i) => {
      const w = findWord(s.id);
      if (!w) return;
      const t = el(`<button class="sticker${i === worldSel ? ' selected' : ''}" data-i="${i}" aria-label="${w.en}，${w.zh}">${w.emoji}</button>`);
      t.style.left = s.x + '%';
      t.style.top = s.y + '%';
      t.style.fontSize = s.size + 'px';
      layer.appendChild(t);
    });
    tools.hidden = worldSel === null;
    hint.style.display = d.world.length ? 'none' : '';
    hint.textContent = d.world.length ? '' : '点 ➕ 加一个，把单词摆进你的世界 🌱';
  }

  // 拖拽 + 点击（移动超阈值算拖，否则算点：点=选中并读英文）
  let drag = null;
  layer.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.sticker');
    if (!t) return;
    const i = +t.dataset.i;
    worldSel = i;
    paint();
    const rect = scene.getBoundingClientRect();
    drag = { i, moved: false, startX: e.clientX, startY: e.clientY, rect };
    const sel = layer.querySelector(`.sticker[data-i="${i}"]`);
    if (sel) sel.setPointerCapture(e.pointerId);
  });
  layer.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.startX) > 6 || Math.abs(e.clientY - drag.startY) > 6) drag.moved = true;
    if (!drag.moved || !d.world[drag.i]) return;
    const x = clampPct(((e.clientX - drag.rect.left) / drag.rect.width) * 100);
    const y = clampPct(((e.clientY - drag.rect.top) / drag.rect.height) * 100);
    d.world[drag.i] = { ...d.world[drag.i], x, y };
    const sel = layer.querySelector(`.sticker[data-i="${drag.i}"]`);
    if (sel) { sel.style.left = x + '%'; sel.style.top = y + '%'; }
  });
  layer.addEventListener('pointerup', () => {
    if (!drag) return;
    const sel = layer.querySelector(`.sticker[data-i="${drag.i}"]`);
    if (drag.moved) {
      saveState(); // 自动存
      if (sel) { sel.classList.add('dropped'); later(() => sel.classList.remove('dropped'), 200); }
    } else {
      const w = findWord(d.world[drag.i].id); // 点一下：再读一遍英文
      if (w) speak(w.en);
    }
    drag = null;
  });
  scene.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.sticker')) { worldSel = null; paint(); }
  });

  node.querySelector('#bigger').addEventListener('click', () => {
    if (worldSel === null) return;
    d.world = resizeSticker(d.world, worldSel, STICKER_SIZE_STEP);
    saveState(); paint();
  });
  node.querySelector('#smaller').addEventListener('click', () => {
    if (worldSel === null) return;
    d.world = resizeSticker(d.world, worldSel, -STICKER_SIZE_STEP);
    saveState(); paint();
  });
  node.querySelector('#del').addEventListener('click', () => {
    if (worldSel === null) return;
    d.world = removeSticker(d.world, worldSel);
    worldSel = null;
    saveState(); paint();
  });
  node.querySelector('#back').addEventListener('click', showHome);
  node.querySelector('#add').addEventListener('click', showUnlock);
  node.querySelector('#add-top').addEventListener('click', showUnlock);
  node.querySelector('#library').addEventListener('click', showStickerLibrary);
  node.querySelector('#room').addEventListener('click', showRoomGame);

  render(node);
  paint();
}

// 🖼️ 选背景：九宫格，每个环境一张带真实预览的大卡片，点一个就选中
function showScenePicker() {
  const d = pdata();
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回我的世界">←</button>
        <div class="title">🖼️ 选个背景</div>
        <div style="width:44px"></div>
      </div>
      <p class="subtitle" style="text-align:center">点一个，就是 ${profile().name} 世界的背景啦！</p>
      <div class="scene-grid" id="grid"></div>
    </div>
  `);
  const grid = node.querySelector('#grid');
  for (const sc of SCENES) {
    const active = (d.worldScene || 'grassland') === sc.id;
    const card = el(`
      <button class="scene-card${active ? ' active' : ''}" data-scene="${sc.id}" aria-pressed="${active}">
        <span class="scene-preview scene--${sc.id}"></span>
        <span class="scene-name">${sc.emoji} ${sc.name}${active ? ' ✓' : ''}</span>
      </button>
    `);
    card.addEventListener('click', () => {
      d.worldScene = sc.id;
      saveState();
      showWorld();
    });
    grid.appendChild(card);
  }
  node.querySelector('#back').addEventListener('click', showWorld);
  render(node);
}

// 📖 贴纸库：她学过的词，点一个直接放进世界（学得越多，能选的越多）
function showStickerLibrary() {
  const d = pdata();
  // 只列"学过且还没摆进世界"的词——摆过的不再出现，保证不重复
  const available = availableStickerWords(WORDS, d.seen, d.progress, d.world.map((s) => s.id));
  if (!available.length) return showNeedLearn('📖 我的贴纸库');
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回我的世界">←</button>
        <div class="title">📖 我的贴纸库</div>
        <div style="width:44px"></div>
      </div>
      <p class="subtitle" style="text-align:center">还有 ${available.length} 个学过的词可以摆，点一个放进世界 🌍</p>
      <div class="lib-grid" id="lib"></div>
    </div>
  `);
  const grid = node.querySelector('#lib');
  for (const w of available) {
    const item = el(`<button class="lib-item" data-id="${w.id}"><span class="e">${w.emoji}</span><span class="w">${w.en}</span></button>`);
    item.addEventListener('click', () => {
      const spawn = [[50, 52], [40, 44], [60, 58], [46, 64], [58, 40], [34, 60]][d.world.length % 6];
      d.world = addSticker(d.world, w.id, spawn[0], spawn[1]);
      saveState();
      speak(w.en);
      showWorld();
    });
    grid.appendChild(item);
  }
  node.querySelector('#back').addEventListener('click', showWorld);
  render(node);
}

// 🎧 听指令布置房间：听 "Put the X next to the Y"，从贴纸库拖对的东西放到目标旁
const ROOM_ROUNDS = 3;

function showRoomGame() {
  runRoomTask(1, 0);
}

function runRoomTask(roundIdx, earned) {
  const d = pdata();
  const worldIds = d.world.map((s) => s.id);
  const sceneWords = [...new Set(worldIds)].map(findWord).filter(Boolean);
  const learned = learnedStickerWords(WORDS, d.seen, d.progress);
  // 要放进去的东西排除已在世界里的，保证不重复
  const task = roundIdx <= ROOM_ROUNDS ? buildRoomTask(sceneWords, learned, worldIds) : null;

  if (!task) {
    if (roundIdx > 1) return roomDone(earned); // 玩过几轮，正常结束
    if (!sceneWords.length) {
      // 世界还空：引导先摆几个贴纸
      const need = el(`
        <div>
          <div class="topbar">
            <button class="icon-btn" id="back" aria-label="返回我的世界">←</button>
            <div class="title">🎧 听指令</div>
            <div style="width:44px"></div>
          </div>
          <div class="mascot"><div class="yoyo"></div></div>
          <p class="subtitle" style="text-align:center">先在世界里摆几个贴纸（用"➕ 加一个"或"📖 贴纸库"），<br>再来玩"听指令布置房间"吧！</p>
          <button class="btn" id="go">好的，去摆贴纸</button>
        </div>
      `);
      need.querySelector('#back').addEventListener('click', showWorld);
      need.querySelector('#go').addEventListener('click', showWorld);
      return render(need);
    }
    // 有贴纸但没有新的可放的词 → 去学更多
    return showNeedLearn('🎧 听指令');
  }

  const say = () => speak(task.prompt);
  const node = el(`
    <div class="room-page">
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="退出听指令游戏">✕</button>
        <div class="title">🎧 听指令 ${roundIdx}/${ROOM_ROUNDS}</div>
        <button class="icon-btn" id="replay" aria-label="重听指令">🔊</button>
      </div>
      <div class="room-task">
        👂 把 <b>${task.item.zh}</b>（${task.item.en}）放到 <b>${task.target.zh}</b> 旁边
        <div class="room-flash" id="flash" aria-live="polite"></div>
      </div>
      <div class="scene room-scene scene--${d.worldScene || 'grassland'}" id="scene"><div class="stickers" id="stickers"></div></div>
      <p class="counter">👇 从下面找到它，拖到房间里</p>
      <div class="room-tray" id="tray"></div>
    </div>
  `);
  const scene = node.querySelector('#scene');
  const layer = node.querySelector('#stickers');
  const tray = node.querySelector('#tray');
  const flash = node.querySelector('#flash');
  let settled = false;

  // 只读渲染现有贴纸，目标贴纸加脉冲高亮帮她定位
  d.world.forEach((s) => {
    const w = findWord(s.id);
    if (!w) return;
    const t = el(`<div class="sticker${s.id === task.target.id ? ' target-hint' : ''}">${w.emoji}</div>`);
    t.style.left = s.x + '%';
    t.style.top = s.y + '%';
    t.style.fontSize = s.size + 'px';
    layer.appendChild(t);
  });

  // 候选托盘：正确项 + 干扰，拖到场景判定
  for (const w of task.choices) {
    const pic = el(`<button class="tray-pic" data-id="${w.id}" aria-label="${w.zh}">${w.emoji}</button>`);
    pic.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      const targetSticker = d.world.find((s) => s.id === task.target.id);
      if (!targetSticker) return;
      const rect = scene.getBoundingClientRect();
      const x = Math.min(92, targetSticker.x + 8);
      const y = targetSticker.y;
      judgeDrop(
        w.id,
        rect.left + (x / 100) * rect.width,
        rect.top + (y / 100) * rect.height
      );
    });
    tray.appendChild(pic);
  }

  function showFlash(msg) {
    flash.textContent = msg;
    flash.classList.add('show');
    later(() => flash.classList.remove('show'), 1400);
  }

  function judgeDrop(id, clientX, clientY) {
    if (settled) return;
    const rect = scene.getBoundingClientRect();
    const inScene = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    if (id !== task.answerId) { showFlash(`这个不是 ${task.item.zh} 哦，再找找 👀`); return; }
    if (!inScene) { showFlash(`拖到房间里，放到 ${task.target.zh} 旁边`); return; }
    const dropX = ((clientX - rect.left) / rect.width) * 100;
    const dropY = ((clientY - rect.top) / rect.height) * 100;
    const near = d.world.some((s) => s.id === task.target.id && isNear(dropX, dropY, s.x, s.y));
    if (!near) { showFlash(`放到 ${task.target.zh} 旁边哦，再试一次 💪`); return; }
    // 成功：放下并留在场景
    settled = true;
    tray.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    d.world = addSticker(d.world, task.item.id, dropX, dropY);
    d.stars += 2;
    saveState();
    speakSeq([{ text: 'Well done!' }, { text: '真棒！', lang: 'zh-CN' }]);
    later(() => runRoomTask(roundIdx + 1, earned + 2), gap(1400));
  }

  // 跨容器拖拽：按住托盘图 → 浮层跟手 → 松手判定落点
  tray.addEventListener('pointerdown', (e) => {
    if (settled) return;
    const pic = e.target.closest('.tray-pic');
    if (!pic) return;
    const id = pic.dataset.id;
    const floating = el(`<div class="floating-pic">${pic.textContent}</div>`);
    document.body.appendChild(floating);
    const moveTo = (x, y) => { floating.style.left = `${x}px`; floating.style.top = `${y}px`; };
    moveTo(e.clientX, e.clientY);
    const cleanup = () => {
      pic.removeEventListener('pointermove', onMove);
      pic.removeEventListener('pointerup', onUp);
      pic.removeEventListener('pointercancel', onCancel);
      floating.remove();
    };
    const onMove = (ev) => moveTo(ev.clientX, ev.clientY);
    const onUp = (ev) => { cleanup(); judgeDrop(id, ev.clientX, ev.clientY); };
    const onCancel = () => cleanup();
    // 先挂监听，再尝试指针捕获（合成事件/旧浏览器捕获会抛错，忽略即可）
    pic.addEventListener('pointermove', onMove);
    pic.addEventListener('pointerup', onUp);
    pic.addEventListener('pointercancel', onCancel);
    try { pic.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  });

  node.querySelector('#back').addEventListener('click', showWorld);
  node.querySelector('#replay').addEventListener('click', say);
  render(node);
  say();
}

function roomDone(earned) {
  const node = el(`
    <div class="result">
      <div class="big-emoji">🏡</div>
      <h2>房间布置好啦！</h2>
      <p class="subtitle">${profile().name} 听指令超厉害！</p>
      <div class="stars-earned">收获 ⭐ × ${earned}</div>
      <div style="margin-top:30px">
        <button class="btn" id="again">🎧 再玩一次</button>
        <button class="btn ghost" id="back">回到我的世界</button>
      </div>
    </div>
  `);
  node.querySelector('#again').addEventListener('click', showRoomGame);
  node.querySelector('#back').addEventListener('click', showWorld);
  render(node);
  if (earned > 0) confetti();
}

// ————— 备份 / 恢复 —————
function showBackup() {
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回选择学习者">←</button>
        <div class="title">💾 备份 / 恢复</div>
        <div style="width:44px"></div>
      </div>
      <p class="subtitle">备份码包含两个人的全部星星和学习进度。换手机或重装时，把备份码粘贴回来即可恢复。</p>
      <textarea class="backup-code" id="code" placeholder="点下面按钮生成备份码，或把备份码粘贴到这里再点恢复"></textarea>
      <button class="btn" id="export">📤 生成备份码（自动复制）</button>
      <button class="btn secondary" id="import">📥 从备份码恢复</button>
      <p class="counter" id="status" aria-live="polite"></p>
    </div>
  `);
  const codeBox = node.querySelector('#code');
  const status = node.querySelector('#status');
  node.querySelector('#back').addEventListener('click', showProfileSelect);
  node.querySelector('#export').addEventListener('click', async () => {
    const code = encodeBackup(state);
    codeBox.value = code;
    codeBox.select();
    try {
      await navigator.clipboard.writeText(code);
      status.textContent = '✅ 备份码已生成并复制，请粘贴保存到备忘录';
    } catch {
      status.textContent = '✅ 备份码已生成，请长按全选复制';
    }
  });
  node.querySelector('#import').addEventListener('click', () => {
    const data = decodeBackup(codeBox.value);
    if (!data) {
      status.textContent = '❌ 备份码无效，请检查是否完整粘贴';
      return;
    }
    storage.save(data);
    state = storage.load();
    status.textContent = '✅ 恢复成功！';
    later(showProfileSelect, 600);
  });
  render(node);
}

// ————— 学一学：翻卡片（自动记住学到哪、学过的词做标记）—————
function showLearn(scope, words, idx) {
  const w = words[idx];
  const d = pdata();
  d.seen[w.id] = true;
  d.learnPos[scope.key] = idx;
  saveState();

  const preReader = !!profile().preReader;
  const seenCount = words.filter((x) => d.seen[x.id]).length;
  const sentenceHtml = w.sentence ? `<div class="sentence">💬 ${w.sentence}</div>` : '';
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="返回单词列表">←</button>
        <div class="title">📖 学一学</div>
        ${preReader
          ? `<button class="icon-btn" id="auto" title="自动连播">${window.__autoLearn ? '⏸️' : '▶️'}</button>`
          : '<div style="width:44px"></div>'}
      </div>
      <p class="counter">${idx + 1} / ${words.length} · 已学过 ${seenCount} 个</p>
      <div class="flashcard ${preReader ? 'kid' : ''}" id="card">
        <div class="emoji">${w.emoji}</div>
        <div class="en">${w.en}</div>
        <div class="zh">${w.zh}</div>
        ${preReader ? '' : sentenceHtml}
        <div class="hint">${preReader ? '👆 点大卡片再听一遍' : '👆 点卡片听发音'}</div>
      </div>
      <div class="learn-nav">
        <button class="btn secondary" id="prev" ${idx === 0 ? 'disabled' : ''}>${preReader ? '⬅️' : '上一个'}</button>
        <button class="btn" id="next">${idx === words.length - 1 ? '完成 ✅' : (preReader ? '➡️' : '下一个')}</button>
      </div>
    </div>
  `);
  // 不识字模式：初见时“英文 → 中文 → 英文”；熟悉后逐步撤掉中文支架。
  const familiar = (d.progress[w.id]?.correct || 0) >= 2;
  const say = () => (preReader
    ? speakSeq(familiar
      ? [{ text: w.en }]
      : [{ text: w.en }, { text: w.zh, lang: 'zh-CN' }, { text: w.en }])
    : speak(w.sentence ? `${w.en}. ${w.sentence}` : w.en));
  const stopAuto = () => {
    if (window.__autoLearn) { clearInterval(window.__autoLearn); window.__autoLearn = null; }
  };
  node.querySelector('#back').addEventListener('click', () => { stopAuto(); showCollection(scope); });
  node.querySelector('#card').addEventListener('click', say);
  const autoBtn = node.querySelector('#auto');
  if (autoBtn) autoBtn.addEventListener('click', () => {
    if (window.__autoLearn) { stopAuto(); }
    else {
      window.__autoLearn = setInterval(() => {
        const next = document.querySelector('#next');
        if (next) next.click(); else stopAuto();
      }, 4000);
    }
    showLearn(scope, words, idx);
  });
  const prev = node.querySelector('#prev');
  if (prev) prev.addEventListener('click', () => showLearn(scope, words, idx - 1));
  node.querySelector('#next').addEventListener('click', () => {
    if (idx === words.length - 1) {
      stopAuto();
      d.learnPos[scope.key] = 0; // 学完一轮，下次从头
      saveState();
      showCollection(scope);
    } else {
      showLearn(scope, words, idx + 1);
    }
  });
  render(node);
  say();
}

// ————— 考一考：闯关测验 —————
let quiz = null;

function startQuiz(words, title, opts = {}) {
  if (!words.length) return showHome();
  const pool = opts.pool || levelWords();
  const preReader = !!profile().preReader;
  const count = opts.graduation ? GRADUATION_QUIZ_SIZE : (preReader ? PIC_QUIZ_SIZE : 8);
  quiz = {
    title,
    graduation: !!opts.graduation,
    kiwiDaily: !!opts.kiwiDaily,
    pool,
    sourceScope: opts.sourceScope || null,
    // 不识字的小朋友全部用"听音点图"，不需要认字也能答题
    questions: opts.questions || (preReader ? buildPicQuiz(words, pool, count) : buildQuiz(words, pool, count)),
    idx: 0,
    combo: 0,
    results: [],
    answered: false,
  };
  window.__quiz = quiz; // 测试钩子
  showQuestion();
}

const TASK_TEXT = {
  en2zh: '这个单词是什么意思？',
  zh2en: '用英语怎么说？',
  listen: '听一听，选出正确的单词',
  listen2pic: '听一听，点一点 👇',
};

function showQuestion() {
  const q = quiz.questions[quiz.idx];
  quiz.answered = false;
  const isPic = q.mode === 'listen2pic';
  const promptHtml = (q.mode === 'listen' || isPic)
    ? `<button class="speaker" id="replay" aria-label="重听题目">🔊</button>`
    : `<div class="big">${q.prompt}</div>${q.context ? `<div class="question-context">${q.context}</div>` : ''}`;
  const node = el(`
    <div>
      <div class="topbar">
        <button class="icon-btn" id="back" aria-label="退出测验">✕</button>
        <div class="title">🎯 ${quiz.title}</div>
        <div style="width:44px"></div>
      </div>
      <div class="progress-track" role="progressbar" aria-label="测验进度" aria-valuemin="0" aria-valuemax="${quiz.questions.length}" aria-valuenow="${quiz.idx}"><div class="progress-fill" style="width:${Math.round((quiz.idx / quiz.questions.length) * 100)}%"></div></div>
      <p class="counter">第 ${quiz.idx + 1} 题 / 共 ${quiz.questions.length} 题</p>
      <div class="quiz-prompt ${isPic ? 'compact' : ''}">
        <div class="task">${TASK_TEXT[q.mode]}</div>
        ${promptHtml}
      </div>
      <div class="options ${isPic ? 'pics' : ''}" id="options"></div>
      <div class="combo" id="combo" aria-live="polite">${quiz.combo >= 2 ? `🔥 连对 ${quiz.combo} 题！` : ''}</div>
    </div>
  `);
  node.querySelector('#back').addEventListener('click', showHome);
  const replay = node.querySelector('#replay');
  if (replay) replay.addEventListener('click', () => speak(q.audioText || q.word.en));

  const box = node.querySelector('#options');
  for (const opt of q.options) {
    const btn = isPic
      ? el(`<button class="option pic" data-id="${opt.id}" aria-label="${opt.label}">${opt.emoji}</button>`)
      : el(`<button class="option" data-id="${opt.id}">${opt.label}</button>`);
    btn.addEventListener('click', () => answer(q, opt.id, box));
    box.appendChild(btn);
  }
  render(node);
  if (q.mode === 'listen' || isPic) speak(q.audioText || q.word.en);
}

function answer(q, pickedId, box) {
  const activeQuiz = quiz;
  // 真实按钮会同步 disabled，但这里仍做状态锁，避免快速连点、辅助技术或
  // 程序化事件让同一题重复加星/重复安排跳转。
  if (!activeQuiz || activeQuiz.answered || q !== activeQuiz.questions[activeQuiz.idx]) return;
  activeQuiz.answered = true;
  const isCorrect = pickedId === q.answerId;
  for (const b of box.querySelectorAll('.option')) {
    b.disabled = true;
    if (b.dataset.id === q.answerId) b.classList.add('correct');
    else if (b.dataset.id === pickedId) b.classList.add('wrong');
  }

  activeQuiz.combo = isCorrect ? activeQuiz.combo + 1 : 0;
  const starsEarned = isCorrect ? starReward(activeQuiz.combo) : 0;
  activeQuiz.results.push({ wordId: q.word.id, isCorrect, starsEarned });

  const d = pdata();
  d.progress[q.word.id] = gradeAnswer(d.progress[q.word.id], isCorrect);
  d.stars += starsEarned;
  saveState();

  // 语音反馈：不识字的小朋友靠听觉知道对错
  if (profile().preReader) {
    if (isCorrect) speakSeq([{ text: q.word.en }, { text: '真棒！', lang: 'zh-CN' }]);
    else speakSeq([{ text: '是这个哦：', lang: 'zh-CN' }, { text: q.word.en }]);
  } else if (isCorrect) {
    speak(q.word.en);
  }
  later(() => {
    if (quiz !== activeQuiz) return;
    activeQuiz.idx += 1;
    if (activeQuiz.idx < activeQuiz.questions.length) showQuestion();
    else showResult();
  }, gap(isCorrect ? (profile().preReader ? 1500 : 1100) : 1900));
}

function showResult() {
  if (quiz.graduation) return showGraduationResult();
  const name = profile().name;
  const s = summarize(quiz.results);
  const praise = s.accuracy === 100 ? `太厉害了 ${name}，全对！🏆`
    : s.accuracy >= 75 ? `${name} 你真棒！🎉`
    : s.accuracy >= 50 ? '越来越好啦，继续加油！💪'
    : '没关系，多练几次就记住啦！🌱';
  const node = el(`
    <div class="result">
      <div class="big-emoji">${s.accuracy >= 75 ? '🥳' : '🤗'}</div>
      <h2>${praise}</h2>
      <div class="stars-earned">本关收获 ⭐ × ${s.stars}</div>
      <div class="accuracy">答对 ${s.correct} / ${s.total} 题（${s.accuracy}%）</div>
      <div style="margin-top:30px">
        <button class="btn" id="again">🚀 再来一关</button>
        <button class="btn ghost" id="home">回到王国</button>
      </div>
    </div>
  `);
  node.querySelector('#again').addEventListener('click', () => {
    if (quiz.kiwiDaily) {
      startKiwiDaily();
    } else if (quiz.sourceScope) {
      const source = quiz.sourceScope;
      const sourcePool = source.pool || (profile().preReader ? KIWI_ITEMS : WORDS);
      const sourceWords = source.wrongbook
        ? wrongBookWords(sourcePool, pdata().progress)
        : source.words;
      if (!sourceWords.length) return showHome();
      const nextWords = source.wrongbook
        ? sourceWords
        : dueWords(sourceWords, pdata().progress, Date.now(), 8);
      startQuiz(nextWords, quiz.title, {
        pool: source.wrongbook ? sourcePool : quiz.pool,
        sourceScope: source,
      });
    } else {
      startQuiz(dueWords(levelWords(), pdata().progress, Date.now(), 8), '智能闯关');
    }
  });
  node.querySelector('#home').addEventListener('click', showHome);
  render(node);
  if (s.accuracy >= 75) confetti();
}

// 应用内词汇通关结算：通过则发毕业帽、+20 星、自动升入下一级
function showGraduationResult() {
  const p = profile();
  const d = pdata();
  const s = summarize(quiz.results);
  const passed = isGraduationPassed(s.correct);
  const fromLvl = findLevel(d.level);

  let nextLvl = null;
  if (passed && !d.graduated.includes(d.level)) {
    d.graduated.push(d.level);
    d.stars += GRADUATION_BONUS_STARS;
    const nextId = nextLevelId(LEVELS, d.level);
    if (nextId) {
      nextLvl = findLevel(nextId);
      d.level = nextId;
    }
    saveState();
  }

  const node = passed
    ? el(`
      <div class="result">
        <div class="big-emoji">🎓</div>
        <h2>核心词汇通关啦！</h2>
        <p class="subtitle">恭喜 ${p.name} 完成 ${fromLvl.emoji} ${fromLvl.name} 核心词汇！</p>
        <div class="stars-earned">通关奖励 ⭐ × ${GRADUATION_BONUS_STARS}</div>
        <div class="accuracy">答对 ${s.correct} / ${s.total} 题</div>
        <div style="margin-top:30px">
          <button class="btn gold" id="go-next">${nextLvl ? `进入 ${nextLvl.emoji} ${nextLvl.name} 王国 →` : '👑 你已通关全部级别！'}</button>
          <button class="btn ghost" id="home">回到王国</button>
        </div>
      </div>
    `)
    : el(`
      <div class="result">
        <div class="big-emoji">💪</div>
        <h2>差一点点！</h2>
        <div class="accuracy">答对 ${s.correct} / ${s.total} 题，词汇通关需要答对 ${GRADUATION_PASS_CORRECT} 题</div>
        <p class="subtitle">再复习一下，${p.name} 一定可以的！</p>
        <div style="margin-top:30px">
          <button class="btn" id="again">🎓 再挑战一次</button>
          <button class="btn ghost" id="home">回到王国</button>
        </div>
      </div>
    `);

  const goNext = node.querySelector('#go-next');
  if (goNext) goNext.addEventListener('click', showHome);
  const again = node.querySelector('#again');
  if (again) again.addEventListener('click', () => {
    startQuiz(levelWords(), `${fromLvl.name} 词汇通关挑战`, { graduation: true });
  });
  node.querySelector('#home').addEventListener('click', showHome);
  render(node);
  if (passed) confetti();
}

function confetti() {
  const emojis = ['⭐', '🎉', '💖', '🌟', '🎈'];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = emojis[i % emojis.length];
    s.style.left = `${Math.random() * 100}vw`;
    s.style.animationDelay = `${Math.random() * 0.8}s`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 3500);
  }
}

// —— 启动：有当前用户直接进首页，否则先选人 ——
if (state.current && findProfile(state.current)) showHome();
else showProfileSelect();

// —— 注册 Service Worker：自动检测新版并秒切，避免旧缓存卡住 ——
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  // updateViaCache:'none' → 检查 sw.js 时绕过 HTTP 缓存，能第一时间发现新版
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then((reg) => reg.update())
    .catch(() => {});
  // 新 SW 接管后自动刷新一次（仅在"更新"时，首次安装不刷，避免多余闪一下）
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    location.reload();
  });
}
