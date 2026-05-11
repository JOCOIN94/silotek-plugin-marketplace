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

test('skill directories match the public command families plus diagram design', () => {
  const skillsDir = path.join(PLUGIN_ROOT, 'skills');
  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  assert.deepEqual(skillDirs, [
    'research-log-docx-create',
    'research-log-yaml-create',
    'research-log-yaml-retouch',
    'silotek-diagram-design'
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
  assert.match(text, /silotek-diagram-design/);
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
    /diagram-1/
  ];

  for (const file of activeDocs) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, file);
    }
  }
});
