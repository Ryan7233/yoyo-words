// Validate draft format only. Drafts are not consumed by the production builder.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ADULT_WORDS } from '../js/adult-words.js';

const root = new URL('../', import.meta.url);
const directory = new URL('scripts/data/vocab-batches/', root);
const words = new Map(ADULT_WORDS.map(w => [w.id, w]));
const rankedWords = [...ADULT_WORDS].sort((a, b) => a.rank - b.rank);
const lanes = { a: [0, 2303], b: [2304, 4607], c: [4608, 6911] };
const seen = new Set();
const issues = [];
const files = [];
for (const name of readdirSync(directory).filter(n => n.endsWith('.json')).sort()) {
  let rows;
  try { rows = JSON.parse(readFileSync(new URL(name, directory), 'utf8')); }
  catch (error) { issues.push({ file: name, error: error.message }); continue; }
  if (!Array.isArray(rows)) { issues.push({ file: name, error: 'Expected an array' }); continue; }
  files.push({ file: name, words: rows.length, senses: rows.reduce((n, r) => n + (r.senses?.length || 0), 0) });
  const match = /^adult-([abc])-(\d{3})\.json$/.exec(name);
  if (!match) issues.push({ file: name, error: 'Unexpected draft batch filename' });
  else {
    const [start, end] = lanes[match[1]];
    const first = start + (Number(match[2]) - 1) * 100;
    const expected = first <= end ? Math.min(100, end - first + 1) : 0;
    if (!expected || rows.length !== expected) {
      issues.push({ file: name, error: `Expected ${expected} words at rank index ${first}, got ${rows.length}` });
    }
    rows.forEach((row, index) => {
      const source = rankedWords[first + index];
      if (!source || first + index > end || source.id !== row.id || source.en !== row.en) {
        issues.push({ file: name, id: row.id, error: `Rank-order mismatch at index ${first + index}; expected ${source?.id || 'none'}` });
      }
    });
  }
  for (const row of rows) {
    const fail = error => issues.push({ file: name, id: row.id, error });
    if (seen.has(row.id)) fail('Duplicate word across draft batches');
    seen.add(row.id);
    if (!words.has(row.id) || words.get(row.id).en !== row.en) fail('Unknown ID or changed spelling');
    if (!row.author?.trim()) fail('Missing author');
    if (!Array.isArray(row.senses) || !row.senses.length) { fail('Missing senses'); continue; }
    if (row.senses.filter(s => s.pos === row.primaryPos).length !== 1) fail('Primary POS must match exactly one sense');
    if (new Set(row.senses.map(s => s.pos)).size !== row.senses.length) fail('Duplicate POS');
    for (const sense of row.senses) {
      for (const field of ['pos', 'zh', 'definition', 'example']) {
        if (typeof sense[field] !== 'string' || !sense[field].trim()) fail(`Missing ${sense.pos} ${field}`);
      }
      if (sense.zh?.length > 36) fail(`${sense.pos} Chinese gloss exceeds 36 characters`);
      if (sense.definition?.length > 150) fail(`${sense.pos} definition exceeds 150 characters`);
      if (!Array.isArray(sense.collocations) || sense.collocations.length > 3) fail(`${sense.pos} invalid collocations`);
    }
  }
}
const report = { status: 'drafts_only_not_semantically_approved', files,
  draft_words: seen.size, total_words: ADULT_WORDS.length,
  words_without_draft: ADULT_WORDS.length - seen.size, issues };
if (process.argv.includes('--write')) {
  writeFileSync(new URL('reports/vocab-draft-audit.json', root), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exitCode = 1;
