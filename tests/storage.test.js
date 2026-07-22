import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStorage, memoryBackend, defaultState, defaultProfileState,
  PROFILES, findProfile, encodeBackup, decodeBackup,
} from '../js/storage.js';

test('profiles：内置 Yoyo、Kiwi 和森蝶三个档案，默认级别符合各自水平', () => {
  assert.deepEqual(PROFILES.map((p) => p.id), ['yoyo', 'yodi', 'mom']);
  assert.equal(findProfile('yoyo').defaultLevel, 'movers');
  assert.equal(findProfile('yodi').defaultLevel, 'seed');
  assert.deepEqual(findProfile('mom'), {
    id: 'mom', name: '森蝶', title: '成人学习', emoji: '🌷', theme: 'sage', defaultLevel: 'cet4', adult: true,
  });
  assert.equal(findProfile('nobody'), null);
});

test('storage：初次加载返回三档案 v3 默认状态，未选人', () => {
  const state = createStorage(memoryBackend()).load();
  assert.equal(state.v, 3);
  assert.equal(state.current, null);
  assert.deepEqual(state.profiles.yoyo, defaultProfileState('yoyo'));
  assert.deepEqual(state.profiles.yodi, defaultProfileState('yodi'));
  assert.deepEqual(state.profiles.mom, defaultProfileState('mom'));
  assert.equal(state.profiles.yoyo.level, 'movers');
  assert.equal(state.profiles.yodi.level, 'seed');
  assert.equal(state.profiles.mom.level, 'cet4');
});

test('storage：保存后能完整读回，三人进度互不干扰且 current 支持 mom', () => {
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.current = 'mom';
  state.profiles.yoyo.stars = 30;
  state.profiles.yoyo.progress.dolphin = { box: 2, correct: 2, wrong: 0, nextDue: 99 };
  state.profiles.yodi.stars = 5;
  state.profiles.yodi.progress.cat = { box: 1, correct: 1, wrong: 0, nextDue: 11 };
  state.profiles.mom.stars = 12;
  state.profiles.mom.level = 'cet6';
  state.profiles.mom.progress.abandon = { box: 3, correct: 4, wrong: 1, nextDue: 123 };
  state.profiles.mom.knownWords['adult:temperamental'] = true;
  s.save(state);
  const loaded = s.load();
  assert.deepEqual(loaded, state);
  assert.equal(loaded.current, 'mom');
  assert.equal(loaded.profiles.yoyo.progress.cat, undefined);
  assert.equal(loaded.profiles.yodi.progress.dolphin, undefined);
  assert.equal(loaded.profiles.mom.progress.cat, undefined);
  assert.deepEqual(loaded.profiles.mom.knownWords, { 'adult:temperamental': true });
});

test('storage：v1 旧数据迁移 —— 星星和进度归 Yoyo', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    stars: 6,
    progress: { rabbit: { box: 1, correct: 1, wrong: 0, nextDue: 123 } },
    name: 'Yoyo',
  }));
  const state = createStorage(be).load();
  assert.equal(state.v, 3);
  assert.equal(state.current, null, '迁移后仍要先选人');
  assert.equal(state.profiles.yoyo.stars, 6);
  assert.deepEqual(state.profiles.yoyo.progress.rabbit,
    { box: 1, correct: 1, wrong: 0, nextDue: 123 });
  assert.equal(state.profiles.yodi.stars, 0);
  assert.deepEqual(state.profiles.mom, defaultProfileState('mom'));
});

test('storage：数据损坏时回退到默认状态而不是崩溃', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', '{oops not json');
  assert.deepEqual(createStorage(be).load(), defaultState());
  be.setItem('yoyo-words-v1', '"just a string"');
  assert.deepEqual(createStorage(be).load(), defaultState());
  be.setItem('yoyo-words-v1', ' '.repeat(2_000_001));
  assert.deepEqual(createStorage(be).load(), defaultState(), '异常大的本地存档不应继续解析');
});

