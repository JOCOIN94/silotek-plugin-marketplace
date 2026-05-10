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
