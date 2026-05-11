# 연구일지 워크플로 복원·개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `research-log-yaml-create`에 소스 모드(대화/폴더/혼합)·연구 성격(구축/분석/검증) 선택 절차를 되살리고, YAML 작성 중 식별한 N개 시각화 지점을 사용자 확인 후 N개 `silotek-diagrammer` 서브에이전트로 병렬 생성해 YAML에 `image`로 자동 연결한다.

**Architecture:** Node 스크립트 `next-diagram-path.js`에 `--count N` 일괄 할당을 추가하고, 신규 플러그인 서브에이전트 `agents/silotek-diagrammer.md`(그림 1장 = 1 dispatch)를 두며, `research-log-yaml-create`의 SKILL/command 본문에 선택 절차와 다중 다이어그램 흐름(브리프 작성 → 확인 게이트 → 경로 일괄 할당 → 병렬 dispatch → image 페어링 → save)을 명문화한다. 채점·import 경로는 범위 밖. 비파괴 변경 → 버전 0.3.1 → 0.4.0(SemVer MINOR).

**Tech Stack:** Node.js (`node:test`, `node:fs`, `node:path`, `child_process.spawnSync`), Claude Code 플러그인(commands/skills/agents 마크다운), `@resvg/resvg-js`(기존), `docx`(기존). 설계 근거: `docs/superpowers/specs/2026-05-11-research-log-workflow-restore-design.md`.

**Working directory & commands:** 모든 명령은 플러그인 디렉터리 `plugins/silotek-tools/`에서 실행한다(에이전트 작업 디렉터리). 리포 루트(`CLAUDE.md` 등)는 `../..` 상대경로로 가리킨다. git은 리포 어디서 실행해도 동작한다.

**Pre-flight:** 다음이 깨끗하게 통과하는지 먼저 확인한다 (기준선).

```powershell
npm.cmd test
```
Expected: 모든 테스트 통과 (현재 `tests/*.test.js` 13개 파일). 통과하지 않으면 작업 시작 전에 원인을 보고한다.

---

## Task 1: `next-diagram-path.js` — `--count N` 일괄 할당

병렬 dispatch 전에 메인 세션이 N개의 서로 다른 빈 다이어그램 경로를 한 번에 받아야 한다. 점유된 인덱스는 건너뛴다. `--count` 미지정 시 동작은 그대로(하위호환).

**Files:**
- Modify: `plugins/silotek-tools/scripts/next-diagram-path.js`
- Test: `plugins/silotek-tools/tests/next-diagram-path.test.js`

- [ ] **Step 1: 실패하는 테스트 추가**

`plugins/silotek-tools/tests/next-diagram-path.test.js` 끝에 아래를 추가한다 (기존 두 테스트와 import는 그대로 둔다):

```javascript
const { spawnSync } = require('node:child_process');
const { nextDiagramPaths } = require('../scripts/next-diagram-path');

const NEXT_DIAGRAM_SCRIPT = path.join(__dirname, '..', 'scripts', 'next-diagram-path.js');

test('nextDiagramPaths returns N consecutive entries in an empty directory', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const results = nextDiagramPaths(dir, 3);
  assert.equal(results.length, 3);
  assert.deepEqual(results.map(r => r.index), [1, 2, 3]);
  assert.equal(path.basename(results[0].htmlPath), 'diagram-1.html');
  assert.equal(path.basename(results[2].pngPath), 'diagram-3.png');
});

test('nextDiagramPaths skips occupied indices', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  fs.writeFileSync(path.join(dir, 'diagram-1.html'), '');
  fs.writeFileSync(path.join(dir, 'diagram-3.png'), '');
  const results = nextDiagramPaths(dir, 3);
  assert.deepEqual(results.map(r => r.index), [2, 4, 5]);
});

test('nextDiagramPaths throws on a non-positive or non-integer count', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  assert.throws(() => nextDiagramPaths(dir, 0));
  assert.throws(() => nextDiagramPaths(dir, -1));
  assert.throws(() => nextDiagramPaths(dir, 'abc'));
});

test('nextDiagramPath delegates to nextDiagramPaths (single object, backward compatible)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const result = nextDiagramPath(dir);
  assert.equal(typeof result, 'object');
  assert.equal(Array.isArray(result), false);
  assert.equal(path.basename(result.htmlPath), 'diagram-1.html');
});

test('CLI --count N --json prints a JSON array', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--count', '2', '--json'], { encoding: 'utf8' });
  assert.equal(out.status, 0);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), true);
  assert.equal(parsed.length, 2);
  assert.equal(path.basename(parsed[0].htmlPath), 'diagram-1.html');
  assert.equal(path.basename(parsed[1].htmlPath), 'diagram-2.html');
});

test('CLI without --count still prints a single object (backward compatible)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--json'], { encoding: 'utf8' });
  assert.equal(out.status, 0);
  const parsed = JSON.parse(out.stdout);
  assert.equal(Array.isArray(parsed), false);
  assert.equal(path.basename(parsed.htmlPath), 'diagram-1.html');
});

test('CLI --count with a bad value exits non-zero', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silotek-diagram-'));
  const out = spawnSync('node', [NEXT_DIAGRAM_SCRIPT, dir, '--count', 'abc', '--json'], { encoding: 'utf8' });
  assert.notEqual(out.status, 0);
});
```

