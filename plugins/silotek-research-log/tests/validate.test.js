const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { META_RECOMMENDED_KEYS, FORBIDDEN_TOP_LEVEL_KEYS, validateResearchLog, RESEARCH_NATURES } = require('../scripts/common');

function loadFixture(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, 'fixtures', name), 'utf8'
  ));
}

test('META_RECOMMENDED_KEYS exports the 6 user-confirmed keys', () => {
  assert.deepEqual(
    META_RECOMMENDED_KEYS,
    ['연구 주제', '연구 성격', '연구 단계', '분류', '작성일', '작성자']
  );
});

test('FORBIDDEN_TOP_LEVEL_KEYS exports the english keys to reject at top level', () => {
  assert.deepEqual(
    FORBIDDEN_TOP_LEVEL_KEYS,
    ['project', 'date', 'authors', 'keywords', 'category']
  );
});

test('validateResearchLog accepts baseline fixture without errors', () => {
  const errors = validateResearchLog(loadFixture('baseline.yaml'));
  assert.deepEqual(errors, []);
});

test('validateResearchLog rejects forbidden top-level english keys', () => {
  const errors = validateResearchLog(loadFixture('forbidden-top-key.yaml'));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /project/);
  assert.match(errors[0], /meta/);
});

test('RESEARCH_NATURES exports the 3 user-confirmed Korean labels', () => {
  assert.deepEqual(RESEARCH_NATURES, ['구축', '분석', '검증']);
});

test('META_RECOMMENDED_KEYS now includes 연구 성격 at index 1', () => {
  assert.equal(META_RECOMMENDED_KEYS.length, 6);
  assert.equal(META_RECOMMENDED_KEYS[1], '연구 성격');
  assert.deepEqual(
    META_RECOMMENDED_KEYS,
    ['연구 주제', '연구 성격', '연구 단계', '분류', '작성일', '작성자']
  );
});

test('validateResearchLog accepts visual_brief with all required fields', () => {
  const errors = validateResearchLog(loadFixture('visual-brief-complete.yaml'));
  assert.deepEqual(errors, []);
});

test('validateResearchLog rejects visual_brief missing required fields', () => {
  const errors = validateResearchLog(loadFixture('visual-brief-incomplete.yaml'));
  assert.ok(errors.length >= 4); // claim, evidence, forbidden, palette 누락
  assert.ok(errors.some(e => /claim/.test(e)));
  assert.ok(errors.some(e => /evidence/.test(e)));
  assert.ok(errors.some(e => /forbidden/.test(e)));
  assert.ok(errors.some(e => /palette/.test(e)));
});
