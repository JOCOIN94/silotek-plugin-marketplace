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

function writeDiagramDraft(filePath, imagePath) {
  fs.writeFileSync(filePath, yaml.dump({
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
          path: imagePath,
          caption: '[그림 1] 자동 래스터 테스트'
        }
      }
    ]
  }), 'utf8');
}

test('save-draft auto-rasterizes sibling diagram HTML when PNG is missing', () => {
  const draftFigures = path.join(storage, 'draft-figures-auto');
  fs.mkdirSync(draftFigures, { recursive: true });
  fs.copyFileSync(path.join(FIXTURES, 'diagram-korean.html'), path.join(draftFigures, 'diagram-1.html'));
  const draft = path.join(storage, 'auto-raster-draft.yaml');
  writeDiagramDraft(draft, 'draft-figures-auto/diagram-1.png');

  const result = runSaveDraft(draft, { storage, noCritique: true, slug: 'auto-raster' });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /diagram rasterized: 1/);
  assert.ok(fs.existsSync(path.join(draftFigures, 'diagram-1.png')));

  const storedFigureDir = path.join(storage, 'figures', '2026-05-11-auto-raster');
  assert.ok(fs.existsSync(path.join(storedFigureDir, 'diagram-1.png')));
  assert.ok(fs.existsSync(path.join(storedFigureDir, 'diagram-1.html')));
});

test('save-draft --no-rasterize leaves missing PNG unresolved', () => {
  const draftFigures = path.join(storage, 'draft-figures-no-raster');
  fs.mkdirSync(draftFigures, { recursive: true });
  fs.copyFileSync(path.join(FIXTURES, 'diagram-korean.html'), path.join(draftFigures, 'diagram-1.html'));
  const draft = path.join(storage, 'no-raster-draft.yaml');
  writeDiagramDraft(draft, 'draft-figures-no-raster/diagram-1.png');

  const result = runSaveDraft(draft, { storage, noCritique: true, noRasterize: true, slug: 'no-raster' });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.doesNotMatch(result.stdout, /diagram rasterized/);
  assert.equal(fs.existsSync(path.join(draftFigures, 'diagram-1.png')), false);
});
