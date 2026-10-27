// dictation.html 的入口：给花园全屏打开用，也可以直接带词单打开
//   花园（同源 iframe）：页面发 ready → 花园发 start（词单）→ 写完发 result
//   直接打开：dictation.html#new=sunny,hot&review=the
// 这里不读写 Words 的学习进度和星星，结果只交回花园。
import {
  normalizeItems, parseHashItems, MSG_READY, MSG_START, MSG_RESULT, MSG_CLOSE,
} from './dictation-core.js';
import { mountDictation } from './dictation.js';
import { selectVoice, naturalRate } from './speech.js';
import { WORDS } from './words.js';

const root = document.getElementById('app');
const embedded = window.parent !== window;

// —— 朗读：只保留 iOS 上必要的两条保护 ——
// cancel() 后立刻 speak() 会被丢掉，所以稍等再说；高级音色不出声就换系统默认声音
let silentVoice = null;
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  let busy = false;
  try { busy = speechSynthesis.speaking || speechSynthesis.pending; } catch { busy = false; }
  speechSynthesis.cancel();
  const play = (useVoice) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = useVoice ? selectVoice(speechSynthesis.getVoices(), 'en-GB') : null;
    if (voice && voice !== silentVoice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = 'en-GB';
    }
    utterance.rate = naturalRate(0.8, utterance.lang, text);
    let started = false;
    utterance.onstart = () => { started = true; };
    if (speechSynthesis.paused) speechSynthesis.resume();
    speechSynthesis.speak(utterance);
    if (useVoice) {
      setTimeout(() => {
        if (started) return;
        silentVoice = utterance.voice;
        speechSynthesis.cancel();
        setTimeout(() => play(false), 80);
      }, 1500);
    }
  };
  if (busy) setTimeout(() => play(true), 60);
  else play(true);
}

// Words 词库里有的词，补上图标和中文
const LEXICON = new Map(WORDS.map((w) => [w.en.toLowerCase(), w]));
function enrich(items) {
  return items.map((item) => {
    const known = LEXICON.get(item.word);
    return { ...item, zh: item.zh || known?.zh || '', emoji: item.emoji || known?.emoji || '' };
  });
}

function post(message) {
  if (embedded) window.parent.postMessage(message, location.origin);
}

let started = false;
function start(rawItems, finishLabel) {
  const items = enrich(normalizeItems(rawItems));
  if (!items.length) return showEmpty();
  started = true;
  mountDictation(root, {
    items,
    speak,
    title: '✍️ 今日默写',
    finishLabel: finishLabel || (embedded ? '🌷 回花园' : '完成'),
    onFinish(summary) {
      post({ type: MSG_RESULT, summary, at: new Date().toISOString() });
      if (!embedded) location.href = './';
    },
    onExit() {
      post({ type: MSG_CLOSE });
      if (!embedded) location.href = './';
    },
  });
}

function showEmpty() {
  root.innerHTML = `
    <div class="result">
      <div class="big-emoji">📒</div>
      <h2>今天还没有默写的词</h2>
      <p class="subtitle">请家长先在花园的“拼写本”里加上今天的词。</p>
      <button class="btn" id="close">返回</button>
    </div>`;
  root.querySelector('#close').addEventListener('click', () => {
    post({ type: MSG_CLOSE });
    if (!embedded) location.href = './';
  });
}

window.addEventListener('message', (event) => {
  // 只接受同一个网站（ryan7233.github.io）下的花园发来的词单
  if (event.origin !== location.origin || event.source !== window.parent) return;
  const data = event.data;
  if (!data || data.type !== MSG_START || started) return;
  start(data.items, data.finishLabel);
});

const fromHash = parseHashItems(location.hash);
if (fromHash.length) start(fromHash);
else if (embedded) post({ type: MSG_READY });
else showEmpty();

// 离线也能打开：注册 Words 的 Service Worker（不像主页面那样自动刷新，避免写到一半被打断）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
}
