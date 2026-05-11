const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSaveDraft, runResolveYaml } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('resolve-yaml resolves a saved YAML by list number as JSON', () => {
  const draft = path.join(storage, 'baseline-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'baseline.yaml'), draft);

  const saved = runSaveDraft(draft, { storage });
  assert.equal(saved.status, 0, `save stderr: ${saved.stderr}`);

  const resolved = runResolveYaml(1, { storage });
  assert.equal(resolved.status, 0, `stderr: ${resolved.stderr}`);

  const payload = JSON.parse(resolved.stdout);
  assert.equal(payload.index, 1);
  assert.equal(payload.basename.endsWith('.yaml'), false);
  assert.ok(payload.inputPath.endsWith('.yaml'));
  assert.equal(fs.existsSync(payload.inputPath), true);
});
