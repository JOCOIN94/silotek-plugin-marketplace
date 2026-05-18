#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { assertInsideStorage, dateStamp, ensureStorage } = require('./common');

// 디스크 상태 기준으로 비어 있는 다이어그램 인덱스를 count개 골라 반환한다.
// 점유된 인덱스(.html 또는 .png가 이미 있는 인덱스)는 건너뛴다. 파일은 만들지 않는다.
// dir은 반드시 절대 경로이며, 중앙 보관소(Silotek Research Logs) 내부여야 한다.
function nextDiagramPaths(dir, count, options = {}) {
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`count must be a positive integer, got: ${count}`);
  }
  const storage = options.storage || ensureStorage();
  const targetDir = assertInsideStorage(dir, storage, 'dir');
  const prefix = options.prefix || 'diagram';
  fs.mkdirSync(targetDir, { recursive: true });

  const results = [];
  let index = 1;
  while (results.length < n) {
    const occupied =
      fs.existsSync(path.join(targetDir, `${prefix}-${index}.html`)) ||
      fs.existsSync(path.join(targetDir, `${prefix}-${index}.png`));
    if (!occupied) {
      results.push({
        dir: targetDir,
        index,
        htmlPath: path.join(targetDir, `${prefix}-${index}.html`),
        pngPath: path.join(targetDir, `${prefix}-${index}.png`)
      });
    }
    index += 1;
  }
  return results;
}

// 하위호환: 인자 한 개짜리 호출은 그대로 단일 객체를 반환한다.
function nextDiagramPath(dir, options = {}) {
  return nextDiagramPaths(dir, 1, options)[0];
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  let count = null;
  let standalone = false;
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') continue;
    if (arg === '--standalone') { standalone = true; continue; }
    if (arg === '--count') {
      const next = args[i + 1];
      if (next === undefined || next.startsWith('--')) {
        throw new Error('--count requires a value');
      }
      count = next;
      i += 1;
      continue;
    }
    if (arg.startsWith('--count=')) { count = arg.slice('--count='.length); continue; }
    if (arg.startsWith('--')) { throw new Error(`unknown flag: ${arg}`); }
    positional.push(arg);
  }

  const storage = ensureStorage();
  let dir = positional[0];
  if (!dir) {
    if (!standalone) {
      throw new Error(
        '대상 디렉터리가 필요합니다. 중앙 보관소 내부의 절대 경로를 전달하세요 ' +
        '(예: 연구일지 흐름의 figuresDir). 독립 다이어그램 흐름은 --standalone 플래그를 ' +
        '쓰면 오늘 날짜 폴더(<중앙>/diagrams/<YYYY-MM-DD>/)에 자동 할당합니다.'
      );
    }
    dir = path.join(storage.diagrams, dateStamp());
  }

  if (count !== null) {
    const results = nextDiagramPaths(dir, count, { storage });
    if (jsonMode) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const r of results) {
        console.log(`html: ${r.htmlPath}`);
        console.log(`png: ${r.pngPath}`);
      }
    }
    return;
  }

  const result = nextDiagramPath(dir, { storage });
  if (jsonMode) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`html: ${result.htmlPath}`);
    console.log(`png: ${result.pngPath}`);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`next-diagram-path failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { nextDiagramPath, nextDiagramPaths };
