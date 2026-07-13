import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, LEVELS, WORDS, UNITS, SCENES, KIWI_ITEMS, KIWI_PACKS,
  wordsForLevel, categoriesForLevel, wordsByCategory, findWord, findLevel, unitWords,
  kiwiPackItems, findUnitContent,
} from '../js/words.js';

test('单词库：总量不少于 400，覆盖四个级别', () => {
  assert.ok(WORDS.length >= 400, `实际只有 ${WORDS.length} 个`);
  assert.deepEqual(LEVELS.map((l) => l.id), ['seed', 'starters', 'movers', 'flyers']);
});

test('单词库：每个级别的词量在合理范围（60~260）', () => {
  for (const lvl of LEVELS) {
    const n = wordsForLevel(lvl.id).length;
    assert.ok(n >= 60 && n <= 260, `级别 ${lvl.name} 有 ${n} 个词`);
  }
});

test('PU2 单元：Welcome + Unit1~9 + 拓展共 11 个，id 都能找到对应单词', () => {
  assert.equal(UNITS.length, 11);
  assert.equal(UNITS[0].id, 'welcome');
  assert.equal(UNITS[10].id, 'extra');
  for (const u of UNITS) {
    assert.ok(u.ids.length >= 6, `单元 ${u.name} 只有 ${u.ids.length} 个词`);
    assert.equal(new Set(u.ids).size, u.ids.length, `单元 ${u.name} 有重复 id`);
    for (const id of u.ids) {
      assert.ok(findWord(id), `单元 ${u.name} 的 ${id} 在词库里不存在`);
    }
    assert.equal(unitWords(u.id).length, u.ids.length);
  }
});

test('PU2 单元：每个 Movers 级单词至少属于一个单元（含拓展）', () => {
  const inUnits = new Set(UNITS.flatMap((u) => u.ids));
  for (const w of wordsForLevel('movers')) {
    assert.ok(inUnits.has(w.id), `${w.id} 不在任何单元里，没有学习入口`);
  }
});

test('PU2 单元：课本单元允许跨级引用（如 U5 的 run 来自 Starters）', () => {
  const u5 = unitWords('u5');
  assert.ok(u5.some((w) => w.id === 'run' && w.lvl === 'starters'));
  assert.ok(u5.some((w) => w.id === 'lion' && w.lvl === 'seed'));
  const u9 = unitWords('u9');
  assert.ok(u9.some((w) => w.id === 'bored' && w.lvl === 'flyers'));
});

