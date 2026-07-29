import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ADULT_LEVEL_ID,
  ADULT_LEVELS,
  ADULT_WORDS,
  adultWordsForLevel,
  findAdultLevel,
  adultWordPage,
} from '../js/adult-words.js';

const LEVEL_IDS = ['life', 'cet4', 'cet6', 'postgrad'];
const ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/i;

test('成人词库：四条路线齐全，默认从 CET4 开始', () => {
  assert.deepEqual(ADULT_LEVELS.map((level) => level.id), LEVEL_IDS);
  assert.equal(DEFAULT_ADULT_LEVEL_ID, 'cet4');
  assert.equal(ADULT_LEVELS.filter((level) => level.isDefault).length, 1);
  assert.equal(findAdultLevel('cet6').id, 'cet6');
  assert.equal(findAdultLevel('not-a-level').id, 'cet4');
});

test('成人词库：生活常用约 1800，CET4/CET6/考研保留完整量级', () => {
  const counts = Object.fromEntries(
    LEVEL_IDS.map((levelId) => [levelId, adultWordsForLevel(levelId).length]),
  );
  assert.equal(counts.life, 1800);
  assert.ok(counts.cet4 >= 3800 && counts.cet4 <= 3900, `CET4 数量异常: ${counts.cet4}`);
  assert.ok(counts.cet6 >= 5350 && counts.cet6 <= 5450, `CET6 数量异常: ${counts.cet6}`);
  assert.ok(counts.postgrad >= 4750 && counts.postgrad <= 4850,
    `考研数量异常: ${counts.postgrad}`);
  assert.ok(ADULT_WORDS.length >= 6000, `成人词库总量不足: ${ADULT_WORDS.length}`);
});

test('成人词库：英文和 id 全局唯一，id 可安全写入存档', () => {
  const ids = ADULT_WORDS.map((word) => word.id);
  const exactEnglish = ADULT_WORDS.map((word) => word.en);
  const english = exactEnglish.map((word) => word.toLocaleLowerCase('en'));
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(exactEnglish).size, exactEnglish.length);
  const caseOnlyDuplicates = [...new Set(
    english.filter((word, index) => english.indexOf(word) !== index),
  )];
  assert.deepEqual(caseOnlyDuplicates, ['polish']);
  for (const id of ids) {
    assert.ok(id.startsWith('adult:'), `${id} 没有 adult: 前缀`);
    assert.match(id, ID_PATTERN);
  }
  assert.ok(!english.includes('reservior'), '已知拼写错误应合并为 reservoir');
  assert.ok(!english.includes('uptodate'), 'up-to-date 不应再有无连字符重复项');
  assert.ok(!english.includes('world-wide'), 'worldwide 不应再有重复拼写项');
});

test('成人词库：学习字段完整，中文释义已清洗为短释义', () => {
  const validTracks = new Set(LEVEL_IDS);
  for (const word of ADULT_WORDS) {
    for (const field of ['id', 'en', 'zh', 'phonetic', 'pos', 'tracks', 'rank']) {
      assert.ok(Object.hasOwn(word, field), `${word.id || '?'} 缺少字段 ${field}`);
    }
    assert.ok(word.en.length > 0);
    assert.ok(word.zh.length > 0 && word.zh.length <= 36, `${word.id} 释义过长: ${word.zh}`);
    assert.ok(!word.zh.includes('\\n') && !word.zh.includes('\n'), `${word.id} 释义仍有换行`);
    assert.equal(typeof word.phonetic, 'string');
    assert.ok(typeof word.pos === 'string' && word.pos.length > 0);
    if (word.senses) {
      assert.ok(Array.isArray(word.senses) && word.senses.length >= 2);
      assert.equal(word.pos, word.senses[0].pos, `${word.en} 主词性与第一条义项不一致`);
      assert.equal(word.zh, word.senses[0].zh, `${word.en} 主释义与第一条义项不一致`);
      assert.equal(
        new Set(word.senses.map((sense) => sense.pos)).size,
        word.senses.length,
        `${word.en} 同一词性重复显示`,
      );
      for (const sense of word.senses) {
        assert.ok(typeof sense.pos === 'string' && sense.pos.length > 0);
        assert.ok(typeof sense.zh === 'string' && sense.zh.length > 0 && sense.zh.length <= 36);
        if (sense.phonetic !== undefined) {
          assert.ok(typeof sense.phonetic === 'string' && sense.phonetic.length > 0);
        }
      }
    }
    assert.ok(Number.isInteger(word.rank) && word.rank > 0);
    assert.ok(Array.isArray(word.tracks) && word.tracks.length > 0);
    assert.equal(new Set(word.tracks).size, word.tracks.length);
    assert.ok(word.tracks.every((track) => validTracks.has(track)));
  }
});

