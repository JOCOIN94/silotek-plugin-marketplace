const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPTS_DIR = path.resolve(__dirname, '..', '..', 'scripts');

function runSaveDraft(draftPath, opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'save-draft.js'), draftPath];
  if (opts.mode) args.push('--mode', opts.mode);
  if (opts.sourceRoot) args.push('--source-root', opts.sourceRoot);
  if (opts.slug) args.push('--slug', opts.slug);
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: { ...process.env, SILOTEK_RESEARCH_LOG_ROOT: opts.storage || '' }
  });
}

function runBuildDocx(selector, opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'build-docx.js'), String(selector)];
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: { ...process.env, SILOTEK_RESEARCH_LOG_ROOT: opts.storage || '' }
  });
}

module.exports = { runSaveDraft, runBuildDocx };
