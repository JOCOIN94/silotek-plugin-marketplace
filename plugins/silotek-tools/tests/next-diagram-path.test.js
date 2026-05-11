const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { nextDiagramPath, nextDiagramPaths } = require('../scripts/next-diagram-path');
const { spawnSync } = require('node:child_process');

const NEXT_DIAGRAM_SCRIPT = path.join(__dirname, '..', 'scripts', 'next-diagram-path.js');

test('nextDiagramPath returns diagram-1 when directory is empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const result = nextDiagramPath(dir);
  assert.equal(path.basename(result.htmlPath), 'diagram-1.html');
  assert.equal(path.basename(result.pngPath), 'diagram-1.png');
});

test('nextDiagramPath increments after existing html or png files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  fs.writeFileSync(path.join(dir, 'diagram-1.html'), '');
  fs.writeFileSync(path.join(dir, 'diagram-2.png'), '');
  const result = nextDiagramPath(dir);
  assert.equal(path.basename(result.htmlPath), 'diagram-3.html');
  assert.equal(path.basename(result.pngPath), 'diagram-3.png');
});

test('nextDiagramPaths returns N consecutive entries in an empty directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const results = nextDiagramPaths(dir, 3);
  assert.equal(results.length, 3);
  assert.deepEqual(results.map(r => r.index), [1, 2, 3]);
  assert.equal(path.basename(results[0].htmlPath), 'diagram-1.html');
  assert.equal(path.basename(results[2].pngPath), 'diagram-3.png');
});

test('nextDiagramPaths skips occupied indices', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  fs.writeFileSync(path.join(dir, 'diagram-1.html'), '');
  fs.writeFileSync(path.join(dir, 'diagram-3.png'), '');
  const results = nextDiagramPaths(dir, 3);
  assert.deepEqual(results.map(r => r.index), [2, 4, 5]);
});

test('nextDiagramPaths throws on a non-positive or non-integer count', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  assert.throws(() => nextDiagramPaths(dir, 0));
  assert.throws(() => nextDiagramPaths(dir, -1));
  assert.throws(() => nextDiagramPaths(dir, 'abc'));
});

test('nextDiagramPath delegates to nextDiagramPaths (single object, backward compatible)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const result = nextDiagramPath(dir);
  assert.equal(typeof result, 'object');
  assert.equal(Array.isArray(result), false);
  assert.equal(path.basename(result.htmlPath), 'diagram-1.html');
});

test('CLI --count N --json prints a JSON array', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--count', '2', '--json'], { encoding: 'utf8' });
  assert.equal(out.status, 0);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(path.basename(parsed[0].htmlPath), 'diagram-1.html');
  assert.equal(path.basename(parsed[1].htmlPath), 'diagram-2.html');
});

test('CLI without --count still prints a single object (backward compatible)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--json'], { encoding: 'utf8' });
  assert.equal(out.status, 0);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), false);
  assert.equal(path.basename(parsed.htmlPath), 'diagram-1.html');
});

test('CLI --count with a bad value exits non-zero', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--count', 'abc', '--json'], { encoding: 'utf8' });
  assert.notEqual(out.status, 0);
});

test('CLI --count=N (equals form) prints a JSON array', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--count=2', '--json'], { encoding: 'utf8' });
  assert.equal(out.status, 0);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
});

test('CLI --count with no value exits non-zero', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--count'], { encoding: 'utf8' });
  assert.notEqual(out.status, 0);
});

test('CLI rejects an unknown flag', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--bogus'], { encoding: 'utf8' });
  assert.notEqual(out.status, 0);
});
