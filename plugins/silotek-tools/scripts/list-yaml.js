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

  console.log(`Central research-log storage: ${storage.root}`);
  if (!entries.length) {
    console.log('No saved YAML found. Create one first with /silotek-tools:research-log-yaml-create.');
    return;
  }

  for (const entry of entries) {
    const status = entry.hasDocx ? 'DOCX exists' : 'DOCX missing';
    const label = entry.subtitle || entry.title || entry.basename;
    const date = entry.date ? ` / ${entry.date}` : '';
    console.log(`${entry.index}. ${entry.name} [${status}]`);
    console.log(`   ${label}${date}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`list-yaml failed: ${error.message}`);
  process.exit(1);
}
