const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runNextDiagramPath } = require('./helpers/runScript');
const { nextDiagramPath, nextDiagramPaths } = require('../scripts/next-diagram-path');
const { dateStamp, ensureStorage } = require('../scripts/common');

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

function mkFigDir(name) {
  const dir = path.join(storage.figures, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

test('nextDiagramPath returns diagram-1 when directory is empty', () => {
  const dir = mkFigDir('empty');
  const result = nextDiagramPath(dir, { storage });
  assert.equal(path.basename(result.htmlPath), 'diagram-1.html');
  assert.equal(path.basename(result.pngPath), 'diagram-1.png');
});

test('nextDiagramPath increments after existing html or png files', () => {
  const dir = mkFigDir('incremental');
  fs.writeFileSync(path.join(dir, 'diagram-1.html'), '');
  fs.writeFileSync(path.join(dir, 'diagram-2.png'), '');
  const result = nextDiagramPath(dir, { storage });
  assert.equal(path.basename(result.htmlPath), 'diagram-3.html');
  assert.equal(path.basename(result.pngPath), 'diagram-3.png');
});

test('nextDiagramPaths returns N consecutive entries in an empty directory', () => {
  const dir = mkFigDir('consecutive');
  const results = nextDiagramPaths(dir, 3, { storage });
  assert.equal(results.length, 3);
  assert.deepEqual(results.map(r => r.index), [1, 2, 3]);
  assert.equal(path.basename(results[0].htmlPath), 'diagram-1.html');
  assert.equal(path.basename(results[2].pngPath), 'diagram-3.png');
});

test('nextDiagramPaths skips occupied indices', () => {
  const dir = mkFigDir('skip-occupied');
  fs.writeFileSync(path.join(dir, 'diagram-1.html'), '');
  fs.writeFileSync(path.join(dir, 'diagram-3.png'), '');
  const results = nextDiagramPaths(dir, 3, { storage });
  assert.deepEqual(results.map(r => r.index), [2, 4, 5]);
});

test('nextDiagramPaths throws on a non-positive or non-integer count', () => {
  const dir = mkFigDir('bad-count');
  assert.throws(() => nextDiagramPaths(dir, 0, { storage }));
  assert.throws(() => nextDiagramPaths(dir, -1, { storage }));
  assert.throws(() => nextDiagramPaths(dir, 'abc', { storage }));
});

test('nextDiagramPaths rejects a relative path', () => {
  assert.throws(() => nextDiagramPaths('figures/foo', 1, { storage }), /절대 경로여야 합니다/);
});

test('nextDiagramPaths rejects an absolute path outside the central storage', () => {
  const outside = path.join(path.dirname(storage.root), 'somewhere-else', 'figures');
  assert.throws(() => nextDiagramPaths(outside, 1, { storage }), /중앙 보관소 .* 내부여야 합니다/);
});

test('nextDiagramPath delegates to nextDiagramPaths (single object, backward compatible)', () => {
  const dir = mkFigDir('single');
  const result = nextDiagramPath(dir, { storage });
  assert.equal(typeof result, 'object');
  assert.equal(Array.isArray(result), false);
  assert.equal(path.basename(result.htmlPath), 'diagram-1.html');
});

test('CLI --count N --json prints a JSON array', () => {
  const dir = mkFigDir('cli-count');
  const out = runNextDiagramPath({ dir, count: 2, json: true, storage: storageRoot });
  assert.equal(out.status, 0, `stderr: ${out.stderr}`);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(path.basename(parsed[0].htmlPath), 'diagram-1.html');
  assert.equal(path.basename(parsed[1].htmlPath), 'diagram-2.html');
});

test('CLI without --count still prints a single object (backward compatible)', () => {
  const dir = mkFigDir('cli-single');
  const out = runNextDiagramPath({ dir, json: true, storage: storageRoot });
  assert.equal(out.status, 0, `stderr: ${out.stderr}`);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), false);
  assert.equal(path.basename(parsed.htmlPath), 'diagram-1.html');
});

test('CLI --count with a bad value exits non-zero', () => {
  const dir = mkFigDir('cli-bad-count');
  const out = runNextDiagramPath({ dir, count: 'abc', json: true, storage: storageRoot });
  assert.notEqual(out.status, 0);
});

test('CLI --count=N (equals form) prints a JSON array', () => {
  const dir = mkFigDir('cli-equals');
  const out = runNextDiagramPath({ dir, count: 2, countForm: 'equals', json: true, storage: storageRoot });
  assert.equal(out.status, 0, `stderr: ${out.stderr}`);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
});

test('CLI --count with no value exits non-zero', () => {
  const dir = mkFigDir('cli-count-noval');
  const out = runNextDiagramPath({ dir, countNoValue: true, storage: storageRoot });
  assert.notEqual(out.status, 0);
});

test('CLI rejects an unknown flag', () => {
  const dir = mkFigDir('cli-unknown');
  const out = runNextDiagramPath({ dir, extraArgs: ['--bogus'], storage: storageRoot });
  assert.notEqual(out.status, 0);
});

test('CLI rejects a relative dir', () => {
  const out = runNextDiagramPath({ dir: 'figures/foo', count: 1, json: true, storage: storageRoot });
  assert.notEqual(out.status, 0);
  assert.match(out.stderr, /절대 경로여야 합니다/);
});

test('CLI rejects an absolute dir outside the central storage', () => {
  const outside = path.join(path.dirname(storage.root), 'somewhere-else', 'figures');
  const out = runNextDiagramPath({ dir: outside, count: 1, json: true, storage: storageRoot });
  assert.notEqual(out.status, 0);
  assert.match(out.stderr, /중앙 보관소 .* 내부여야 합니다/);
});

test('CLI requires a dir or --standalone (no positional, no flag)', () => {
  const out = runNextDiagramPath({ count: 1, json: true, storage: storageRoot });
  assert.notEqual(out.status, 0);
  assert.match(out.stderr, /대상 디렉터리가 필요합니다/);
});

test('CLI --standalone --count 2 --json allocates inside diagrams/<today>/', () => {
  const out = runNextDiagramPath({ standalone: true, count: 2, json: true, storage: storageRoot });
  assert.equal(out.status, 0, `stderr: ${out.stderr}`);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  const today = dateStamp();
  const expectedDir = path.join(storage.diagrams, today);
  assert.equal(path.dirname(parsed[0].htmlPath), expectedDir);
  assert.equal(path.basename(parsed[0].htmlPath), 'diagram-1.html');
  assert.equal(path.basename(parsed[1].htmlPath), 'diagram-2.html');
});
