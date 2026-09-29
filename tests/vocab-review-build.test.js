import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('复核批次构建：保留 ID、多词性和读音；拒绝自审、错拼与无理由删义', () => {
  const code = `
import importlib.util, json, tempfile, copy
from pathlib import Path
spec = importlib.util.spec_from_file_location('vocab', 'scripts/build_adult_vocab.py')
vocab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vocab)
assert 'inter' not in vocab.detect_word_parts('internal', {'adj.'})
assert 'ist' not in vocab.detect_word_parts('assist', {'n.', 'v.'})
assert 'ology' not in vocab.detect_word_parts('ideology', {'n.'})
assert 'ology' not in vocab.detect_word_parts('terminology', {'n.'})
assert 'ist' in vocab.detect_word_parts('artist', {'n.'})
assert 'ology' in vocab.detect_word_parts('psychology', {'n.'})
base = {'id':'adult:test','en':'test','pos':'n.','zh':'考试','definition':'an examination',
        'phonetic':'test','tracks':['life'],'rank':1}
row = {'id':'adult:test','en':'test','author':'A','reviewer':'B','reviewType':'model-semantic-review','reviewNotes':'Checked verb and noun separately.',
       'primaryPos':'v.','senses':[{'pos':'v.','zh':'测试','definition':'to check how well something works',
       'example':'We test the alarm each week.','collocations':['test an alarm']}]}
def build(item):
    words = [copy.deepcopy(base)]
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory)
        (path/'batch.json').write_text(json.dumps([item]), encoding='utf-8')
        vocab.apply_reviewed_batches(words, path)
    return words[0]
w = build(row)
assert w['id'] == base['id'] and w['tracks'] == base['tracks'] and w['rank'] == 1
assert w['pos'] == 'v.' and [s['pos'] for s in w['senses']] == ['v.', 'n.']
assert w['definitionStatus'] == 'generated'
assert w['phonetic'] == 'test'
json.dumps(w)  # no circular reference when preserving an old single POS
removed = build({**row, 'removedPos':{'n.':'Fixture: obsolete noun not appropriate here.'}})
assert 'senses' not in removed
with_note = copy.deepcopy(row)
with_note['senses'][0]['note'] = 'Use this as a verb.'
with_note['removedPos'] = {'n.':'Fixture noun removed.'}
single = build(with_note)
assert 'senses' not in single and single['note'] == 'Use this as a verb.'
for update in [{'reviewer':'A'}, {'reviewer':'/A/review_batch'}, {'en':'Test'}, {'reviewNotes':''}, {'reviewType':'format-only'}, {'removedPos':{'n.':''}},
               {'removedPos':{'v.':'cannot delete a kept POS'}}]:
    try:
        build({**row, **update})
    except ValueError:
        pass
    else:
        raise AssertionError('Expected validation error: ' + repr(update))
`;
  const result = spawnSync('python3', ['-c', code], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
