import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ADULT_WORDS } from '../js/adult-words.js';
import { spawnSync } from 'node:child_process';

const WORDS_BY_ENGLISH = new Map(
  ADULT_WORDS.map((word) => [word.en.toLocaleLowerCase('en'), word]),
);

const TOP_500 = [...ADULT_WORDS]
  .sort((left, right) => left.rank - right.rank)
  .slice(0, 500);

test('全库首批修订：对待/治疗、批次和接待处不能被狭窄旧义替代', () => {
  const treat = WORDS_BY_ENGLISH.get('treat');
  assert.equal(treat.pos, 'v.');
  assert.match(treat.zh, /对待/);
  assert.match(treat.zh, /治疗/);
  assert.ok(treat.senses.some(s => s.pos === 'n.' && /享受/.test(s.zh)));
  const batch = WORDS_BY_ENGLISH.get('batch');
  assert.match(batch.zh, /一批/);
  assert.doesNotMatch(batch.definition, /loaves|bread/);
  assert.ok(batch.senses.some(s => s.pos === 'v.' && s.example));
  assert.match(WORDS_BY_ENGLISH.get('reception').zh, /接待处/);
  assert.match(WORDS_BY_ENGLISH.get('entertain').zh, /考虑/);
  assert.ok(WORDS_BY_ENGLISH.get('feast').senses.every(s => s.example));
  assert.match(WORDS_BY_ENGLISH.get('maltreat').family.find(w => w.en === 'treat').zh, /对待/);
});

test('成人英英释义：普通词不能被解释成人物、地名或生物学名', () => {
  // WordNet 把同名人物/地点挂在普通词下：hunt→画家 Hunt，buffalo→布法罗市……
  const expected = {
    hunt: /chasing animals|search/, foster: /child/, mill: /flour|factory/,
    curl: /hair|curved/, crane: /lifting|bird/, barber: /hair/, villa: /house/,
    piston: /engine/, weld: /metal/, seaman: /sailor/, forth: /forward/,
    buffalo: /cattle/, tuna: /fish/, thorn: /plant|rose/, wasp: /insect/,
    donkey: /horse/, dot: /mark/, north: /direction/, south: /direction/,
    chase: /follow/, peel: /skin/, tyre: /wheel/, grey: /colour/,
    cosmos: /universe/, everlasting: /forever/, thrift: /money/,
  };
  for (const [en, pattern] of Object.entries(expected)) {
    const word = WORDS_BY_ENGLISH.get(en);
    const text = [word.definition, ...(word.senses || []).map((s) => s.definition || '')].join(' ');
    assert.match(text, pattern, `${en}: ${word.definition}`);
    assert.doesNotMatch(text, /\(\d{3,4}\s*[-–]\s*\d{2,4}\)|\bgenus [A-Z]|\ba (?:city|river|port) (?:in|on)\b/, en);
  }
});