Note: line 6 already has `const { nextDiagramPath } = require('../scripts/next-diagram-path');` — leave it; the appended block adds a second `require` of the same module for `nextDiagramPaths`. Two requires of one module is harmless. (If you prefer, merge them into `const { nextDiagramPath, nextDiagramPaths } = require('../scripts/next-diagram-path');` on line 6 and drop the appended `const { nextDiagramPaths } = ...` line — functionally identical.) Net additions: one `spawnSync` require, one `nextDiagramPaths` require (or merged into line 6), one `NEXT_DIAGRAM_SCRIPT` const, and the seven `test(...)` blocks above.

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test tests/next-diagram-path.test.js`
Expected: FAIL — `nextDiagramPaths is not a function` (또는 `--count` 미구현으로 CLI 테스트 실패).

- [ ] **Step 3: `next-diagram-path.js` 구현**

`plugins/silotek-tools/scripts/next-diagram-path.js` 전체를 아래로 교체한다:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 디스크 상태 기준으로 비어 있는 다이어그램 인덱스를 count개 골라 반환한다.
// 점유된 인덱스(.html 또는 .png가 이미 있는 인덱스)는 건너뛴다. 파일은 만들지 않는다.
function nextDiagramPaths(dir, count, options = {}) {
  const n = Number(count);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`count must be a positive integer, got: ${count}`);
  }
  const prefix = options.prefix || 'diagram';
  const targetDir = path.resolve(dir || '.silotek-diagrams');
  fs.mkdirSync(targetDir, { recursive: true });

  const results = [];
  let index = 1;
  while (results.length < n) {
    const occupied =
      fs.existsSync(path.join(targetDir, `${prefix}-${index}.html`)) ||
      fs.existsSync(path.join(targetDir, `${prefix}-${index}.png`));
    if (!occupied) {
      results.push({
        dir: targetDir,
        index,
        htmlPath: path.join(targetDir, `${prefix}-${index}.html`),
        pngPath: path.join(targetDir, `${prefix}-${index}.png`)
      });
    }
    index += 1;
  }
  return results;
}

// 하위호환: 인자 한 개짜리 호출은 그대로 단일 객체를 반환한다.
function nextDiagramPath(dir, options = {}) {
  return nextDiagramPaths(dir, 1, options)[0];
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  let count = null;
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') continue;
    if (arg === '--count') { count = args[i + 1]; i += 1; continue; }
    positional.push(arg);
  }
  const dir = positional[0] || '.silotek-diagrams';

  if (count !== null) {
    const results = nextDiagramPaths(dir, count); // 잘못된 count면 throw → 아래 catch에서 exit 1
    if (jsonMode) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      for (const r of results) {
        console.log(`html: ${r.htmlPath}`);
        console.log(`png: ${r.pngPath}`);
      }
    }
    return;
  }

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

module.exports = { nextDiagramPath, nextDiagramPaths };
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --test tests/next-diagram-path.test.js`
Expected: PASS — 새 7개 + 기존 2개 모두 통과.

- [ ] **Step 5: 구문 점검 + 커밋**

Run: `node --check scripts/next-diagram-path.js`
Expected: (출력 없음, exit 0)

```bash
git add plugins/silotek-tools/scripts/next-diagram-path.js plugins/silotek-tools/tests/next-diagram-path.test.js
git commit -m "feat(silotek-tools): add --count batch allocation to next-diagram-path"
```

---

## Task 2: `agents/silotek-diagrammer.md` — 단일 다이어그램 서브에이전트

그림 1장 = 1 dispatch. 메인 세션이 병렬로 여러 인스턴스를 동시에 띄운다. 각 인스턴스는 받은 `visual_brief` 하나만 보고, `silotek-diagram-design` 규칙대로 HTML을 쓰고, `rasterize-svg.js`로 PNG를 만든 뒤 경로를 보고한다.

**Files:**
- Create: `plugins/silotek-tools/agents/silotek-diagrammer.md`
- Test: `plugins/silotek-tools/tests/structure.test.js` (기존 `'legacy agents directory ...'` 테스트를 교체)

- [ ] **Step 1: 실패하는 테스트 (기존 테스트 교체)**

`plugins/silotek-tools/tests/structure.test.js`에서 아래 블록을 찾는다:

```javascript
test('legacy agents directory is not part of silotek-tools runtime surface', () => {
  const agentsDir = path.join(PLUGIN_ROOT, 'agents');
  assert.equal(fs.existsSync(agentsDir), false);
});
```

이 블록 전체를 아래로 교체한다:

```javascript
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test tests/structure.test.js`
Expected: FAIL — `agents` 디렉터리가 없어 `fs.existsSync(agentsDir)` 가 false.

