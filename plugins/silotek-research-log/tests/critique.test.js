const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { critiqueScore } = require('../scripts/critique');

function loadFixture(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, 'fixtures', name), 'utf8'
  ));
}

test('critiqueScore returns the documented shape', () => {
  const result = critiqueScore(loadFixture('baseline.yaml'));
  assert.equal(typeof result.total, 'number');
  assert.ok(result.total >= 0 && result.total <= 100);
  assert.equal(typeof result.breakdown, 'object');
  assert.ok(Array.isArray(result.missing));
  assert.ok(Array.isArray(result.suggestions));
});

test('critiqueScore breakdown sums to 100 max points', () => {
  const result = critiqueScore(loadFixture('baseline.yaml'));
  const maxSum = Object.values(result.breakdown).reduce((s, b) => s + b.max, 0);
  assert.equal(maxSum, 100);
});

test('critiqueScore gives 0 for nature consistency when 연구 성격 is invalid', () => {
  const result = critiqueScore(loadFixture('invalid-research-nature.yaml'));
  assert.equal(result.breakdown['성격 일관성'].score, 0);
});

test('critiqueScore deducts heavily on baseline (no images, no tables, etc)', () => {
  // baseline.yaml은 image 0, table 0, 본문 짧음 → 점수 낮아야
  const result = critiqueScore(loadFixture('baseline.yaml'));
  assert.ok(result.total < 60, `expected < 60, got ${result.total}`);
});

function loadExample(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'yaml', name), 'utf8'
  ));
}

test('rf-card-baseline scores below 60 (low quality regression)', () => {
  const result = critiqueScore(loadExample('rf-card-baseline.yaml'));
  assert.ok(result.total < 60, `expected < 60, got ${result.total}`);
  // 시각 자료 영역이 0이거나 낮아야 (image+brief 0개)
  assert.equal(result.breakdown['시각 자료'].score, 0);
  // 검증 섹션 점수 낮아야 (검증 heading 없음)
  assert.ok(result.breakdown['검증 섹션'].score < 15);
});

test('plugin-direction-baseline scores below 65 (low quality regression)', () => {
  const result = critiqueScore(loadExample('plugin-direction-baseline.yaml'));
  assert.ok(result.total < 65, `expected < 65, got ${result.total}`);
  assert.equal(result.breakdown['시각 자료'].score, 0);
});
