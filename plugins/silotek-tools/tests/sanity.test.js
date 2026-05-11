const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');

test('makeTmpStorage creates a unique writable directory', () => {
  const a = makeTmpStorage();
  const b = makeTmpStorage();
  assert.notEqual(a, b);
  cleanTmpStorage(a);
  cleanTmpStorage(b);
});