- [ ] **Step 3: 에이전트 파일 생성**

`plugins/silotek-tools/agents/silotek-diagrammer.md` 를 아래 내용으로 만든다 (`agents/` 디렉터리도 함께 생성):

```markdown
---
name: silotek-diagrammer
description: Generate exactly one Silotek editorial diagram from a single visual_brief. The main session passes one brief, a recommended diagram type, the allocated diagram-N HTML/PNG paths, and the plugin root absolute path. Follow the silotek-diagram-design rules, rasterize the result to PNG via scripts/rasterize-svg.js, and report the paths back. Stay strictly inside the brief's evidence and forbidden lists.
tools: Read, Write, Bash, Glob, Grep
---

# Silotek 다이어그램 생성 (단일)

당신의 역할은 **그림 딱 한 장**을 만드는 것이다. 메인 세션이 병렬로 여러 인스턴스를 동시에 띄울 수 있다 — 당신은 받은 하나만 보고, 다른 그림은 신경 쓰지 않는다.

## 입력 (메인 세션이 프롬프트로 전달)

- `visual_brief` 블록: `purpose`, `claim`, `evidence`(목록), `forbidden`(목록), `palette`, `caption`.
- `recommendedType`: `flowchart` / `er` / `state` / `timeline` / `quadrant` / `architecture` / `sequence` / `swimlane` / `nested` / `tree` / `layers` / `venn` / `pyramid` 중 하나.
- `htmlPath`: 작성할 HTML 절대경로 (예: `<workspace>/.silotek-research-log-figures/diagram-N.html`).
- `pngPath`: 래스터 PNG 절대경로 (같은 디렉터리, 같은 인덱스).
- `pluginRoot`: silotek-tools 플러그인 루트 절대경로.

## 절차

1. `<pluginRoot>/skills/silotek-diagram-design/SKILL.md` 를 Read.
2. `<pluginRoot>/skills/silotek-diagram-design/references/type-<recommendedType>.md` 를 Read. 해당 파일이 없으면 SKILL.md의 type 목록을 보고 가장 가까운 reference를 골라 읽는다.
3. 필요하면 `<pluginRoot>/skills/silotek-diagram-design/assets/template.html` 또는 `assets/template-full.html` 를 Read 해 출발점으로 쓴다.
4. 디자인 규칙:
   - Silotek 팔레트 — navy 포커스 / teal 강조 1색 / gray 보조 / paper / ink. 강조색 최대 2개.
   - Pretendard로 시작하는 폰트 스택. 한국어 라벨 OK.
   - 4px 그리드, 단순한 선. 그림자·그라데이션·장식 블롭·이모지·불필요한 일러스트 금지.
   - 주요 박스 9개 이하 (사용자가 명시적으로 dense reference를 요구하지 않는 한).
   - 자기완결 HTML — 인라인 SVG 정확히 1개. 원격 폰트/스크립트/이미지/iframe/`foreignObject` 금지.
5. 콘텐츠 규칙:
   - `evidence`에 있는 사실만 표현한다. evidence에 없는 걸 그리지 않는다.
   - `forbidden` 항목은 단어로든 시각 표현으로든 절대 등장시키지 않는다.
   - `caption`은 brief의 caption 그대로 사용한다.
6. `htmlPath`에 HTML을 Write 한다.
7. `node <pluginRoot>/scripts/rasterize-svg.js <htmlPath> <pngPath>` 를 Bash로 실행한다. 실패하면 SVG 구조를 단순화해 다시 작성하고 재시도한다. 그래도 실패하면 그 사실을 보고에 포함한다.
8. 자체 QA (보고 직전):
   - evidence 항목이 어떤 형태로든 반영됐는가? (전부 시각화일 필요는 없음 — 일부는 텍스트 라벨로만 반영해도 OK)
   - `forbidden` 위반 0건인가? 하나라도 있으면 다시 작성.
   - 팔레트 외 색이 없는가?
   - 라스터 ~1152px 폭에서도 읽히는가?
9. 보고 (메인 세션에 반환):

```
- htmlPath: <절대경로>
- pngPath: <절대경로>
- altText: "<한 줄 설명>"
- usedEvidence: [...]
- forbiddenViolations: 0
- rasterizeOk: true | false
```

## 톤 가이드

- 캡션 형식: `[그림 N] ...`
- 화살표는 단순한 직선 또는 직각. 곡선 화살표 자제.
- 텍스트 라벨은 굵게 또는 일반. 이탤릭 금지 (한국어와 어울리지 않음).
- 중요 강조는 색상보다 굵기·박스 테두리로.
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --test tests/structure.test.js`
Expected: PASS — 교체한 에이전트 테스트 통과, 나머지 structure 테스트도 통과.

- [ ] **Step 5: 커밋**

```bash
git add plugins/silotek-tools/agents/silotek-diagrammer.md plugins/silotek-tools/tests/structure.test.js
git commit -m "feat(silotek-tools): add silotek-diagrammer subagent (one diagram per dispatch)"
```

