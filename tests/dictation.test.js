import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  normalizeItems, parseHashItems, firstStage, recordCheck, recordWritten, keepFirstInk, canSkip, markSkipped,
  summarizeDictation, DICTATION_MAX_WORDS,
} from '../js/dictation-core.js';

test('词单：去重、转小写、丢掉不合法的词，最多 15 个', () => {
  const items = normalizeItems(['Sunny', 'sunny', 'hot dog', '<b>', { word: 'said', kind: 'review' }, 42]);
  assert.deepEqual(items.map((i) => [i.word, i.kind]), [['sunny', 'new'], ['said', 'review']]);
  const many = normalizeItems(Array.from({ length: 30 }, (_, i) => `word${String.fromCharCode(97 + (i % 26))}${i >= 26 ? 'z' : ''}`));
  assert.equal(many.length, DICTATION_MAX_WORDS);
  assert.deepEqual(normalizeItems(null), []);
});

test('地址里的词单：新词和复习词分开', () => {
  const items = parseHashItems('#new=sunny,hot&review=the,said');
  assert.deepEqual(items.map((i) => `${i.kind}:${i.word}`), ['new:sunny', 'new:hot', 'review:the', 'review:said']);
  assert.equal(firstStage(items[0]), 'look');
  assert.equal(firstStage(items[2]), 'write');
});

test('对照：第一次写对才算一次写对；写错两次可以跳过', () => {
  const sunny = { word: 'sunny', kind: 'new' };
  const hot = { word: 'hot', kind: 'new' };
  let results = recordCheck([], sunny, true);
  results = recordCheck(results, hot, false);
  assert.equal(canSkip(results, hot), false);
  results = recordCheck(results, hot, false);
  assert.equal(canSkip(results, hot), true);
  results = markSkipped(results, hot);
  const summary = summarizeDictation([sunny, hot], results);
  assert.deepEqual(summary, {
    total: 2, firstTry: 1, done: 1,
    words: [
      { word: 'sunny', kind: 'new', firstTry: true, done: true, attempts: 1, checkedBy: 'self' },
      { word: 'hot', kind: 'new', firstTry: false, done: false, attempts: 2, checkedBy: 'self' },
    ],
  });
  // 写错后再写对：完成，但不算一次写对
  const fixed = recordCheck(recordCheck([], hot, false), hot, true);
  assert.deepEqual(summarizeDictation([hot], fixed).words[0], { word: 'hot', kind: 'new', firstTry: false, done: true, attempts: 2, checkedBy: 'self' });
});

test('听写：只记写过，对错留给家长；笔迹只留第一次、只收图片', () => {
  const hot = { word: 'hot', kind: 'review' };
  const results = recordWritten([], hot);
  let inks = keepFirstInk(new Map(), 'hot', 'data:image/jpeg;base64,AAA');
  inks = keepFirstInk(inks, 'hot', 'data:image/jpeg;base64,BBB');
  inks = keepFirstInk(inks, 'jump', 'javascript:alert(1)');
  inks = keepFirstInk(inks, 'sun', `data:image/jpeg;base64,${'A'.repeat(300_000)}`);
  assert.deepEqual([...inks.keys()], ['hot']);
  assert.deepEqual(summarizeDictation([hot], results, inks).words[0], {
    word: 'hot', kind: 'review', firstTry: false, done: false, attempts: 1, checkedBy: 'none', ink: 'data:image/jpeg;base64,AAA',
  });
});

test('默写页只接受同源父页面的消息，并且不读写 Words 进度', async () => {
  const page = await readFile(new URL('../js/dictation-page.js', import.meta.url), 'utf8');
  assert.match(page, /event\.origin !== location\.origin \|\| event\.source !== window\.parent/);
  assert.match(page, /postMessage\(message, location\.origin\)/);
  assert.doesNotMatch(page, /storage\.js/);
  assert.doesNotMatch(page, /controllerchange/);
});
