import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStorage, memoryBackend, defaultState, defaultProfileState,
  PROFILES, findProfile, encodeBackup, decodeBackup,
} from '../js/storage.js';

test('profiles：内置姐姐 Yoyo 和弟弟 Kiwi（id 沿用 yodi），默认级别符合各自水平', () => {
  assert.deepEqual(PROFILES.map((p) => p.id), ['yoyo', 'yodi']);
  assert.equal(findProfile('yoyo').defaultLevel, 'movers');
  assert.equal(findProfile('yodi').defaultLevel, 'seed');
  assert.equal(findProfile('nobody'), null);
});

test('storage：初次加载返回双档案默认状态，未选人', () => {
  const state = createStorage(memoryBackend()).load();
  assert.equal(state.v, 2);
  assert.equal(state.current, null);
  assert.deepEqual(state.profiles.yoyo, defaultProfileState('yoyo'));
  assert.deepEqual(state.profiles.yodi, defaultProfileState('yodi'));
  assert.equal(state.profiles.yoyo.level, 'movers');
  assert.equal(state.profiles.yodi.level, 'seed');
});

test('storage：保存后能完整读回，两人进度互不干扰', () => {
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.current = 'yodi';
  state.profiles.yoyo.stars = 30;
  state.profiles.yoyo.progress.dolphin = { box: 2, correct: 2, wrong: 0, nextDue: 99 };
  state.profiles.yodi.stars = 5;
  state.profiles.yodi.progress.cat = { box: 1, correct: 1, wrong: 0, nextDue: 11 };
  s.save(state);
  const loaded = s.load();
  assert.deepEqual(loaded, state);
  assert.equal(loaded.profiles.yoyo.progress.cat, undefined);
  assert.equal(loaded.profiles.yodi.progress.dolphin, undefined);
});

test('storage：v1 旧数据迁移 —— 星星和进度归 Yoyo', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    stars: 6,
    progress: { rabbit: { box: 1, correct: 1, wrong: 0, nextDue: 123 } },
    name: 'Yoyo',
  }));
  const state = createStorage(be).load();
  assert.equal(state.v, 2);
  assert.equal(state.current, null, '迁移后仍要先选人');
  assert.equal(state.profiles.yoyo.stars, 6);
  assert.deepEqual(state.profiles.yoyo.progress.rabbit,
    { box: 1, correct: 1, wrong: 0, nextDue: 123 });
  assert.equal(state.profiles.yodi.stars, 0);
});

test('storage：数据损坏时回退到默认状态而不是崩溃', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', '{oops not json');
  assert.deepEqual(createStorage(be).load(), defaultState());
  be.setItem('yoyo-words-v1', '"just a string"');
  assert.deepEqual(createStorage(be).load(), defaultState());
});

test('storage：v2 数据缺字段时用默认值补齐（含毕业记录）', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 2,
    current: 'yoyo',
    profiles: { yoyo: { stars: 7 } },
  }));
  const state = createStorage(be).load();
  assert.equal(state.current, 'yoyo');
  assert.equal(state.profiles.yoyo.stars, 7);
  assert.deepEqual(state.profiles.yoyo.progress, {});
  assert.equal(state.profiles.yoyo.level, 'movers');
  assert.deepEqual(state.profiles.yoyo.graduated, [], '老数据自动补上空毕业记录');
  assert.deepEqual(state.profiles.yodi, defaultProfileState('yodi'));
});

test('storage：毕业记录能保存和读回', () => {
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.profiles.yoyo.graduated = ['movers'];
  state.profiles.yoyo.level = 'flyers';
  s.save(state);
  const loaded = s.load();
  assert.deepEqual(loaded.profiles.yoyo.graduated, ['movers']);
  assert.equal(loaded.profiles.yoyo.level, 'flyers');
  assert.deepEqual(loaded.profiles.yodi.graduated, []);
});

