const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSaveDraft } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

// 새 직행 모델에서는 draft YAML이 처음부터 <storage>/inputs/<basename>.yaml에 있고,
// 다이어그램 HTML/PNG는 <storage>/figures/<basename>/에 있다. YAML 안의 image.path는
// inputs/ 기준 상대경로 ../figures/<basename>/diagram-N.png 다.
function placeCentralDraft(basename, imageRelativePath) {
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  const inputPath = path.join(inputsDir, `${basename}.yaml`);
  fs.writeFileSync(inputPath, yaml.dump({
    title: '연구 일지',
    subtitle: '자동 래스터 테스트',
    meta: {
      '연구 주제': '다이어그램 자동 변환',
      '연구 성격': '구축',
      '연구 단계': '검증',
      '분류': '테스트',
      '작성일': '2026년 5월 11일',
      '작성자': '테스트'
    },
    sections: [
      { h1: '1. 연구 질문' },
      { p: 'visual_brief와 image가 저장 단계에서 안전하게 결합되는지 확인한다.' },
      {
        visual_brief: {
          purpose: 'PNG가 없을 때 sibling HTML을 래스터화한다.',
          claim: 'save-draft가 다이어그램 산출물을 복구할 수 있다.',
          evidence: ['HTML sidecar가 존재한다.', 'PNG image element가 존재한다.'],
          forbidden: ['HTML을 DOCX에 직접 넣는 방식은 사용하지 않는다.'],
          palette: 'navy / teal / gray',
          caption: '[그림 1] 자동 래스터 테스트'
        }
      },
      {
        image: {
          path: imageRelativePath,
          caption: '[그림 1] 자동 래스터 테스트'
        }
      }
    ]
  }), 'utf8');
  return inputPath;
}

test('save-draft auto-rasterizes a sibling diagram HTML when the PNG is missing', () => {
  const basename = '2026-05-11-auto-raster';
  const figuresDir = path.join(storage, 'figures', basename);
  fs.mkdirSync(figuresDir, { recursive: true });
  fs.copyFileSync(path.join(FIXTURES, 'diagram-korean.html'), path.join(figuresDir, 'diagram-1.html'));

  const inputPath = placeCentralDraft(basename, `../figures/${basename}/diagram-1.png`);

  const result = runSaveDraft(inputPath, { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /diagram rasterized: 1/);

  // PNG was produced next to the HTML, in the central figures dir.
  assert.ok(fs.existsSync(path.join(figuresDir, 'diagram-1.png')));
  assert.ok(fs.existsSync(path.join(figuresDir, 'diagram-1.html')));

  // Manifest records the rasterized entry.
  const manifest = JSON.parse(fs.readFileSync(path.join(storage, 'manifests', `${basename}.json`), 'utf8'));
  assert.equal(manifest.rasterizedFigures.length, 1);
});

test('save-draft --no-rasterize leaves the missing PNG unresolved', () => {
  const basename = '2026-05-11-no-raster';
  const figuresDir = path.join(storage, 'figures', basename);
  fs.mkdirSync(figuresDir, { recursive: true });
  fs.copyFileSync(path.join(FIXTURES, 'diagram-korean.html'), path.join(figuresDir, 'diagram-1.html'));

  const inputPath = placeCentralDraft(basename, `../figures/${basename}/diagram-1.png`);

  const result = runSaveDraft(inputPath, { storage, noRasterize: true });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.doesNotMatch(result.stdout, /diagram rasterized/);
  assert.equal(fs.existsSync(path.join(figuresDir, 'diagram-1.png')), false);
});
