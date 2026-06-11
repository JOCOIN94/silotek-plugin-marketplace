const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runBuildDocx } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('build-docx does not print writing-quality warnings for non-critical missing-meta yaml', () => {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  fs.copyFileSync(
    path.join(FIXTURES, 'missing-meta-non-critical.yaml'),
    path.join(inputsDir, '2026-05-10-mm-non-critical.yaml')
  );

  const built = runBuildDocx('2026-05-10-mm-non-critical', { storage });
  assert.equal(built.status, 0, `build stderr: ${built.stderr}`);
  assert.doesNotMatch(built.stdout, /META_MISSING_KEY/);
  assert.doesNotMatch(built.stdout, /TEXT_TOO_SHORT/);
});

test('build-docx still rejects forbidden top-level key (validateResearchLog)', () => {
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

test('build-docx preserves line breaks in a multi-line code block', () => {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  fs.copyFileSync(
    path.join(FIXTURES, 'code-multiline.yaml'),
    path.join(inputsDir, '2026-05-13-code-multiline.yaml')
  );
  const built = runBuildDocx('2026-05-13-code-multiline', { storage });
  assert.equal(built.status, 0, `stderr: ${built.stderr}`);

  const docx = path.join(storage, 'outputs', '2026-05-13-code-multiline.docx');
  assert.ok(fs.existsSync(docx));

  const documentXml = new AdmZip(docx).readAsText('word/document.xml');
  // The code block has 5 lines, so the rendered run should carry >= 4 line breaks.
  const breakCount = (documentXml.match(/<w:br\s*\/?>/g) || []).length;
  assert.ok(breakCount >= 4, `expected >= 4 <w:br/> from the code block, got ${breakCount}`);
  // Sanity: first and last code lines both made it into the document.
  assert.match(documentXml, /src\/app\//);
  assert.match(documentXml, /page\.tsx/);
});

test('build-docx renders visual_brief as a gray box (no error)', () => {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  const target = path.join(inputsDir, '2026-05-10-vb-complete.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'visual-brief-complete.yaml'), target);
  const built = runBuildDocx('2026-05-10-vb-complete', { storage });
  assert.equal(built.status, 0, `stderr: ${built.stderr}`);
  const docx = path.join(storage, 'outputs', '2026-05-10-vb-complete.docx');
  assert.ok(fs.existsSync(docx));
  assert.ok(fs.statSync(docx).size > 0);
});
