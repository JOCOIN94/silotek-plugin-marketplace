#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { pluginRoot, researchRoot, readJsonIfExists } = require('./common');

function status(ok, warning = false) {
  if (ok) return 'ok';
  return warning ? 'warn' : 'fail';
}

function checkDependencies(root) {
  const pkg = readJsonIfExists(path.join(root, 'package.json'));
  const dependencies = Object.keys(pkg.dependencies || {});
  const missing = dependencies.filter(name => {
    try {
      require.resolve(name, { paths: [root] });
      return false;
    } catch {
      return true;
    }
  });
  return {
    id: 'dependencies',
    status: status(missing.length === 0),
    message: missing.length ? `Missing npm dependencies: ${missing.join(', ')}` : 'All declared npm dependencies resolve.',
    detail: { dependencies, missing }
  };
}

function checkRasterizer(root) {
  let resolved = null;
  try {
    resolved = require.resolve('@resvg/resvg-js', { paths: [root] });
  } catch {
    return {
      id: 'rasterizer',
      status: 'fail',
      message: '@resvg/resvg-js is not available.',
      detail: { package: '@resvg/resvg-js' }
    };
  }
  return {
    id: 'rasterizer',
    status: 'ok',
    message: '@resvg/resvg-js is available.',
    detail: { resolved }
  };
}

function checkStorage(root) {
  const exists = fs.existsSync(root);
  return {
    id: 'storage',
    status: exists ? 'ok' : 'warn',
    message: exists ? 'Central storage exists.' : 'Central storage does not exist yet. setup-check does not create it.',
    detail: { exists }
  };
}

function checkTemplate(root) {
  const templatePath = path.join(root, 'templates', 'research-log.yaml');
  try {
    const parsed = yaml.load(fs.readFileSync(templatePath, 'utf8'));
    return {
      id: 'template',
      status: parsed && typeof parsed === 'object' ? 'ok' : 'fail',
      message: 'Research-log template parses as YAML.',
      detail: { templatePath }
    };
  } catch (error) {
    return {
      id: 'template',
      status: 'fail',
      message: `Template parse failed: ${error.message}`,
      detail: { templatePath }
    };
  }
}

function checkAssets(root) {
  const logoPath = path.join(root, 'assets', 'logo_silotek.png');
  const fontsDir = path.join(root, 'assets', 'fonts');
  const regularCandidates = [
    path.join(fontsDir, 'Pretendard-Regular.ttf'),
    path.join(fontsDir, 'Pretendard-Regular.otf')
  ];
  const boldCandidates = [
    path.join(fontsDir, 'Pretendard-Bold.ttf'),
    path.join(fontsDir, 'Pretendard-Bold.otf')
  ];
  const regular = regularCandidates.find(file => fs.existsSync(file));
  const bold = boldCandidates.find(file => fs.existsSync(file));
  const fontsPresent = Boolean(regular && bold);
  return [
    {
      id: 'logo',
      status: status(fs.existsSync(logoPath)),
      message: fs.existsSync(logoPath) ? 'Logo asset exists.' : 'Logo asset is missing.',
      detail: { logoPath }
    },
    {
      id: 'fonts',
      status: fontsPresent ? 'ok' : 'warn',
      message: fontsPresent ? 'Bundled Pretendard fonts exist.' : 'Bundled Pretendard fonts are absent; rasterizer will use system fonts.',
      detail: { fontsDir, expected: [...regularCandidates, ...boldCandidates], found: [regular, bold].filter(Boolean) }
    }
  ];
}