---

## Task 3: `research-log-yaml-create` SKILL/command 재작성 — 선택 절차 복원 + 다중 다이어그램 흐름

소스 모드·연구 성격 선택 절차를 되살리고, 다중 다이어그램 흐름(브리프 작성 → 확인 게이트 → `--count` 일괄 할당 → 병렬 dispatch → image 페어링)을 본문에 명문화한다. **Task 1·2 완료 후 진행한다** (SKILL.md가 `--count`와 `silotek-diagrammer`를 참조함).

**Files:**
- Modify (전체 교체): `plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md`
- Modify (전체 교체): `plugins/silotek-tools/commands/research-log-yaml-create.md`
- Test: `plugins/silotek-tools/tests/structure.test.js` (테스트 추가)

- [ ] **Step 1: 실패하는 테스트 추가**

`plugins/silotek-tools/tests/structure.test.js` 끝에 추가한다:

```javascript
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
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test tests/structure.test.js`
Expected: FAIL — 현재 SKILL.md에 `silotek-diagrammer`, `--count`, `병렬` 등이 없음.

- [ ] **Step 3: SKILL.md 전체 교체**

`plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md` 전체를 아래로 교체한다:

````markdown
---
name: research-log-yaml-create
description: Create a Silotek research-log YAML record from conversation or workspace evidence, with source-mode and research-nature selection, and optional parallel diagram generation through the silotek-diagrammer subagent.
---

# Research Log YAML Create

Use this skill to create a Korean Silotek research-log YAML file. The output is a research artifact, not a folder exploration summary.

## Required Flow

1. Decide the source mode (see "Source Mode Selection").
2. Decide the research nature `meta.연구 성격` (see "Research Nature Selection").
3. Write `.silotek-research-log-draft.yaml` in the current workspace using the flat `sections` schema from `templates/research-log.yaml`, following the 8-section arc and the nature's emphasis.
4. While drafting, insert a `visual_brief` element wherever a figure makes the document clearer (see "Visuals"). Do not force figures — zero `visual_brief` elements is fine.
5. If there is at least one `visual_brief`, **confirm with the user**, then generate the diagrams in parallel and pair each as an `image` (see "Visuals").
6. Save with `scripts/save-draft.js` (see "Scripts").
7. Do not build DOCX. Tell the user to run `/silotek-tools:research-log-docx-create` for Word output.

## Source Mode Selection

- `conversation`: the current conversation and its decisions are the source.
- `folder`: inspect the current working folder — code, docs, config, tests, artifacts.
- `mixed`: use both.

If the source is obvious from context, confirm in one line — *"폴더 기반으로 작성합니다 (다르면 알려주세요)."* — and proceed. If it is ambiguous, present the three options and wait for the user's answer (use `AskUserQuestion` or print a short numbered menu — either is fine).

## Research Nature Selection

You MUST record `meta.연구 성격` as one of `구축` / `분석` / `검증`. Any other value triggers a `META_INVALID_VALUE` warning from `save-draft.js`.

| 성격 | 핵심 질문 | 본문 형태 |
|---|---|---|
| 구축 | "X를 어떻게 만들었나?" | 시간순 시도·시행착오 + 단계별 결과 |
| 분석 | "X의 현재 구조와 문제는?" | 대상 정의 + 현재 구조 + 원인 분석 + 권장 방향 |
| 검증 | "가설 X가 참인가?" | 가설 + 실험 설계 + 정량 데이터 + 결론 |

Signals — "구축/만든/구현/프로토타입" → 구축; "분석/현황/구조/체계 정비" → 분석; "검증/실험/비교/측정/가설" → 검증.

If the nature is obvious, confirm in one line and proceed. If ambiguous, present the menu and wait:

```
어떤 성격의 연구일지일까요?
1) 구축 — 구축/구현 과정
2) 분석 — 기존 체계 분석
3) 검증 — 검증 실험
```

### Nature-specific emphasis (within the 8-section arc)

- 구축: 시도/시행착오를 시간순으로 자세히, 각 단계 결과, 최종 동작 확인, 다음 빌드 단계.
- 분석: 분석 대상 명시, 현재 구조(스키마/호출 그래프/디렉터리 트리), 발견 문제의 원인, 코드/문서로 가설 확인, 권장 방향(Refactor/Replace/Keep).
- 검증: 연구 질문을 가설 한 줄로, 실험 설계 변경 이력, 정량 데이터, 결과 해석, 가설 결론(성립/부분 성립/기각).

## 8-Section Arc

본문은 다음 흐름을 따른다 (헤딩은 실제 작업에 맞게 조정하되 흐름은 드러나야 한다):

1. 연구 질문 — 한 줄
2. 문제 정의 / 배경
3. 시도와 시행착오 — 실패 사례 + 원인 분석 동반
4. 관찰 / 측정 — 수치·로그·스크린샷이 있으면 `image`로
5. 원인 분석 — 관찰에서 가설로
6. 검증 — 실험·비교·측정으로 가설 확인
7. 교훈 / 판단 기록
8. 향후 과제 / 남은 불확실성

