const { test } = require('node:test');
const assert = require('node:assert/strict');
const { META_RECOMMENDED_KEYS, FORBIDDEN_TOP_LEVEL_KEYS } = require('../scripts/common');

test('META_RECOMMENDED_KEYS exports the 5 user-confirmed keys', () => {
  assert.deepEqual(
    META_RECOMMENDED_KEYS,
    ['연구 주제', '연구 단계', '분류', '작성일', '작성자']
  );
});

test('FORBIDDEN_TOP_LEVEL_KEYS exports the english keys to reject at top level', () => {
  assert.deepEqual(
    FORBIDDEN_TOP_LEVEL_KEYS,
    ['project', 'date', 'authors', 'keywords', 'category']
  );
});
