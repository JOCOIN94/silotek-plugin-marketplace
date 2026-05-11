const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const AdmZip = require('adm-zip');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runBuildDocx } = require('./helpers/runScript');

const PLUGIN_ROOT = path.resolve(__dirname, '..');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

function writePairedYaml(basename, imagePath) {
  const inputs = path.join(storage, 'inputs');
  fs.mkdirSync(inputs, { recursive: true });
  const filePath = path.join(inputs, `${basename}.yaml`);
  fs.writeFileSync(filePath, yaml.dump({
    title: '연구 일지',
    subtitle: 'DOCX visual pair test',
    meta: {
      '연구 주제': 'DOCX visual pair',
      '연구 성격': '구축',
      '연구 단계': '검증',
      '분류': '테스트',
      '작성일': '2026년 5월 11일',
      '작성자': '테스트'
    },
    sections: [
      { h1: '1. 연구 질문' },
      {
        visual_brief: {
          purpose: 'VISUAL_BRIEF_FALLBACK_MARKER',
          claim: 'VISUAL_BRIEF_CLAIM_MARKER',
          evidence: ['이미지 존재 여부'],
          forbidden: ['HTML 직접 삽입'],
          palette: 'navy / teal / gray',
          caption: '[그림 1] fallback marker'
        }
      },
      {
        image: {
          path: imagePath,
          caption: 'IMAGE_CAPTION_MARKER'
        }
      }
    ]
  }), 'utf8');
  return filePath;
}

function documentXml(docxPath) {
  const zip = new AdmZip(docxPath);
  return zip.getEntry('word/document.xml').getData().toString('utf8');
}

test('build.js suppresses paired visual_brief fallback when PNG exists', () => {
  const figureDir = path.join(storage, 'figures', 'paired');
  fs.mkdirSync(figureDir, { recursive: true });
  fs.copyFileSync(path.join(PLUGIN_ROOT, 'assets', 'logo_silotek.png'), path.join(figureDir, 'diagram-1.png'));
  const basename = '2026-05-11-paired-existing';
  writePairedYaml(basename, '../figures/paired/diagram-1.png');

  const built = runBuildDocx(basename, { storage });
  assert.equal(built.status, 0, `stderr: ${built.stderr}`);
  const xml = documentXml(path.join(storage, 'outputs', `${basename}.docx`));
  assert.doesNotMatch(xml, /VISUAL_BRIEF_FALLBACK_MARKER/);
  assert.match(xml, /IMAGE_CAPTION_MARKER/);
});

test('build.js renders visual_brief fallback and skips missing paired image', () => {
  const basename = '2026-05-11-paired-missing';
  writePairedYaml(basename, '../figures/missing/diagram-1.png');

  const built = runBuildDocx(basename, { storage });
  assert.equal(built.status, 0, `stderr: ${built.stderr}`);
  const xml = documentXml(path.join(storage, 'outputs', `${basename}.docx`));
  assert.match(xml, /VISUAL_BRIEF_FALLBACK_MARKER/);
  assert.doesNotMatch(xml, /IMAGE_CAPTION_MARKER/);
});
