const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const {
  assertInsideStorage,
  assertInsideSubdir,
  ensureStorage
} = require('../scripts/common');

let storageRoot;
let storage;
let prevEnv;

before(() => {
  storageRoot = makeTmpStorage();
  prevEnv = process.env.SILOTEK_RESEARCH_LOG_ROOT;
  process.env.SILOTEK_RESEARCH_LOG_ROOT = storageRoot;
  storage = ensureStorage();
});

after(() => {
  if (prevEnv === undefined) delete process.env.SILOTEK_RESEARCH_LOG_ROOT;
  else process.env.SILOTEK_RESEARCH_LOG_ROOT = prevEnv;
  cleanTmpStorage(storageRoot);
});

test('ensureStorage exposes a diagrams subdir alongside the existing four', () => {
  for (const key of ['inputs', 'outputs', 'manifests', 'figures', 'diagrams']) {
    assert.equal(typeof storage[key], 'string');
    assert.equal(fs.existsSync(storage[key]), true, `missing storage subdir: ${key}`);
  }
});

test('assertInsideStorage rejects a relative path', () => {
  assert.throws(
    () => assertInsideStorage('figures/foo', storage, 'dir'),
    /절대 경로여야 합니다/
  );
});

test('assertInsideStorage rejects an empty or non-string value', () => {
  assert.throws(() => assertInsideStorage('', storage, 'dir'), /비어있지 않은 문자열/);
  assert.throws(() => assertInsideStorage(undefined, storage, 'dir'), /비어있지 않은 문자열/);
  assert.throws(() => assertInsideStorage(null, storage, 'dir'), /비어있지 않은 문자열/);
});

test('assertInsideStorage rejects an absolute path outside the central storage', () => {
  const outside = path.join(path.dirname(storage.root), 'somewhere-else', 'figures');
  assert.throws(
    () => assertInsideStorage(outside, storage, 'dir'),
    /중앙 보관소 .* 내부여야 합니다/
  );
});

test('assertInsideStorage accepts a path inside the central storage', () => {
  const candidate = path.join(storage.figures, 'test-basename');
  const resolved = assertInsideStorage(candidate, storage, 'dir');
  assert.equal(resolved, path.resolve(candidate));
});

test('assertInsideSubdir rejects a path that is inside storage but outside the given subdir', () => {
  const insideStorageButWrongSubdir = path.join(storage.outputs, 'foo.yaml');
  assert.throws(
    () => assertInsideSubdir(insideStorageButWrongSubdir, storage, 'inputs', 'draftPath'),
    /내부여야 합니다/
  );
});

test('assertInsideSubdir accepts a path inside the requested subdir', () => {
  const candidate = path.join(storage.inputs, '2026-05-18-example.yaml');
  const resolved = assertInsideSubdir(candidate, storage, 'inputs', 'draftPath');
  assert.equal(resolved, path.resolve(candidate));
});

test('assertInsideSubdir throws for an unknown subdir key', () => {
  const candidate = path.join(storage.root, 'foo');
  assert.throws(
    () => assertInsideSubdir(candidate, storage, 'nonexistent', 'x'),
    /알 수 없는 storage subdir 키/
  );
});