test('storage：默认档案带学习记录字段（seen / learnPos）', () => {
  const p = defaultProfileState('yoyo');
  assert.deepEqual(p.seen, {});
  assert.deepEqual(p.learnPos, {});
  // 旧版 v2 数据缺这两个字段时自动补齐
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 2, current: 'yodi', profiles: { yodi: { stars: 3, level: 'seed' } },
  }));
  const state = createStorage(be).load();
  assert.deepEqual(state.profiles.yodi.seen, {});
  assert.deepEqual(state.profiles.yodi.learnPos, {});
});

test('storage：学习位置和学过标记能保存读回', () => {
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.profiles.yoyo.seen = { dolphin: true, cat: true };
  state.profiles.yoyo.learnPos = { 'unit:u1': 7 };
  s.save(state);
  const loaded = s.load();
  assert.deepEqual(loaded.profiles.yoyo.seen, { dolphin: true, cat: true });
  assert.equal(loaded.profiles.yoyo.learnPos['unit:u1'], 7);
});

test('备份码：导出后能完整恢复（含中文），坏码返回 null', () => {
  const state = defaultState();
  state.current = 'yoyo';
  state.profiles.yoyo.stars = 88;
  state.profiles.yoyo.graduated = ['movers'];
  state.profiles.yoyo.progress.dolphin = { box: 3, correct: 4, wrong: 1, nextDue: 42 };
  const code = encodeBackup(state);
  assert.equal(typeof code, 'string');
  assert.deepEqual(decodeBackup(code), state);
  assert.deepEqual(decodeBackup(`  ${code}  `), state, '首尾空格应被容忍');
  assert.equal(decodeBackup('not-a-valid-code!!!'), null);
  assert.equal(decodeBackup(encodeBackup({ hello: 'world' })), null, '结构不对也算无效');
});

test('我的世界：Yoyo 档案带 world 字段，默认空、能存读、老数据自动补齐', () => {
  assert.deepEqual(defaultProfileState('yoyo').world, []);
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.profiles.yoyo.world = [{ id: 'cat', x: 50, y: 52, size: 84 }];
  s.save(state);
  assert.deepEqual(s.load().profiles.yoyo.world, [{ id: 'cat', x: 50, y: 52, size: 84 }]);
  // 老 v2 数据没有 world → 自动补 []
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({ v: 2, current: 'yoyo', profiles: { yoyo: { stars: 5 } } }));
  assert.deepEqual(createStorage(be).load().profiles.yoyo.world, []);
});

test('备份码：把「我的世界」贴纸一起编码进去', () => {
  const state = defaultState();
  state.profiles.yoyo.world = [{ id: 'dolphin', x: 30, y: 40, size: 100 }];
  const decoded = decodeBackup(encodeBackup(state));
  assert.deepEqual(decoded.profiles.yoyo.world, [{ id: 'dolphin', x: 30, y: 40, size: 100 }]);
});

test('语速：默认 0.8、能存读、老数据自动补默认、备份码带上', () => {
  assert.equal(defaultState().speechRate, 0.8);
  // 老 v2 数据没有 speechRate → 补默认
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({ v: 2, current: 'yoyo', profiles: { yoyo: { stars: 1 } } }));
  assert.equal(createStorage(be).load().speechRate, 0.8);
  // 自定义语速能存读
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.speechRate = 0.6;
  s.save(state);
  assert.equal(s.load().speechRate, 0.6);
  // 备份码带上语速
  assert.equal(decodeBackup(encodeBackup(state)).speechRate, 0.6);
});

test('我的世界：worldScene 默认 grassland、能存读、老数据补默认、备份码带上', () => {
  assert.equal(defaultProfileState('yoyo').worldScene, 'grassland');
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.profiles.yoyo.worldScene = 'sea';
  s.save(state);
  assert.equal(s.load().profiles.yoyo.worldScene, 'sea');
  assert.equal(decodeBackup(encodeBackup(state)).profiles.yoyo.worldScene, 'sea');
  // 老 v2 数据没有 worldScene → 补默认
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({ v: 2, current: 'yoyo', profiles: { yoyo: { stars: 1 } } }));
  assert.equal(createStorage(be).load().profiles.yoyo.worldScene, 'grassland');
});

test('storage：reset 清空数据', () => {
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.profiles.yoyo.stars = 9;
  s.save(state);
  s.reset();
  assert.deepEqual(s.load(), defaultState());
});
