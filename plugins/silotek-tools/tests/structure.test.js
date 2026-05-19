const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PLUGIN_ROOT, '..', '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('marketplace and package expose the single silotek-tools plugin', () => {
  const marketplace = readJson(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'));
  const plugin = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));
  const pkg = readJson(path.join(PLUGIN_ROOT, 'package.json'));

  assert.equal(marketplace.name, 'silotek-tools');
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, 'silotek-tools');
  assert.equal(marketplace.plugins[0].source.replace(/\\/g, '/'), './plugins/silotek-tools');
  assert.equal(plugin.name, 'silotek-tools');
  assert.equal(pkg.name, 'silotek-tools');
});

test('only the five final visible command files exist', () => {
  const commandsDir = path.join(PLUGIN_ROOT, 'commands');
  const commandFiles = fs.readdirSync(commandsDir)
    .filter(name => name.endsWith('.md'))
    .sort();

  assert.deepEqual(commandFiles, [
    'diagram-create.md',
    'research-log-docx-create.md',
    'research-log-yaml-create.md',
    'research-log-yaml-retouch.md',
    'setup-check.md'
  ]);
});

test('skill directories match the public command families', () => {
  const skillsDir = path.join(PLUGIN_ROOT, 'skills');
  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  assert.deepEqual(skillDirs, [
    'diagram-create',
    'research-log-docx-create',
    'research-log-yaml-create',
    'research-log-yaml-retouch'
  ]);
});

test('command and skill docs do not rely on a bare CLAUDE_PLUGIN_ROOT script path', () => {
  const docs = [
    ...fs.readdirSync(path.join(PLUGIN_ROOT, 'commands'))
      .filter(name => name.endsWith('.md'))
      .map(name => path.join(PLUGIN_ROOT, 'commands', name)),
    ...fs.readdirSync(path.join(PLUGIN_ROOT, 'skills'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(PLUGIN_ROOT, 'skills', entry.name, 'SKILL.md'))
      .filter(file => fs.existsSync(file))
  ];

  for (const file of docs) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /\$env:CLAUDE_PLUGIN_ROOT[\\/]+scripts/i, file);
    assert.doesNotMatch(text, /\$\{CLAUDE_PLUGIN_ROOT\}[\\/]+scripts/i, file);
  }
});

test('agents directory contains exactly the silotek-diagrammer agent with valid frontmatter', () => {
  const agentsDir = path.join(PLUGIN_ROOT, 'agents');
  assert.equal(fs.existsSync(agentsDir), true);
  const agentFiles = fs.readdirSync(agentsDir).filter(name => name.endsWith('.md')).sort();
  assert.deepEqual(agentFiles, ['silotek-diagrammer.md']);

  const text = fs.readFileSync(path.join(agentsDir, 'silotek-diagrammer.md'), 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(fm, 'silotek-diagrammer.md must start with a YAML frontmatter block');
  assert.match(fm[1], /name:\s*silotek-diagrammer\b/);
  assert.match(fm[1], /description:\s*\S/);
  assert.match(fm[1], /tools:\s*\S/);
  // 본문이 다이어그램 스킬과 래스터라이저를 가리키는지
  assert.match(text, /diagram-create/);
  assert.match(text, /rasterize-svg\.js/);
});

test('command and skill docs include Windows and macOS shell guidance', () => {
  const docs = [
    ...fs.readdirSync(path.join(PLUGIN_ROOT, 'commands'))
      .filter(name => name.endsWith('.md'))
      .map(name => path.join(PLUGIN_ROOT, 'commands', name)),
    ...fs.readdirSync(path.join(PLUGIN_ROOT, 'skills'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(PLUGIN_ROOT, 'skills', entry.name, 'SKILL.md'))
      .filter(file => fs.existsSync(file))
  ];

  for (const file of docs) {
    const text = fs.readFileSync(file, 'utf8');
    assert.match(text, /Windows PowerShell/i, file);
    assert.match(text, /macOS\/Linux shell/i, file);
  }
});

test('active docs do not expose stale draft, old namespace, or quality-scoring language', () => {
  const activeDocs = [
    path.join(REPO_ROOT, 'README.md'),
    path.join(REPO_ROOT, 'CLAUDE.md'),
    path.join(PLUGIN_ROOT, 'README.md'),
    path.join(PLUGIN_ROOT, 'templates', 'research-log.yaml'),
    ...fs.readdirSync(path.join(PLUGIN_ROOT, 'commands'))
      .filter(name => name.endsWith('.md'))
      .map(name => path.join(PLUGIN_ROOT, 'commands', name)),
    ...fs.readdirSync(path.join(PLUGIN_ROOT, 'skills'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(PLUGIN_ROOT, 'skills', entry.name, 'SKILL.md'))
      .filter(file => fs.existsSync(file))
  ];

  const forbidden = [
    new RegExp('/silotek-' + 'research-log:'),
    new RegExp('/' + 'draft\\b'),
    new RegExp('commands/' + 'draft\\.md'),
    new RegExp('skills/' + 'draft'),
    new RegExp('research-' + 'critic'),
    new RegExp('research-' + 'diagrammer'),
    new RegExp('quality ' + 'score', 'i'),
    new RegExp('critique ' + 'score', 'i'),
    new RegExp('품질 ' + '경고'),
    /diagram-1/,
    /\.silotek-diagrams\b/
  ];

  for (const file of activeDocs) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, file);
    }
  }
});