test('成人词库：重叠考试词只存一份，并记录多条共享路线', () => {
  const shared = ADULT_WORDS.filter((word) => word.tracks.length >= 3);
  assert.ok(shared.length >= 3000, `多路线共享词只有 ${shared.length} 个`);
  const abandon = ADULT_WORDS.find((word) => word.en.toLowerCase() === 'abandon');
  assert.ok(abandon);
  assert.ok(abandon.tracks.includes('cet4'));
  assert.ok(abandon.tracks.includes('cet6'));
  assert.ok(abandon.tracks.includes('postgrad'));
});

test('成人词库：高频多义词使用日常义，不把生僻首义当成主卡片', () => {
  const byEnglish = new Map(ADULT_WORDS.map((word) => [word.en.toLowerCase(), word]));
  const expected = {
    a: '一个、任一',
    can: '能、可以',
    will: '将、会、愿意',
    want: '想要、需要',
    give: '给、给予',
    well: '很好地、健康的',
    may: '可以、可能',
    still: '仍然、还是',
    just: '只是、刚刚、正好',
    mean: '意思是、意味着',
    might: '可能、也许',
    lot: '许多、大量、一批',
    natural: '自然的、天然的',
    special: '特别的、特殊的',
    pm: '下午',
    ms: '女士',
    jew: '犹太人',
  };
  for (const [word, gloss] of Object.entries(expected)) {
    assert.equal(byEnglish.get(word)?.zh, gloss, `${word} 没有使用校正后的日常义`);
  }
  assert.ok(!byEnglish.has("n't"), "n't 不能作为独立背词项");
});

test('成人词库：生活路线的错误首义和冒犯性旧义已校正', () => {
  const lifeWords = adultWordsForLevel('life');
  const byEnglish = new Map(lifeWords.map((word) => [word.en.toLowerCase(), word]));
  const expected = {
    woman: ['女人、女性', 'n.'],
    girl: ['女孩、少女', 'n.'],
    save: ['保存、节省、挽救', 'v.'],
    medical: ['医疗的、医学的', 'adj.'],
    current: ['当前的、现行的', 'adj.'],
    despite: ['尽管、不管', 'prep.'],
    dog: ['狗', 'n.'],
    ready: ['准备好的、愿意的', 'adj.'],
    miss: ['错过、想念、未击中', 'v.'],
    final: ['最后的、最终的', 'adj.'],
    main: ['主要的、最重要的', 'adj.'],
    specific: ['具体的、特定的', 'adj.'],
    somebody: ['某人、有人', 'pron.'],
    tough: ['艰难的、强硬的', 'adj.'],
    modern: ['现代的、近代的', 'adj.'],
    safe: ['安全的、平安的', 'adj.'],
    nobody: ['没有人、无人', 'pron.'],
    perfect: ['完美的、完全的', 'adj.'],
    basic: ['基本的、基础的', 'adj.'],
    none: ['没有一个、毫无', 'pron.'],
    southern: ['南方的、南部的', 'adj.'],
    settle: ['解决、定居、安顿', 'v.'],
    hide: ['隐藏、躲藏', 'v.'],
    independent: ['独立的、自主的', 'adj.'],
    christian: ['基督徒、基督教的', 'n.'],
    express: ['表达、表示', 'v.'],
    select: ['选择、挑选', 'v.'],
    sick: ['生病的、不舒服的', 'adj.'],
    cat: ['猫', 'n.'],
    equal: ['相等的、平等的', 'adj.'],
    due: ['到期的、预定的、由于', 'adj.'],
    separate: ['分开的、把…分开', 'adj.'],
    somewhat: ['有点、稍微', 'adv.'],
    initial: ['最初的、开始的', 'adj.'],
    contemporary: ['当代的、同时代的', 'adj.'],
    multiple: ['多个的、多重的', 'adj.'],
    essential: ['必不可少的、本质的', 'adj.'],
    supreme: ['最高的、至高的', 'adj.'],
    vegetable: ['蔬菜、植物', 'n.'],
    narrow: ['狭窄的、有限的', 'adj.'],
  };

  for (const [word, [gloss, pos]] of Object.entries(expected)) {
    assert.equal(byEnglish.get(word)?.zh, gloss, `${word} 的常用义仍不准确`);
    assert.equal(byEnglish.get(word)?.pos, pos, `${word} 的主词性仍不准确`);
  }

  const bannedGloss = /女仆|女佣|坏蛋|恶妇|男风|无名小卒|有背长椅|无精打采之人/;
  for (const word of lifeWords) {
    assert.doesNotMatch(word.zh, bannedGloss, `${word.en} 仍含不适合作为主卡片的旧义`);
  }
});

