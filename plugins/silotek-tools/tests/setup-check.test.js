const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSetupCheck } = require('./helpers/runScript');
const { checkManifest } = require('../scripts/setup-check');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('setup-check reports environment status as JSON without creating central storage folders', () => {
  fs.rmSync(storage, { recursive: true, force: true });

  const result = runSetupCheck({ storage, json: true });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const report = JSON.parse(result.stdout);

  assert.equal(report.plugin, 'silotek-tools');
  assert.equal(report.storage.root, storage);
  assert.equal(fs.existsSync(storage), false);
  assert.ok(Array.isArray(report.checks));
  assert.ok(report.checks.some(check => check.id === 'dependencies'));
  assert.ok(report.checks.some(check => check.id === 'rasterizer'));
});

test('setup-check manifest lookup works from the source checkout', () => {
  const pluginRoot = path.resolve(__dirname, '..');
  const result = checkManifest(pluginRoot);
  assert.equal(result.status, 'ok');
  assert.match(result.detail.marketplacePath.replace(/\\/g, '/'), /\.claude-plugin\/marketplace\.json$/);
});

test('setup-check manifest lookup warns, not fails, without marketplace in installed cache context', () => {
  const root = makeTmpStorage();
  try {
    fs.mkdirSync(path.join(root, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
      name: 'silotek-tools',
      version: '9.9.9',
      dependencies: {}
    }, null, 2));
    fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({
      name: 'silotek-tools',
      version: '9.9.9'
    }, null, 2));

    const result = checkManifest(root);
    assert.equal(result.status, 'warn');
    assert.equal(result.message, 'Marketplace manifest not found in this context.');
  } finally {
    cleanTmpStorage(root);
  }
});
