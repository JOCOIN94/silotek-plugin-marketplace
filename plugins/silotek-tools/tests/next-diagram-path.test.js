const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { nextDiagramPath } = require('../scripts/next-diagram-path');

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
