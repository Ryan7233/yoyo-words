import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswer, isMastered, scheduleFirstReview, dailyStudyPlan, pendingPlanWords, localStudyDay, DAY_MS, buildKiwiSession, buildKiwiQuiz } from '../js/engine.js';
import { KIWI_ITEMS } from '../js/words.js';
import { createStorage, memoryBackend, defaultState, encodeBackup, decodeBackup } from '../js/storage.js';

test('同轮重复和提前练习不提升等级，也不延后原定复习', () => {
  let e = gradeAnswer(undefined, true, 1000);
  const due = e.nextDue;
  for (let i = 0; i < 20; i++) e = gradeAnswer(e, true, 2000 + i);
  assert.equal(e.box, 1);
  assert.equal(e.correct, 21, '练习次数仍如实记录');
  assert.equal(e.nextDue, due);
  assert.equal(isMastered(e), false);
  e = gradeAnswer(e, true, due);
  assert.equal(e.box, 2);
  e = gradeAnswer(e, true, e.nextDue);
  assert.equal(isMastered(e), true);
});

test('Kiwi 两词六题全对只算本次练会，不立即变成掌握', () => {
  const quiz = buildKiwiQuiz(buildKiwiSession(KIWI_ITEMS, {}, 1000), KIWI_ITEMS);
  const progress = {};
  for (const q of quiz) progress[q.word.id] = gradeAnswer(progress[q.word.id], true, 1000);
  assert.equal(Object.keys(progress).length, 2);
  for (const e of Object.values(progress)) {
    assert.equal(e.box, 1);
    assert.equal(isMastered(e), false);
    assert.equal(e.nextDue, DAY_MS + 1000);
  }
});

test('同日答错后再纠正不反复升级；旧存档的记忆等级不清零', () => {
  let e = gradeAnswer(undefined, true, 1000);
  e = gradeAnswer(e, false, 2000);
  e = gradeAnswer(e, true, 3000);
  assert.equal(e.box, 1);
  const legacy = { box: 4, correct: 7, wrong: 0, nextDue: 100000 };
  assert.equal(gradeAnswer(legacy, true, 2000).box, 4);
});

test('看过词卡建立首次复习但不算答对，重复看不推迟复习', () => {
  const e = scheduleFirstReview(undefined, 1000);
  assert.equal(e.correct, 0);
  assert.equal(e.box, 0);
  assert.equal(e.nextDue, DAY_MS + 1000);
  assert.equal(scheduleFirstReview(e, DAY_MS), e);
  assert.equal(gradeAnswer(e, true, 2000).box, 1, '看后首次小测仍可进入一级');
});

test('每日固定20词、跨刷新和进度变化不换队列；次日才更新', () => {
  const now = new Date(2026, 8, 18, 10).getTime();
  const words = Array.from({ length: 30 }, (_, i) => ({ id: `adult:w${i}` }));
  const plan = dailyStudyPlan(null, words, {}, {}, now);
  assert.equal(plan.wordIds.length, 20);
  assert.equal(plan.day, localStudyDay(now));
  assert.equal(dailyStudyPlan(plan, [...words].reverse(), {}, {}, now + 1000), plan);
  const next = dailyStudyPlan(plan, words, {}, { 'adult:w0': true }, now + DAY_MS);
  assert.notEqual(next.day, plan.day);
  assert.ok(!next.wordIds.includes('adult:w0'));
});

test('20词分两批测完不遗漏；移出后不回流，撤销可回到原计划', () => {
  const words = Array.from({ length: 20 }, (_, i) => ({ id: `adult:w${i}` }));
  const plan = dailyStudyPlan(null, words, {});
  const known = { 'adult:w0': true };
  let pending = pendingPlanWords(plan, words, known);
  assert.equal(pending.length, 19);
  plan.testedIds.push(...pending.slice(0, 10).map((w) => w.id));
  pending = pendingPlanWords(plan, words, known);
  assert.equal(pending.length, 9);
  plan.testedIds.push(...pending.map((w) => w.id));
  assert.equal(pendingPlanWords(plan, words, known).length, 0);
  delete known['adult:w0'];
  assert.deepEqual(pendingPlanWords(plan, words, known), [words[0]]);
});

test('新学习计划、技能记录和升级时间可以保存及备份恢复', () => {
  const state = defaultState();
  const d = state.profiles.mom;
  d.dailyPlans.cet4 = dailyStudyPlan(null, [{ id: 'adult:mean' }], {});
  d.dailyPlans.cet4.phase = 'quiz';
  d.dailyPlans.cet4.lastWordId = 'adult:mean';
  d.dailyPlans.cet4.testedIds = ['adult:mean'];
  d.practice['adult:mean'] = { recognition: 2, speaking: 1 };
  d.progress['adult:mean'] = gradeAnswer(undefined, true, 1000);
  const storage = createStorage(memoryBackend());
  assert.equal(storage.save(state), true);
  assert.deepEqual(storage.load(), state);
  assert.deepEqual(decodeBackup(encodeBackup(state)), state);
});

test('备份不允许伪造计划字段或注入技能内容', () => {
  const state = defaultState();
  state.profiles.mom.dailyPlans = {
    bad: { day: '2026-09-18', wordIds: ['adult:mean'] },
    cet4: { day: '2026-09-18', wordIds: ['adult:mean', '<img>'], testedIds: ['adult:other'], phase: '<img>' },
  };
  state.profiles.mom.practice = { 'adult:mean': { speaking: '<img>', action: 2, extra: 1 } };
  const d = decodeBackup(encodeBackup(state)).profiles.mom;
  assert.deepEqual(Object.keys(d.dailyPlans), ['cet4']);
  assert.deepEqual(d.dailyPlans.cet4.wordIds, ['adult:mean']);
  assert.deepEqual(d.dailyPlans.cet4.testedIds, []);
  assert.equal(d.dailyPlans.cet4.phase, 'learn');
  assert.deepEqual(d.practice['adult:mean'], { action: 2 });
});
