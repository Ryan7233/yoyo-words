import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ADULT_WORDS } from '../js/adult-words.js';

const WORDS_BY_ENGLISH = new Map(
  ADULT_WORDS.map((word) => [word.en.toLocaleLowerCase('en'), word]),
);

const TOP_500 = [...ADULT_WORDS]
  .sort((left, right) => left.rank - right.rank)
  .slice(0, 500);

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
      required: /\b(?:particular|specific|already (?:known|mentioned)|clear which)\b/i,
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