const ENGLISH_TOKEN_PATTERN = /[a-z]+(?:'[a-z]+)?/gi;
const CROSS_REFERENCE_PATTERN =
  /(?:^|[.;]\s*)(?:i\.\s*)?(?:see|compare|cf\.?)\s+[a-z][a-z'-]*\.?\s*$/i;
const OLD_DICTIONARY_SHORTHAND_PATTERN =
  /^(?:dat\.\s*&\s*obj\.|obj\.|pl\.|imp\.|p\.\s*p\.|pa\.\s*p\.)\s+(?:of\s+)?/i;
const CLEARLY_TRUNCATED_PATTERN =
  /(?:[,;:]|\b(?:and|or|which|because|the|a|an))\s*$/i;

function englishTokens(text) {
  return text.toLocaleLowerCase('en').match(ENGLISH_TOKEN_PATTERN) || [];
}

function describeWords(words) {
  return words
    .slice(0, 30)
    .map((word) => `${word.en} (#${word.rank}): ${word.definition}`)
    .join('\n');
}

function assertNoMatches(words, predicate, message) {
  const failures = words.filter(predicate);
  assert.equal(
    failures.length,
    0,
    `${message}（共 ${failures.length} 条）\n${describeWords(failures)}`,
  );
}

test('成人英英释义：审计摘要对应当前生成词库且高置信缺陷为零', () => {
  const source = readFileSync(new URL('../js/adult-words.js', import.meta.url));
  const audit = JSON.parse(
    readFileSync(
      new URL('../reports/adult-definition-audit.json', import.meta.url),
      'utf8',
    ),
  );
  const sourceSha = createHash('sha256').update(source).digest('hex');
  assert.equal(audit.input_sha256, sourceSha, '释义审计报告未随词库重建刷新');
  assert.equal(audit.total_words, ADULT_WORDS.length);
  for (const code of [
    'missing_definition',
    'letter_sense_mismatch',
    'abbreviation_sense_mismatch',
    'homograph_sense_mismatch',
    'proper_name_sense_mismatch',
    'sense_proper_name_sense_mismatch',
    'headword_self_reference',
    'obvious_truncation',
    'legacy_cross_reference',
    'legacy_grammar_notation',
  ]) {
    assert.equal(audit.issue_counts[code] || 0, 0, `高置信释义缺陷仍存在: ${code}`);
  }
});

test('成人英英释义：全量词库不允许空释义', () => {
  assertNoMatches(
    ADULT_WORDS,
    (word) => typeof word.definition !== 'string' || word.definition.trim().length < 3,
    '发现空白或过短的英英释义',
  );
});

test('成人英英释义：高频短词不能错配到字母、缩写、州名或货币义', () => {
  const checks = {
    the: {
      required: /\b(?:particular|specific|already (?:known|mentioned)|clear which|knows which)\b/i,
      forbidden: /\b(?:thee|letter|alphabet)\b/i,
    },
    a: {
      required: /\b(?:one|any|each|single|singular|not specific)\b/i,
      forbidden: /\b(?:letter|alphabet)\b/i,
    },
    i: {
      required: /\b(?:speaker|person (?:who is )?speaking)\b/i,
      forbidden: /\b(?:letter|alphabet)\b/i,
    },
    he: {
      required: /\b(?:male|man|boy)\b/i,
      forbidden: /\b(?:letter|alphabet|hebrew)\b/i,
    },
    at: {
      required: /\b(?:place|position|point|time|location|event)\b/i,
      forbidden: /\b(?:kip|laos|currency)\b/i,
    },
    it: {
      required: /\b(?:thing|animal|situation|idea|already mentioned|being discussed)\b/i,
      forbidden: /\b(?:engineering|computers?|telecommunications?|information technology)\b/i,
    },
    its: {
      required: /\b(?:belonging|connected|possessive)\b/i,
      forbidden: /\b(?:engineering|computers?|telecommunications?|information technology)\b/i,
    },
    or: {
      required: /\b(?:alternative|choice|possibilit(?:y|ies)|otherwise)\b/i,
      forbidden: /\b(?:oregon|northwestern|pacific|state)\b/i,
    },
  };

  for (const [english, { required, forbidden }] of Object.entries(checks)) {
    const word = WORDS_BY_ENGLISH.get(english);
    assert.ok(word, `词库缺少高频词 ${english}`);
    assert.match(word.definition, required, `${word.en} 的英英释义没有表达主卡片常用义`);
    assert.doesNotMatch(word.definition, forbidden, `${word.en} 的英英释义仍错配到同形生僻义`);
  }
});

test('成人英英释义：已知高频同形词不再选中错误词性或专名义', () => {
  const forbiddenByWord = {
    as: /\b(?:arsenic|poisonous metallic element|allotropic)\b/i,
    can: /\b(?:metal container|tin|airtight sealed)\b/i,
    may: /\b(?:month|april|june)\b/i,
    us: /\b(?:republic|alaska|hawaii|50 states)\b/i,
    who: /\b(?:united nations|health agency|governments)\b/i,
    down: /\b(?:feathers?|plumage)\b/i,
    well: /\b(?:hole|shaft|oil|gas|brine)\b/i,
    still: /\b(?:photograph|movie|advertising)\b/i,
    over: /\b(?:cricket|bowled|batsman)\b/i,
    might: /\bphysical strength\b/i,
  };

  for (const [english, forbidden] of Object.entries(forbiddenByWord)) {
    const word = WORDS_BY_ENGLISH.get(english);
    assert.ok(word, `词库缺少高频词 ${english}`);
    assert.doesNotMatch(word.definition, forbidden, `${word.en} 的英英释义仍是错误义项`);
  }
});

test('成人英英释义：不允许明确交叉引用、古旧缩写或截断半句', () => {
  assertNoMatches(
    ADULT_WORDS,
    (word) => CROSS_REFERENCE_PATTERN.test(word.definition),
    '英英释义仍含 See X 一类词典交叉引用',
  );
  assertNoMatches(
    ADULT_WORDS,
    (word) => OLD_DICTIONARY_SHORTHAND_PATTERN.test(word.definition),
    '英英释义仍以 pl./imp./obj. 一类古旧词典缩写开头',
  );
  assertNoMatches(
    ADULT_WORDS,
    (word) => CLEARLY_TRUNCATED_PATTERN.test(word.definition),
    '英英释义明显在标点、连接词或冠词后被截断',
  );
});

test('成人英英释义：不允许最直接的循环定义', () => {
  const allowed = new Set(['one']);
  assertNoMatches(
    ADULT_WORDS,
    (word) => {
      const headword = word.en.toLocaleLowerCase('en');
      if (allowed.has(headword) || !/^[a-z]{2,}$/i.test(headword)) return false;
      return englishTokens(word.definition)[0] === headword;
    },
    '英英释义直接用目标词自身开头',
  );
});

test('成人英英释义：前 500 高频词至少提供可读短语而非单个生词', () => {
  assert.equal(TOP_500.length, 500);
  assertNoMatches(
    TOP_500,
    (word) => englishTokens(word.definition).length < 2,
    '前 500 高频词存在单词式同义替换，不能充当可读释义',
  );
});

test('生成器按词性精确匹配，不把主词性复制到缺失词性', () => {
  const result = spawnSync('python3', ['-c', [
    'import scripts.build_adult_vocab as b',
    'b.LEARNER_CONTENT["fixture"] = [{"pos":"v.","primary":True,"definition":"to use something"}]',
    'assert b.learner_content_for("fixture", "n.") is None',
    'assert b.learner_content_for("fixture", "v.")["pos"] == "v."',
    'assert b.learner_content_for("fixture")["pos"] == "v."',
  ].join('\n')], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

test('多词性修复：mean/right/fall 的次要词性有独立意义和例句', () => {
  const expected = {
    mean: { 'adj.': /刻薄|吝啬/, 'n.': /平均/ },
    right: { 'n.': /权利|右边/, 'adv.': /向右/ },
    back: { 'n.': /背部/, 'v.': /支持/ },
    fall: { 'n.': /秋(?:天|季)/ },
    open: { 'v.': /打开/ },
  };
  for (const [en, poses] of Object.entries(expected)) {
    const word = WORDS_BY_ENGLISH.get(en);
    for (const [pos, pattern] of Object.entries(poses)) {
      const sense = word.senses.find((item) => item.pos === pos);
      assert.match(sense.zh, pattern);
      assert.notEqual(sense.definition, word.definition, `${en} ${pos} 仍复制主释义`);
      assert.ok(sense.example);
    }
  }
});

test('已知错误义项与学习者不友好释义不再出现', () => {
  assert.match(WORDS_BY_ENGLISH.get('ordinary').definition, /usual|not special/);
  assert.doesNotMatch(WORDS_BY_ENGLISH.get('ordinary').definition, /judge|probate/);
  assert.match(WORDS_BY_ENGLISH.get('album').zh, /专辑/);
  assert.match(WORDS_BY_ENGLISH.get('album').zh, /相册/);
  assert.doesNotMatch(WORDS_BY_ENGLISH.get('moreover').definition, /["“”]|mice|quality/);
  assert.doesNotMatch(WORDS_BY_ENGLISH.get('dog').definition, /genus|Canis|prehistoric/);
  assert.doesNotMatch(WORDS_BY_ENGLISH.get('silver').definition, /univalent|conductivity/);
  assert.doesNotMatch(WORDS_BY_ENGLISH.get('question').definition, /questioning/);
  assert.match(WORDS_BY_ENGLISH.get('severe').zh, /严重/);
  assert.equal(WORDS_BY_ENGLISH.get('resolute').senses, undefined);
  assert.equal(WORDS_BY_ENGLISH.get('else').senses, undefined);
  assert.deepEqual(WORDS_BY_ENGLISH.get('more').senses.map((s) => s.pos).sort(), ['adv.', 'det.', 'pron.']);
  assert.deepEqual(WORDS_BY_ENGLISH.get('centre').senses.map((s) => s.pos), ['n.', 'v.']);
});

test('新增语义复核：常用漏义、单词性提醒与异读不能丢失', () => {
  const roast = WORDS_BY_ENGLISH.get('roast');
  assert.match(roast.zh, /严厉批评/);
  assert.match(roast.definition, /harshly/);
  const flake = WORDS_BY_ENGLISH.get('flake').senses.find(s => s.pos === 'v.');
  assert.match(flake.zh, /累倒或睡着/);
  assert.match(flake.note, /主要英式/);
  assert.match(WORDS_BY_ENGLISH.get('bathe').zh, /游泳/);
  assert.match(WORDS_BY_ENGLISH.get('girl').note, /woman/);
  assert.match(WORDS_BY_ENGLISH.get('read').senses.find(s => s.pos === 'v.').note, /过去式.*red/);
  const second = WORDS_BY_ENGLISH.get('second').senses.find(s => s.pos === 'v.');
  assert.equal(second.phonetic, 'ˈsekənd; sɪˈkɒnd');
  assert.match(second.note, /借调/);
});

test('全量生成词库不得把两个词性的中英文同时复制成相同内容', () => {
  const failures = ADULT_WORDS.filter((w) => w.senses?.some((s) =>
    s.pos !== w.pos && s.definition && s.definition === w.definition && s.zh === w.zh));
  assert.deepEqual(failures.map((w) => w.en), []);
});

test('审计覆盖次要义项而不只检查主卡片', () => {
  const result = spawnSync('python3', ['-c', [
    'from scripts.audit_adult_definitions import analyze_word',
    'w={"en":"mean","pos":"v.","zh":"意味着","definition":"to express an idea","rank":100,"senses":[{"pos":"n.","zh":"意味着","definition":"to express an idea"}]}',
    'r=analyze_word(w, {}, 3000, .5, .6)',
    'assert "cross_pos_copy" in r["issue_codes"]',
    'assert "sense_pos_definition_conflict" in r["issue_codes"]',
  ].join('\n')], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
