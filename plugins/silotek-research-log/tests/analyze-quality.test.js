const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { analyzeQuality } = require('../scripts/common');

function loadFixture(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, 'fixtures', name), 'utf8'
  ));
}

test('analyzeQuality returns the documented shape', () => {
  const result = analyzeQuality(loadFixture('baseline.yaml'));
  assert.equal(typeof result, 'object');
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.warnings));
  assert.equal(typeof result.stats, 'object');
  assert.equal(typeof result.stats.sectionCount, 'number');
  assert.equal(typeof result.stats.imageCount, 'number');
  assert.equal(typeof result.stats.tableCount, 'number');
  assert.equal(typeof result.stats.textLength, 'number');
});

test('analyzeQuality warns for each missing META_RECOMMENDED key', () => {
  const result = analyzeQuality(loadFixture('missing-meta.yaml'));
  const metaWarnings = result.warnings.filter(w => w.code === 'META_MISSING_KEY');
  // 연구 단계, 분류, 작성자 — 3건
  assert.equal(metaWarnings.length, 3);
  const missingKeys = metaWarnings.map(w => w.detail.key).sort();
  assert.deepEqual(missingKeys, ['분류', '연구 단계', '작성자']);
});