## Anti-patterns to Reject Yourself

- 성격 미선택 상태로 본문 작성 시작.
- 파일 경로/디렉터리만 나열하는 본문.
- 검증 없는 단정 ("그래서 X가 맞다").
- 시행착오 없이 "이렇게 했더니 잘 됐다"형 단편 서술.
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동 경고함.

## Visuals

`visual_brief` is a planning element — the figure's spec, not the diagram itself.

### 1. Author briefs while drafting

Wherever a figure raises understanding, insert a complete `visual_brief` and decide a recommended diagram type from `silotek-diagram-design`: `flowchart`, `er`, `state`, `timeline`, `quadrant`, `architecture`, `sequence`, `swimlane`, `nested`, `tree`, `layers`, `venn`, `pyramid`. Keep the recommended type with the brief (you will pass it to the subagent in step 3).

```yaml
- visual_brief:
    purpose: "..."
    claim: "..."
    evidence: ["...", "..."]
    forbidden: ["..."]
    palette: "navy / teal / gray, 밝은 배경"
    caption: "[그림 N] ..."
```

### 2. Confirm before generating

After the draft is written, list the briefs and ask the user whether to generate them:

```
다음 N개 그림을 만들까요?
  1) [flowchart] [그림 N] caption — 핵심: ...
  2) [er] [그림 N] caption — 핵심: ...
  ...
[예 / 일부만(번호) / 아니오]
```

- 아니오 → leave the `visual_brief` elements without paired images and go straight to Save. `build.js` renders a gray spec box for each unpaired brief.
- 일부만 → generate only the selected briefs; leave the rest unpaired.

### 3. Allocate paths and dispatch in parallel

Allocate one HTML/PNG pair per selected brief in a single call (see "Scripts" for `$pluginRoot`):

```
node <plugin-root>/scripts/next-diagram-path.js .silotek-research-log-figures --count <N> --json
```

This prints a JSON array of `{ index, htmlPath, pngPath }`. Then dispatch the `silotek-diagrammer` subagent **once per brief — all in one message so they run in parallel**. Pass each subagent exactly one brief plus:

- the `visual_brief` block,
- the recommended diagram type,
- its allocated `htmlPath` and `pngPath`,
- the plugin root absolute path (so it can read `skills/silotek-diagram-design/`).

Each subagent writes its HTML, rasterizes it via `scripts/rasterize-svg.js`, and reports `{ htmlPath, pngPath, altText, usedEvidence, forbiddenViolations, rasterizeOk }`.

### 4. Pair each result as an `image`

For each successfully generated diagram, insert an `image` element immediately after its `visual_brief`:

```yaml
- image:
    path: ".silotek-research-log-figures/diagram-N.png"
    caption: "<the brief's caption>"
```

`save-draft.js` rewrites this to `../figures/<basename>/diagram-N.png` and copies the file. Leave any failed or skipped brief without an `image` — `build.js` renders its gray spec box. `save-draft.js` can also recover a missing PNG by rasterizing a sibling HTML sidecar unless `--no-rasterize` is used.

## Scripts

Resolve the plugin root, optionally allocate diagram paths, then save.

### Windows PowerShell

```powershell
$scriptName = "save-draft.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
# Only when generating diagrams:
node (Join-Path $pluginRoot "scripts\next-diagram-path.js") ".silotek-research-log-figures" --count <N> --json
# Always:
node (Join-Path $pluginRoot "scripts\$scriptName") .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

### macOS/Linux shell

```bash
script_name="save-draft.js"
plugin_root=""
for base in "${CLAUDE_PLUGIN_ROOT}" "$PWD" "$PWD/plugins/silotek-tools"; do
  if [ -n "$base" ] && [ -f "$base/scripts/$script_name" ]; then plugin_root="$base"; break; fi
done
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools: scripts/$script_name not found via CLAUDE_PLUGIN_ROOT or current directory." >&2
  exit 1