test('成人词库：普通方向词和 core 不沿用来源中的异常大写', () => {
  const byLowerEnglish = new Map(ADULT_WORDS.map((word) => [word.en.toLowerCase(), word.en]));
  assert.equal(byLowerEnglish.get('north'), 'north');
  assert.equal(byLowerEnglish.get('core'), 'core');
});

test('成人词库：跨路线语义抽检使用现代常用义和正确主词性', () => {
  const byEnglish = new Map(ADULT_WORDS.map((word) => [word.en.toLowerCase(), word]));
  const expected = {
    assimilate: ['吸收、理解、使同化', 'v.'],
    bit: ['一点、少量、比特', 'n.'],
    commission: ['委员会、佣金、委托', 'n.'],
    configuration: ['配置、结构、布局', 'n.'],
    doll: ['玩偶、洋娃娃', 'n.'],
    'ice-cream': ['冰淇淋', 'n.'],
    intermediate: ['中间的、中级的', 'adj.'],
    loose: ['松的、宽松的、不牢固的', 'adj.'],
    temperamental: ['喜怒无常的、情绪多变的', 'adj.'],
    resolute: ['坚定的、坚决的', 'adj.'],
    invert: ['使倒置、使颠倒、反转', 'v.'],
    inverse: ['倒转的、相反的', 'adj.'],
    invalid: ['无效的、不合法的', 'adj.'],
    circumference: ['圆周、周长', 'n.'],
    transcendental: ['先验的、超验的、超凡的', 'adj.'],
    'x-ray': ['X射线、X光检查', 'n.'],
  };
  for (const [word, [gloss, pos]] of Object.entries(expected)) {
    assert.equal(byEnglish.get(word)?.zh, gloss, `${word} 的主释义不准确`);
    assert.equal(byEnglish.get(word)?.pos, pos, `${word} 的主词性不准确`);
  }

  assert.ok(!ADULT_WORDS.some((word) => /残废者|病人、残/.test(word.zh)),
    '过时或冒犯性的 invalid 名词义不应作为主卡片');
});

test('成人词库：常用多词性分开保留，过时或冒犯义不重新混入', () => {
  const byEnglish = new Map(ADULT_WORDS.map((word) => [word.en.toLowerCase(), word]));
  assert.deepEqual(byEnglish.get('relative')?.senses, [
    { pos: 'adj.', zh: '相对的、相关的' },
    { pos: 'n.', zh: '亲戚、亲属' },
  ]);
  assert.deepEqual(byEnglish.get('civilian')?.senses, [
    { pos: 'adj.', zh: '平民的、民用的' },
    { pos: 'n.', zh: '平民' },
  ]);
  assert.deepEqual(byEnglish.get('tender')?.senses, [
    { pos: 'adj.', zh: '柔软的、嫩的' },
    { pos: 'v.', zh: '正式提出、提交、投标' },
    { pos: 'n.', zh: '投标、投标书' },
  ]);
  assert.deepEqual(byEnglish.get('duplicate')?.senses, [
    { pos: 'n.', zh: '副本、复制品' },
    { pos: 'adj.', zh: '复制的、完全相同的' },
    { pos: 'v.', zh: '复制、使加倍' },
  ]);
  assert.deepEqual(byEnglish.get('implement')?.senses, [
    { pos: 'v.', zh: '实施、执行' },
    { pos: 'n.', zh: '工具、器具' },
  ]);
  assert.deepEqual(byEnglish.get('representative')?.senses, [
    { pos: 'n.', zh: '代表、代表性人物' },
    { pos: 'adj.', zh: '有代表性的、典型的' },
  ]);
  assert.equal(byEnglish.get('invalid')?.senses, undefined);
  assert.equal(byEnglish.get('stale')?.senses, undefined);
  assert.equal(byEnglish.get('natural')?.senses, undefined);
  assert.doesNotMatch(byEnglish.get('invalid')?.zh || '', /病人|残废者/);
});