test('project docs mention the silotek-diagrammer agent and the --count flag', () => {
  const repoClaude = fs.readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  const pluginReadme = fs.readFileSync(path.join(PLUGIN_ROOT, 'README.md'), 'utf8');
  for (const text of [repoClaude, pluginReadme]) {
    assert.match(text, /silotek-diagrammer/);
  }
  assert.match(repoClaude, /--count/);
});

test('plugin version fields are consistent across manifests', () => {
  const marketplace = readJson(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'));
  const plugin = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));
  const pkg = readJson(path.join(PLUGIN_ROOT, 'package.json'));
  const lock = readJson(path.join(PLUGIN_ROOT, 'package-lock.json'));
  const version = pkg.version;
  assert.match(version, /^\d+\.\d+\.\d+$/, 'package.json version must be a semver string');
  const entry = marketplace.plugins.find(p => p.name === 'silotek-tools');
  assert.ok(entry, 'marketplace must list the silotek-tools plugin');
  assert.equal(entry.version, version);
  assert.equal(plugin.version, version);
  assert.equal(lock.version, version);
  assert.equal(lock.packages[''].version, version);
});

test('research-log-yaml-create docs restore source/nature selection and describe parallel diagram generation', () => {
  const skill = fs.readFileSync(path.join(PLUGIN_ROOT, 'skills', 'research-log-yaml-create', 'SKILL.md'), 'utf8');
  const cmd = fs.readFileSync(path.join(PLUGIN_ROOT, 'commands', 'research-log-yaml-create.md'), 'utf8');
  for (const text of [skill, cmd]) {
    // 소스 모드 3종
    assert.match(text, /conversation/);
    assert.match(text, /folder/);
    assert.match(text, /mixed/);
    // 연구 성격 3종
    assert.match(text, /구축/);
    assert.match(text, /분석/);
    assert.match(text, /검증/);
    // 다중 다이어그램 흐름
    assert.match(text, /silotek-diagrammer/);
    assert.match(text, /--count/);
    assert.match(text, /병렬|parallel/i);
    assert.match(text, /confirm/i);
  }
});

test('research-log-yaml-create references the body writing-style guide, and the guide exists', () => {
  const guidePath = path.join(PLUGIN_ROOT, 'references', 'writing-style.md');
  assert.equal(fs.existsSync(guidePath), true, 'references/writing-style.md must exist');
  const guide = fs.readFileSync(guidePath, 'utf8');
  assert.match(guide, /행정체/, 'writing-style.md must name the formal (행정체) register');
  assert.match(guide, /종결어미/, 'writing-style.md must cover sentence endings');
  assert.match(guide, /sections/, 'writing-style.md must scope itself to YAML sections prose');

  const skill = fs.readFileSync(path.join(PLUGIN_ROOT, 'skills', 'research-log-yaml-create', 'SKILL.md'), 'utf8');
  assert.match(skill, /references\/writing-style\.md/, 'yaml-create SKILL.md must point at references/writing-style.md');
});
