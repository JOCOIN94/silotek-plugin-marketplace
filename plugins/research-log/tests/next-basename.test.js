const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runNextBasename } = require('./helpers/runScript');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('next-basename outputs basename + central yaml/figures paths as JSON', () => {
  const result = runNextBasename({
    storage,
    title: '테스트 주제',
    date: '2026-05-13',
    json: true
  });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  const out = JSON.parse(result.stdout);
  assert.match(out.basename, /^2026-05-13-/);
  assert.equal(out.yamlPath, path.join(storage, 'inputs', `${out.basename}.yaml`));
  assert.equal(out.figuresDir, path.join(storage, 'figures', out.basename));
  assert.equal(out.centralRoot, storage);
});

test('next-basename ensures the central storage layout exists', () => {
  const result = runNextBasename({
    storage,
    title: '레이아웃 생성 테스트',
    date: '2026-05-13',
    json: true
  });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  for (const sub of ['inputs', 'outputs', 'manifests', 'figures']) {
    assert.equal(fs.existsSync(path.join(storage, sub)), true, `${sub} should exist`);
  }
});

test('next-basename appends a numeric suffix on collision', () => {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  // 첫 번째 호출로 basename 확보.
  const first = JSON.parse(runNextBasename({ storage, title: '충돌 테스트', date: '2026-05-13', json: true }).stdout);
  // 그 자리에 실제 YAML이 있다고 위장.
  fs.writeFileSync(first.yamlPath, 'title: stub\n');
  // 같은 인자로 다시 호출 → -2 접미사가 붙어야 한다.
  const second = JSON.parse(runNextBasename({ storage, title: '충돌 테스트', date: '2026-05-13', json: true }).stdout);
  assert.notEqual(second.basename, first.basename);
  assert.equal(second.basename, `${first.basename}-2`);
});

test('next-basename without --json prints human-readable lines', () => {
  const result = runNextBasename({ storage, title: '텍스트 출력', date: '2026-05-13' });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /^basename: /m);
  assert.match(result.stdout, /^yaml: /m);
  assert.match(result.stdout, /^figures: /m);
});

test('next-basename fails without --title', () => {
  const result = runNextBasename({ storage });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /--title/);
});
