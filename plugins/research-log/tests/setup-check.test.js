const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSetupCheck } = require('./helpers/runScript');
const { checkManifest, checkLatestVersion } = require('../scripts/setup-check');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const CURRENT_VERSION = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'package.json'), 'utf8')).version;

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('setup-check reports environment status as JSON without creating central storage folders', () => {
  fs.rmSync(storage, { recursive: true, force: true });

  const result = runSetupCheck({ storage, json: true });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const report = JSON.parse(result.stdout);

  assert.equal(report.plugin, 'research-log');
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
      name: 'research-log',
      version: '9.9.9',
      dependencies: {}
    }, null, 2));
    fs.writeFileSync(path.join(root, '.claude-plugin', 'plugin.json'), JSON.stringify({
      name: 'research-log',
      version: '9.9.9'
    }, null, 2));

    const result = checkManifest(root);
    assert.equal(result.status, 'warn');
    assert.equal(result.message, 'Marketplace manifest not found in this context.');
  } finally {
    cleanTmpStorage(root);
  }
});

test('checkLatestVersion reports ok when remote matches current version', async () => {
  const fetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ plugins: [{ name: 'research-log', version: CURRENT_VERSION }] })
  });
  const result = await checkLatestVersion(PLUGIN_ROOT, { fetcher, skipEnv: '' });
  assert.equal(result.status, 'ok');
  assert.match(result.message, /up to date/);
  assert.equal(result.detail.remoteVersion, CURRENT_VERSION);
});

test('checkLatestVersion warns when remote advertises a newer version', async () => {
  const fetcher = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ plugins: [{ name: 'research-log', version: '99.0.0' }] })
  });
  const result = await checkLatestVersion(PLUGIN_ROOT, { fetcher, skipEnv: '' });
  assert.equal(result.status, 'warn');
  assert.match(result.message, /New version available/);
  assert.equal(result.detail.currentVersion, CURRENT_VERSION);
  assert.equal(result.detail.remoteVersion, '99.0.0');
});

test('checkLatestVersion warns (not fails) on network error', async () => {
  const fetcher = async () => { throw new Error('ENETUNREACH'); };
  const result = await checkLatestVersion(PLUGIN_ROOT, { fetcher, skipEnv: '' });
  assert.equal(result.status, 'warn');
  assert.match(result.message, /Update check skipped/);
});

test('checkLatestVersion honors RESEARCH_LOG_SKIP_UPDATE_CHECK=1', async () => {
  let called = false;
  const fetcher = async () => { called = true; throw new Error('should not be called'); };
  const result = await checkLatestVersion(PLUGIN_ROOT, { fetcher, skipEnv: '1' });
  assert.equal(called, false);
  assert.equal(result.status, 'ok');
  assert.match(result.message, /skipped/);
  assert.equal(result.detail.skipped, true);
});