fi
# Only when generating diagrams:
node "$plugin_root/scripts/next-diagram-path.js" ".silotek-research-log-figures" --count "<N>" --json
# Always:
node "$plugin_root/scripts/$script_name" .silotek-research-log-draft.yaml --mode "<conversation|folder|mixed>" --source-root "$PWD"
```

Report the source mode, research nature, saved YAML path, manifest path, copied/rasterized figure counts, the list of generated diagrams (type + corresponding section + key message), any failed or skipped brief, and the validator diagnostics.
````

- [ ] **Step 4: command.md 전체 교체**

`plugins/silotek-tools/commands/research-log-yaml-create.md` 전체를 아래로 교체한다:

````markdown
---
description: Create and save a Silotek research-log YAML draft (with source-mode/nature selection and optional parallel diagram generation).
---

# Research Log YAML Create

Create a Korean Silotek research-log YAML record, then save it through `scripts/save-draft.js`. Use the `research-log-yaml-create` skill for the full rules.

Workflow:

1. Decide the source mode. If obvious from context, confirm in one line; if ambiguous, present `conversation` / `folder` / `mixed` and wait for the user.
2. Decide the research nature `meta.연구 성격`: `구축`, `분석`, or `검증`. If obvious, confirm; if ambiguous, present the menu and wait.
3. Write `.silotek-research-log-draft.yaml` using the flat `sections` schema from `templates/research-log.yaml`, following the 8-section arc and the nature's emphasis.
4. While drafting, insert a `visual_brief` wherever a figure makes the document clearer (with a recommended diagram type). Do not force figures.
5. If there is ≥1 `visual_brief`: list them and **confirm** ("다음 N개 그림을 만들까요? [예 / 일부만 / 아니오]"). On yes/partial, allocate paths with `next-diagram-path.js --count <N>`, dispatch one `silotek-diagrammer` subagent per brief **in parallel (one message)**, then pair each returned PNG as an `image` element right after its `visual_brief`. Leave skipped/failed briefs unpaired (DOCX shows a gray spec box).
6. Save with the bundled script. Do not create DOCX in this command.

## Windows PowerShell

```powershell
$scriptName = "save-draft.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
# Only when generating diagrams:
node (Join-Path $pluginRoot "scripts\next-diagram-path.js") ".silotek-research-log-figures" --count <N> --json
# Always:
node (Join-Path $pluginRoot "scripts\$scriptName") .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

## macOS/Linux shell

```bash
script_name="save-draft.js"
plugin_root=""
for base in "${CLAUDE_PLUGIN_ROOT}" "$PWD" "$PWD/plugins/silotek-tools"; do
  if [ -n "$base" ] && [ -f "$base/scripts/$script_name" ]; then plugin_root="$base"; break; fi
done
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools: scripts/$script_name not found via CLAUDE_PLUGIN_ROOT or current directory." >&2
  exit 1
fi
# Only when generating diagrams:
node "$plugin_root/scripts/next-diagram-path.js" ".silotek-research-log-figures" --count "<N>" --json
# Always:
node "$plugin_root/scripts/$script_name" .silotek-research-log-draft.yaml --mode "<conversation|folder|mixed>" --source-root "$PWD"
```

Report the source mode, research nature, saved YAML path, manifest path, copied figure count, rasterized figure count, the list of generated diagrams, and any failed or skipped brief.
````

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `node --test tests/structure.test.js`
Expected: PASS — 새 `research-log-yaml-create docs ...` 테스트 통과. 기존 `'command and skill docs include Windows and macOS shell guidance'`, `'... do not rely on a bare CLAUDE_PLUGIN_ROOT script path'`, `'active docs do not expose stale ...'` 도 계속 통과 (새 본문에 `diagram-1`, `/draft`, `research-critic`, `research-diagrammer`, `품질 경고` 등이 없는지 확인).

- [ ] **Step 6: 전체 테스트 실행 → 회귀 없음 확인**

Run: `npm.cmd test`
Expected: PASS — 전 테스트 통과.

- [ ] **Step 7: 커밋**

```bash
git add plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md plugins/silotek-tools/commands/research-log-yaml-create.md plugins/silotek-tools/tests/structure.test.js
git commit -m "feat(silotek-tools): restore source/nature selection and add parallel diagram flow to research-log-yaml-create"
```

---

## Task 4: `CLAUDE.md` + 플러그인 `README.md` 갱신

새 에이전트, `--count`, 확인 게이트·병렬 생성 흐름을 문서에 반영한다.

**Files:**
- Modify: `CLAUDE.md` (리포 루트 — 플러그인 디렉터리 기준 `../../CLAUDE.md`)
- Modify: `plugins/silotek-tools/README.md`
- Test: `plugins/silotek-tools/tests/structure.test.js` (테스트 추가)

- [ ] **Step 1: 실패하는 테스트 추가**

`plugins/silotek-tools/tests/structure.test.js` 끝에 추가한다:

```javascript
test('project docs mention the silotek-diagrammer agent and the --count flag', () => {
  const repoClaude = fs.readFileSync(path.join(REPO_ROOT, 'CLAUDE.md'), 'utf8');
  const pluginReadme = fs.readFileSync(path.join(PLUGIN_ROOT, 'README.md'), 'utf8');
  for (const text of [repoClaude, pluginReadme]) {
    assert.match(text, /silotek-diagrammer/);
  }
  assert.match(repoClaude, /--count/);
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test tests/structure.test.js`
Expected: FAIL — `CLAUDE.md` 와 `README.md` 에 `silotek-diagrammer` 가 없음.

- [ ] **Step 3: `CLAUDE.md` 편집**

리포 루트 `CLAUDE.md` 의 "Architecture > Claude-facing layer:" 목록 끝(`- skills/silotek-diagram-design/...` 줄 다음)에 한 줄 추가:

```markdown
- `agents/silotek-diagrammer.md`: per-diagram subagent; the research-log creation skill dispatches one instance per `visual_brief` in parallel.
```

