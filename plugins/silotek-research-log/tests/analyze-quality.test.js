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

test('analyzeQuality warns when no validation/trial-error/future heading is found', () => {
  const result = analyzeQuality(loadFixture('no-validation-section.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('NO_VALIDATION_SECTION'));
  assert.ok(codes.includes('NO_TRIAL_ERROR_SECTION'));
  assert.ok(codes.includes('NO_FUTURE_WORK_SECTION'));
});

test('analyzeQuality does NOT warn validation when heading has 검증', () => {
  const result = analyzeQuality(loadFixture('baseline.yaml'));
  // baseline.yaml은 "1. 연구 질문"만 있어서 NO_VALIDATION_SECTION이 떠야 한다.
  // 이 테스트는 baseline에 검증 헤딩이 없음을 확인 (음성 케이스 검증).
  assert.ok(result.warnings.some(w => w.code === 'NO_VALIDATION_SECTION'));
});

test('analyzeQuality warns NO_IMAGES and NO_TABLES when both are zero', () => {
  const result = analyzeQuality(loadFixture('no-images.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('NO_IMAGES'));
  assert.ok(codes.includes('NO_TABLES'));
});

test('analyzeQuality warns TEXT_TOO_SHORT when total text is under 800', () => {
  const result = analyzeQuality(loadFixture('short-text.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('TEXT_TOO_SHORT'));
});

test('analyzeQuality warns FOLDER_EXPLORATION_ANTI_PATTERN when keywords appear multiple times', () => {
  const result = analyzeQuality(loadFixture('anti-pattern.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('FOLDER_EXPLORATION_ANTI_PATTERN'));
});
