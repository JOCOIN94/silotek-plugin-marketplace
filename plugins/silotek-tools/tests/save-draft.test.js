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

function copyFixture(name, targetName) {
  const draft = path.join(storage, targetName);
  fs.copyFileSync(path.join(FIXTURES, name), draft);
  return draft;
}

function readLatestManifest() {
  const manifestDir = path.join(storage, 'manifests');
  const manifests = fs.readdirSync(manifestDir)
    .filter(name => name.endsWith('.json'))
    .sort();
  assert.equal(manifests.length > 0, true);
  return JSON.parse(fs.readFileSync(path.join(manifestDir, manifests.at(-1)), 'utf8'));
}

test('save-draft accepts baseline.yaml and writes central files', () => {
  const result = runSaveDraft(copyFixture('baseline.yaml', 'baseline-draft.yaml'), {
    storage,
    mode: 'conversation'
  });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.equal(fs.readdirSync(path.join(storage, 'inputs')).some(name => name.endsWith('.yaml')), true);
  assert.equal(fs.readdirSync(path.join(storage, 'manifests')).some(name => name.endsWith('.json')), true);
});

test('save-draft rejects forbidden-top-key.yaml with non-zero exit', () => {
  const result = runSaveDraft(copyFixture('forbidden-top-key.yaml', 'forbidden-draft.yaml'), { storage });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /project/);
});

test('save-draft saves non-critical missing metadata without research-quality warnings', () => {
  const result = runSaveDraft(copyFixture('missing-meta-non-critical.yaml', 'missing-meta-non-critical-draft.yaml'), {
    storage
  });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.doesNotMatch(result.stdout, /META_MISSING_KEY/);
  assert.doesNotMatch(result.stdout, /TEXT_TOO_SHORT/);
});

test('save-draft does not print writing-quality warnings for short-text.yaml', () => {
  const result = runSaveDraft(copyFixture('short-text.yaml', 'short-draft.yaml'), { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.doesNotMatch(result.stdout, /TEXT_TOO_SHORT/);
  assert.doesNotMatch(result.stdout, /NO_IMAGES/);
});

test('save-draft hard-fails when meta research nature is missing', () => {
  const result = runSaveDraft(copyFixture('missing-meta.yaml', 'missing-nature-draft.yaml'), { storage });
  assert.notEqual(result.status, 0);
});

test('save-draft hard-fails when meta research nature is out of domain', () => {
  const result = runSaveDraft(copyFixture('invalid-research-nature.yaml', 'invalid-nature-draft.yaml'), { storage });
  assert.notEqual(result.status, 0);
});

test('save-draft manifest stores deterministic diagnostics only', () => {
  const result = runSaveDraft(copyFixture('baseline.yaml', 'baseline-diagnostics-draft.yaml'), { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.doesNotMatch(result.stdout, /점수: \d+ \/ 100/);

  const manifest = readLatestManifest();
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'quality'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'critique'), false);
  assert.deepEqual(Object.keys(manifest.diagnostics.stats).sort(), ['imageCount', 'tableCount', 'visualBriefCount']);
});
