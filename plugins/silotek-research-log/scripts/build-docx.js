#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { buildDocx } = require('../build');
const {
  analyzeQuality,
  ensureStorage,
  formatValidationErrors,
  listYaml,
  loadYaml,
  readJsonIfExists,
  validateResearchLog,
  writeJson
} = require('./common');

function usage() {
  console.log(`사일로텍 연구일지 DOCX 생성기

사용법:
  node scripts/build-docx.js --list
  node scripts/build-docx.js <번호|파일명|basename|yaml-path>

예시:
  node scripts/build-docx.js --list
  node scripts/build-docx.js 1
  node scripts/build-docx.js 2026-05-09-rag-validation
`);
}

function resolveInput(selector, entries, storage) {
  if (!selector) return null;

  if (/^\d+$/.test(selector)) {
    const entry = entries[Number(selector) - 1];
    if (!entry) throw new Error(`목록 번호가 범위를 벗어남: ${selector}`);
    return entry;
  }

  const asPath = path.resolve(selector);
  if (fs.existsSync(asPath)) {
    const basename = path.basename(asPath, path.extname(asPath));
    return {
      basename,
      name: path.basename(asPath),
      inputPath: asPath,
      outputPath: path.join(storage.outputs, `${basename}.docx`)
    };
  }

  const normalized = selector.toLowerCase().replace(/\.ya?ml$/, '');
  const entry = entries.find(item =>
    item.basename.toLowerCase() === normalized ||
    item.name.toLowerCase() === selector.toLowerCase()
  );
  if (entry) return entry;

  const centralPath = path.join(storage.inputs, selector.endsWith('.yaml') || selector.endsWith('.yml')
    ? selector
    : `${selector}.yaml`);
  if (fs.existsSync(centralPath)) {
    const basename = path.basename(centralPath, path.extname(centralPath));
    return {
      basename,
      name: path.basename(centralPath),
      inputPath: centralPath,
      outputPath: path.join(storage.outputs, `${basename}.docx`)
    };
  }

  throw new Error(`YAML을 찾을 수 없음: ${selector}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  const storage = ensureStorage();
  const entries = listYaml(storage);

  if (!args.length || args.includes('--list')) {
    usage();
    console.log('');
    require('./list-yaml');
    return;
  }

  const target = resolveInput(args[0], entries, storage);
  const doc = loadYaml(target.inputPath);
  const schemaErrors = validateResearchLog(doc);
  if (schemaErrors.length) {
    throw new Error(formatValidationErrors(schemaErrors));
  }

  const quality = analyzeQuality(doc, {
    draftDir: path.dirname(target.inputPath)
  });
  if (quality.warnings.length) {
    console.log('⚠ 품질 경고 (빌드는 진행됨):');
    for (const w of quality.warnings) {
      console.log(`  - ${w.code}: ${w.message}`);
    }
  }

  fs.mkdirSync(path.dirname(target.outputPath), { recursive: true });
  await buildDocx(target.inputPath, target.outputPath);

  const manifestPath = path.join(storage.manifests, `${target.basename}.json`);
  const manifest = readJsonIfExists(manifestPath);
  manifest.outputPath = target.outputPath;
  manifest.build = {
    builtAt: new Date().toISOString(),
    sizeBytes: fs.statSync(target.outputPath).size
  };
  writeJson(manifestPath, manifest);

  console.log(`✓ manifest 업데이트: ${manifestPath}`);
}

main().catch(error => {
  console.error(`✗ DOCX 생성 실패: ${error.message}`);
  process.exit(1);
});