function marketplaceCandidates(root) {
  const candidates = [];
  if (process.env.RESEARCH_LOG_MARKETPLACE) {
    candidates.push(path.resolve(process.env.RESEARCH_LOG_MARKETPLACE));
  }

  let current = root;
  for (let i = 0; i < 6; i += 1) {
    candidates.push(path.join(current, '.claude-plugin', 'marketplace.json'));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return [...new Set(candidates)];
}

function checkManifest(root) {
  const pkg = readJsonIfExists(path.join(root, 'package.json'));
  const plugin = readJsonIfExists(path.join(root, '.claude-plugin', 'plugin.json'));
  const marketplacePath = marketplaceCandidates(root).find(candidate => fs.existsSync(candidate));
  const packageAndPluginOk =
    pkg.name === 'research-log' &&
    plugin.name === 'research-log' &&
    pkg.version === plugin.version;

  if (!marketplacePath) {
    return {
      id: 'manifest',
      status: packageAndPluginOk ? 'warn' : 'fail',
      message: packageAndPluginOk
        ? 'Marketplace manifest not found in this context.'
        : 'Package/plugin metadata is inconsistent and marketplace manifest was not found.',
      detail: {
        packageName: pkg.name,
        packageVersion: pkg.version,
        pluginName: plugin.name,
        pluginVersion: plugin.version,
        marketplacePath: null
      }
    };
  }

  const marketplace = readJsonIfExists(marketplacePath);
  const entry = Array.isArray(marketplace.plugins)
    ? marketplace.plugins.find(item => item.name === 'research-log') || marketplace.plugins[0]
    : null;
  const ok =
    packageAndPluginOk &&
    entry &&
    entry.name === 'research-log' &&
    String(entry.source || '').replace(/\\/g, '/') === './plugins/research-log' &&
    plugin.version === entry.version;

  return {
    id: 'manifest',
    status: status(ok),
    message: ok ? 'Package, plugin manifest, and marketplace entry are consistent.' : 'Package/manifest/marketplace metadata is inconsistent.',
    detail: {
      packageName: pkg.name,
      packageVersion: pkg.version,
      pluginName: plugin.name,
      pluginVersion: plugin.version,
      marketplaceName: entry && entry.name,
      marketplaceVersion: entry && entry.version,
      marketplaceSource: entry && entry.source,
      marketplacePath
    }
  };
}

const DEFAULT_UPDATE_URL = 'https://raw.githubusercontent.com/JOCOIN94/silotek-plugin-marketplace/main/.claude-plugin/marketplace.json';

async function checkLatestVersion(root, options = {}) {
  const skipEnv = options.skipEnv !== undefined
    ? options.skipEnv
    : process.env.RESEARCH_LOG_SKIP_UPDATE_CHECK;
  if (skipEnv === '1') {
    return {
      id: 'update',
      status: 'ok',
      message: 'Update check skipped (RESEARCH_LOG_SKIP_UPDATE_CHECK=1).',
      detail: { skipped: true }
    };
  }

  const pkg = readJsonIfExists(path.join(root, 'package.json'));
  const currentVersion = pkg.version;
  const url = options.url || process.env.RESEARCH_LOG_UPDATE_URL || DEFAULT_UPDATE_URL;
  const fetcher = options.fetcher || globalThis.fetch;
  const timeoutMs = options.timeoutMs !== undefined ? options.timeoutMs : 3000;

  try {
    if (typeof fetcher !== 'function') {
      throw new Error('fetch is not available in this Node runtime');
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetcher(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response || !response.ok) {
      throw new Error(`HTTP ${response ? response.status : 'no-response'}`);
    }
    const remote = await response.json();
    const entries = Array.isArray(remote && remote.plugins) ? remote.plugins : [];
    const entry = entries.find(p => p && p.name === 'research-log');
    if (!entry || !entry.version) {
      throw new Error('research-log entry not found in remote marketplace');
    }
    const remoteVersion = entry.version;
    const upToDate = currentVersion === remoteVersion;
    return {
      id: 'update',
      status: upToDate ? 'ok' : 'warn',
      message: upToDate
        ? `Plugin is up to date (${currentVersion}).`
        : `New version available: ${currentVersion} → ${remoteVersion}. Run /plugin marketplace add <silotek-plugin-marketplace git URL 또는 로컬 경로> then /plugin install research-log@silotek --scope user.`,
      detail: { currentVersion, remoteVersion, source: url }
    };
  } catch (error) {
    return {
      id: 'update',
      status: 'warn',
      message: `Update check skipped: ${error.message}`,
      detail: { currentVersion, source: url, error: error.message }
    };
  }
}

async function buildReport() {
  const root = pluginRoot();
  const storageRoot = researchRoot();
  const checks = [
    checkDependencies(root),
    checkRasterizer(root),
    checkStorage(storageRoot),
    checkTemplate(root),
    ...checkAssets(root),
    checkManifest(root),
    await checkLatestVersion(root)
  ];
  const failed = checks.filter(check => check.status === 'fail').length;
  const warned = checks.filter(check => check.status === 'warn').length;
  return {
    plugin: 'research-log',
    pluginRoot: root,
    storage: {
      root: storageRoot,
      exists: fs.existsSync(storageRoot)
    },
    summary: { failed, warned, passed: checks.length - failed - warned },
    checks
  };
}

function printText(report) {
  console.log(`research-log setup-check`);
  console.log(`plugin: ${report.pluginRoot}`);
  console.log(`storage: ${report.storage.root}`);
  for (const check of report.checks) {
    console.log(`[${check.status}] ${check.id}: ${check.message}`);
  }
}

async function main() {
  const jsonMode = process.argv.slice(2).includes('--json');
  const report = await buildReport();
  if (jsonMode) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printText(report);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(`setup-check failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { buildReport, checkManifest, checkLatestVersion, marketplaceCandidates };
