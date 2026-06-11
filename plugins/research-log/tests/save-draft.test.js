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

function placeFixtureAsInput(fixtureName, basename) {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  const inputPath = path.join(inputsDir, `${basename}.yaml`);
  fs.copyFileSync(path.join(FIXTURES, fixtureName), inputPath);
  return inputPath;
}

function readManifest(basename) {
  const manifestPath = path.join(storage, 'manifests', `${basename}.json`);
  assert.equal(fs.existsSync(manifestPath), true, `manifest missing: ${manifestPath}`);
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

test('save-draft validates a central-store YAML and writes a manifest', () => {
  const basename = '2026-05-10-baseline';
  const inputPath = placeFixtureAsInput('baseline.yaml', basename);

  const result = runSaveDraft(inputPath, { storage, mode: 'conversation' });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);

  // YAML remains where it was placed (no copy step).
  assert.equal(fs.existsSync(inputPath), true);
  // Manifest is written under <storage>/manifests/<basename>.json.
  const manifest = readManifest(basename);
  assert.equal(manifest.basename, basename);
  assert.equal(manifest.inputPath, inputPath);
  assert.equal(manifest.mode, 'conversation');
});

test('save-draft rejects forbidden-top-key.yaml with non-zero exit', () => {
  const inputPath = placeFixtureAsInput('forbidden-top-key.yaml', '2026-05-10-forbidden');
  const result = runSaveDraft(inputPath, { storage });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /project/);
  // No manifest written for a rejected draft.
  assert.equal(fs.existsSync(path.join(storage, 'manifests', '2026-05-10-forbidden.json')), false);
});

test('save-draft saves non-critical missing metadata without research-quality warnings', () => {
  const inputPath = placeFixtureAsInput('missing-meta-non-critical.yaml', '2026-05-10-mm-non-critical');
  const result = runSaveDraft(inputPath, { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.doesNotMatch(result.stdout, /META_MISSING_KEY/);
  assert.doesNotMatch(result.stdout, /TEXT_TOO_SHORT/);
});

test('save-draft does not print writing-quality warnings for short-text.yaml', () => {
  const inputPath = placeFixtureAsInput('short-text.yaml', '2026-05-10-short');
  const result = runSaveDraft(inputPath, { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.doesNotMatch(result.stdout, /TEXT_TOO_SHORT/);
  assert.doesNotMatch(result.stdout, /NO_IMAGES/);
});

test('save-draft hard-fails when meta research nature is missing', () => {
  const inputPath = placeFixtureAsInput('missing-meta.yaml', '2026-05-10-missing-nature');
  const result = runSaveDraft(inputPath, { storage });
  assert.notEqual(result.status, 0);
});

test('save-draft hard-fails when meta research nature is out of domain', () => {
  const inputPath = placeFixtureAsInput('invalid-research-nature.yaml', '2026-05-10-invalid-nature');
  const result = runSaveDraft(inputPath, { storage });
  assert.notEqual(result.status, 0);
});

test('save-draft manifest stores deterministic diagnostics only', () => {
  const basename = '2026-05-10-baseline-diagnostics';
  const inputPath = placeFixtureAsInput('baseline.yaml', basename);
  const result = runSaveDraft(inputPath, { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.doesNotMatch(result.stdout, /점수: \d+ \/ 100/);

  const manifest = readManifest(basename);
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'quality'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(manifest, 'critique'), false);
  assert.deepEqual(Object.keys(manifest.diagnostics.stats).sort(), ['imageCount', 'tableCount', 'visualBriefCount']);
});

test('save-draft does not create artifacts in the current working directory', () => {
  const basename = '2026-05-10-no-cwd-pollution';
  const inputPath = placeFixtureAsInput('baseline.yaml', basename);
  const cwdSnapshot = new Set(fs.readdirSync(process.cwd()));
  const result = runSaveDraft(inputPath, { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const cwdAfter = new Set(fs.readdirSync(process.cwd()));
  for (const name of cwdAfter) {
    assert.equal(
      cwdSnapshot.has(name),
      true,
      `unexpected new entry in cwd after save: ${name}`
    );
  }
});