test('storage：畸形 v2 字段会按白名单修复，未知字段不会进入状态', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 2,
    current: '<img onerror=alert(1)>',
    speechRate: 99,
    speechVoice: '\u0000bad voice',
    injected: true,
    profiles: {
      yoyo: {
        stars: '<img onerror=alert(1)>',
        progress: null,
        level: 'admin',
        graduated: ['movers', 'movers', '<script>'],
        seen: { cat: true, dog: 'yes', '__proto__': true },
        missions: { 'movers:u1': true, bad: 'yes', '<img>': true },
        learnPos: { 'unit:u1': 7, bad: -1, huge: 9_999_999 },
        world: [
          { id: 'cat', x: -20, y: 150, size: 999, html: '<img>' },
          { id: '<img>', x: 1, y: 2, size: 84 },
          { id: 'dog', x: '50', y: 2, size: 84 },
        ],
        worldScene: '<img>',
        extra: 'discard me',
      },
    },
  }));
  const state = createStorage(be).load();
  assert.equal(state.current, null);
  assert.equal(state.speechRate, 1.2);
  assert.equal(state.speechVoice, 'auto');
  assert.equal(state.injected, undefined);
  assert.equal(state.profiles.yoyo.stars, 0);
  assert.deepEqual(state.profiles.yoyo.progress, {});
  assert.equal(state.profiles.yoyo.level, 'movers');
  assert.deepEqual(state.profiles.yoyo.graduated, ['movers']);
  assert.deepEqual(state.profiles.yoyo.seen, { cat: true });
  assert.deepEqual(state.profiles.yoyo.missions, { 'movers:u1': true });
  assert.deepEqual(state.profiles.yoyo.learnPos, { 'unit:u1': 7, huge: 1_000_000 });
  assert.deepEqual(state.profiles.yoyo.worlds, {
    grassland: [{ id: 'cat', x: 0, y: 100, size: 168 }],
  });
  assert.equal(state.profiles.yoyo.worldScene, 'grassland');
  assert.equal(state.profiles.yoyo.extra, undefined);
});

test('storage：progress 各字段容错并限制到安全范围', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 2,
    profiles: { yoyo: { progress: {
      cat: { box: 99, correct: 2.9, wrong: -2, nextDue: 42.8, extra: 'no' },
      dog: { box: '2', correct: 1, wrong: 0, nextDue: 4 },
      '<img>': { box: 1, correct: 1, wrong: 0, nextDue: 0 },
    } } },
  }));
  assert.deepEqual(createStorage(be).load().profiles.yoyo.progress, {
    cat: { box: 5, correct: 2, wrong: 0, nextDue: 42 },
    dog: { box: 0, correct: 1, wrong: 0, nextDue: 4 },
  });
});

test('storage：v2 数据缺字段时升级为 v3 并补齐默认值与 mom 档案', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 2,
    current: 'yoyo',
    profiles: { yoyo: { stars: 7 } },
  }));
  const state = createStorage(be).load();
  assert.equal(state.v, 3);
  assert.equal(state.current, 'yoyo');
  assert.equal(state.profiles.yoyo.stars, 7);
  assert.deepEqual(state.profiles.yoyo.progress, {});
  assert.equal(state.profiles.yoyo.level, 'movers');
  assert.deepEqual(state.profiles.yoyo.graduated, [], '老数据自动补上空毕业记录');
  assert.deepEqual(state.profiles.yodi, defaultProfileState('yodi'));
  assert.deepEqual(state.profiles.mom, defaultProfileState('mom'));
});

