# Silotek Tools Skill Boundary Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `silotek-tools`를 skill-first 구조로 정리해 AI/Skill은 연구적 판단과 재작성을 맡고, Node는 Windows/macOS 양쪽에서 동일하게 동작하는 결정적 파일/검증/변환 도구만 제공하게 만든다.

**Architecture:** 공개 command 5개는 유지하되, retouch와 품질 판단은 Node 엔진에서 제거하고 skill 지침으로 이동한다. Node scripts는 schema validation, path/storage, image copy, SVG safety check, PNG rasterize, DOCX build, setup diagnostics만 담당한다. 모든 command/skill 문서는 Windows PowerShell과 macOS/Linux shell 실행 예시를 함께 제공한다.

**Tech Stack:** Claude Code plugin markdown commands/skills, Node.js CommonJS scripts, `node:test`, `js-yaml`, `@resvg/resvg-js`, `docx`, PowerShell, POSIX shell.

---

## Non-Negotiable Responsibility Boundary

AI/Skill owns:

- 연구 품질 판단
- research-log retouch/rewrite
- 다이어그램 타입 판단
- 다이어그램 정보 구조와 문구 설계
- `visual_brief`의 의미 해석

Node owns:

- YAML schema validation
- deterministic metadata/domain validation
- file/path/storage lookup
- image copy and path rewrite
- HTML/SVG safety check
- PNG rasterize
- DOCX build
- read-only setup diagnostics

Node must not:

- score research quality
- decide that a report has enough evidence, diagrams, tables, or validation narrative
- append artificial sections such as `Retouch Notes`
- emit automatic quality scores after save/build
- store `quality` or `critique` authority in manifests

---

## File Map

Modify:

- `plugins/silotek-tools/scripts/common.js` — keep schema/path helpers; replace broad `analyzeQuality` with deterministic artifact/schema inspection only.
- `plugins/silotek-tools/scripts/save-draft.js` — remove automatic quality warning and score output; keep validation, rasterize, copy, manifest save.
- `plugins/silotek-tools/scripts/build-docx.js` — remove automatic quality warning output; keep validation and DOCX build.
- `plugins/silotek-tools/scripts/setup-check.js` — improve marketplace lookup for source checkout and installed plugin cache.
- `plugins/silotek-tools/scripts/rasterize-svg.js` — keep SVG safety/rasterize behavior unchanged unless tests expose a cross-platform path issue.
- `plugins/silotek-tools/package.json` — remove misleading script names such as `research:retouch`.
- `plugins/silotek-tools/commands/*.md` and `plugins/silotek-tools/skills/*/SKILL.md` — make command docs skill-first and cross-platform.
- `CLAUDE.md`, `README.md`, `plugins/silotek-tools/README.md`, `plugins/silotek-tools/templates/research-log.yaml` — remove stale `/draft`, quality-score, and old namespace language.

Delete:

- `plugins/silotek-tools/scripts/retouch-yaml.js`
- `plugins/silotek-tools/scripts/critique.js`
- `plugins/silotek-tools/agents/research-critic.md`
- `plugins/silotek-tools/agents/research-diagrammer.md`
- `plugins/silotek-tools/tests/critique.test.js`
- `plugins/silotek-tools/tests/retouch-yaml.test.js`

Create:

- `plugins/silotek-tools/scripts/resolve-yaml.js` — deterministic YAML selector resolver for skill use.
- `plugins/silotek-tools/scripts/next-diagram-path.js` — deterministic filename allocator for standalone and research-log diagram outputs.
- `plugins/silotek-tools/tests/resolve-yaml.test.js`
- `plugins/silotek-tools/tests/next-diagram-path.test.js`

---

## Task 1: Remove Node Retouch Engine

**Files:**

- Delete: `plugins/silotek-tools/scripts/retouch-yaml.js`
- Modify: `plugins/silotek-tools/package.json`
- Modify: `plugins/silotek-tools/tests/helpers/runScript.js`
- Delete: `plugins/silotek-tools/tests/retouch-yaml.test.js`
- Create: `plugins/silotek-tools/scripts/resolve-yaml.js`
- Create: `plugins/silotek-tools/tests/resolve-yaml.test.js`

- [ ] **Step 1: Add a failing resolver test**

