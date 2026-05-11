const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { inspectResearchLogArtifacts } = require('../scripts/common');

function loadFixture(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, 'fixtures', name), 'utf8'
  ));
}

test('inspectResearchLogArtifacts returns deterministic artifact stats', () => {
  const result = inspectResearchLogArtifacts(loadFixture('baseline.yaml'));
  assert.deepEqual(Object.keys(result).sort(), ['errors', 'stats', 'warnings']);
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.warnings));
  assert.deepEqual(Object.keys(result.stats).sort(), ['imageCount', 'tableCount', 'visualBriefCount']);
  assert.equal(typeof result.stats.imageCount, 'number');
  assert.equal(typeof result.stats.tableCount, 'number');
  assert.equal(typeof result.stats.visualBriefCount, 'number');
});

test('inspectResearchLogArtifacts does not score missing images, tables, visual briefs, or short text', () => {
  const result = inspectResearchLogArtifacts(loadFixture('no-images.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.equal(result.stats.imageCount, 0);
  assert.equal(result.stats.tableCount, 0);
  assert.equal(result.stats.visualBriefCount, 0);
  assert.equal(codes.includes('NO_IMAGES'), false);
  assert.equal(codes.includes('NO_TABLES'), false);
  assert.equal(codes.includes('NO_VISUAL_BRIEF'), false);
  assert.equal(codes.includes('TEXT_TOO_SHORT'), false);
});

test('inspectResearchLogArtifacts warns when an image path cannot be resolved', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const result = inspectResearchLogArtifacts(loadFixture('missing-image-file.yaml'), {
    draftDir: fixturesDir
  });
  const warning = result.warnings.find(w => w.code === 'IMAGE_FILE_MISSING');
  assert.ok(warning);
  assert.match(warning.detail.path, /does-not-exist\.png/);
});

test('inspectResearchLogArtifacts reports invalid research nature as deterministic metadata diagnostics', () => {
  const result = inspectResearchLogArtifacts(loadFixture('invalid-research-nature.yaml'));
  const warning = result.warnings.find(w => w.code === 'META_INVALID_VALUE');
  assert.ok(warning);
  assert.equal(warning.detail.key, '연구 성격');
  assert.equal(warning.detail.value, '회고');
  assert.deepEqual(warning.detail.allowed, ['구축', '분석', '검증']);
});