test('storage：v2 迁移保留 Yoyo/Kiwi 全部白名单字段并自动补 mom', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 2,
    current: 'yodi',
    speechRate: 0.6,
    speechVoice: 'com.apple.voice.enhanced.en-GB.Daniel',
    profiles: {
      yoyo: {
        stars: 17,
        progress: { dolphin: { box: 3, correct: 4, wrong: 1, nextDue: 99 } },
        level: 'flyers',
        graduated: ['movers'],
        seen: { dolphin: true },
        learnPos: { 'unit:u1': 8 },
        missions: { 'movers:u1': true },
        world: [{ id: 'dolphin', x: 32, y: 44, size: 96 }],
        worldScene: 'sea',
      },
      yodi: {
        stars: 4,
        progress: { cat: { box: 1, correct: 1, wrong: 0, nextDue: 11 } },
        level: 'starters',
        graduated: ['seed'],
        seen: { cat: true },
        learnPos: { 'kiwi:animals': 2 },
        missions: { 'seed:u1': true },
        world: [],
        worldScene: 'grassland',
      },
    },
  }));

  const state = createStorage(be).load();
  assert.equal(state.v, 3);
  assert.equal(state.current, 'yodi');
  assert.equal(state.speechRate, 0.6);
  assert.equal(state.speechVoice, 'com.apple.voice.enhanced.en-GB.Daniel');
  assert.deepEqual(state.profiles.yoyo, {
    stars: 17,
    progress: { dolphin: { box: 3, correct: 4, wrong: 1, nextDue: 99 } },
    level: 'flyers',
    graduated: ['movers'],
    seen: { dolphin: true },
    knownWords: {},
    learnPos: { 'unit:u1': 8 },
    missions: { 'movers:u1': true },
    wrongbookRewarded: {},
    roomRewarded: {},
    recentWords: [],
    worlds: { sea: [{ id: 'dolphin', x: 32, y: 44, size: 96 }] },
    worldScene: 'sea',
  });
  assert.deepEqual(state.profiles.yodi, {
    stars: 4,
    progress: { cat: { box: 1, correct: 1, wrong: 0, nextDue: 11 } },
    level: 'starters',
    graduated: ['seed'],
    seen: { cat: true },
    knownWords: {},
    learnPos: { 'kiwi:animals': 2 },
    missions: { 'seed:u1': true },
    wrongbookRewarded: {},
    roomRewarded: {},
    recentWords: [],
    worlds: {},
    worldScene: 'grassland',
  });
  assert.deepEqual(state.profiles.mom, defaultProfileState('mom'));
});

test('storage：儿童与成人 level/graduated 各按档案白名单校验，不串级别', () => {
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.current = 'mom';
  state.profiles.yoyo.level = 'cet4';
  state.profiles.yoyo.graduated = ['movers', 'cet6', 'flyers'];
  state.profiles.yodi.level = 'postgrad';
  state.profiles.yodi.graduated = ['seed', 'life'];
  state.profiles.mom.level = 'movers';
  state.profiles.mom.graduated = ['life', 'movers', 'cet6', 'postgrad'];
  s.save(state);

  const loaded = s.load();
  assert.equal(loaded.current, 'mom');
  assert.equal(loaded.profiles.yoyo.level, 'movers');
  assert.deepEqual(loaded.profiles.yoyo.graduated, ['movers', 'flyers']);
  assert.equal(loaded.profiles.yodi.level, 'seed');
  assert.deepEqual(loaded.profiles.yodi.graduated, ['seed']);
  assert.equal(loaded.profiles.mom.level, 'cet4');
  assert.deepEqual(loaded.profiles.mom.graduated, ['life', 'cet6', 'postgrad']);

  loaded.profiles.mom.level = 'postgrad';
  s.save(loaded);
  assert.equal(s.load().profiles.mom.level, 'postgrad');
});

