import test from 'node:test';
import assert from 'node:assert/strict';
import { contentHash, coverageRow, buildCoverage, CHECKS, hasCurrentModelReview, hasCurrentChildReview } from '../scripts/audit_vocab_coverage.mjs';

const word = { id: 'adult:test', en: 'test', zh: '测试', pos: 'n.',
  definition: 'a way to find out what someone knows',
  example: 'We have a test tomorrow.', definitionStatus: 'generated' };
function receipt(w = word) {
  return { author: 'writer-A', reviewer: 'reviewer-B', verdict: 'pass',
    content_sha256: contentHash(w),
    evidence: [{ url: 'https://example.com/test', note: 'Test fixture, not production evidence.' }],
    checks: Object.fromEntries(CHECKS.adult.map(c => [c, 'pass'])) };
}

test('全库覆盖：成人、儿童、Kiwi 均列入，不把同路线重复算作新词', () => {
  const report = buildCoverage();
  assert.equal(report.counts.adult.total, 6912);
  assert.equal(report.counts.children.total, 459);
  assert.equal(report.counts.kiwi.total, 24);
  assert.equal(new Set(report.rows.map(r => r.key)).size, report.rows.length);
  assert.equal(report.complete, false);
  assert.ok(report.rows.every(r => r.verification === 'pending_review'));
});

test('全库覆盖：字段完整和 reviewed 标签不能代替独立复核记录', () => {
  assert.equal(coverageRow('adult', { ...word, definitionStatus: 'reviewed' }).verification, 'pending_review');
  assert.equal(coverageRow('adult', word, receipt()).verification, 'independently_checked');
  assert.equal(coverageRow('adult', word, { ...receipt(), reviewer: 'writer-A' }).verification, 'pending_review');
  assert.equal(coverageRow('adult', word, { ...receipt(), evidence: [] }).verification, 'pending_review');
  assert.equal(coverageRow('adult', word, { ...receipt(), checks: {} }).verification, 'pending_review');
});

test('全库覆盖：任何词条变化使旧复核失效，字段顺序不会误报变化', () => {
  assert.equal(contentHash(word), contentHash(Object.fromEntries(Object.entries(word).reverse())));
  assert.equal(coverageRow('adult', { ...word, zh: '考试' }, receipt()).verification, 'stale_review');
});

test('全库覆盖：次要词性缺失英文或例句仍不算内容完成', () => {
  const multi = { ...word, senses: [{ pos: 'v.', zh: '测试' }] };
  const row = coverageRow('adult', multi, receipt(multi));
  assert.equal(row.content_complete, false);
  assert.equal(row.verification, 'pending_review');
  assert.ok(row.missing.includes('v.:example'));
});

test('全库覆盖：模型语义复核另计数，过期、漏词性、自审都不算', () => {
  const review = { id: word.id, en: word.en, primaryPos: word.pos,
    author: 'A', reviewer: 'B', reviewType: 'model-semantic-review',
    reviewNotes: 'Checked examination sense and the example.', senses: [word] };
  assert.equal(hasCurrentModelReview(word, review), true);
  assert.equal(hasCurrentModelReview({ ...word, zh: '错误新义' }, review), false);
  assert.equal(hasCurrentModelReview(word, { ...review, reviewer: 'A' }), false);
  assert.equal(hasCurrentModelReview(word, { ...review, reviewNotes: '' }), false);
  assert.equal(hasCurrentModelReview(word, { ...review, senses: [] }), false);
  assert.equal(hasCurrentModelReview(word, { ...review, senses: [{ ...word, note: 'A missing usage note' }] }), false);
  assert.equal(coverageRow('adult', word).verification, 'pending_review');
});

test('儿童复核：图像、例句或翻译变化后必须重审，不能只记录已读', () => {
  const child = { id: 'cat', en: 'cat', zh: '猫', emoji: '🐱', sentence: 'A cat is here.' };
  const review = { id: 'cat', scope: 'children', author: 'A', reviewer: 'B',
    reviewType: 'model-semantic-review', verdict: 'pass', reviewNotes: 'Checked meaning and example.',
    content_sha256: contentHash(child) };
  assert.equal(hasCurrentChildReview('children', child, review), true);
  for (const field of ['zh', 'emoji', 'sentence']) {
    assert.equal(hasCurrentChildReview('children', { ...child, [field]: 'changed' }, review), false);
  }
  assert.equal(hasCurrentChildReview('kiwi', child, review), false);
  assert.equal(hasCurrentChildReview('children', child, { ...review, reviewer: 'A' }), false);
  assert.equal(hasCurrentChildReview('children', child, { ...review, verdict: 'finding' }), false);
  assert.equal(hasCurrentChildReview('children', child, { ...review, finding: 'Unresolved issue' }), false);
  assert.equal(hasCurrentChildReview('children', child, { ...review, reviewNotes: '' }), false);
});
