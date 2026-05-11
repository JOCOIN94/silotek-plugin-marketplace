#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function nextDiagramPath(dir, options = {}) {
  const prefix = options.prefix || 'diagram';
  const targetDir = path.resolve(dir || '.silotek-diagrams');
  fs.mkdirSync(targetDir, { recursive: true });

  let index = 1;
  while (
    fs.existsSync(path.join(targetDir, `${prefix}-${index}.html`)) ||
    fs.existsSync(path.join(targetDir, `${prefix}-${index}.png`))
  ) {
    index += 1;
  }

  return {
    dir: targetDir,
    index,
    htmlPath: path.join(targetDir, `${prefix}-${index}.html`),
    pngPath: path.join(targetDir, `${prefix}-${index}.png`)
  };
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const dir = args.find(arg => arg !== '--json') || '.silotek-diagrams';
  const result = nextDiagramPath(dir);
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

module.exports = { nextDiagramPath };
