import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../js/app.js', import.meta.url), 'utf8');
const htmlSource = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const cssSource = await readFile(new URL('../css/style.css', import.meta.url), 'utf8');

test('交互编排：换页统一取消延时任务，普通测验一题只结算一次', () => {
  assert.match(appSource, /function clearViewAsync\(\)/);
  assert.match(appSource, /function later\(fn, delay\)/);
  assert.match(appSource, /answered: false/);
  assert.match(appSource, /if \(!activeQuiz \|\| activeQuiz\.answered/);
});

test('触控策略：不使用会吞快速点击的全局 touchend，仍阻止捏合缩放', () => {
  assert.doesNotMatch(htmlSource, /addEventListener\(['"]touchend/);
  assert.match(cssSource, /html, body, #app \{ touch-action: pan-x pan-y; \}/);
});

test('PWA 强制更新只清理本应用作用域和缓存前缀', () => {
  assert.match(appSource, /r\.scope === appScope/);
  assert.match(appSource, /k\.startsWith\(['"]yoyo-words-['"]\)/);
  assert.doesNotMatch(appSource, /regs\.map\(\(r\) => r\.unregister\(\)\)/);
  assert.doesNotMatch(appSource, /keys\.map\(\(k\) => caches\.delete\(k\)\)/);
});
