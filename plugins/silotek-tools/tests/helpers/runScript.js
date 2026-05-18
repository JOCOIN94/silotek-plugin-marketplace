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
  if (opts.noRasterize) args.push('--no-rasterize');
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: buildEnv(opts)
  });
}

function runNextBasename(opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'next-basename.js')];
  if (opts.title) args.push('--title', opts.title);
  if (opts.date) args.push('--date', opts.date);
  if (opts.slug) args.push('--slug', opts.slug);
  if (opts.json) args.push('--json');
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

function runNextDiagramPath(opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'next-diagram-path.js')];
  if (opts.dir !== undefined && opts.dir !== null) args.push(String(opts.dir));
  if (opts.standalone) args.push('--standalone');
  if (opts.count !== undefined && opts.count !== null) {
    if (opts.countForm === 'equals') {
      args.push(`--count=${opts.count}`);
    } else {
      args.push('--count', String(opts.count));
    }
  } else if (opts.countNoValue) {
    args.push('--count');
  }
  if (opts.json) args.push('--json');
  if (Array.isArray(opts.extraArgs)) args.push(...opts.extraArgs);
  return spawnSync('node', args, {
    encoding: 'utf8',
    env: buildEnv(opts)
  });
}

module.exports = {
  runSaveDraft,
  runBuildDocx,
  runResolveYaml,
  runSetupCheck,
  runNextBasename,
  runNextDiagramPath
};
