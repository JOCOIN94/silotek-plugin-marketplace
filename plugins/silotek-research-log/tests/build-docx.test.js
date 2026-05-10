const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSaveDraft, runBuildDocx } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('build-docx prints quality warnings for missing-meta yaml', () => {
  // 먼저 저장
  const draft = path.join(storage, 'mm-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'missing-meta.yaml'), draft);
  const saved = runSaveDraft(draft, { storage });
  assert.equal(saved.status, 0, `save stderr: ${saved.stderr}`);

  // 빌드
  const built = runBuildDocx(1, { storage });
  assert.equal(built.status, 0, `build stderr: ${built.stderr}`);
  assert.match(built.stdout, /META_MISSING_KEY/);
});

test('build-docx still rejects forbidden top-level key (validateResearchLog)', () => {
  // forbidden 키는 save-draft에서 이미 막혔지만, 사용자가 inputs/*.yaml을 손으로
  // 수정해 forbidden 키를 다시 넣은 케이스를 시뮬레이션한다.
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  fs.copyFileSync(
    path.join(FIXTURES, 'forbidden-top-key.yaml'),
    path.join(inputsDir, '2026-05-10-tampered.yaml')
  );
  const built = runBuildDocx('2026-05-10-tampered', { storage });
  assert.notEqual(built.status, 0);
  assert.match(built.stderr, /project/);
});
