// Coverage accounting, not a semantic correctness detector.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ADULT_WORDS } from '../js/adult-words.js';
import { WORDS, KIWI_ITEMS } from '../js/words.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const CHECKS = {
  adult: ['common_senses', 'pos_zh_alignment', 'english_alignment', 'examples',
    'collocations', 'family_and_parts', 'pronunciation'],
  children: ['translation', 'example_alignment', 'age_suitability'],
  kiwi: ['translation', 'spoken_naturalness', 'age_suitability'],
};

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

export function contentHash(word) {
  return createHash('sha256').update(JSON.stringify(canonical(word))).digest('hex');
}

export function coverageRow(scope, word, receipt) {
  const hash = contentHash(word);
  // Explicit senses must cover the primary POS too; do not hide an omitted primary.
  const senses = scope === 'adult'
    ? [word, ...(word.senses || []).filter(s => s.pos !== word.pos)] : [];
  const missing = [];
  for (const field of ['en', 'zh']) if (!word[field]?.trim()) missing.push(field);
  if (scope === 'adult') {
    for (const sense of senses) {
      for (const field of ['pos', 'zh', 'definition', 'example', 'definitionStatus']) {
        if (!sense[field]?.trim()) missing.push(`${sense.pos || '?'}:${field}`);
      }
    }
  }
  const evidenceValid = Array.isArray(receipt?.evidence) && receipt.evidence.length > 0
    && receipt.evidence.every(e => /^https:\/\//.test(e.url || '') && e.note?.trim());
  const independent = Boolean(receipt?.author?.trim() && receipt?.reviewer?.trim()
    && receipt.author.trim() !== receipt.reviewer.trim());
  const current = receipt?.content_sha256 === hash;
  const checked = CHECKS[scope].every(check => receipt?.checks?.[check] === 'pass');
  const verified = missing.length === 0 && current && independent && evidenceValid
    && checked && receipt?.verdict === 'pass';
  return {
    key: `${scope}/${word.id}`, scope, id: word.id, en: word.en,
    content_sha256: hash, senses: senses.length,
    content_complete: missing.length === 0, missing,
    verification: verified ? 'independently_checked'
      : receipt && !current ? 'stale_review' : 'pending_review',
  };
}

export function hasCurrentModelReview(word, review) {
  if (!review || review.id !== word.id || review.en !== word.en
    || review.primaryPos !== word.pos || review.reviewType !== 'model-semantic-review'
    || !review.author?.trim() || !review.reviewer?.trim()
    || review.author.trim() === review.reviewer.trim() || !review.reviewNotes?.trim()) return false;
  const actual = word.senses?.length ? word.senses : [word];
  if (!Array.isArray(review.senses) || review.senses.length !== actual.length) return false;
  return actual.every(sense => {
    const checked = review.senses.find(s => s.pos === sense.pos);
    return checked && ['zh', 'definition', 'example'].every(field => checked[field] === sense[field])
      && JSON.stringify(checked.collocations || []) === JSON.stringify(sense.collocations || [])
      && (!checked.note || checked.note === sense.note)
      && (!checked.phonetic || checked.phonetic === sense.phonetic || (sense.pos === word.pos && checked.phonetic === word.phonetic));
  });
}

export function hasCurrentChildReview(scope, word, review) {
  return Boolean(['children', 'kiwi'].includes(scope) && review
    && review.scope === scope && review.id === word.id
    && review.reviewType === 'model-semantic-review' && review.verdict === 'pass'
    && !review.finding && !review.findings?.length
    && review.author?.trim() && review.reviewer?.trim()
    && review.author.trim() !== review.reviewer.trim() && review.reviewNotes?.trim()
    && review.content_sha256 === contentHash(word));
}

export function buildCoverage(receipts = {}, modelReviews = {}, childReviews = {}) {
  const pools = { adult: [...ADULT_WORDS].sort((a, b) => a.rank - b.rank),
    children: WORDS, kiwi: KIWI_ITEMS };
  const rows = Object.entries(pools).flatMap(([scope, words]) => words.map((word, index) => ({
    ...coverageRow(scope, word, receipts[`${scope}/${word.id}`]),
    model_semantic_review: (scope === 'adult' ? hasCurrentModelReview(word, modelReviews[word.id])
      : hasCurrentChildReview(scope, word, childReviews[`${scope}/${word.id}`]))
      ? 'current' : 'not_recorded_or_stale',
    batch: `${scope}-${String(Math.floor(index / 100) + 1).padStart(3, '0')}`,
  })));
  const counts = Object.fromEntries(Object.keys(pools).map(scope => {
    const subset = rows.filter(row => row.scope === scope);
    return [scope, { total: subset.length, content_complete: subset.filter(r => r.content_complete).length,
      independently_checked: subset.filter(r => r.verification === 'independently_checked').length,
      model_semantic_reviewed: subset.filter(r => r.model_semantic_review === 'current').length,
      batches: new Set(subset.map(r => r.batch)).size }];
  }));
  return { schema_version: 1,
    warning: 'Completeness and recorded review coverage are not proof of zero semantic errors.',
    scope: 'Adult words, child words and Kiwi items. Unit dialogues are not included in these word counts.',
    counts, complete: rows.every(r => r.verification === 'independently_checked'), rows };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const receiptPath = resolve(ROOT, 'scripts/data/vocab-verification.json');
  let receipts = {};
  try { receipts = JSON.parse(readFileSync(receiptPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const modelReviews = {};
  const reviewedDirectory = resolve(ROOT, 'scripts/data/vocab-reviewed');
  let reviewedFiles = [];
  try { reviewedFiles = readdirSync(reviewedDirectory).filter(n => n.endsWith('.json')).sort(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const file of reviewedFiles) {
    const rows = JSON.parse(readFileSync(resolve(reviewedDirectory, file), 'utf8'));
    for (const row of rows) {
      if (modelReviews[row.id]) throw new Error(`Duplicate model review: ${row.id}`);
      modelReviews[row.id] = row;
    }
  }
  const childReviews = {};
  let childRows = [];
  try { childRows = JSON.parse(readFileSync(resolve(ROOT, 'reports/children-independent-review.json'), 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const row of childRows) {
    const key = `${row.scope}/${row.id}`;
    if (childReviews[key]) throw new Error(`Duplicate child review: ${key}`);
    childReviews[key] = row;
  }
  const report = buildCoverage(receipts, modelReviews, childReviews);
  if (process.argv.includes('--write')) {
    writeFileSync(resolve(ROOT, 'reports/vocab-coverage.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ counts: report.counts, complete: report.complete }, null, 2));
  if (process.argv.includes('--require-complete') && !report.complete) process.exitCode = 1;
}