Create `plugins/silotek-tools/tests/resolve-yaml.test.js`:

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSaveDraft, runResolveYaml } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('resolve-yaml resolves a saved YAML by list number as JSON', () => {
  const draft = path.join(storage, 'baseline-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'baseline.yaml'), draft);

  const saved = runSaveDraft(draft, { storage });
  assert.equal(saved.status, 0, `save stderr: ${saved.stderr}`);

  const resolved = runResolveYaml(1, { storage });
  assert.equal(resolved.status, 0, `stderr: ${resolved.stderr}`);

  const payload = JSON.parse(resolved.stdout);
  assert.equal(payload.index, 1);
  assert.equal(payload.basename.endsWith('.yaml'), false);
  assert.ok(payload.inputPath.endsWith('.yaml'));
  assert.equal(fs.existsSync(payload.inputPath), true);
});
```

- [ ] **Step 2: Extend the test helper**

Modify `plugins/silotek-tools/tests/helpers/runScript.js` so it exports `runResolveYaml` and no longer exports `runRetouch`:

```js
function runResolveYaml(selector, opts = {}) {
  const args = [path.join(SCRIPTS_DIR, 'resolve-yaml.js'), String(selector), '--json'];
  return spawnSync(process.execPath, args, {
    cwd: PLUGIN_ROOT,
    env: {
      ...process.env,
      SILOTEK_RESEARCH_LOG_ROOT: opts.storage || process.env.SILOTEK_RESEARCH_LOG_ROOT || ''
    },
    encoding: 'utf8'
  });
}

module.exports = {
  runSaveDraft,
  runBuildDocx,
  runResolveYaml,
  runSetupCheck,
  runRasterize
};
```

- [ ] **Step 3: Run the failing test**

Run:

```powershell
npm.cmd test --prefix plugins/silotek-tools -- tests/resolve-yaml.test.js
```

Expected: FAIL because `scripts/resolve-yaml.js` does not exist yet.

- [ ] **Step 4: Implement deterministic YAML resolution**

Create `plugins/silotek-tools/scripts/resolve-yaml.js`:

```js
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { ensureStorage, listYaml } = require('./common');

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

  const centralName = String(selector).endsWith('.yaml') || String(selector).endsWith('.yml')
    ? String(selector)
    : `${selector}.yaml`;
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
```

- [ ] **Step 5: Remove retouch executable references**

In `plugins/silotek-tools/package.json`, remove:

```json
"research:retouch": "node scripts/retouch-yaml.js"
```

Then delete `plugins/silotek-tools/scripts/retouch-yaml.js` and `plugins/silotek-tools/tests/retouch-yaml.test.js`.

- [ ] **Step 6: Verify**

Run:

```powershell
node --check plugins/silotek-tools/scripts/resolve-yaml.js
npm.cmd test --prefix plugins/silotek-tools -- tests/resolve-yaml.test.js
```

Expected: PASS.

---

## Task 2: Remove Node Quality Judge and Automatic Scores

**Files:**

- Delete: `plugins/silotek-tools/scripts/critique.js`
- Delete: `plugins/silotek-tools/tests/critique.test.js`
- Modify: `plugins/silotek-tools/scripts/common.js`
- Modify: `plugins/silotek-tools/scripts/save-draft.js`
- Modify: `plugins/silotek-tools/scripts/build-docx.js`
- Modify: `plugins/silotek-tools/tests/analyze-quality.test.js`
- Modify: `plugins/silotek-tools/tests/save-draft.test.js`
- Modify: `plugins/silotek-tools/tests/build-docx.test.js`

- [ ] **Step 1: Redefine deterministic diagnostics**

Replace `analyzeQuality(doc, options)` with `inspectResearchLogArtifacts(doc, options)` in `scripts/common.js`.

Allowed diagnostics:

- invalid `meta.연구 성격` value, because this is domain/schema validation
- missing image file referenced by an `image` element
- malformed `visual_brief`, if not already caught by `validateResearchLog`

Remove diagnostics:

- `TEXT_TOO_SHORT`
- `NO_IMAGES`
- `NO_TABLES`
- `NO_VISUAL_BRIEF`
- `FOLDER_EXPLORATION_ANTI_PATTERN`
- validation/trial-error/future keyword checks
- any score or suggestion derived from writing quality

The new return shape must be:

```js
{
  errors: [],
  warnings: [],
  stats: {
    imageCount: Number,
    visualBriefCount: Number,
    tableCount: Number
  }
}
```

- [ ] **Step 2: Keep backward compatibility only if needed**

If existing imports make the change too large, temporarily export:

```js
const analyzeQuality = inspectResearchLogArtifacts;
```

Do not document `analyzeQuality` in command/skill docs. Remove the alias in a later cleanup once tests and callers are migrated.

- [ ] **Step 3: Remove automatic quality output from save-draft**

In `scripts/save-draft.js`:

- remove `critiqueScore` and `formatReport` import
- remove `--no-critique`
- remove `critique: true` default
- remove the final automatic score block
- keep schema validation, artifact diagnostics, auto-rasterize, image copy, manifest write

Manifest must not include `quality` or `critique`. If diagnostics are stored, store only:

```js
diagnostics: {
  warnings: artifact.warnings,
  errors: artifact.errors,
  stats: artifact.stats
}
```

- [ ] **Step 4: Remove automatic quality output from build-docx**

In `scripts/build-docx.js`:

- remove quality warning console block
- keep `validateResearchLog(doc)` before build
- optionally run artifact diagnostics only for deterministic file checks, but do not print writing-quality warnings

- [ ] **Step 5: Update tests**

Delete `tests/critique.test.js`.

Change test names and expectations:

- `analyze-quality.test.js` becomes deterministic artifact diagnostics tests.
- `save-draft.test.js` must not expect `점수`, `품질 경고`, `NO_IMAGES`, `TEXT_TOO_SHORT`, or `META_MISSING_KEY`.
- `build-docx.test.js` must not expect quality warning output.

Run:

```powershell
npm.cmd test --prefix plugins/silotek-tools -- tests/analyze-quality.test.js tests/save-draft.test.js tests/build-docx.test.js
```

Expected: PASS after old quality/scoring expectations are removed.

---

## Task 3: Make Retouch Skill-First

**Files:**

- Modify: `plugins/silotek-tools/commands/research-log-yaml-retouch.md`
- Modify: `plugins/silotek-tools/skills/research-log-yaml-retouch/SKILL.md`
- Modify: `CLAUDE.md`
- Modify: `plugins/silotek-tools/README.md`

- [ ] **Step 1: Rewrite command workflow**

`research-log-yaml-retouch.md` must say:

```markdown
Workflow:

1. Resolve the existing YAML with `scripts/resolve-yaml.js`.
2. Read the resolved YAML directly.
3. The AI rewrites the YAML into a stronger research-log revision.
4. Save the new revision through `scripts/save-draft.js`.
5. Leave the original YAML unchanged.
```

It must not mention `retouch-yaml.js`, `critique.js`, quality score, or Node retouch.

- [ ] **Step 2: Add Windows and macOS command snippets**

Windows PowerShell snippet:

```powershell
$scriptName = "resolve-yaml.js"
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
node (Join-Path $pluginRoot "scripts\$scriptName") <number|basename|path> --json
```

macOS/Linux shell snippet:

```bash
script_name="resolve-yaml.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" "<number|basename|path>" --json
```

- [ ] **Step 3: Update skill instructions**

`skills/research-log-yaml-retouch/SKILL.md` must explicitly say:

- Do not call a Node retouch engine.
- Do not append `Retouch Notes`.
- Do not treat Node diagnostics as research-quality judgment.
- Preserve original YAML.
- Save the rewritten revision through `save-draft.js`.

- [ ] **Step 4: Verify stale references**

Run:

```powershell
rg -n "retouch-yaml|Retouch Notes|Quality score before retouch|critiqueScore|scripts/critique" plugins/silotek-tools README.md CLAUDE.md
```

Expected: no matches.

---

## Task 4: Remove Deprecated Agents

**Files:**

- Delete: `plugins/silotek-tools/agents/research-critic.md`
- Delete: `plugins/silotek-tools/agents/research-diagrammer.md`
- Modify: `plugins/silotek-tools/tests/structure.test.js`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Delete legacy agent files**

Remove the entire `plugins/silotek-tools/agents/` directory if it becomes empty.

- [ ] **Step 2: Add a structure test**

Add to `plugins/silotek-tools/tests/structure.test.js`:

```js
test('legacy agents directory is not part of silotek-tools runtime surface', () => {
  const agentsDir = path.join(PLUGIN_ROOT, 'agents');
  assert.equal(fs.existsSync(agentsDir), false);
});
```

- [ ] **Step 3: Verify**

Run:

```powershell
npm.cmd test --prefix plugins/silotek-tools -- tests/structure.test.js
```

Expected: PASS.

---

## Task 5: Add Diagram Filename Auto-Increment

**Files:**

- Create: `plugins/silotek-tools/scripts/next-diagram-path.js`
- Create: `plugins/silotek-tools/tests/next-diagram-path.test.js`
- Modify: `plugins/silotek-tools/commands/diagram-create.md`
- Modify: `plugins/silotek-tools/skills/silotek-diagram-design/SKILL.md`
- Modify: `plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add failing test**

Create `plugins/silotek-tools/tests/next-diagram-path.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { nextDiagramPath } = require('../scripts/next-diagram-path');

test('nextDiagramPath returns diagram-1 when directory is empty', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const result = nextDiagramPath(dir);
  assert.equal(path.basename(result.htmlPath), 'diagram-1.html');
  assert.equal(path.basename(result.pngPath), 'diagram-1.png');
});

test('nextDiagramPath increments after existing html or png files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  fs.writeFileSync(path.join(dir, 'diagram-1.html'), '');
  fs.writeFileSync(path.join(dir, 'diagram-2.png'), '');
  const result = nextDiagramPath(dir);
  assert.equal(path.basename(result.htmlPath), 'diagram-3.html');
  assert.equal(path.basename(result.pngPath), 'diagram-3.png');
});
```

- [ ] **Step 2: Run failing test**

Run:

```powershell
npm.cmd test --prefix plugins/silotek-tools -- tests/next-diagram-path.test.js
```

Expected: FAIL because the script does not exist yet.

- [ ] **Step 3: Implement allocator**

Create `plugins/silotek-tools/scripts/next-diagram-path.js`:

```js
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
```

- [ ] **Step 4: Update diagram docs**

Replace hard-coded `diagram-1.html` / `diagram-1.png` as the required output with:

```text
.silotek-diagrams/
  diagram-N.html
  diagram-N.png
```

and:

```text
.silotek-research-log-figures/
  diagram-N.html
  diagram-N.png
```

The command must call `next-diagram-path.js` before writing the HTML.

- [ ] **Step 5: Verify**

Run:

```powershell
node --check plugins/silotek-tools/scripts/next-diagram-path.js
npm.cmd test --prefix plugins/silotek-tools -- tests/next-diagram-path.test.js
```

Expected: PASS.

---

## Task 6: Improve setup-check Marketplace Lookup

**Files:**

- Modify: `plugins/silotek-tools/scripts/setup-check.js`
- Modify: `plugins/silotek-tools/tests/setup-check.test.js`

- [ ] **Step 1: Add tests for source and installed contexts**

Add tests that assert:

- source checkout with root `.claude-plugin/marketplace.json` reports manifest status `ok`
- missing marketplace in installed cache reports `warn`, not `fail`, when `package.json` and plugin manifest are consistent

- [ ] **Step 2: Implement candidate lookup**

In `setup-check.js`, replace the single hard-coded marketplace path with candidate lookup:

```js
function marketplaceCandidates(root) {
  const candidates = [];
  if (process.env.SILOTEK_TOOLS_MARKETPLACE) {
    candidates.push(path.resolve(process.env.SILOTEK_TOOLS_MARKETPLACE));
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
```

`checkManifest(root)` must select the first existing candidate. If none exists, return `warn` with message `Marketplace manifest not found in this context.`.

- [ ] **Step 3: Verify read-only behavior**

Run:

```powershell
npm.cmd test --prefix plugins/silotek-tools -- tests/setup-check.test.js
```

Expected: PASS and no central storage folder created by setup-check.

---

## Task 7: Cross-Platform Command and Skill Cleanup

**Files:**

- Modify: `plugins/silotek-tools/commands/setup-check.md`
- Modify: `plugins/silotek-tools/commands/research-log-yaml-create.md`
- Modify: `plugins/silotek-tools/commands/research-log-yaml-retouch.md`
- Modify: `plugins/silotek-tools/commands/research-log-docx-create.md`
- Modify: `plugins/silotek-tools/commands/diagram-create.md`
- Modify: all matching `skills/*/SKILL.md`
- Modify: `plugins/silotek-tools/tests/structure.test.js`

- [ ] **Step 1: Add both shell families to every command**

Every command/skill that shows a script invocation must include:

- `Windows PowerShell`
- `macOS/Linux shell`

No command may rely only on `$env:CLAUDE_PLUGIN_ROOT`.

- [ ] **Step 2: Add structure test**

Add to `plugins/silotek-tools/tests/structure.test.js`:

```js
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
```

- [ ] **Step 3: Verify no stale root snippets**

Run:

```powershell
npm.cmd test --prefix plugins/silotek-tools -- tests/structure.test.js
```

Expected: PASS.

---

## Task 8: Remove Stale `/draft` and Old Quality Language

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `plugins/silotek-tools/README.md`
- Modify: `plugins/silotek-tools/templates/research-log.yaml`
- Modify: `plugins/silotek-tools/tests/structure.test.js`

- [ ] **Step 1: Remove active stale strings**

Active docs and templates must not contain:

- `/silotek-research-log:`
- `/draft`
- `commands/draft.md`
- `skills/draft`
- `research-critic`
- `research-diagrammer`
- `품질 경고`
- `quality score`
- `critique score`
- `diagram-1` as a fixed required filename

Historical files under `docs/superpowers/plans/2026-05-10-*` may keep old strings.

- [ ] **Step 2: Add active-doc grep test**

Add to `plugins/silotek-tools/tests/structure.test.js`:

```js
test('active docs do not expose stale draft or quality-scoring language', () => {
  const activeDocs = [
    path.join(REPO_ROOT, 'README.md'),
    path.join(REPO_ROOT, 'CLAUDE.md'),
    path.join(PLUGIN_ROOT, 'README.md'),
    path.join(PLUGIN_ROOT, 'templates', 'research-log.yaml'),
    ...fs.readdirSync(path.join(PLUGIN_ROOT, 'commands')).map(name => path.join(PLUGIN_ROOT, 'commands', name)),
    ...fs.readdirSync(path.join(PLUGIN_ROOT, 'skills'), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(PLUGIN_ROOT, 'skills', entry.name, 'SKILL.md'))
      .filter(file => fs.existsSync(file))
  ];

  const forbidden = [
    /\/silotek-research-log:/,
    /\/draft\b/,
    /commands\/draft\.md/,
    /skills\/draft/,
    /research-critic/,
    /research-diagrammer/,
    /quality score/i,
    /critique score/i,
    /품질 경고/
  ];

  for (const file of activeDocs) {
    const text = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, file);
    }
  }
});
```

- [ ] **Step 3: Verify**

Run:

```powershell
npm.cmd test --prefix plugins/silotek-tools -- tests/structure.test.js
```

Expected: PASS.

---

## Task 9: Full Verification

**Files:** no new files.

- [ ] **Step 1: Syntax check**

Run:

```powershell
node --check plugins/silotek-tools/scripts/common.js
node --check plugins/silotek-tools/scripts/save-draft.js
node --check plugins/silotek-tools/scripts/build-docx.js
node --check plugins/silotek-tools/scripts/rasterize-svg.js
node --check plugins/silotek-tools/scripts/setup-check.js
node --check plugins/silotek-tools/scripts/resolve-yaml.js
node --check plugins/silotek-tools/scripts/next-diagram-path.js
node --check plugins/silotek-tools/build.js
```

Expected: no syntax errors.

- [ ] **Step 2: Test suite**

Run:

```powershell
npm.cmd test --prefix plugins/silotek-tools
```

Expected: all tests PASS.

- [ ] **Step 3: Plugin validation**

Run:

```powershell
claude plugin validate .
```

Expected: validation passes.

- [ ] **Step 4: Active surface grep**

Run:

```powershell
rg -n "retouch-yaml|Retouch Notes|critiqueScore|scripts/critique|research-critic|research-diagrammer|품질 경고|quality score|/silotek-research-log:|/draft\b" README.md CLAUDE.md plugins/silotek-tools
```

Expected: no matches.

- [ ] **Step 5: Cross-platform command review**

Manually inspect command/skill docs and confirm every script invocation has both:

```text
Windows PowerShell
macOS/Linux shell
```

Expected: all public commands are usable from either OS without rewriting path syntax.

---

## Acceptance Criteria

- The only visible slash commands remain:
  - `/silotek-tools:setup-check`
  - `/silotek-tools:research-log-yaml-create`
  - `/silotek-tools:research-log-yaml-retouch`
  - `/silotek-tools:research-log-docx-create`
  - `/silotek-tools:diagram-create`
- No Node script performs research-quality scoring or retouch writing.
- Retouch is skill-first: AI reads, rewrites, and saves a new revision.
- Node diagnostics are deterministic and limited to schema/path/storage/assets.
- Save and build scripts do not automatically print quality scores.
- Manifests do not store `quality` or `critique` as authority.
- Diagram outputs never overwrite an existing `diagram-N.html` or `diagram-N.png`.
- setup-check works in both source checkout and installed plugin cache contexts.
- Active docs and skills include Windows PowerShell and macOS/Linux shell snippets.
- Historical old plans may remain under `docs/superpowers/plans`, but active runtime docs must not point users to stale `/draft` or old namespace commands.
