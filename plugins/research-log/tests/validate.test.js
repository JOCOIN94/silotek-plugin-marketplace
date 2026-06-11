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
  // v0.2.1: fixture는 연구 성격도 비어 있어 hard-fail 1건이 함께 발행된다.
  // 이 테스트의 본 의도는 forbidden top-level key 거절 검증이므로 length 대신
  // 메시지 포함 여부로 단언.
  assert.ok(errors.some(e => /project/.test(e) && /meta/.test(e)),
    `expected a forbidden-top-level-key error, got: ${JSON.stringify(errors)}`);
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

// v0.2.1 — meta.연구 성격 hard-fail
test('validateResearchLog rejects when meta.연구 성격 is missing (v0.2.1 hard-fail)', () => {
  const errors = validateResearchLog(loadFixture('missing-meta.yaml'));
  assert.ok(errors.some(e => /연구 성격이 비어 있습니다/.test(e)),
    `expected hard-fail for missing 연구 성격, got: ${JSON.stringify(errors)}`);
});

test('validateResearchLog rejects when meta.연구 성격 is out of domain (v0.2.1 hard-fail)', () => {
  const errors = validateResearchLog(loadFixture('invalid-research-nature.yaml'));
  assert.ok(errors.some(e => /구축 \/ 분석 \/ 검증 중 하나여야 합니다/.test(e)),
    `expected hard-fail for invalid 연구 성격, got: ${JSON.stringify(errors)}`);
  assert.ok(errors.some(e => /회고/.test(e)),
    `error should echo the offending value, got: ${JSON.stringify(errors)}`);
});

test('validateResearchLog accepts missing-meta-non-critical (연구 성격 set, others missing)', () => {
  const errors = validateResearchLog(loadFixture('missing-meta-non-critical.yaml'));
  // 비-치명 메타 누락은 schema error가 아님.
  assert.deepEqual(errors, []);
});