test('storage：新 v3 状态完整 roundtrip，save 总是输出 v3', () => {
  const be = memoryBackend();
  const s = createStorage(be);
  const state = defaultState();
  state.current = 'mom';
  state.profiles.mom.level = 'postgrad';
  state.profiles.mom.stars = 21;
  state.profiles.mom.seen = { analysis: true };
  state.profiles.mom.progress.analysis = { box: 2, correct: 3, wrong: 1, nextDue: 456 };
  state.v = 2;
  assert.equal(s.save(state), true);
  assert.equal(JSON.parse(be.getItem('yoyo-words-v1')).v, 3);
  const loaded = s.load();
  assert.equal(loaded.v, 3);
  assert.equal(loaded.current, 'mom');
  assert.equal(loaded.profiles.mom.level, 'postgrad');
  assert.equal(loaded.profiles.mom.stars, 21);
  assert.deepEqual(loaded.profiles.mom.seen, { analysis: true });
  assert.deepEqual(loaded.profiles.mom.progress.analysis,
    { box: 2, correct: 3, wrong: 1, nextDue: 456 });
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

test('storage：默认档案带学习、奖励和近期避让记录字段', () => {
  const p = defaultProfileState('yoyo');
  assert.deepEqual(p.seen, {});
  assert.deepEqual(p.learnPos, {});
  assert.deepEqual(p.missions, {});
  assert.deepEqual(p.wrongbookRewarded, {});
  assert.deepEqual(p.roomRewarded, {});
  assert.deepEqual(p.recentWords, []);
  // 旧版 v2 数据缺这些字段时自动补齐
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 2, current: 'yodi', profiles: { yodi: { stars: 3, level: 'seed' } },
  }));
  const state = createStorage(be).load();
  assert.deepEqual(state.profiles.yodi.seen, {});
  assert.deepEqual(state.profiles.yodi.learnPos, {});
  assert.deepEqual(state.profiles.yodi.missions, {});
  assert.deepEqual(state.profiles.yodi.wrongbookRewarded, {});
  assert.deepEqual(state.profiles.yodi.roomRewarded, {});
  assert.deepEqual(state.profiles.yodi.recentWords, []);
});

test('storage：奖励标记仅保留安全 true，近期词安全去重并限制 24 个', () => {
  const be = memoryBackend();
  const extraWords = Array.from({ length: 30 }, (_, i) => `word${i}`);
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 3,
    current: 'yoyo',
    profiles: {
      yoyo: {
        wrongbookRewarded: { cat: true, dog: false, bird: 'yes', '<img>': true },
        roomRewarded: { dog: true, cat: 1, constructor: true },
        recentWords: ['cat', 'dog', 'cat', '<img>', 42, ...extraWords],
      },
    },
  }));

  const profile = createStorage(be).load().profiles.yoyo;
  assert.deepEqual(profile.wrongbookRewarded, { cat: true });
  assert.deepEqual(profile.roomRewarded, { dog: true });
  assert.deepEqual(profile.recentWords, ['cat', 'dog', ...extraWords.slice(0, 22)]);
  assert.equal(profile.recentWords.length, 24);
});

test('storage：三类奖励与近期记录按 profile 独立存读并进入备份码', () => {
  const storage = createStorage(memoryBackend());
  const state = defaultState();
  state.profiles.yoyo.wrongbookRewarded = { cat: true };
  state.profiles.yoyo.roomRewarded = { dog: true };
  state.profiles.yoyo.recentWords = ['cat', 'dog'];
  state.profiles.mom.wrongbookRewarded = { analysis: true };
  state.profiles.mom.roomRewarded = { abandon: true };
  state.profiles.mom.recentWords = ['analysis', 'abandon'];

  assert.equal(storage.save(state), true);
  const loaded = storage.load();
  assert.deepEqual(loaded, state);
  assert.deepEqual(loaded.profiles.yodi.wrongbookRewarded, {});
  assert.deepEqual(loaded.profiles.yodi.roomRewarded, {});
  assert.deepEqual(loaded.profiles.yodi.recentWords, []);
  assert.deepEqual(decodeBackup(encodeBackup(state)), state);
});

