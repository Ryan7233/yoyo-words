import test from 'node:test';
import assert from 'node:assert/strict';
import { SPEEDS, naturalRate, voiceScore, selectVoice, englishVoices } from '../js/speech.js';

const voices = [
  { name: 'Alex', lang: 'en-US', voiceURI: 'us-alex', default: true, localService: true },
  { name: 'Daniel', lang: 'en-GB', voiceURI: 'gb-daniel', localService: true },
  { name: 'Serena Enhanced', lang: 'en-GB', voiceURI: 'gb-serena-enhanced', localService: true },
  { name: 'Tingting', lang: 'zh-CN', voiceURI: 'zh-tingting', localService: true },
];

test('自然语速：三个档位保持区分，但不把英文机械拖到 0.6 倍', () => {
  assert.deepEqual(SPEEDS.map((x) => x.rate), [0.6, 0.8, 1]);
  const slow = naturalRate(0.6, 'en-GB', 'The forest is quiet.');
  const mid = naturalRate(0.8, 'en-GB', 'The forest is quiet.');
  const fast = naturalRate(1, 'en-GB', 'The forest is quiet.');
  assert.ok(slow >= 0.75 && slow < mid);
  assert.ok(mid < fast && fast <= 1.05);
  assert.ok(naturalRate(0.8, 'en-GB', 'cat') < mid, '孤立单词略慢，便于听清音素');
});

test('音色选择：自动优先英式增强声音，手动选择优先，缺失时安全回退', () => {
  assert.ok(voiceScore(voices[2], 'en-GB') > voiceScore(voices[1], 'en-GB'));
  assert.equal(selectVoice(voices, 'en-GB', 'auto').voiceURI, 'gb-serena-enhanced');
  assert.equal(selectVoice(voices, 'en-GB', 'gb-daniel').voiceURI, 'gb-daniel');
  assert.equal(selectVoice(voices, 'en-GB', 'missing').voiceURI, 'gb-serena-enhanced');
  assert.equal(selectVoice(voices, 'zh-CN', 'auto').voiceURI, 'zh-tingting');
});

test('英文音色列表：排除中文，并按英式高质量优先排序', () => {
  const list = englishVoices(voices);
  assert.equal(list.length, 2, '设备有英式音色时，不混入其他口音');
  assert.equal(list[0].voiceURI, 'gb-serena-enhanced');
  assert.ok(list.every((voice) => voice.lang === 'en-GB'));
});

test('英文音色列表：过滤娱乐音效，设备没有英音时才回退其他英语口音', () => {
  const fallback = englishVoices([
    voices[0],
    { name: 'Bells', lang: 'en-US', voiceURI: 'novelty-bells' },
  ]);
  assert.deepEqual(fallback.map((voice) => voice.voiceURI), ['us-alex']);
});
