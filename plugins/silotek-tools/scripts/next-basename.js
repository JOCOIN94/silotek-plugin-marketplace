#!/usr/bin/env node
/**
 * 중앙 보관소에서 충돌하지 않는 basename을 할당하고,
 * 그에 대응하는 절대 경로(inputs/<basename>.yaml, figures/<basename>/)를 반환한다.
 * 연구일지 작성 스킬이 작업 시작 직후 호출해, 작업 폴더(레포)를 거치지 않고
 * 곧장 중앙 보관소에 쓸 수 있도록 경로를 미리 확보한다.
 */
'use strict';

const path = require('path');
const { basenameFromDoc, ensureStorage, uniqueBasename } = require('./common');

function usage() {
  console.log(`사일로텍 연구일지 basename 할당기

사용법:
  node scripts/next-basename.js --title "<제목>" [--date YYYY-MM-DD] [--slug <text>] [--json]

옵션:
  --title <text>          연구 주제(또는 문서 제목). 필수.
  --date YYYY-MM-DD       작성일. 생략하면 오늘.
  --slug <text>           파일명 슬러그 override.
  --json                  JSON 출력.

출력 (기본):
  basename: <yyyy-mm-dd>-<slug>
  yaml: <중앙 보관소>/inputs/<basename>.yaml
  figures: <중앙 보관소>/figures/<basename>

출력 (--json):
  { "basename": "...", "yamlPath": "...", "figuresDir": "...", "centralRoot": "..." }
`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--title') out.title = argv[++i];
    else if (a === '--date') out.date = argv[++i];
    else if (a === '--slug') out.slug = argv[++i];
    else if (a === '--json') out.json = true;
    else throw new Error(`알 수 없는 인자: ${a}`);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (!args.title) {
    console.error('--title is required');
    process.exit(1);
  }

  const storage = ensureStorage();
  const stubDoc = {
    title: args.title,
    meta: args.date ? { '작성일': args.date } : {}
  };
  const basename = uniqueBasename(storage, basenameFromDoc(stubDoc, args.slug));
  const result = {
    basename,
    yamlPath: path.join(storage.inputs, `${basename}.yaml`),
    figuresDir: path.join(storage.figures, basename),
    centralRoot: storage.root
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`basename: ${result.basename}`);
    console.log(`yaml: ${result.yamlPath}`);
    console.log(`figures: ${result.figuresDir}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
