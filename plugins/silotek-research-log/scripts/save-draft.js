#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  basenameFromDoc,
  ensureStorage,
  formatValidationErrors,
  loadYaml,
  pluginRoot,
  rewriteImages,
  uniqueBasename,
  validateResearchLog,
  writeJson,
  writeYaml
} = require('./common');

function usage() {
  console.log(`사일로텍 연구일지 YAML 저장기

사용법:
  node scripts/save-draft.js <draft.yaml> [options]

옵션:
  --mode <conversation|folder|mixed>   생성 모드
  --source-root <path>                 참고한 작업 폴더 경로
  --slug <text>                        파일명 주제 slug
  --source-file <path>                 참고 파일 경로 (여러 번 지정 가능)

출력:
  중앙 저장소 inputs/<basename>.yaml
  중앙 저장소 manifests/<basename>.json
  중앙 저장소 figures/<basename>/...
`);
}

function parseArgs(argv) {
  const parsed = {
    mode: 'conversation',
    sourceRoot: process.cwd(),
    sourceFiles: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') parsed.help = true;
    else if (arg === '--mode') parsed.mode = argv[++i];
    else if (arg === '--source-root') parsed.sourceRoot = argv[++i];
    else if (arg === '--slug') parsed.slug = argv[++i];
    else if (arg === '--source-file') parsed.sourceFiles.push(argv[++i]);
    else if (!parsed.draftPath) parsed.draftPath = arg;
    else throw new Error(`알 수 없는 인자: ${arg}`);
  }

  return parsed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.draftPath) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const draftPath = path.resolve(args.draftPath);
  if (!fs.existsSync(draftPath)) {
    throw new Error(`초안 YAML을 찾을 수 없음: ${draftPath}`);
  }

  const doc = loadYaml(draftPath);
  const schemaErrors = validateResearchLog(doc);
  if (schemaErrors.length) {
    throw new Error(formatValidationErrors(schemaErrors));
  }

  const storage = ensureStorage();
  const base = uniqueBasename(storage, basenameFromDoc(doc, args.slug));
  const draftDir = path.dirname(draftPath);
  const copiedFigures = rewriteImages(doc, {
    draftDir,
    sourceRoot: args.sourceRoot ? path.resolve(args.sourceRoot) : null,
    storage,
    basename: base
  });

  const inputPath = path.join(storage.inputs, `${base}.yaml`);
  const manifestPath = path.join(storage.manifests, `${base}.json`);

  writeYaml(inputPath, doc);
  writeJson(manifestPath, {
    schemaVersion: 1,
    plugin: 'silotek-research-log',
    pluginRoot: pluginRoot(),
    mode: args.mode,
    basename: base,
    createdAt: new Date().toISOString(),
    sourceRoot: args.sourceRoot ? path.resolve(args.sourceRoot) : null,
    sourceFiles: args.sourceFiles.map(file => path.resolve(file)),
    copiedFigures,
    inputPath,
    outputPath: null,
    build: null
  });

  console.log('✓ 연구일지 YAML 저장 완료');
  console.log(`  입력: ${inputPath}`);
  console.log(`  manifest: ${manifestPath}`);
  console.log(`  figures: ${copiedFigures.length}개 복사`);
}

try {
  main();
} catch (error) {
  console.error(`✗ 저장 실패: ${error.message}`);
  process.exit(1);
}
