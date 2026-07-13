import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, LEVELS, WORDS, UNITS, SCENES,
  wordsForLevel, categoriesForLevel, wordsByCategory, findWord, findLevel, unitWords,
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

test('单词库：英文全局不重复、中文在同级别内不重复（保证选项不撞车）', () => {
  const ens = WORDS.map((w) => w.en.toLowerCase());
  assert.equal(new Set(ens).size, ens.length);
  for (const lvl of LEVELS) {
    const zhs = wordsForLevel(lvl.id).map((w) => w.zh);
    assert.equal(new Set(zhs).size, zhs.length, `级别 ${lvl.name} 中文有重复`);
  }
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
