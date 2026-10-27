// ✍️ 手写默写界面：上面看词 / 听词，下面在 iPad 上用手指或 Apple Pencil 直接写。
// 不做手写识别：写完翻开对照，孩子自己点“写对了 / 再写一次”。
// 主应用（Words 里的默写模式）和 dictation.html（花园里全屏打开）共用这一个组件。
import {
  firstStage, recordCheck, canSkip, markSkipped, summarizeDictation,
} from './dictation-core.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[ch]);
}

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// —— 手写板：画布本身只放笔迹，四线格是下面的一层，擦掉时不会擦到格子 ——
export function createPad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = null;
  let strokes = 0;
  let penSeen = false;
  let locked = false;

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * ratio));
    const h = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width === w && canvas.height === h) return;
    const old = strokes ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;
    canvas.width = w;
    canvas.height = h;
    if (old) ctx.putImageData(old, 0, 0);
  }

  function point(e) {
    const rect = canvas.getBoundingClientRect();
    const ratio = canvas.width / rect.width;
    return { x: (e.clientX - rect.left) * ratio, y: (e.clientY - rect.top) * ratio };
  }

  function lineWidth(e) {
    const base = canvas.height / 26;
    // Apple Pencil 有压感，手指没有
    return e.pointerType === 'pen' && e.pressure > 0 ? base * (0.6 + e.pressure * 0.8) : base;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (locked) return;
    if (e.pointerType === 'pen') penSeen = true;
    // 用过笔以后忽略手掌碰到屏幕
    else if (penSeen && e.pointerType === 'touch') return;
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    const p = point(e);
    drawing = { id: e.pointerId, last: p };
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#3b2a6b';
    ctx.fillStyle = '#3b2a6b';
    ctx.beginPath();
    ctx.arc(p.x, p.y, lineWidth(e) / 2, 0, Math.PI * 2);
    ctx.fill();
    strokes += 1;
    canvas.dispatchEvent(new CustomEvent('pad-change'));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing || e.pointerId !== drawing.id) return;
    e.preventDefault();
    const events = e.getCoalescedEvents?.() || [e];
    for (const ev of events) {
      const p = point(ev);
      ctx.lineWidth = lineWidth(ev);
      ctx.beginPath();
      ctx.moveTo(drawing.last.x, drawing.last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      drawing.last = p;
    }
  });
  const end = (e) => {
    if (drawing && e.pointerId === drawing.id) drawing = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  return {
    fit,
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokes = 0;
      canvas.dispatchEvent(new CustomEvent('pad-change'));
    },
    isEmpty: () => strokes === 0,
    lock(value) { locked = value; drawing = null; },
  };
}

/**
 * 挂载默写流程。
 * @param {HTMLElement} root
 * @param {{ items: Array, speak: (text: string) => void, onFinish: (summary) => void,
 *           onExit: () => void, finishLabel?: string, title?: string }} options
 */
