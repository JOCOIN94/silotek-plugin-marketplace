const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function makeTmpStorage() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-test-'));
}

function cleanTmpStorage(dir) {
  if (!dir) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { makeTmpStorage, cleanTmpStorage };
