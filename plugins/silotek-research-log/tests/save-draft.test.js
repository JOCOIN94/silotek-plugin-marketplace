const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSaveDraft } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('save-draft accepts baseline.yaml and prints success', () => {
  const draft = path.join(storage, 'baseline-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'baseline.yaml'), draft);
  const result = runSaveDraft(draft, { storage, mode: 'conversation' });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /연구일지 YAML 저장 완료/);
});

test('save-draft rejects forbidden-top-key.yaml with non-zero exit', () => {
  const draft = path.join(storage, 'forbidden-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'forbidden-top-key.yaml'), draft);
  const result = runSaveDraft(draft, { storage });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /project/);
});

test('save-draft prints META_MISSING_KEY warnings but still saves', () => {
  const draft = path.join(storage, 'missing-meta-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'missing-meta.yaml'), draft);
  const result = runSaveDraft(draft, { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /META_MISSING_KEY/);
  assert.match(result.stdout, /연구 단계/);
});

test('save-draft prints quality warnings for short-text.yaml', () => {
  const draft = path.join(storage, 'short-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'short-text.yaml'), draft);
  const result = runSaveDraft(draft, { storage });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /TEXT_TOO_SHORT/);
});
