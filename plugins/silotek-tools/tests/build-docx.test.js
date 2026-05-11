const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSaveDraft, runBuildDocx } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('build-docx does not print writing-quality warnings for non-critical missing-meta yaml', () => {
  const draft = path.join(storage, 'mm-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'missing-meta-non-critical.yaml'), draft);
  const saved = runSaveDraft(draft, { storage });
  assert.equal(saved.status, 0, `save stderr: ${saved.stderr}`);

  const built = runBuildDocx(1, { storage });
  assert.equal(built.status, 0, `build stderr: ${built.stderr}`);
  assert.doesNotMatch(built.stdout, /META_MISSING_KEY/);
  assert.doesNotMatch(built.stdout, /TEXT_TOO_SHORT/);
});

test('build-docx still rejects forbidden top-level key (validateResearchLog)', () => {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  fs.copyFileSync(
    path.join(FIXTURES, 'forbidden-top-key.yaml'),
    path.join(inputsDir, '2026-05-10-tampered.yaml')
  );
  const built = runBuildDocx('2026-05-10-tampered', { storage });
  assert.notEqual(built.status, 0);
  assert.match(built.stderr, /project/);
});

test('build-docx renders visual_brief as a gray box (no error)', () => {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  const target = path.join(inputsDir, '2026-05-10-vb-complete.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'visual-brief-complete.yaml'), target);
  const built = runBuildDocx('2026-05-10-vb-complete', { storage });
  assert.equal(built.status, 0, `stderr: ${built.stderr}`);
  const docx = path.join(storage, 'outputs', '2026-05-10-vb-complete.docx');
  assert.ok(fs.existsSync(docx));
  assert.ok(fs.statSync(docx).size > 0);
});