test('storage：v1、v2、v3 均兼容奖励与近期记录并统一输出 v3', () => {
  const profileFields = {
    wrongbookRewarded: { cat: true },
    roomRewarded: { dog: true },
    recentWords: ['cat', 'dog'],
  };
  const inputs = [
    { ...profileFields },
    { v: 2, profiles: { yoyo: profileFields } },
    { v: 3, profiles: { yoyo: profileFields } },
  ];

  for (const input of inputs) {
    const be = memoryBackend();
    be.setItem('yoyo-words-v1', JSON.stringify(input));
    const state = createStorage(be).load();
    assert.equal(state.v, 3);
    assert.deepEqual(state.profiles.yoyo.wrongbookRewarded, { cat: true });
    assert.deepEqual(state.profiles.yoyo.roomRewarded, { dog: true });
    assert.deepEqual(state.profiles.yoyo.recentWords, ['cat', 'dog']);
  }
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

test('storage：单元综合任务完成状态能存档并进入备份码', () => {
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.profiles.yoyo.missions = { 'movers:u1': true };
  s.save(state);
  assert.deepEqual(s.load().profiles.yoyo.missions, { 'movers:u1': true });
  assert.deepEqual(decodeBackup(encodeBackup(state)).profiles.yoyo.missions, { 'movers:u1': true });
});

test('备份码：导出后能完整恢复（含中文），坏码返回 null', () => {
  const state = defaultState();
  state.current = 'mom';
  state.profiles.yoyo.stars = 88;
  state.profiles.yoyo.graduated = ['movers'];
  state.profiles.yoyo.progress.dolphin = { box: 3, correct: 4, wrong: 1, nextDue: 42 };
  state.profiles.mom.level = 'cet6';
  state.profiles.mom.seen.analysis = true;
  const code = encodeBackup(state);
  assert.equal(typeof code, 'string');
  assert.deepEqual(decodeBackup(code), state);
  assert.deepEqual(decodeBackup(`  ${code}  `), state, '首尾空格应被容忍');
  assert.equal(decodeBackup('not-a-valid-code!!!'), null);
  assert.equal(decodeBackup(encodeBackup({ hello: 'world' })), null, '结构不对也算无效');
});

test('备份码：接受旧 v2 并恢复为 v3，接受 v3，拒绝其他版本和畸形 profiles', () => {
  const oldV2 = {
    v: 2,
    current: 'yoyo',
    speechRate: 1,
    profiles: {
      yoyo: { stars: 9, level: 'flyers', seen: { dolphin: true } },
      yodi: { stars: 2, level: 'seed' },
    },
  };
  const restoredV2 = decodeBackup(encodeBackup(oldV2));
  assert.equal(restoredV2.v, 3);
  assert.equal(restoredV2.current, 'yoyo');
  assert.equal(restoredV2.profiles.yoyo.stars, 9);
  assert.equal(restoredV2.profiles.yoyo.level, 'flyers');
  assert.deepEqual(restoredV2.profiles.yoyo.seen, { dolphin: true });
  assert.equal(restoredV2.profiles.yodi.stars, 2);
  assert.deepEqual(restoredV2.profiles.mom, defaultProfileState('mom'));

  const v3 = defaultState();
  v3.current = 'mom';
  v3.profiles.mom.level = 'postgrad';
  assert.deepEqual(decodeBackup(encodeBackup(v3)), v3);

  assert.equal(decodeBackup(encodeBackup({ v: 1, profiles: {} })), null);
  assert.equal(decodeBackup(encodeBackup({ v: 4, profiles: {} })), null);
  assert.equal(decodeBackup(encodeBackup({ v: 3, profiles: null })), null);
  assert.equal(decodeBackup(encodeBackup({ v: 3, profiles: [] })), null);
});

test('备份码：恢复前规范化内部字段，顶层无效或超长输入返回 null', () => {
  const badInner = {
    v: 2,
    current: 'someone',
    speechRate: 'fast',
    profiles: { yoyo: { stars: '<svg onload=alert(1)>', progress: null }, yodi: [] },
  };
  const restored = decodeBackup(encodeBackup(badInner));
  assert.equal(restored.current, null);
  assert.equal(restored.speechRate, 0.8);
  assert.deepEqual(restored.profiles.yoyo, defaultProfileState('yoyo'));
  assert.deepEqual(restored.profiles.yodi, defaultProfileState('yodi'));
  assert.equal(decodeBackup(encodeBackup({ v: 2, profiles: null })), null);
  assert.equal(decodeBackup('a'.repeat(2_000_001)), null);
  assert.equal(decodeBackup(123), null);
});

test('我的世界：不同场景的贴纸独立保存，不会随场景切换互相带过去', () => {
  assert.deepEqual(defaultProfileState('yoyo').worlds, {});
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.profiles.yoyo.worlds = {
    grassland: [{ id: 'cat', x: 50, y: 52, size: 84 }],
    sea: [{ id: 'dolphin', x: 30, y: 40, size: 100 }],
  };
  s.save(state);
  const loaded = s.load();
  assert.deepEqual(loaded.profiles.yoyo.worlds.grassland,
    [{ id: 'cat', x: 50, y: 52, size: 84 }]);
  assert.deepEqual(loaded.profiles.yoyo.worlds.sea,
    [{ id: 'dolphin', x: 30, y: 40, size: 100 }]);
  assert.notStrictEqual(loaded.profiles.yoyo.worlds.grassland, loaded.profiles.yoyo.worlds.sea);
  // 老 v2 数据没有 world / worlds → 自动补空映射
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({ v: 2, current: 'yoyo', profiles: { yoyo: { stars: 5 } } }));
  assert.deepEqual(createStorage(be).load().profiles.yoyo.worlds, {});
});

test('我的世界：旧 world 按当前场景迁移，非法场景回退草原且不丢贴纸', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 2,
    profiles: {
      yoyo: {
        worldScene: 'sea',
        world: [{ id: 'dolphin', x: 30, y: 40, size: 100 }],
      },
      yodi: {
        worldScene: 'volcano',
        world: [{ id: 'cat', x: 50, y: 52, size: 84 }],
      },
    },
  }));
  const state = createStorage(be).load();
  assert.deepEqual(state.profiles.yoyo.worlds, {
    sea: [{ id: 'dolphin', x: 30, y: 40, size: 100 }],
  });
  assert.equal(state.profiles.yoyo.worldScene, 'sea');
  assert.deepEqual(state.profiles.yodi.worlds, {
    grassland: [{ id: 'cat', x: 50, y: 52, size: 84 }],
  });
  assert.equal(state.profiles.yodi.worldScene, 'grassland');
  assert.equal(state.profiles.yoyo.world, undefined);
});