같은 파일 "Node layer:" 목록의 `next-diagram-path.js` 줄을 아래로 교체:

```markdown
- `scripts/next-diagram-path.js`: allocates the next available diagram HTML/PNG path; `--count N` returns N consecutive free paths for batch (parallel) allocation.
```

같은 파일 "Data Flow" 섹션의 `Research-log diagrams default to:` 코드블록 바로 다음 문단(`visual_brief` remains a planning element ...) 뒤에 한 문단 추가:

```markdown
`research-log-yaml-create` writes `visual_brief` placeholders while drafting, confirms with the user before generating, allocates paths with `next-diagram-path.js --count`, dispatches one `silotek-diagrammer` subagent per brief in parallel, and pairs each returned PNG as an immediate `image`. Skipped or failed briefs stay unpaired and render as the gray fallback box.
```

같은 파일 "Versioning" 섹션 끝의 `Current breaking rename: v0.3.0, ...` 줄을 아래로 교체:

```markdown
Current breaking rename: v0.3.0, from `silotek-research-log` package to `silotek-tools`. v0.4.0 adds source/nature selection and parallel diagram generation (non-breaking).
```

- [ ] **Step 4: 플러그인 `README.md` 편집**

`plugins/silotek-tools/README.md` 의 "## Research Log Flow" 섹션 번호 목록 전체를 아래로 교체:

```markdown
1. `/silotek-tools:research-log-yaml-create` decides the source mode (`conversation`/`folder`/`mixed`) and research nature (`구축`/`분석`/`검증`), confirming with the user when ambiguous.
2. It writes `.silotek-research-log-draft.yaml` with `visual_brief` placeholders wherever a figure helps.
3. It lists the briefs, confirms with the user, allocates paths via `scripts/next-diagram-path.js --count`, and dispatches one `silotek-diagrammer` subagent per brief in parallel — each runs `silotek-diagram-design`, writes `.silotek-research-log-figures/diagram-N.html`, and rasterizes `diagram-N.png`.
4. It pairs each returned PNG as an immediate `image` element. Skipped or failed briefs stay unpaired.
5. `scripts/save-draft.js` saves the YAML, copies figures into `figures/<basename>/`, and auto-rasterizes a sibling HTML when a referenced PNG is missing unless `--no-rasterize` is used.
6. `/silotek-tools:research-log-docx-create` builds DOCX from the saved YAML.

If a paired image exists, DOCX renders the image and suppresses the gray `visual_brief` fallback box. If the image is missing, the fallback box remains visible.
```

같은 파일 "## Diagram Skill" 섹션 첫 문단 뒤에 한 줄 추가:

