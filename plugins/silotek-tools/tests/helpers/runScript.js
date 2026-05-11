const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SCRIPTS_DIR = path.resolve(__dirname, '..', '..', 'scripts');

function buildEnv(opts) {
  const env = { ...process.env };
  if (opts.storage !== undefined) {
    env.SILOTEK_RESEARCH_LOG_ROOT = opts.storage;
  } else {
    delete env.SILOTEK_RESEARCH_LOG_ROOT;
  }
  return env;
}

function runSaveDraft(draftPath, opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'save-draft.js'), draftPath];
  if (opts.mode) args.push('--mode', opts.mode);
  if (opts.sourceRoot) args.push('--source-root', opts.sourceRoot);
  if (opts.slug) args.push('--slug', opts.slug);
  if (opts.noRasterize) args.push('--no-rasterize');
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: buildEnv(opts)
  });
}

function runBuildDocx(selector, opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'build-docx.js'), String(selector)];
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: buildEnv(opts)
  });
}

function runResolveYaml(selector, opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'resolve-yaml.js'), String(selector), '--json'];
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: buildEnv(opts)
  });
}

function runSetupCheck(opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'setup-check.js')];
  if (opts.json) args.push('--json');
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: buildEnv(opts)
  });
}

module.exports = { runSaveDraft, runBuildDocx, runResolveYaml, runSetupCheck };