test('单词库：id 全局唯一', () => {
  const ids = WORDS.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('单词库：每个单词字段齐全且非空、级别合法', () => {
  const lvlIds = new Set(LEVELS.map((l) => l.id));
  for (const w of WORDS) {
    for (const field of ['id', 'en', 'zh', 'emoji', 'cat', 'lvl']) {
      assert.ok(typeof w[field] === 'string' && w[field].length > 0,
        `${w.id || '?'} 缺少字段 ${field}`);
    }
    assert.ok(lvlIds.has(w.lvl), `${w.id} 的级别 ${w.lvl} 不存在`);
  }
});

test('单词库：分类合法，每级每个分类不少于 6 个词', () => {
  const catIds = new Set(CATEGORIES.map((c) => c.id));
  for (const w of WORDS) {
    assert.ok(catIds.has(w.cat), `${w.id} 的分类 ${w.cat} 不存在`);
  }
  for (const lvl of LEVELS) {
    for (const c of categoriesForLevel(lvl.id)) {
      const n = wordsByCategory(c.id, lvl.id).length;
      assert.ok(n >= 6, `级别 ${lvl.name} 的分类 ${c.name} 只有 ${n} 个词`);
    }
  }
});

test('单词库：同一英文可保留不同词义，但“英文 + 中文词义”不重复', () => {
  const senses = WORDS.map((w) => `${w.en.toLowerCase()}\u0000${w.zh}`);
  assert.equal(new Set(senses).size, senses.length);
  const byEnglish = new Map();
  for (const w of WORDS) {
    const key = w.en.toLowerCase();
    byEnglish.set(key, [...(byEnglish.get(key) || []), w]);
  }
  for (const [en, entries] of byEnglish) {
    if (entries.length < 2) continue;
    assert.equal(new Set(entries.map((w) => w.zh)).size, entries.length, `${en} 的词义重复`);
    assert.ok(entries.every((w) => w.sentence), `${en} 一词多义时必须有语境例句`);
  }
  for (const lvl of LEVELS) {
    const zhs = wordsForLevel(lvl.id).map((w) => w.zh);
    assert.equal(new Set(zhs).size, zhs.length, `级别 ${lvl.name} 中文有重复`);
  }
});

test('Power Up 2：课本 10 个主单元的每项内容都有可朗读例句', () => {
  for (const unit of UNITS.slice(0, 10)) {
    for (const word of unitWords(unit.id)) {
      assert.ok(word.sentence, `${unit.id}/${word.id} 缺少例句`);
    }
  }
});

test('Power Up 2：补齐关键词义、英式用词和不规则复数', () => {
  assert.ok(unitWords('u3').some((w) => w.id === 'cookperson' && w.zh === '厨师'));
  assert.ok(unitWords('u5').some((w) => w.id === 'flyverb' && w.zh === '飞'));
  assert.equal(findWord('busstop').en, 'bus station');
  assert.deepEqual(findWord('leaf').forms, ['leaf', 'leaves']);
});

test('Kiwi 听说启蒙：24 项分成 4 组，每组 6 项且图片不重复', () => {
  assert.equal(KIWI_ITEMS.length, 24);
  assert.equal(new Set(KIWI_ITEMS.map((w) => w.id)).size, 24);
  assert.equal(new Set(KIWI_ITEMS.map((w) => w.emoji)).size, 24);
  assert.equal(KIWI_PACKS.length, 4);
  for (const pack of KIWI_PACKS) assert.equal(kiwiPackItems(pack.id).length, 6);
  assert.ok(KIWI_ITEMS.filter((w) => ['command', 'chunk'].includes(w.kind)).length >= 8,
    '除了名词，还要有足够的动作指令和完整口语块');
});

test('Unit 1 综合任务：包含句型、对话和自主表达三层内容', () => {
  const content = findUnitContent('u1');
  assert.ok(content);
  assert.ok(content.chunks.length >= 4);
  assert.ok(content.dialogue.length >= 4);
  assert.ok(content.mission.prompts.length >= 4);
  assert.equal(findUnitContent('u2'), null, '第一批只开放 Unit 1，避免伪装成全量完成');
});

test('单词库：Movers 和 Flyers 级每个词都有例句，且例句包含该单词', () => {
  for (const lvlId of ['movers', 'flyers']) {
    for (const w of wordsForLevel(lvlId)) {
      assert.ok(typeof w.sentence === 'string' && w.sentence.length > 0,
        `${w.id} 缺少例句`);
      assert.ok(w.sentence.toLowerCase().includes(w.en.toLowerCase()),
        `${w.id} 的例句里没有出现单词本身: "${w.sentence}"`);
    }
  }
});

test('categoriesForLevel：只返回该级别有词的分类', () => {
  for (const lvl of LEVELS) {
    for (const c of categoriesForLevel(lvl.id)) {
      assert.ok(wordsByCategory(c.id, lvl.id).length > 0);
    }
  }
  // 萌芽级没有"地点"分类，Movers 级没有"颜色"分类
  assert.ok(!categoriesForLevel('seed').some((c) => c.id === 'places'));
  assert.ok(!categoriesForLevel('movers').some((c) => c.id === 'colors'));
});

test('wordsByCategory：带级别参数时只返回该级别的词', () => {
  const seedAnimals = wordsByCategory('animals', 'seed');
  assert.ok(seedAnimals.every((w) => w.lvl === 'seed'));
  const allAnimals = wordsByCategory('animals');
  assert.ok(allAnimals.length > seedAnimals.length, '不带级别应返回所有级别的词');
});

test('环境场景：至少 6 个、id 唯一、含默认 grassland、字段齐全', () => {
  assert.ok(SCENES.length >= 6, `实际只有 ${SCENES.length} 个环境`);
  const ids = SCENES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, 'id 有重复');
  assert.ok(ids.includes('grassland'), '缺少默认草原');
  for (const s of SCENES) {
    for (const f of ['id', 'name', 'emoji']) {
      assert.ok(typeof s[f] === 'string' && s[f].length > 0, `${s.id || '?'} 缺字段 ${f}`);
    }
  }
});

test('findWord / findLevel：正常查找与兜底', () => {
  assert.equal(findWord('cat').zh, '猫');
  assert.equal(findWord('dolphin').lvl, 'movers');
  assert.equal(findWord('nonexistent'), null);
  assert.equal(findLevel('movers').name, 'Movers');
  assert.equal(findLevel('bad-id').id, 'seed', '找不到级别时回退到第一个');
});