test('成人词库：考研常用多词性不再只审主词性冲突', () => {
  const postgrad = adultWordsForLevel('postgrad');
  assert.ok(postgrad.filter((word) => word.senses).length >= 900,
    '考研路线多词性覆盖不足');
  assert.ok(postgrad.filter((word) => word.senses?.length >= 3).length >= 50,
    '考研路线三词性覆盖不足');

  const byEnglish = new Map(postgrad.map((word) => [word.en.toLowerCase(), word]));
  for (const word of ['record', 'content', 'permit', 'convict', 'contract', 'object', 'project']) {
    assert.ok(byEnglish.get(word)?.senses?.length >= 2, `${word} 未保留常用多词性`);
    assert.ok(byEnglish.get(word).senses.every((sense) => sense.phonetic),
      `${word} 的异读词性缺少独立音标`);
  }
});

test('成人词库：考研高风险旧义、错译和大小写同形词已校正', () => {
  const words = adultWordsForLevel('postgrad');
  const exact = new Map(words.map((word) => [word.en, word]));
  const byLower = new Map(words.map((word) => [word.en.toLowerCase(), word]));

  const expectedPrimary = {
    less: ['更少的、较小的', 'adj.'],
    pale: ['苍白的、浅色的、微弱的', 'adj.'],
    render: ['使成为、提供、呈现、渲染', 'v.'],
    interact: ['互动、相互作用', 'v.'],
    shy: ['害羞的、胆怯的', 'adj.'],
    steer: ['驾驶、引导', 'v.'],
    primitive: ['原始的、早期的、简陋的', 'adj.'],
    bankrupt: ['破产的、彻底缺乏的', 'adj.'],
    exempt: ['被免除的、豁免的', 'adj.'],
    tidy: ['整齐的、有条理的', 'adj.'],
    mute: ['无声的、沉默的', 'adj.'],
  };
  for (const [en, [zh, pos]] of Object.entries(expectedPrimary)) {
    assert.equal(byLower.get(en)?.zh, zh, `${en} 的高风险首义未校正`);
    assert.equal(byLower.get(en)?.pos, pos, `${en} 的高风险主词性未校正`);
  }
  assert.ok(!JSON.stringify(byLower.get('tan')).includes('马戏团'));
  assert.ok(!JSON.stringify(byLower.get('render')).includes('给于'));
  assert.deepEqual(byLower.get('steer')?.senses, [
    { pos: 'v.', zh: '驾驶、引导' },
    { pos: 'n.', zh: '阉公牛' },
  ]);
  assert.equal(exact.get('polish')?.zh, '擦亮、润色');
  assert.equal(exact.get('Polish')?.zh, '波兰的');
  assert.notEqual(exact.get('polish')?.id, exact.get('Polish')?.id);
});

test('成人词库：字幕词性只发现风险，不再覆盖考试常用主释义', () => {
  const byEnglish = new Map(ADULT_WORDS.map((word) => [word.en.toLowerCase(), word]));
  const expected = {
    peer: ['同龄人、同等地位者', 'n.'],
    brave: ['勇敢的', 'adj.'],
    orphan: ['孤儿', 'n.'],
    missionary: ['传教士', 'n.'],
    anchor: ['锚、主持人', 'n.'],
    eclipse: ['日食、月食', 'n.'],
    token: ['标志、代币、令牌', 'n.'],
    latent: ['潜在的、潜伏的', 'adj.'],
    periodical: ['期刊、杂志', 'n.'],
  };
  for (const [word, [zh, pos]] of Object.entries(expected)) {
    assert.equal(byEnglish.get(word)?.zh, zh, `${word} 的常用主释义回归`);
    assert.equal(byEnglish.get(word)?.pos, pos, `${word} 的常用主词性回归`);
  }
});

test('adultWordPage：按页返回，越界页会安全收敛', () => {
  const first = adultWordPage('cet4', 0, 25);
  assert.equal(first.page, 0);
  assert.equal(first.words.length, 25);
  assert.equal(first.total, adultWordsForLevel('cet4').length);
  const last = adultWordPage('cet4', 99999, 25);
  assert.equal(last.page, last.pageCount - 1);
  assert.ok(last.words.length >= 1 && last.words.length <= 25);
  const fallback = adultWordPage('invalid', -3, 0);
  assert.equal(fallback.total, adultWordsForLevel('cet4').length);
  assert.equal(fallback.words.length, 20);
});
