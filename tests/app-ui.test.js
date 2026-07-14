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

test('自然语音：换页停止旧朗读、支持设备音色选择和试听', () => {
  assert.match(appSource, /function stopSpeech\(\)/);
  assert.match(appSource, /selectVoice\(deviceVoices\(\), lang, preferred\)/);
  assert.match(appSource, /class="voice-select"/);
  assert.match(appSource, /class="voice-preview"/);
  assert.match(appSource, /utterance\.onend = finish/);
});

test('成人路线：独立首页先背词再小测，测验不累加儿童星星', () => {
  assert.match(appSource, /if \(p\.adult\) return showAdultHome\(\)/);
  assert.match(appSource, /function showAdultHome\(\)/);
  assert.match(appSource, /今日背词/);
  assert.match(appSource, /function showAdultLearn\(scope, words, idx\)/);
  assert.match(appSource, /scope\.daily[\s\S]*startQuiz\(words, '今日背词小测'/);
  assert.match(appSource, /activeQuiz\.adult\s*\?\s*0/);
  assert.match(appSource, /function showAdultResult\(\)/);
});

test('成人路线：错词、词表分组和重测都使用当前成人词池', () => {
  assert.match(appSource, /adultWordsForLevel\(pdata\(\)\.level\)/);
  assert.match(appSource, /wrongBookWords\(words, d\.progress\)/);
  assert.match(appSource, /source\?\.pool \|\| quiz\.pool \|\| routeWords/);
  assert.match(appSource, /ADULT_DECK_SIZE = 200/);
});

test('错题本：中间答对不刷星，达到掌握线才奖励并自动移出', () => {
  assert.match(appSource, /wrongBookReward\(beforeProgress, afterProgress, isCorrect, alreadyRewarded\)/);
  assert.match(appSource, /clearedWrongbook/);
  assert.match(appSource, /移出错题本 \+\$\{WRONG_BOOK_CLEAR_STARS\}⭐/);
  assert.match(appSource, /\(preReader \|\| scope\.wrongbook\) \? ''/);
});

test('我的世界：每个背景使用独立贴纸数组，不再共用单一 world 字段', () => {
  assert.match(appSource, /function currentSceneWorld\(d = pdata\(\)\)/);
  assert.match(appSource, /d\.worlds\[sceneId\]/);
  assert.match(appSource, /setCurrentSceneWorld\(addSticker/);
  assert.doesNotMatch(appSource, /d\.world\b/);
});

test('轮播调度：不同学习通道记录近期词并交给 SRS 避让', () => {
  assert.match(appSource, /const recentSelections = new Map\(\)/);
  assert.match(appSource, /function scheduledWords\(words, limit, channel = 'quiz'\)/);
  assert.match(appSource, /dueWords\(words, pdata\(\)\.progress, Date\.now\(\), limit, recent\)/);
  assert.match(appSource, /'world-unlock'/);
  assert.match(appSource, /world-room-target/);
  assert.match(appSource, /d\.recentWords/);
  assert.match(appSource, /rememberRecentWords\(session\.items, 'kiwi-daily'\)/);
});

test('听指令奖励：同一词首次成功才发星，换场景或删除后不重复刷', () => {
  assert.match(appSource, /const firstRoomReward = !d\.roomRewarded\?\.\[task\.item\.id\]/);
  assert.match(appSource, /d\.roomRewarded = \{\s*\.\.\.\(d\.roomRewarded \|\| \{\}\)/);
  assert.match(appSource, /earned \+ \(firstRoomReward \? 2 : 0\)/);
});