test('我的世界：过渡存档同时含 worlds 和 world 时按 id 去重，优先保留新布局', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 3,
    current: 'yoyo',
    profiles: {
      yoyo: {
        worldScene: 'sea',
        worlds: {
          sea: [
            { id: 'dolphin', x: 20, y: 30, size: 96 },
            { id: 'cat', x: 40, y: 50, size: 84 },
          ],
        },
        world: [
          { id: 'dolphin', x: 80, y: 90, size: 140 },
          { id: 'dog', x: 60, y: 70, size: 100 },
          { id: 'dog', x: 10, y: 15, size: 70 },
        ],
      },
    },
  }));

  assert.deepEqual(createStorage(be).load().profiles.yoyo.worlds.sea, [
    { id: 'dolphin', x: 20, y: 30, size: 96 },
    { id: 'cat', x: 40, y: 50, size: 84 },
    { id: 'dog', x: 60, y: 70, size: 100 },
  ]);
});

test('我的世界：旧字段迁移重复 load 幂等，保存规范化结果后也不会重复贴纸', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 3,
    current: 'yoyo',
    profiles: {
      yoyo: {
        worldScene: 'forest',
        world: [{ id: 'rabbit', x: 45, y: 55, size: 90 }],
      },
    },
  }));
  const storage = createStorage(be);
  const first = storage.load();
  const second = storage.load();
  assert.deepEqual(second, first);
  assert.equal(second.profiles.yoyo.worlds.forest.length, 1);

  storage.save(first);
  const afterSave = storage.load();
  assert.deepEqual(afterSave, first);
  assert.equal(afterSave.profiles.yoyo.worlds.forest.length, 1);
  assert.equal(afterSave.profiles.yoyo.world, undefined);
});

