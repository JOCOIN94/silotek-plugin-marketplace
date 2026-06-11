#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { assertInsideSubdir, ensureStorage, listYaml } = require('./common');

function usage() {
  console.log(`Resolve a saved research-log YAML.

Usage:
  node scripts/resolve-yaml.js <number|basename|yaml-path> [--json]
`);
}

function resolveYaml(selector, storage = ensureStorage()) {
  if (!selector) throw new Error('YAML selector is required.');

  const entries = listYaml(storage);
  if (/^\d+$/.test(String(selector))) {
    const index = Number(selector);
    const entry = entries[index - 1];
    if (!entry) throw new Error(`YAML list number is out of range: ${selector}`);
    return { ...entry, index };
  }

  const direct = path.resolve(String(selector));
  if (fs.existsSync(direct)) {
    assertInsideSubdir(direct, storage, 'inputs', 'yaml selector path');
    return {
      index: null,
      basename: path.basename(direct, path.extname(direct)),
      name: path.basename(direct),
      inputPath: direct
    };
  }

  const normalized = String(selector).toLowerCase().replace(/\.ya?ml$/, '');
  const entry = entries.find(item =>
    item.basename.toLowerCase() === normalized ||
    item.name.toLowerCase() === String(selector).toLowerCase()
  );
  if (entry) return entry;

  const selectorText = String(selector);
  const centralName = selectorText.endsWith('.yaml') || selectorText.endsWith('.yml')
    ? selectorText
    : `${selectorText}.yaml`;
  const centralPath = path.join(storage.inputs, centralName);
  if (fs.existsSync(centralPath)) {
    return {
      index: null,
      basename: path.basename(centralPath, path.extname(centralPath)),
      name: path.basename(centralPath),
      inputPath: centralPath
    };
  }

  throw new Error(`YAML not found: ${selector}`);
}

function printText(resolved) {
  console.log(`YAML: ${resolved.inputPath}`);
  console.log(`basename: ${resolved.basename}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h') || !args.length) {
    usage();
    process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
  }

  const jsonMode = args.includes('--json');
  const selector = args.find(arg => arg !== '--json');
  const resolved = resolveYaml(selector);

  if (jsonMode) console.log(JSON.stringify(resolved, null, 2));
  else printText(resolved);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`resolve-yaml failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { resolveYaml };
