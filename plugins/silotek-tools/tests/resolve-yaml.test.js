const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runResolveYaml } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('resolve-yaml resolves a saved YAML by list number as JSON', () => {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  fs.copyFileSync(
    path.join(FIXTURES, 'baseline.yaml'),
    path.join(inputsDir, '2026-05-10-baseline.yaml')
  );

  const resolved = runResolveYaml(1, { storage });
  assert.equal(resolved.status, 0, `stderr: ${resolved.stderr}`);

  const payload = JSON.parse(resolved.stdout);
  assert.equal(payload.index, 1);
  assert.equal(payload.basename.endsWith('.yaml'), false);
  assert.ok(payload.inputPath.endsWith('.yaml'));
  assert.equal(fs.existsSync(payload.inputPath), true);
});