test('我的世界：畸形 worlds 只保留合法场景，并逐场景规范化贴纸', () => {
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({
    v: 3,
    profiles: {
      yoyo: {
        worlds: {
          sea: [
            { id: 'dolphin', x: -5, y: 105, size: 999 },
            { id: '<img>', x: 1, y: 2, size: 84 },
          ],
          desert: 'not-an-array',
          volcano: [{ id: 'cat', x: 50, y: 50, size: 84 }],
        },
      },
    },
  }));
  assert.deepEqual(createStorage(be).load().profiles.yoyo.worlds, {
    sea: [{ id: 'dolphin', x: 0, y: 100, size: 168 }],
    desert: [],
  });
});

test('备份码：把「我的世界」各场景贴纸一起编码进去', () => {
  const state = defaultState();
  state.profiles.yoyo.worlds = {
    grassland: [{ id: 'cat', x: 50, y: 52, size: 84 }],
    sea: [{ id: 'dolphin', x: 30, y: 40, size: 100 }],
  };
  const decoded = decodeBackup(encodeBackup(state));
  assert.deepEqual(decoded.profiles.yoyo.worlds, state.profiles.yoyo.worlds);
});

test('备份码：旧 v3 的 world 字段恢复到对应 worlds 场景且结果可稳定重备份', () => {
  const oldV3 = {
    v: 3,
    current: 'yoyo',
    profiles: {
      yoyo: {
        worldScene: 'snow',
        world: [{ id: 'rabbit', x: 35, y: 45, size: 88 }],
      },
    },
  };
  const restored = decodeBackup(encodeBackup(oldV3));
  assert.equal(restored.v, 3);
  assert.deepEqual(restored.profiles.yoyo.worlds, {
    snow: [{ id: 'rabbit', x: 35, y: 45, size: 88 }],
  });
  assert.equal(restored.profiles.yoyo.world, undefined);
  assert.deepEqual(decodeBackup(encodeBackup(restored)), restored);
});

test('语音设置：语速和音色能存读，老数据补默认，备份码带上', () => {
  assert.equal(defaultState().speechRate, 0.8);
  assert.equal(defaultState().speechVoice, 'auto');
  // 老 v2 数据没有 speechRate → 补默认
  const be = memoryBackend();
  be.setItem('yoyo-words-v1', JSON.stringify({ v: 2, current: 'yoyo', profiles: { yoyo: { stars: 1 } } }));
  assert.equal(createStorage(be).load().speechRate, 0.8);
  assert.equal(createStorage(be).load().speechVoice, 'auto');
  // 自定义语速能存读
  const s = createStorage(memoryBackend());
  const state = defaultState();
  state.speechRate = 0.6;
  state.speechVoice = 'com.apple.voice.enhanced.en-GB.Daniel';
  s.save(state);
  assert.equal(s.load().speechRate, 0.6);
  assert.equal(s.load().speechVoice, 'com.apple.voice.enhanced.en-GB.Daniel');
  // 备份码带上语速
  assert.equal(decodeBackup(encodeBackup(state)).speechRate, 0.6);
  assert.equal(decodeBackup(encodeBackup(state)).speechVoice, 'com.apple.voice.enhanced.en-GB.Daniel');
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
