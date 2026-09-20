// Optional real-browser regression suite. Start `python3 serve.py --port 18377`
// then run with Playwright available (NODE_PATH may point to a bundled runtime).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { defaultState } from '../js/storage.js';
import { ADULT_WORDS, adultWordsForLevel } from '../js/adult-words.js';
import { localStudyDay } from '../js/engine.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => {
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = (utterance) => queueMicrotask(() => utterance.onend?.());
    window.speechSynthesis.cancel = () => {};
  }
});
await page.clock.install();
const base = process.env.TEST_URL || 'http://127.0.0.1:18377';

async function seed(state) {
  await page.goto(base);
  await page.evaluate((data) => localStorage.setItem('yoyo-words-v1', JSON.stringify(data)), state);
  await page.reload();
}
async function saved() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('yoyo-words-v1')));
}
async function answerBatch() {
  const ids = [];
  while (await page.locator('.option').count()) {
    const current = await page.evaluate(() => {
      const q = window.__quiz.questions[window.__quiz.idx];
      return { id: q.answerId, wordId: q.word.id };
    });
    ids.push(current.wordId);
    await page.locator(`.option[data-id="${current.id}"]`).click();
    await page.clock.runFor(6000);
    assert.ok(ids.length <= 20, '测验未结束');
  }
  return ids;
}
try {
  const state = defaultState();
  state.current = 'mom';
  state.profiles.mom.level = 'life';
  state.profiles.yoyo.stars = 77;
  const words = [ADULT_WORDS.find((w) => w.en === 'mean'), ADULT_WORDS.find((w) => w.en === 'right'),
    ...adultWordsForLevel('life').filter((w) => !['mean', 'right'].includes(w.en)).slice(0, 18)];
  state.profiles.mom.dailyPlans.life = { day: localStudyDay(), wordIds: words.map((w) => w.id), testedIds: [], lastWordId: '', phase: 'learn' };
  await seed(state);
  await page.locator('#adult-daily').click();
  assert.equal(await page.locator('.adult-word').textContent(), 'mean');
  await page.locator('.adult-extra-senses summary').click();
  assert.match(await page.locator('.adult-extra-senses').innerText(), /平均/);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.locator('#next').tap();
  assert.equal(await page.locator('.adult-word').textContent(), 'right');
  await page.locator('#known').tap();
  assert.notEqual(await page.locator('.adult-word').textContent(), 'right');
  await page.locator('#next').tap();
  await page.locator('#prev').tap();
  assert.notEqual(await page.locator('.adult-word').textContent(), 'right');
  await page.locator('.known-undo button').click();
  assert.equal(await page.locator('.adult-word').textContent(), 'right');
  assert.equal((await saved()).profiles.mom.knownWords['adult:right'], undefined);
  await page.locator('#next').tap();
  const resumeWord = await page.locator('.adult-word').textContent();
  await page.locator('#back').click();
  await page.reload();
  await page.locator('#adult-daily').click();
  assert.equal(await page.locator('.adult-word').textContent(), resumeWord, '刷新后应回到同一词');
  while (await page.locator('.adult-word').count()) await page.locator('#next').tap();
  const firstBatch = await answerBatch();
  assert.equal(firstBatch.length, 10);
  assert.match(await page.locator('.adult-result').innerText(), /还有 10 个词待测/);
  await page.locator('#home').click();
  await page.reload();
  await page.locator('#adult-daily').click();
  const secondBatch = await answerBatch();
  assert.equal(secondBatch.length, 10);
  assert.equal(new Set([...firstBatch, ...secondBatch]).size, 20);
  await page.locator('#again').click();
  assert.equal(await page.locator('#adult-daily').isDisabled(), true);
  const after = await saved();
  assert.equal(after.profiles.yoyo.stars, 77);
  assert.equal(after.profiles.mom.dailyPlans.life.testedIds.length, 20);
  for (const w of words) assert.equal(after.profiles.mom.progress[w.id].box, 1);
  console.log('PASS mobile: meanings, scroll navigation, skip/undo, reload resume, 20/20 quiz, old data');

  const longState = defaultState();
  longState.current = 'mom';
  longState.profiles.mom.level = 'postgrad';
  const longWords = ['transcendental', 'circumference', 'ordinary'].map((en) => ADULT_WORDS.find((w) => w.en === en));
  longState.profiles.mom.dailyPlans.postgrad = { day: localStudyDay(), wordIds: longWords.map((w) => w.id), testedIds: [], lastWordId: '', phase: 'learn' };
  await seed(longState);
  await page.locator('#adult-daily').click();
  for (let i = 0; i < 2; i++) {
    if (await page.locator('.adult-word-expansion summary').count()) await page.locator('.adult-word-expansion summary').click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '手机页面横向溢出');
    await page.screenshot({ path: `/tmp/yoyo-v29-mobile-${i}.png`, fullPage: true });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.locator('#next').tap();
    assert.equal(await page.locator('.adult-word').textContent(), longWords[i + 1].en);
  }
  console.log('PASS mobile: long words and bottom fixed next button');

  await seed(state);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'yoyo-words-v1') throw new DOMException('Storage full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.locator('#adult-daily').click();
  assert.match(await page.locator('#save-warning').innerText(), /未能保存/);
  console.log('PASS save failure is visible, not reported as saved');

  const kiwi = defaultState();
  kiwi.current = 'yodi';
  await seed(kiwi);
  await page.locator('#kiwi-daily').click();
  await page.locator('#next').click();
  await page.locator('#next').click();
  assert.equal((await answerBatch()).length, 6);
  const kiwiAfter = (await saved()).profiles.yodi;
  for (const entry of Object.values(kiwiAfter.progress)) assert.equal(entry.box, 1);
  await page.locator('#use').click();
  assert.match(await page.locator('#app').innerText(), /不自动判定发音正确/);
  await page.locator('#done').click();
  assert.equal(Object.keys((await saved()).profiles.yodi.practice).length, 2);
  console.log('PASS Kiwi: repeated practice not mastery, real-world exit');

  const yoyo = defaultState();
  yoyo.current = 'yoyo';
  await seed(yoyo);
  await page.locator('#smart-quiz').click();
  await page.locator('#next').click();
  await page.locator('#next').click();
  assert.equal((await answerBatch()).length, 2);
  await page.locator('#use').click();
  await page.locator('#later').click();
  console.log('PASS Yoyo: two new words, short quiz and no-pressure exit');
  await page.locator('.cat-card').first().click();
  await page.evaluate(() => {
    window.SpeechRecognition = class {
      start() { this.onerror?.({ error: 'not-allowed' }); }
      stop() {}
      abort() {}
    };
  });
  await page.locator('#speak-mode').click();
  await page.locator('#mic').click();
  assert.match(await page.locator('#status').innerText(), /自评继续/);
  const beforeSpeaking = (await saved()).profiles.yoyo.stars;
  await page.locator('#self-ok').click();
  await page.clock.runFor(6000);
  assert.equal((await saved()).profiles.yoyo.stars, beforeSpeaking + 1);
  console.log('PASS microphone denial still permits self-reported speaking');
  await page.setViewportSize({ width: 1280, height: 900 });
  await seed(state);
  await page.locator('#adult-daily').click();
  await page.screenshot({ path: '/tmp/yoyo-v29-desktop.png', fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('PASS desktop layout; no page errors');
} finally {
  await browser.close();
}
