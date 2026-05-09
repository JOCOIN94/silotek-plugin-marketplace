#!/usr/bin/env node

const { ensureStorage, listYaml } = require('./common');

function main() {
  const json = process.argv.includes('--json');
  const storage = ensureStorage();
  const entries = listYaml(storage);

  if (json) {
    console.log(JSON.stringify({ root: storage.root, entries }, null, 2));
    return;
  }

  console.log(`중앙 연구일지 저장소: ${storage.root}`);
  if (!entries.length) {
    console.log('저장된 YAML이 없습니다. 먼저 /silotek-research-log:draft 로 초안을 저장하세요.');
    return;
  }

  for (const entry of entries) {
    const status = entry.hasDocx ? 'DOCX 있음' : 'DOCX 없음';
    const label = entry.subtitle || entry.title || entry.basename;
    const date = entry.date ? ` / ${entry.date}` : '';
    console.log(`${entry.index}. ${entry.name} [${status}]`);
    console.log(`   ${label}${date}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`✗ 목록 조회 실패: ${error.message}`);
  process.exit(1);
}
