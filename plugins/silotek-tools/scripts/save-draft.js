#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  assertInsideSubdir,
  ensureStorage,
  formatValidationErrors,
  inspectResearchLogArtifacts,
  loadYaml,
  pluginRoot,
  validateResearchLog,
  writeJson
} = require('./common');

function usage() {
  console.log(`사일로텍 연구일지 YAML 저장기

사용법:
  node scripts/save-draft.js <중앙 inputs/<basename>.yaml> [options]

옵션:
  --mode <conversation|folder|mixed>   생성 모드 (manifest 기록용)
  --source-file <path>                 참고 파일 경로 (여러 번 지정 가능)
  --no-rasterize                       누락 PNG의 형제 HTML 자동 래스터화 비활성화

동작:
  중앙 보관소의 YAML(이미 자리에 있음)을 검증하고, 누락된 PNG가 있으면
  같은 폴더의 HTML 사이드카로부터 복구하고, manifest를 기록합니다.
  YAML이나 figures를 복사하지 않습니다 — 이미 중앙에 있어야 합니다.

출력:
  <중앙>/manifests/<basename>.json
`);
}

function parseArgs(argv) {
  const parsed = {
    mode: 'conversation',
    sourceFiles: [],
    rasterize: true
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--mode') parsed.mode = argv[++i];
    else if (arg === '--source-file') parsed.sourceFiles.push(argv[++i]);
    else if (arg === '--no-rasterize') parsed.rasterize = false;
    else if (!parsed.draftPath) parsed.draftPath = arg;
    else throw new Error(`알 수 없는 인자: ${arg}`);
  }

  return parsed;
}

function autoRasterizeImageSidecars(doc, draftDir) {
  const converted = [];
  let rasterizeHtmlFile = null;

  for (const element of doc.sections || []) {
    if (!element || typeof element !== 'object' || !element.image || !element.image.path) continue;
    const imagePath = String(element.image.path);
    if (path.extname(imagePath).toLowerCase() !== '.png') continue;

    const targetPath = path.isAbsolute(imagePath)
      ? imagePath
      : path.resolve(draftDir, imagePath);
    if (fs.existsSync(targetPath)) continue;

    const sourceHtml = targetPath.replace(/\.png$/i, '.html');
    if (!fs.existsSync(sourceHtml)) continue;

    try {
      if (!rasterizeHtmlFile) {
        ({ rasterizeHtmlFile } = require('./rasterize-svg'));
      }
      rasterizeHtmlFile(sourceHtml, targetPath);
      converted.push({ sourceHtml, targetPath });
    } catch (error) {
      console.log(`diagram rasterize skipped: ${sourceHtml} -> ${targetPath}: ${error.message}`);
    }
  }

  return converted;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.draftPath) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const draftPath = path.resolve(args.draftPath);
  if (!fs.existsSync(draftPath)) {
    throw new Error(`YAML 파일을 찾을 수 없음: ${draftPath}`);
  }

  const storage = ensureStorage();
  assertInsideSubdir(draftPath, storage, 'inputs', 'draftPath');

  const doc = loadYaml(draftPath);
  const schemaErrors = validateResearchLog(doc);
  if (schemaErrors.length) {
    throw new Error(formatValidationErrors(schemaErrors));
  }

  const draftDir = path.dirname(draftPath);
  const basename = path.basename(draftPath, path.extname(draftPath));

  const rasterizedFigures = args.rasterize
    ? autoRasterizeImageSidecars(doc, draftDir)
    : [];
  if (rasterizedFigures.length) {
    console.log(`diagram rasterized: ${rasterizedFigures.length}`);
  }

  const diagnostics = inspectResearchLogArtifacts(doc, { draftDir });

  const manifestPath = path.join(storage.manifests, `${basename}.json`);

  writeJson(manifestPath, {
    schemaVersion: 1,
    plugin: 'silotek-tools',
    pluginRoot: pluginRoot(),
    mode: args.mode,
    basename,
    createdAt: new Date().toISOString(),
    sourceFiles: args.sourceFiles.map(file => path.resolve(file)),
    rasterizedFigures,
    diagnostics,
    inputPath: draftPath,
    outputPath: null,
    build: null
  });

  console.log('✓ 연구일지 YAML 저장 완료');
  console.log(`  입력: ${draftPath}`);
  console.log(`  manifest: ${manifestPath}`);
}

try {
  main();
} catch (error) {
  console.error(`✗ 저장 실패: ${error.message}`);
  process.exit(1);
}