```markdown
For research logs, the `silotek-diagrammer` subagent (`agents/silotek-diagrammer.md`) wraps this skill so the main session can generate several diagrams in parallel — one dispatch per `visual_brief`.
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `node --test tests/structure.test.js`
Expected: PASS — 새 테스트 통과, `'active docs do not expose stale ...'` 도 계속 통과 (새 문장에 `diagram-1` 리터럴이나 다른 금지 패턴이 없는지 확인 — `diagram-N` 만 사용).

- [ ] **Step 6: 커밋**

```bash
git add CLAUDE.md plugins/silotek-tools/README.md plugins/silotek-tools/tests/structure.test.js
git commit -m "docs(silotek-tools): document silotek-diagrammer agent and parallel diagram flow"
```

---

## Task 5: 버전 0.3.1 → 0.4.0 동기화

4개 파일의 버전을 올린다. (비파괴 기능 추가 = SemVer MINOR.)

**Files:**
- Modify: `.claude-plugin/marketplace.json` (플러그인 디렉터리 기준 `../../.claude-plugin/marketplace.json`)
- Modify: `plugins/silotek-tools/.claude-plugin/plugin.json`
- Modify: `plugins/silotek-tools/package.json`
- Modify: `plugins/silotek-tools/package-lock.json`
- Test: `plugins/silotek-tools/tests/structure.test.js` (테스트 추가)

- [ ] **Step 1: 실패하는 테스트 추가**

`plugins/silotek-tools/tests/structure.test.js` 끝에 추가한다:

```javascript
test('plugin version fields are all 0.4.0', () => {
  const marketplace = readJson(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'));
  const plugin = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));
  const pkg = readJson(path.join(PLUGIN_ROOT, 'package.json'));
  const lock = readJson(path.join(PLUGIN_ROOT, 'package-lock.json'));
  assert.equal(marketplace.plugins[0].version, '0.4.0');
  assert.equal(plugin.version, '0.4.0');
  assert.equal(pkg.version, '0.4.0');
  assert.equal(lock.version, '0.4.0');
  assert.equal(lock.packages[''].version, '0.4.0');
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test tests/structure.test.js`
Expected: FAIL — 현재 모두 `0.3.1`.

- [ ] **Step 3: 버전 필드 4곳(실제로는 5개 값) 갱신**

- `../../.claude-plugin/marketplace.json` — `plugins[0].version` 의 `"0.3.1"` → `"0.4.0"`.
- `plugins/silotek-tools/.claude-plugin/plugin.json` — `"version": "0.3.1"` → `"version": "0.4.0"`.
- `plugins/silotek-tools/package.json` — `"version": "0.3.1"` → `"version": "0.4.0"`.
- `plugins/silotek-tools/package-lock.json` — 최상위 `"version": "0.3.1"` → `"version": "0.4.0"` **그리고** `packages[""].version` 의 `"0.3.1"` → `"0.4.0"` (두 곳 모두).

다른 줄은 건드리지 않는다. (`node_modules/.package-lock.json` 은 캐시 파일이므로 손대지 않는다.)

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --test tests/structure.test.js`
Expected: PASS — 새 버전 테스트 + 기존 `'marketplace and package expose the single silotek-tools plugin'` 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add .claude-plugin/marketplace.json plugins/silotek-tools/.claude-plugin/plugin.json plugins/silotek-tools/package.json plugins/silotek-tools/package-lock.json plugins/silotek-tools/tests/structure.test.js
git commit -m "chore(silotek-tools): bump to 0.4.0"
```

---

## Task 6: 최종 전체 검증

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전 스크립트 구문 점검**

Run (플러그인 디렉터리에서):
```powershell
node --check scripts/common.js
node --check scripts/save-draft.js
node --check scripts/build-docx.js
node --check scripts/rasterize-svg.js
node --check scripts/setup-check.js
node --check scripts/resolve-yaml.js
node --check scripts/next-diagram-path.js
node --check build.js
```
Expected: 각 명령 출력 없음, exit 0.

- [ ] **Step 2: 전체 테스트**

Run: `npm.cmd test`
Expected: PASS — `tests/*.test.js` 전부 통과 (변경된 `next-diagram-path.test.js`, `structure.test.js` 포함).

- [ ] **Step 3: 플러그인 검증 (가능하면)**

Run (리포 루트에서, `claude` CLI가 있으면): `claude plugin validate .`
Expected: 검증 통과. `claude` CLI가 없으면 이 단계는 건너뛰고 보고에 명시한다.

- [ ] **Step 4: 작업 트리 확인 + 요약 커밋(필요 시)**

Run: `git status`
Expected: 깨끗함 (모든 변경이 Task 1~5에서 커밋됨). 잔여 변경이 있으면 원인을 보고하고 적절히 커밋한다. 잔여가 없으면 추가 커밋은 만들지 않는다.

---

## Self-Review

**1. Spec coverage** (spec: `docs/superpowers/specs/2026-05-11-research-log-workflow-restore-design.md`):
- 목표 ① 소스 모드/연구 성격 선택 절차 복원 → Task 3 (SKILL.md "Source Mode Selection" / "Research Nature Selection" 섹션, command.md workflow 1·2, structure 테스트).
- 목표 ② 다중 다이어그램 병렬 생성 + image 자동 연결 → Task 1 (`--count`), Task 2 (`silotek-diagrammer` 에이전트), Task 3 (SKILL.md "Visuals" 1~4 + "Scripts", command.md workflow 5).
- 확인 게이트 → Task 3 (SKILL.md "Confirm before generating", command.md workflow 5, structure 테스트 `/confirm/i`).
- `next-diagram-path.js --count` 명세(연속·점유 스킵·잘못된 count exit 1·하위호환) → Task 1 (구현 + 7개 테스트).
- `silotek-diagrammer` 계약(입력·절차·보고·tools) → Task 2 (에이전트 본문 + 프론트매터 테스트).
- 파일 구조 표의 모든 항목 → Task 1(next-diagram-path + test), Task 2(agent + structure test), Task 3(SKILL + command + structure test), Task 4(CLAUDE.md + plugin README + structure test), Task 5(버전 4파일 + structure test).
- 버전 0.3.1→0.4.0 동기화 → Task 5.
- 테스트/검증(npm test, node --check 전 스크립트, claude plugin validate) → Task 6.
- 범위 밖(critique 복원, diagram-create 다중 모드, standalone→연구일지 import) → 어떤 Task도 건드리지 않음. ✓ 의도된 제외.
- 갭: 없음.

**2. Placeholder scan:** "TBD"/"implement later"/"add appropriate error handling"/"similar to Task N" 류 없음. 모든 코드 단계에 실제 코드/실제 명령/예상 출력 포함.

**3. Type consistency:** 모든 Task가 동일 이름을 사용 — `nextDiagramPaths(dir, count, options)` / `nextDiagramPath(dir, options)` (Task 1 구현·테스트·SKILL/command 본문), `silotek-diagrammer` 에이전트명(Task 2·3·4·structure 테스트), `--count` 플래그(Task 1·3·4), `.silotek-research-log-figures` 디렉터리·`diagram-N.{html,png}` 명명(Task 2·3·4), 보고 필드 `{ htmlPath, pngPath, altText, usedEvidence, forbiddenViolations, rasterizeOk }`(Task 2·3). 불일치 없음.