export function mountDictation(root, options) {
  const { items, speak, onFinish, onExit } = options;
  const finishLabel = options.finishLabel || '完成';
  const title = options.title || '✍️ 默写';
  let results = [];
  let idx = 0;
  let stage = null;
  let pad = null;
  const cleanups = [];

  function topbar(extra = '') {
    return `
      <div class="topbar">
        <button class="icon-btn" data-act="exit" aria-label="退出默写">✕</button>
        <div class="title">${escapeHtml(title)}</div>
        <div class="dict-progress">${extra}</div>
      </div>`;
  }

  function showIntro() {
    const fresh = items.filter((i) => i.kind === 'new').length;
    const review = items.length - fresh;
    const parts = [fresh && `新词 ${fresh} 个`, review && `复习 ${review} 个`].filter(Boolean).join(' · ');
    root.replaceChildren(el(`
      <div class="dictation dict-intro">
        ${topbar()}
        <div class="big-emoji">✍️</div>
        <h2>今天默写 ${items.length} 个词</h2>
        <p class="subtitle">${parts}</p>
        <ol class="dict-steps">
          <li><b>看</b>看清楚这个词</li>
          <li><b>读</b>听一听，跟着读</li>
          <li><b>盖</b>把它盖住</li>
          <li><b>写</b>在下面的格子里写出来</li>
          <li><b>查</b>翻开对一对</li>
        </ol>
        <button class="btn" data-act="start">开始 →</button>
      </div>`));
    bind();
  }

  function showWord() {
    const item = items[idx];
    const entry = results.find((r) => r.word === item.word);
    const hint = [item.emoji, item.zh].filter(Boolean).map(escapeHtml).join(' ');
    let prompt;
    if (stage === 'look') {
      prompt = `
        <div class="dict-card look">
          ${item.emoji ? `<div class="dict-emoji">${escapeHtml(item.emoji)}</div>` : ''}
          <div class="dict-word">${escapeHtml(item.word)}</div>
          ${item.zh ? `<div class="dict-zh">${escapeHtml(item.zh)}</div>` : ''}
          <button class="speaker small" data-act="say" aria-label="再听一遍">🔊 再听一遍</button>
        </div>`;
    } else if (stage === 'write') {
      prompt = `
        <div class="dict-card cover">
          <div class="dict-cover">🙈</div>
          <div class="dict-zh">${item.kind === 'review' && !entry ? '听一听，写下来' : '盖住啦，自己写一写'}${hint ? ` · ${hint}` : ''}</div>
          <button class="speaker small" data-act="say" aria-label="再听一遍">🔊 再听一遍</button>
        </div>`;
    } else {
      prompt = `
        <div class="dict-card check">
          <div class="dict-zh">翻开对一对 👀</div>
          <div class="dict-word">${escapeHtml(item.word)}</div>
          <div class="dict-letters">${[...item.word].map((ch) => `<span>${escapeHtml(ch)}</span>`).join('')}</div>
        </div>`;
    }
    const actions = {
      look: '<button class="btn" data-act="cover">我记住了，盖住它 🙈</button>',
      write: `<div class="dict-row">
          <button class="btn secondary" data-act="clear">🧽 擦掉重写</button>
          <button class="btn" data-act="written" disabled>写好了，翻开 👀</button>
        </div>`,
      check: `<div class="dict-row">
          <button class="btn secondary" data-act="again">🔁 再写一次</button>
          <button class="btn" data-act="ok">✅ 写对了</button>
        </div>
        ${canSkip(results, item) ? '<button class="btn ghost" data-act="skip">先跳过，下次再练</button>' : ''}`,
    }[stage];

    const node = el(`
      <div class="dictation dict-${stage}">
        ${topbar(`第 ${idx + 1} / ${items.length} 个`)}
        <div class="dict-layout">
          <div class="dict-top">${prompt}</div>
          <div class="dict-bottom">
            <div class="dict-pad ${stage === 'look' ? 'resting' : ''}">
              <div class="dict-guides" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
              <canvas aria-label="手写区：用手指或 Apple Pencil 在这里写单词"></canvas>
              ${stage === 'look' ? '<div class="dict-pad-tip">记住了就盖住它，然后在这里写</div>' : ''}
            </div>
            <div class="dict-actions">${actions}</div>
          </div>
        </div>
      </div>`);

    // 同一个词“写 → 查”时保留笔迹，方便对照
    const canvas = node.querySelector('canvas');
    if (pad && stage === 'check') {
      const old = root.querySelector('.dict-pad canvas');
      canvas.replaceWith(old);
      pad.lock(true);
    } else {
      pad = createPad(canvas);
      pad.lock(stage === 'look');
    }
    root.replaceChildren(node);
    pad.fit();
    const written = node.querySelector('[data-act="written"]');
    if (written) {
      const sync = () => { written.disabled = pad.isEmpty(); };
      node.querySelector('canvas').addEventListener('pad-change', sync);
      sync();
    }
    bind();
    if (stage !== 'check') speak(item.word);
  }

  function showDone() {
    const summary = summarizeDictation(items, results);
    const praise = summary.firstTry === summary.total
      ? '一次全写对，太厉害啦！🏆'
      : summary.done === summary.total ? '全部写对啦，坚持就是胜利！💪' : '写过就会记得更牢 🌱';
    root.replaceChildren(el(`
      <div class="dictation dict-done result">
        <div class="big-emoji">${summary.firstTry === summary.total ? '🥳' : '🤗'}</div>
        <h2>默写完成！</h2>
        <p class="subtitle">${praise}</p>
        <div class="accuracy">一次写对 ${summary.firstTry} / ${summary.total}</div>
        <ul class="dict-summary">
          ${summary.words.map((w) => `<li class="${w.firstTry ? 'ok' : w.done ? 'redo' : 'skip'}">
            <span>${w.firstTry ? '✅' : w.done ? '🔁' : '⏭️'}</span> ${escapeHtml(w.word)}</li>`).join('')}
        </ul>
        <button class="btn" data-act="finish">${escapeHtml(finishLabel)}</button>
      </div>`));
    bind(summary);
  }

  function go(next) {
    stage = next;
    showWord();
  }

  function nextWord() {
    idx += 1;
    pad = null;
    if (idx >= items.length) return showDone();
    go(firstStage(items[idx]));
  }

  function bind(summary) {
    root.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = items[idx];
        switch (btn.dataset.act) {
          case 'exit': return onExit();
          case 'start': idx = 0; return go(firstStage(items[0]));
          case 'say': return speak(item.word);
          case 'cover': pad.clear(); return go('write');
          case 'clear': return pad.clear();
          case 'written': return go('check');
          case 'ok':
            results = recordCheck(results, item, true);
            speak('Well done!');
            return nextWord();
          case 'again':
            results = recordCheck(results, item, false);
            pad = null;
            // 写错了回到“看”：再看一眼正确拼法，盖住再写
            return go('look');
          case 'skip':
            results = markSkipped(results, item);
            return nextWord();
          case 'finish': return onFinish(summary);
          default: return undefined;
        }
      });
    });
  }

  const onResize = () => pad?.fit();
  window.addEventListener('resize', onResize);
  cleanups.push(() => window.removeEventListener('resize', onResize));

  showIntro();
  return { destroy: () => cleanups.forEach((fn) => fn()) };
}
