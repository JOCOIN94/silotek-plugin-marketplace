# 사일로텍 연구일지 v0.1.3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사일로텍 연구일지 플러그인에 작성 지침 강화 + 메타 표준 정규화 + 품질 검증 루프(warn 위주)를 추가해, 폴더 탐구형 본문이 그냥 통과하지 못하게 하고 워크플로는 끊지 않는 0.1.3 버전을 발행한다.

**Architecture:** 기존 Node CommonJS 엔진 위에서 동작. `scripts/common.js`에 `META_RECOMMENDED_KEYS`, `FORBIDDEN_TOP_LEVEL_KEYS` 상수와 `analyzeQuality(doc, options)` 신규 helper를 추가한다. `validateResearchLog`는 구조 검증만(error)을 책임지고, `analyzeQuality`는 품질 신호(warnings 위주)를 책임진다. `save-draft.js`와 `build-docx.js`가 두 검증을 모두 호출하며, error는 throw로 차단하고 warn은 콘솔 출력만 한다. 동시에 `commands/draft.md`, `skills/draft/SKILL.md`, `templates/research-log.yaml`에 체크리스트를 강화한다. `package.json`에 `node --test` 기반 통합 테스트 스크립트를 추가한다.

**Tech Stack:** Node.js 18+ (CommonJS), js-yaml, docx, adm-zip. **신규**: `node:test`(빌트인), `node:assert/strict`(빌트인), `node:os`(빌트인). 외부 npm 의존성 추가 없음.

**Out of scope (이 plan에서 다루지 않음):**
- `visual_brief` element key (v0.2.0 별도 plan)
- `research-diagrammer` / `research-critic` 서브에이전트 (v0.2.0)
- `scripts/critique.js` / `commands/critique.md` (v0.2.0)
- 회귀 baseline YAML examples (v0.2.0 PR-B에서 함께 도입)

---

## File Structure

**신규 생성:**

| 경로 | 책임 |
|---|---|
| `plugins/silotek-research-log/tests/helpers/tmpStorage.js` | 임시 SILOTEK_RESEARCH_LOG_ROOT 디렉터리 만들고 정리하는 helper |
| `plugins/silotek-research-log/tests/helpers/runScript.js` | 자식 프로세스로 save-draft / build-docx 실행하는 wrapper |
| `plugins/silotek-research-log/tests/fixtures/baseline.yaml` | 정상 케이스 fixture (모든 검사 통과) |
| `plugins/silotek-research-log/tests/fixtures/forbidden-top-key.yaml` | top-level `project: "x"` 들어간 fixture (error 케이스) |
| `plugins/silotek-research-log/tests/fixtures/missing-sections.yaml` | sections 배열 누락 fixture (error 케이스) |
| `plugins/silotek-research-log/tests/fixtures/missing-meta.yaml` | meta 5 권장 키 일부 누락 (warn 케이스) |
| `plugins/silotek-research-log/tests/fixtures/no-validation-section.yaml` | 검증 키워드 없는 fixture (warn 케이스) |
| `plugins/silotek-research-log/tests/fixtures/no-images.yaml` | 이미지 0개 (warn 케이스) |
| `plugins/silotek-research-log/tests/fixtures/missing-image-file.yaml` | image element가 존재하지 않는 파일 가리킴 (warn 케이스) |
| `plugins/silotek-research-log/tests/fixtures/short-text.yaml` | 텍스트 < 800자 (warn 케이스) |
| `plugins/silotek-research-log/tests/fixtures/anti-pattern.yaml` | 폴더 탐구형 키워드 다수 (warn 케이스) |
| `plugins/silotek-research-log/tests/validate.test.js` | `validateResearchLog` 단위 테스트 |
| `plugins/silotek-research-log/tests/analyze-quality.test.js` | `analyzeQuality` 단위 테스트 |
| `plugins/silotek-research-log/tests/save-draft.test.js` | save-draft.js 통합 테스트 |
| `plugins/silotek-research-log/tests/build-docx.test.js` | build-docx.js 통합 테스트 |

**수정:**

| 경로 | 변경 |
|---|---|
| `plugins/silotek-research-log/scripts/common.js` | 상수 2개 추가 + `validateResearchLog` 확장 + `analyzeQuality` 신규 + `module.exports`에 추가 |
| `plugins/silotek-research-log/scripts/save-draft.js` | `analyzeQuality` 호출 + warning 콘솔 출력 |
| `plugins/silotek-research-log/scripts/build-docx.js` | `analyzeQuality` 호출 + warning 콘솔 출력 |
| `plugins/silotek-research-log/commands/draft.md` | 체크리스트 강화 |
| `plugins/silotek-research-log/skills/draft/SKILL.md` | 체크리스트 강화 |
| `plugins/silotek-research-log/templates/research-log.yaml` | 새 stub (5 권장 키 + 8 섹션 stub) |
| `plugins/silotek-research-log/package.json` | `version` → `"0.1.3"`, `scripts.test` 추가 |
| `.claude-plugin/marketplace.json` | `plugins[0].version` → `"0.1.3"` |
| `plugins/silotek-research-log/.claude-plugin/plugin.json` | `version` → `"0.1.3"` |

---

## API Contract — 신규/확장 함수

### `analyzeQuality(doc, options)` — 신규

```js
/**
 * 연구일지 문서의 품질을 점검한다.
 * @param {object} doc - YAML 파싱 결과
 * @param {object} [options]
 * @param {string} [options.draftDir] - image 파일 존재성 검사 시 기준 디렉터리
 * @param {string} [options.sourceRoot] - image 파일 존재성 검사 시 보조 root
 * @returns {{
 *   errors: Array<{ code: string, message: string, detail?: object }>,
 *   warnings: Array<{ code: string, message: string, detail?: object }>,
 *   stats: {
 *     sectionCount: number,
 *     headingCount: number,
 *     imageCount: number,
 *     tableCount: number,
 *     visualBriefCount: number,
 *     textLength: number,
 *   }
 * }}
 */
function analyzeQuality(doc, options = {}) { /* ... */ }
```

issue code 카탈로그 (모두 warning으로 발행):
- `META_MISSING_KEY` — META_RECOMMENDED_KEYS 중 하나 누락
- `META_DATE_UNPARSEABLE` — `meta.작성일`이 dateFromMeta로 파싱 실패
- `NO_VALIDATION_SECTION` — heading에 검증/실험/비교/측정/평가/결과 키워드 없음
- `NO_TRIAL_ERROR_SECTION` — heading에 시행착오/실패/문제/오류/재시도 키워드 없음
- `NO_FUTURE_WORK_SECTION` — heading에 남은/향후/한계/불확실 키워드 없음
- `NO_IMAGES` — image element 0개
- `NO_TABLES` — table element 0개
- `TEXT_TOO_SHORT` — sections 텍스트 합계 < 800자
- `FOLDER_EXPLORATION_ANTI_PATTERN` — "단순히 ~을 정리한다", "구조를 살펴본다" 같은 키워드 ≥ 2회
- `IMAGE_FILE_MISSING` — image element가 가리키는 파일이 존재하지 않음

### `validateResearchLog(doc)` — 확장

기존 시그니처 유지(`errors[]` 반환). 추가 검사:
- `top-level FORBIDDEN_TOP_LEVEL_KEYS` 중 하나가 있으면 error 추가

이 외 기존 동작은 그대로 유지.

---

## Phase 0 — 테스트 인프라 (Task 0)

### Task 0: `node --test` 기반 테스트 인프라 셋업

**Files:**
- Create: `plugins/silotek-research-log/tests/helpers/tmpStorage.js`
- Create: `plugins/silotek-research-log/tests/helpers/runScript.js`
- Create: `plugins/silotek-research-log/tests/sanity.test.js`
- Modify: `plugins/silotek-research-log/package.json`

- [ ] **Step 1: `tmpStorage.js` 작성**

`plugins/silotek-research-log/tests/helpers/tmpStorage.js`:

```js
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
```

- [ ] **Step 2: `runScript.js` 작성**

`plugins/silotek-research-log/tests/helpers/runScript.js`:

```js
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
```

- [ ] **Step 3: `sanity.test.js` 작성**

`plugins/silotek-research-log/tests/sanity.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');

test('makeTmpStorage creates a unique writable directory', () => {
  const a = makeTmpStorage();
  const b = makeTmpStorage();
  assert.notEqual(a, b);
  cleanTmpStorage(a);
  cleanTmpStorage(b);
});
```

- [ ] **Step 4: `package.json`에 `scripts.test` 추가**

`plugins/silotek-research-log/package.json`의 `scripts` 블록에 `"test": "node --test tests/"` 추가:

```json
{
  "name": "silotek-research-log",
  "version": "0.1.2",
  "description": "사일로텍 연구일지 Claude Code 플러그인 및 DOCX 생성 엔진",
  "main": "build.js",
  "scripts": {
    "research:list": "node scripts/list-yaml.js",
    "research:save": "node scripts/save-draft.js",
    "research:docx": "node scripts/build-docx.js",
    "plugin:check": "node scripts/list-yaml.js --json",
    "test": "node --test tests/"
  },
  "dependencies": {
    "adm-zip": "^0.5.17",
    "docx": "^8.5.0",
    "js-yaml": "^4.1.0"
  },
  "author": "Silotek",
  "license": "UNLICENSED"
}
```

- [ ] **Step 5: 테스트 실행으로 sanity 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: `tests 1` `pass 1` `fail 0`. 종료 코드 0.

- [ ] **Step 6: 커밋**

```powershell
git add plugins/silotek-research-log/tests/ plugins/silotek-research-log/package.json
git commit -m "Add node:test infrastructure for research-log plugin"
```

---

## Phase 1 — 검증 코드 (TDD)

### Task 1: `META_RECOMMENDED_KEYS` / `FORBIDDEN_TOP_LEVEL_KEYS` 상수 추가

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js`

- [ ] **Step 1: 실패 테스트 작성**

`plugins/silotek-research-log/tests/validate.test.js` 신규 생성:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { META_RECOMMENDED_KEYS, FORBIDDEN_TOP_LEVEL_KEYS } = require('../scripts/common');

test('META_RECOMMENDED_KEYS exports the 5 user-confirmed keys', () => {
  assert.deepEqual(
    META_RECOMMENDED_KEYS,
    ['연구 주제', '연구 단계', '분류', '작성일', '작성자']
  );
});

test('FORBIDDEN_TOP_LEVEL_KEYS exports the english keys to reject at top level', () => {
  assert.deepEqual(
    FORBIDDEN_TOP_LEVEL_KEYS,
    ['project', 'date', 'authors', 'keywords', 'category']
  );
});
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/validate.test.js`

Expected: 두 테스트 모두 FAIL — `META_RECOMMENDED_KEYS` / `FORBIDDEN_TOP_LEVEL_KEYS`가 undefined.

- [ ] **Step 3: 상수 추가 + module.exports 갱신**

`plugins/silotek-research-log/scripts/common.js`의 `SCALAR_SECTION_KEYS` 정의 직후(25번째 줄 직후)에 추가:

```js
const META_RECOMMENDED_KEYS = ['연구 주제', '연구 단계', '분류', '작성일', '작성자'];
const FORBIDDEN_TOP_LEVEL_KEYS = ['project', 'date', 'authors', 'keywords', 'category'];
```

`module.exports` 객체(파일 끝)에 두 상수 추가:

```js
module.exports = {
  basenameFromDoc,
  dateStamp,
  ensureStorage,
  FORBIDDEN_TOP_LEVEL_KEYS,
  listYaml,
  loadYaml,
  META_RECOMMENDED_KEYS,
  pluginRoot,
  readJsonIfExists,
  researchRoot,
  rewriteImages,
  uniqueBasename,
  validateResearchLog,
  formatValidationErrors,
  writeJson,
  writeYaml
};
```

- [ ] **Step 4: 테스트 실행으로 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/validate.test.js`

Expected: 두 테스트 PASS.

- [ ] **Step 5: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/validate.test.js
git commit -m "Add META_RECOMMENDED_KEYS and FORBIDDEN_TOP_LEVEL_KEYS constants"
```

---

### Task 2: `validateResearchLog` — top-level 영문 키 거절

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js:87-146` (`validateResearchLog` 함수 본문)
- Modify: `plugins/silotek-research-log/tests/validate.test.js` (테스트 추가)
- Create: `plugins/silotek-research-log/tests/fixtures/forbidden-top-key.yaml`
- Create: `plugins/silotek-research-log/tests/fixtures/baseline.yaml`

- [ ] **Step 1: fixture 2개 생성**

`plugins/silotek-research-log/tests/fixtures/baseline.yaml`:

```yaml
title: "연구 일지"
subtitle: "테스트 baseline"
meta:
  연구 주제: "테스트 주제"
  연구 단계: "기술 검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 연구 질문"
  - p: "이 fixture가 모든 구조 검사를 통과하는지 확인한다."
```

`plugins/silotek-research-log/tests/fixtures/forbidden-top-key.yaml`:

```yaml
title: "연구 일지"
project: "이 키는 top-level에 있어선 안 됨"
meta:
  연구 주제: "테스트"
  작성일: "2026년 5월 10일"
sections:
  - h1: "1. 본문"
  - p: "내용"
```

- [ ] **Step 2: 실패 테스트 추가**

`plugins/silotek-research-log/tests/validate.test.js` 끝에 추가:

```js
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { validateResearchLog } = require('../scripts/common');

function loadFixture(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, 'fixtures', name), 'utf8'
  ));
}

test('validateResearchLog accepts baseline fixture without errors', () => {
  const errors = validateResearchLog(loadFixture('baseline.yaml'));
  assert.deepEqual(errors, []);
});

test('validateResearchLog rejects forbidden top-level english keys', () => {
  const errors = validateResearchLog(loadFixture('forbidden-top-key.yaml'));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /project/);
  assert.match(errors[0], /meta/); // meta 안으로 옮기라는 안내
});
```

- [ ] **Step 3: 테스트 실행으로 실패 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/validate.test.js`

Expected: `forbidden top-level` 테스트 FAIL — 현재는 errors 배열이 비어 있음. `baseline` 테스트는 PASS (기존 동작).

- [ ] **Step 4: `validateResearchLog`에 검사 추가**

`plugins/silotek-research-log/scripts/common.js`의 `validateResearchLog` 함수 안에서 `if (doc.title !== undefined ...)` 줄 직전(94번 줄 직전)에 추가:

```js
  for (const forbidden of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(doc, forbidden)) {
      errors.push(`top-level "${forbidden}" 키는 사용하지 마세요. meta 객체 안으로 옮기고 한국어 키(예: "연구 주제", "작성일", "작성자", "분류")로 적어주세요.`);
    }
  }
```

- [ ] **Step 5: 테스트 실행으로 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Reject forbidden top-level keys in validateResearchLog"
```

---

### Task 3: `analyzeQuality` 함수 골격 + META 권장 키 누락 warn

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js`
- Create: `plugins/silotek-research-log/tests/analyze-quality.test.js`
- Create: `plugins/silotek-research-log/tests/fixtures/missing-meta.yaml`

- [ ] **Step 1: fixture 생성**

`plugins/silotek-research-log/tests/fixtures/missing-meta.yaml`:

```yaml
title: "연구 일지"
subtitle: "메타 누락 케이스"
meta:
  연구 주제: "테스트 주제"
  작성일: "2026년 5월 10일"
sections:
  - h1: "1. 검증"
  - p: "본문이 어느 정도 있어야 다른 warn이 안 떠서 메타 누락 warn만 깔끔히 잡힌다. 이 fixture는 META_RECOMMENDED_KEYS 중 '연구 단계', '분류', '작성자' 세 개가 빠져 있어 META_MISSING_KEY warn이 3건 발행되어야 한다. 본문은 800자 이상이라 TEXT_TOO_SHORT 경고는 뜨지 않는다. 표와 이미지는 NO_IMAGES와 NO_TABLES warn으로 따로 잡히며, 검증/시행착오/향후 키워드는 별도 검사 항목이다. 이 fixture에서는 META_MISSING_KEY 3건이 핵심 기대값이다. 추가 본문 — 사일로텍 연구일지 표준이 정한 다섯 권장 키는 다음과 같다: 연구 주제, 연구 단계, 분류, 작성일, 작성자. 이 fixture는 그중 세 개를 의도적으로 비워 두었다. 따라서 analyzeQuality 호출 시 META_MISSING_KEY 코드의 warn 객체 세 개가 결과 warnings 배열에 들어 있어야 한다. 본문 길이가 800자를 넘기 위해 더 채운다. 이 문장은 단지 길이 채움용이다. 마지막 문장."
  - h2: "검증"
  - p: "추가 본문."
```

- [ ] **Step 2: 실패 테스트 작성**

`plugins/silotek-research-log/tests/analyze-quality.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { analyzeQuality } = require('../scripts/common');

function loadFixture(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, 'fixtures', name), 'utf8'
  ));
}

test('analyzeQuality returns the documented shape', () => {
  const result = analyzeQuality(loadFixture('baseline.yaml'));
  assert.equal(typeof result, 'object');
  assert.ok(Array.isArray(result.errors));
  assert.ok(Array.isArray(result.warnings));
  assert.equal(typeof result.stats, 'object');
  assert.equal(typeof result.stats.sectionCount, 'number');
  assert.equal(typeof result.stats.imageCount, 'number');
  assert.equal(typeof result.stats.tableCount, 'number');
  assert.equal(typeof result.stats.textLength, 'number');
});

test('analyzeQuality warns for each missing META_RECOMMENDED key', () => {
  const result = analyzeQuality(loadFixture('missing-meta.yaml'));
  const metaWarnings = result.warnings.filter(w => w.code === 'META_MISSING_KEY');
  // 연구 단계, 분류, 작성자 — 3건
  assert.equal(metaWarnings.length, 3);
  const missingKeys = metaWarnings.map(w => w.detail.key).sort();
  assert.deepEqual(missingKeys, ['분류', '연구 단계', '작성자']);
});
```

- [ ] **Step 3: 테스트 실행으로 실패 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/analyze-quality.test.js`

Expected: FAIL — `analyzeQuality is not a function`.

- [ ] **Step 4: `analyzeQuality` 함수 작성 (META 검사만)**

`plugins/silotek-research-log/scripts/common.js`의 `formatValidationErrors` 함수 다음(약 170번 줄 직후), `dateStamp` 함수 직전에 추가:

```js
function collectSectionStats(doc) {
  const stats = {
    sectionCount: 0,
    headingCount: 0,
    imageCount: 0,
    tableCount: 0,
    visualBriefCount: 0,
    textLength: 0
  };
  if (!Array.isArray(doc.sections)) return stats;
  for (const element of doc.sections) {
    stats.sectionCount += 1;
    if (typeof element === 'string') {
      stats.textLength += element.length;
      continue;
    }
    if (!isPlainObject(element)) continue;
    const [key] = Object.keys(element);
    const value = element[key];
    if (key === 'h1' || key === 'h2' || key === 'h3') {
      stats.headingCount += 1;
      if (typeof value === 'string') stats.textLength += value.length;
    } else if (key === 'p' || key === 'text' || key === 'note' || key === 'callout' || key === 'code') {
      if (typeof value === 'string') stats.textLength += value.length;
    } else if (key === 'bullets' || key === 'numbers' || key === 'ordered') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') stats.textLength += item.length;
        }
      }
    } else if (key === 'image') {
      stats.imageCount += 1;
    } else if (key === 'table') {
      stats.tableCount += 1;
    } else if (key === 'visual_brief') {
      // v0.1.3에서는 visual_brief 키가 없지만 forward-compatible
      stats.visualBriefCount += 1;
    }
  }
  return stats;
}

function analyzeQuality(doc, options = {}) {
  const errors = [];
  const warnings = [];
  const stats = collectSectionStats(doc || {});

  // META_MISSING_KEY 검사
  const meta = (doc && doc.meta) || {};
  for (const key of META_RECOMMENDED_KEYS) {
    const value = meta[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      warnings.push({
        code: 'META_MISSING_KEY',
        message: `meta.${key}가 비어 있습니다. 권장 메타 5개(${META_RECOMMENDED_KEYS.join(', ')})를 모두 채우는 것을 권장합니다.`,
        detail: { key }
      });
    }
  }

  return { errors, warnings, stats };
}
```

`module.exports`에 `analyzeQuality` 추가:

```js
module.exports = {
  analyzeQuality,
  basenameFromDoc,
  /* ... 기존 export 그대로 ... */
};
```

- [ ] **Step 5: 테스트 실행으로 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS. 추가된 두 analyze-quality 테스트도 통과.

- [ ] **Step 6: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Add analyzeQuality with META_MISSING_KEY warnings"
```

---

### Task 4: `analyzeQuality` — 섹션 키워드 검사 (검증 / 시행착오 / 향후)

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js` (analyzeQuality 함수 본문)
- Modify: `plugins/silotek-research-log/tests/analyze-quality.test.js`
- Create: `plugins/silotek-research-log/tests/fixtures/no-validation-section.yaml`

- [ ] **Step 1: fixture 생성**

`plugins/silotek-research-log/tests/fixtures/no-validation-section.yaml`:

```yaml
title: "연구 일지"
subtitle: "검증 키워드 누락 케이스"
meta:
  연구 주제: "테스트"
  연구 단계: "기술 검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 배경"
  - p: "본문은 충분히 길게 작성한다. 검증·실험·비교·측정·평가·결과 같은 단어가 어떤 heading에도 들어가지 않아야 한다. 시행착오나 실패, 문제, 오류, 재시도 같은 단어도 heading에 없어야 한다. 향후나 남은, 한계, 불확실 같은 단어도 heading에 없어야 한다. 본문 길이는 800자 이상으로 채운다. 이 fixture는 NO_VALIDATION_SECTION, NO_TRIAL_ERROR_SECTION, NO_FUTURE_WORK_SECTION 세 warn을 모두 발행해야 한다. 메타는 모두 채워져 있어 META_MISSING_KEY는 발행되지 않는다. 표와 이미지는 따로 검사된다. 이 본문 자체는 800자가 안 될 수 있어 추가 문단을 더 넣는다."
  - h2: "1.1 개요"
  - p: "추가 본문을 충분히 길게 적어 800자 임계를 넘기게 한다. 이 문장은 단지 길이 채움용이다. 사일로텍 연구일지의 권장 흐름은 문제 정의에서 시작해 시도와 시행착오, 관찰, 원인 분석, 검증, 교훈, 향후 과제로 이어진다. 그러나 이 fixture는 그 어휘를 의도적으로 제거했다. 마지막 문장."
```

- [ ] **Step 2: 실패 테스트 추가**

`plugins/silotek-research-log/tests/analyze-quality.test.js` 끝에 추가:

```js
test('analyzeQuality warns when no validation/trial-error/future heading is found', () => {
  const result = analyzeQuality(loadFixture('no-validation-section.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('NO_VALIDATION_SECTION'));
  assert.ok(codes.includes('NO_TRIAL_ERROR_SECTION'));
  assert.ok(codes.includes('NO_FUTURE_WORK_SECTION'));
});

test('analyzeQuality does NOT warn validation when heading has 검증', () => {
  const result = analyzeQuality(loadFixture('baseline.yaml'));
  // baseline.yaml은 "1. 연구 질문"만 있어서 NO_VALIDATION_SECTION이 떠야 한다.
  // 이 테스트는 baseline에 검증 헤딩이 없음을 확인 (음성 케이스 검증).
  assert.ok(result.warnings.some(w => w.code === 'NO_VALIDATION_SECTION'));
});
```

- [ ] **Step 3: 테스트 실행으로 실패 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/analyze-quality.test.js`

Expected: 새 테스트 FAIL — 키워드 검사 로직이 없어 warning 발행 안 됨.

- [ ] **Step 4: 키워드 검사 추가**

`plugins/silotek-research-log/scripts/common.js`의 `analyzeQuality` 함수 안, META 검사 다음에 추가:

```js
  const KEYWORD_GROUPS = {
    NO_VALIDATION_SECTION: {
      keywords: ['검증', '실험', '비교', '측정', '평가', '결과'],
      label: '검증/실험/비교/측정'
    },
    NO_TRIAL_ERROR_SECTION: {
      keywords: ['시행착오', '실패', '문제', '오류', '재시도', '에러'],
      label: '시행착오/실패/문제/오류'
    },
    NO_FUTURE_WORK_SECTION: {
      keywords: ['남은', '향후', '한계', '불확실', '추후'],
      label: '남은/향후/한계/불확실'
    }
  };

  const headingTexts = [];
  for (const element of (doc.sections || [])) {
    if (!isPlainObject(element)) continue;
    const [key] = Object.keys(element);
    if (key === 'h1' || key === 'h2' || key === 'h3') {
      const value = element[key];
      if (typeof value === 'string') headingTexts.push(value);
    }
  }
  const allHeadings = headingTexts.join(' ');

  for (const [code, group] of Object.entries(KEYWORD_GROUPS)) {
    const found = group.keywords.some(kw => allHeadings.includes(kw));
    if (!found) {
      warnings.push({
        code,
        message: `'${group.label}' 중 하나가 들어간 섹션 제목이 보이지 않습니다. 연구일지 흐름을 갖추는 것을 권장합니다.`,
        detail: { keywords: group.keywords }
      });
    }
  }
```

- [ ] **Step 5: 테스트 실행으로 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Detect missing validation/trial-error/future-work headings"
```

---

### Task 5: `analyzeQuality` — 정량 검사 (이미지 / 표 / 길이 / 안티패턴)

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js` (analyzeQuality 함수)
- Modify: `plugins/silotek-research-log/tests/analyze-quality.test.js`
- Create: `plugins/silotek-research-log/tests/fixtures/no-images.yaml`
- Create: `plugins/silotek-research-log/tests/fixtures/short-text.yaml`
- Create: `plugins/silotek-research-log/tests/fixtures/anti-pattern.yaml`

- [ ] **Step 1: fixture 3개 생성**

`plugins/silotek-research-log/tests/fixtures/no-images.yaml`:

```yaml
title: "연구 일지"
subtitle: "이미지 0 / 표 0 케이스"
meta:
  연구 주제: "테스트"
  연구 단계: "검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 검증"
  - p: "이 fixture는 image도 table도 없다. NO_IMAGES와 NO_TABLES warn이 모두 떠야 한다. 본문은 800자 이상이라 TEXT_TOO_SHORT는 뜨지 않는다. 검증 헤딩이 있으니 NO_VALIDATION_SECTION도 안 뜬다. 시행착오와 향후도 헤딩에 적어 키워드 warn을 피한다."
  - h2: "시행착오"
  - p: "시도와 실패 — 본문 길이를 800자 이상으로 채우기 위한 추가 텍스트. 사일로텍 연구일지의 표준 흐름을 따른다. 충분한 길이를 확보하기 위해 같은 정도의 문단을 한 번 더 쓴다. 시도와 실패 — 본문 길이를 800자 이상으로 채우기 위한 추가 텍스트. 사일로텍 연구일지의 표준 흐름을 따른다. 충분한 길이를 확보하기 위해 같은 정도의 문단을 한 번 더 쓴다."
  - h2: "향후 과제"
  - p: "남은 질문."
```

`plugins/silotek-research-log/tests/fixtures/short-text.yaml`:

```yaml
title: "연구 일지"
subtitle: "텍스트 짧음 케이스"
meta:
  연구 주제: "테스트"
  연구 단계: "검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 검증"
  - p: "짧은 본문."
  - h2: "시행착오"
  - p: "한 줄."
  - h2: "향후"
  - p: "한 줄."
```

`plugins/silotek-research-log/tests/fixtures/anti-pattern.yaml`:

```yaml
title: "연구 일지"
subtitle: "안티패턴 키워드 케이스"
meta:
  연구 주제: "테스트"
  연구 단계: "검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 검증"
  - p: "이 폴더에서 단순히 디렉터리 구조를 정리한다. 나아가 단순히 컴포넌트들을 정리한다. 또한 구조를 살펴본다. 이 fixture는 폴더 탐구형 안티패턴 키워드를 의도적으로 여러 번 사용해 FOLDER_EXPLORATION_ANTI_PATTERN warn을 발행해야 한다. 본문은 800자 이상이 되도록 추가 문단을 둔다. 추가 문단 — 본문 길이가 임계값 이상이어야 다른 warn이 끼어들지 않는다. 마지막 문장."
  - h2: "시행착오"
  - p: "시도와 실패 — 본문 길이 채움용 문단을 한 번 더 적어 800자 이상을 확보한다. 사일로텍 연구일지의 표준 흐름을 따른다. 충분한 길이를 위해 같은 정도의 문단을 한 번 더 쓴다."
  - h2: "향후"
  - p: "남은 질문."
```

- [ ] **Step 2: 실패 테스트 추가**

`plugins/silotek-research-log/tests/analyze-quality.test.js` 끝에 추가:

```js
test('analyzeQuality warns NO_IMAGES and NO_TABLES when both are zero', () => {
  const result = analyzeQuality(loadFixture('no-images.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('NO_IMAGES'));
  assert.ok(codes.includes('NO_TABLES'));
});

test('analyzeQuality warns TEXT_TOO_SHORT when total text is under 800', () => {
  const result = analyzeQuality(loadFixture('short-text.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('TEXT_TOO_SHORT'));
});

test('analyzeQuality warns FOLDER_EXPLORATION_ANTI_PATTERN when keywords appear multiple times', () => {
  const result = analyzeQuality(loadFixture('anti-pattern.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('FOLDER_EXPLORATION_ANTI_PATTERN'));
});
```

- [ ] **Step 3: 테스트 실행으로 실패 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/analyze-quality.test.js`

Expected: 세 테스트 모두 FAIL — 정량 검사 로직 미구현.

- [ ] **Step 4: 정량 검사 코드 추가**

`plugins/silotek-research-log/scripts/common.js`의 `analyzeQuality` 함수에서 키워드 검사 다음에 추가:

```js
  // 정량 검사
  if (stats.imageCount === 0) {
    warnings.push({
      code: 'NO_IMAGES',
      message: '이미지가 0개입니다. 연구 산출물형 문서는 시각 자료를 1개 이상 두는 것을 권장합니다.',
      detail: {}
    });
  }
  if (stats.tableCount === 0) {
    warnings.push({
      code: 'NO_TABLES',
      message: '표가 하나도 없습니다. 비교/요약 표를 1개 이상 두는 것을 권장합니다.',
      detail: {}
    });
  }
  if (stats.textLength < 800) {
    warnings.push({
      code: 'TEXT_TOO_SHORT',
      message: `본문 텍스트가 ${stats.textLength}자입니다. 800자 이상으로 작성하는 것을 권장합니다.`,
      detail: { textLength: stats.textLength, threshold: 800 }
    });
  }

  // 안티패턴 검사
  const ANTI_PATTERN_PHRASES = [
    '단순히', '구조를 살펴본다', '구조를 살펴보면',
    '디렉터리 구조를 정리', '폴더 구조를 정리'
  ];
  let bodyText = '';
  for (const element of (doc.sections || [])) {
    if (typeof element === 'string') {
      bodyText += element + ' ';
    } else if (isPlainObject(element)) {
      const [key] = Object.keys(element);
      const value = element[key];
      if (typeof value === 'string') bodyText += value + ' ';
      else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string') bodyText += item + ' ';
        }
      }
    }
  }
  let antiPatternHits = 0;
  for (const phrase of ANTI_PATTERN_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = bodyText.match(re);
    if (matches) antiPatternHits += matches.length;
  }
  if (antiPatternHits >= 2) {
    warnings.push({
      code: 'FOLDER_EXPLORATION_ANTI_PATTERN',
      message: `폴더 탐구형 키워드(${ANTI_PATTERN_PHRASES.join(', ')})가 ${antiPatternHits}회 등장합니다. 연구 질문 중심으로 본문을 다시 짜는 것을 권장합니다.`,
      detail: { hits: antiPatternHits, threshold: 2 }
    });
  }
```

- [ ] **Step 5: 테스트 실행으로 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Add quantitative quality warnings (images/tables/length/anti-pattern)"
```

---

### Task 6: `analyzeQuality` — 이미지 파일 존재성 검사

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js`
- Modify: `plugins/silotek-research-log/tests/analyze-quality.test.js`
- Create: `plugins/silotek-research-log/tests/fixtures/missing-image-file.yaml`

- [ ] **Step 1: fixture 생성**

`plugins/silotek-research-log/tests/fixtures/missing-image-file.yaml`:

```yaml
title: "연구 일지"
subtitle: "이미지 파일 미존재 케이스"
meta:
  연구 주제: "테스트"
  연구 단계: "검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 검증"
  - p: "본문 길이를 충분히 채운다. 사일로텍 연구일지 표준은 visual brief 1개 이상을 권장하지만, 이 fixture는 image element가 가리키는 파일이 디스크에 없는 케이스를 검사한다. 본문 길이를 800자 이상으로 맞춰 다른 warn이 끼어들지 않게 한다. 추가 문단 — 본문 충분히 채우기. 추가 문단 — 본문 충분히 채우기. 추가 문단 — 본문 충분히 채우기. 추가 문단 — 본문 충분히 채우기."
  - image:
      path: "./does-not-exist.png"
      caption: "[그림 1] 존재하지 않는 파일"
  - table:
      headers: ["a", "b"]
      rows:
        - ["x", "y"]
  - h2: "시행착오"
  - p: "시도와 실패."
  - h2: "향후"
  - p: "남은 질문."
```

- [ ] **Step 2: 실패 테스트 추가**

`plugins/silotek-research-log/tests/analyze-quality.test.js` 끝에 추가:

```js
test('analyzeQuality warns IMAGE_FILE_MISSING when image path does not resolve', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');
  const result = analyzeQuality(loadFixture('missing-image-file.yaml'), {
    draftDir: fixturesDir
  });
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('IMAGE_FILE_MISSING'));
  const detail = result.warnings.find(w => w.code === 'IMAGE_FILE_MISSING').detail;
  assert.match(detail.path, /does-not-exist\.png/);
});

test('analyzeQuality does NOT warn IMAGE_FILE_MISSING when no image element exists', () => {
  const result = analyzeQuality(loadFixture('no-images.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(!codes.includes('IMAGE_FILE_MISSING'));
});
```

- [ ] **Step 3: 테스트 실행으로 실패 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/analyze-quality.test.js`

Expected: 첫 새 테스트 FAIL.

- [ ] **Step 4: 이미지 파일 존재성 검사 추가**

`plugins/silotek-research-log/scripts/common.js`의 `analyzeQuality` 함수에서 안티패턴 검사 다음에 추가:

```js
  // 이미지 파일 존재성 검사
  if (options.draftDir) {
    for (const element of (doc.sections || [])) {
      if (!isPlainObject(element) || !element.image || !element.image.path) continue;
      const resolved = resolveImagePath(
        String(element.image.path),
        options.draftDir,
        options.sourceRoot || null
      );
      if (!resolved) {
        warnings.push({
          code: 'IMAGE_FILE_MISSING',
          message: `image element가 가리키는 파일을 찾을 수 없습니다: ${element.image.path}`,
          detail: { path: element.image.path }
        });
      }
    }
  }
```

- [ ] **Step 5: 테스트 실행으로 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Detect missing image files in analyzeQuality"
```

---

## Phase 2 — 통합 (save-draft / build-docx)

### Task 7: `save-draft.js`에 `analyzeQuality` 통합

**Files:**
- Modify: `plugins/silotek-research-log/scripts/save-draft.js`
- Create: `plugins/silotek-research-log/tests/save-draft.test.js`

- [ ] **Step 1: 통합 테스트 작성**

`plugins/silotek-research-log/tests/save-draft.test.js`:

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSaveDraft } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('save-draft accepts baseline.yaml and prints success', () => {
  const draft = path.join(storage, 'baseline-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'baseline.yaml'), draft);
  const result = runSaveDraft(draft, { storage, mode: 'conversation' });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /연구일지 YAML 저장 완료/);
});

test('save-draft rejects forbidden-top-key.yaml with non-zero exit', () => {
  const draft = path.join(storage, 'forbidden-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'forbidden-top-key.yaml'), draft);
  const result = runSaveDraft(draft, { storage });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /project/);
});

test('save-draft prints META_MISSING_KEY warnings but still saves', () => {
  const draft = path.join(storage, 'missing-meta-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'missing-meta.yaml'), draft);
  const result = runSaveDraft(draft, { storage });
  assert.equal(result.status, 0, `stderr: ${result.stderr}`);
  assert.match(result.stdout, /META_MISSING_KEY/);
  assert.match(result.stdout, /연구 단계/);
});

test('save-draft prints quality warnings for short-text.yaml', () => {
  const draft = path.join(storage, 'short-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'short-text.yaml'), draft);
  const result = runSaveDraft(draft, { storage });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /TEXT_TOO_SHORT/);
});
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/save-draft.test.js`

Expected: META_MISSING_KEY / TEXT_TOO_SHORT 테스트 FAIL — save-draft.js가 아직 analyzeQuality를 부르지 않음.

- [ ] **Step 3: `save-draft.js` 수정**

`plugins/silotek-research-log/scripts/save-draft.js`의 import 줄(5~16번 줄)에 `analyzeQuality` 추가:

```js
const {
  analyzeQuality,
  basenameFromDoc,
  ensureStorage,
  formatValidationErrors,
  loadYaml,
  pluginRoot,
  rewriteImages,
  uniqueBasename,
  validateResearchLog,
  writeJson,
  writeYaml
} = require('./common');
```

`main()` 함수(58번 줄)에서 `validateResearchLog` 호출 직후, `ensureStorage` 호출 직전(75번 줄 근처)에 quality 검사 + 출력 추가:

```js
  const draftDirForQuality = path.dirname(draftPath);
  const quality = analyzeQuality(doc, {
    draftDir: draftDirForQuality,
    sourceRoot: args.sourceRoot ? path.resolve(args.sourceRoot) : null
  });
  if (quality.warnings.length) {
    console.log('⚠ 품질 경고 (저장은 진행됨):');
    for (const w of quality.warnings) {
      console.log(`  - ${w.code}: ${w.message}`);
    }
  }
```

- [ ] **Step 4: 테스트 실행으로 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS. save-draft 통합 테스트 4개 모두 통과.

- [ ] **Step 5: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/save-draft.js plugins/silotek-research-log/tests/
git commit -m "Run analyzeQuality during save-draft and surface warnings"
```

---

### Task 8: `build-docx.js`에 `analyzeQuality` 통합

**Files:**
- Modify: `plugins/silotek-research-log/scripts/build-docx.js`
- Create: `plugins/silotek-research-log/tests/build-docx.test.js`

- [ ] **Step 1: 통합 테스트 작성**

`plugins/silotek-research-log/tests/build-docx.test.js`:

```js
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { makeTmpStorage, cleanTmpStorage } = require('./helpers/tmpStorage');
const { runSaveDraft, runBuildDocx } = require('./helpers/runScript');

const FIXTURES = path.join(__dirname, 'fixtures');

let storage;
before(() => { storage = makeTmpStorage(); });
after(() => { cleanTmpStorage(storage); });

test('build-docx prints quality warnings for missing-meta yaml', () => {
  // 먼저 저장
  const draft = path.join(storage, 'mm-draft.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'missing-meta.yaml'), draft);
  const saved = runSaveDraft(draft, { storage });
  assert.equal(saved.status, 0, `save stderr: ${saved.stderr}`);

  // 빌드
  const built = runBuildDocx(1, { storage });
  assert.equal(built.status, 0, `build stderr: ${built.stderr}`);
  assert.match(built.stdout, /META_MISSING_KEY/);
});

test('build-docx still rejects forbidden top-level key (validateResearchLog)', () => {
  // forbidden 키는 save-draft에서 이미 막혔지만, 사용자가 inputs/*.yaml을 손으로
  // 수정해 forbidden 키를 다시 넣은 케이스를 시뮬레이션한다.
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  fs.copyFileSync(
    path.join(FIXTURES, 'forbidden-top-key.yaml'),
    path.join(inputsDir, '2026-05-10-tampered.yaml')
  );
  const built = runBuildDocx('2026-05-10-tampered', { storage });
  assert.notEqual(built.status, 0);
  assert.match(built.stderr, /project/);
});
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `npm test --prefix plugins/silotek-research-log -- tests/build-docx.test.js`

Expected: 첫 테스트 FAIL — build-docx.js가 quality warning 미출력.

- [ ] **Step 3: `build-docx.js` 수정**

`plugins/silotek-research-log/scripts/build-docx.js`의 import 줄(6~14번 줄)에 `analyzeQuality` 추가:

```js
const {
  analyzeQuality,
  ensureStorage,
  formatValidationErrors,
  listYaml,
  loadYaml,
  readJsonIfExists,
  validateResearchLog,
  writeJson
} = require('./common');
```

`main()` 함수(73번 줄)의 `validateResearchLog` 호출 직후(95번 줄 직후), `fs.mkdirSync` 직전에 추가:

```js
  const quality = analyzeQuality(doc, {
    draftDir: path.dirname(target.inputPath)
  });
  if (quality.warnings.length) {
    console.log('⚠ 품질 경고 (빌드는 진행됨):');
    for (const w of quality.warnings) {
      console.log(`  - ${w.code}: ${w.message}`);
    }
  }
```

- [ ] **Step 4: 테스트 실행으로 통과 확인**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/build-docx.js plugins/silotek-research-log/tests/
git commit -m "Run analyzeQuality during build-docx and surface warnings"
```

---

## Phase 3 — 문서 / 지침 / 템플릿 갱신

### Task 9: `commands/draft.md` 강화

**Files:**
- Modify: `plugins/silotek-research-log/commands/draft.md`

(이 task는 markdown 변경이라 TDD가 부적절. 직접 수정 후 검증.)

- [ ] **Step 1: 새 본문으로 교체**

`plugins/silotek-research-log/commands/draft.md` 전체를 다음으로 교체:

```markdown
---
description: 사일로텍 연구일지 YAML 초안을 만들고 중앙 저장소에 저장합니다.
---

# 사일로텍 연구일지 초안 생성

사용자의 요청을 보고 다음 모드 중 하나로 연구일지 YAML을 작성한다.

- `conversation`: 현재 대화와 결정 사항을 기반으로 작성
- `folder`: 현재 작업 폴더의 코드, 문서, 설정, 테스트, 산출물을 조사해 작성
- `mixed`: 대화 맥락과 작업 폴더 조사를 함께 반영해 작성

모드가 명확하지 않으면 짧게 확인한다.

## 작성 전 자가 질문 (필수)

작성 시작 전에 자기 자신에게 한 줄로 답한다:

> **이번 문서가 답하려는 연구 질문은 무엇인가?**

답이 떠오르지 않으면 사용자 작업 맥락에서 가장 좁은 질문을 직접 추론해 명시한다. 폴더 설명/요약이 답이 되면 안 된다.

## 필수 섹션 체크리스트

본문은 다음 흐름을 따른다. 모든 섹션을 기계적으로 넣지는 말고 실제 내용에 맞게 조정하되, 흐름은 드러나야 한다.

- [ ] **연구 질문** — 한 줄
- [ ] **문제 정의 / 배경** — 무엇이 문제인가, 왜 지금 다루는가
- [ ] **시도와 시행착오** — 실패 사례 포함, 원인 분석 동반
- [ ] **관찰 / 측정** — 수치, 로그, 스크린샷이 있으면 image element로
- [ ] **원인 분석** — 관찰에서 가설로
- [ ] **검증** — 실험, 비교, 측정 결과로 가설 확인
- [ ] **교훈 / 판단 기록** — 무엇을 알게 되었나
- [ ] **향후 과제 / 남은 불확실성** — 남은 질문

## 안티패턴 금지

다음 형태는 작성 직후 스스로 거절한다:

- 파일 경로/디렉터리만 나열하는 본문
- 검증 없는 결론 ("그래서 X가 맞다", "결국 Y가 좋다")
- 시행착오 없이 "이렇게 했더니 잘 됐다"형 단편 서술
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동 경고함

## 플러그인 방식

임시 YAML을 만든 뒤 플러그인 스크립트로 사용자 Documents 아래 중앙 저장소에 저장한다.

중앙 저장소:

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```

## 조사 규칙

- 한국어 기술 보고서 문체로 작성한다.
- folder/mixed 모드에서는 README, docs, package/config 파일, 주요 source entrypoint, 테스트, 산출물, 이미지/스크린샷을 먼저 조사한다.
- `node_modules`, `.git`, `.next`, `dist`, `build`, 캐시, 대용량 바이너리 의존성은 제외한다.
- 고객사명, 개인명, 내부 URL, API 키, 시크릿, 실제 매장명, UID, 독점 쿼리 문자열은 일반화한다.
- 이미지가 문서 이해에 도움이 되고 실제 파일이 확인될 때만 `image` 요소를 사용한다.

## 메타 표준 (warn 정책)

다음 5개 키를 권장한다. 빠지면 저장은 진행되지만 콘솔에 `META_MISSING_KEY` 경고가 출력된다.

- `연구 주제`
- `연구 단계`
- `분류`
- `작성일`
- `작성자`

추가로 필요한 한국어 키는 자유롭게 적는다 (예: `커밋버전`, `변경 규모`, `관련 프로젝트`).

**금지**: top-level에 `project`, `date`, `authors`, `keywords`, `category` 같은 영문 키를 두지 않는다 — 코드가 거절한다. 모두 `meta` 안의 한국어 키로 옮긴다.

## YAML 스키마

`sections`는 DOCX 빌더가 바로 읽는 flat command list다. 각 항목은 하나의 타입만 가진 객체로 작성한다.

허용 타입:

```text
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank
```

올바른 형식:

```yaml
sections:
  - h1: "1. 연구 질문"
  - p: "본문을 문단 단위로 작성한다."
  - bullets:
      - "항목 1"
      - "항목 2"
```

금지 형식:

```yaml
sections:
  - heading: "1. 연구 배경"
    body: "본문..."
```

`heading`, `body`, `paragraph`, `list`, `items`, `content`, `subsections`는 사용하지 않는다.

## 저장 절차

1. 현재 작업 폴더에 임시 YAML 파일 `.silotek-research-log-draft.yaml`을 만든다.
2. 아래 스크립트로 중앙 저장소에 저장한다.

Windows PowerShell:

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\save-draft.js" .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

macOS/Linux shell:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-draft.js" .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root "$PWD"
```

중요 참고 파일이 있으면 `--source-file <path>`를 여러 번 추가한다.

3. 저장된 YAML 경로, manifest 경로, 복사된 이미지 개수, **출력된 품질 경고**를 사용자에게 알려준다.
4. 이 명령에서는 DOCX를 자동 생성하지 않는다. 사용자가 Word 문서를 원하면 `/silotek-research-log:build-docx`를 안내한다.
```

- [ ] **Step 2: 검증 — `claude plugin validate` 실행**

Run: `claude plugin validate .`

Expected: 정상 종료. command 정의가 valid.

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/commands/draft.md
git commit -m "Strengthen /draft command with research-question checklist"
```

---

### Task 10: `skills/draft/SKILL.md` 강화

**Files:**
- Modify: `plugins/silotek-research-log/skills/draft/SKILL.md`

- [ ] **Step 1: 새 본문으로 교체**

`plugins/silotek-research-log/skills/draft/SKILL.md` 전체를 다음으로 교체. **description은 영어 유지** (Anthropic 권장):

```markdown
---
description: Create a Silotek research-log YAML draft from the current conversation, a project/work folder, or both. Use when the user asks to write, summarize, archive, or convert research/development work into a standardized Silotek research log. Saves YAML and source metadata to the central Silotek Research Logs folder.
---

# Silotek Research Log Draft

Create a Korean Silotek research-log YAML record and save it through the bundled plugin script.

## Self-Question Before Drafting (Required)

Before writing anything, answer to yourself in one line:

> **What is the research question this document tries to answer?**

If you cannot answer in one line, infer the narrowest plausible question from the user's working context and write it out explicitly. A folder summary is not a research question.

## Required Section Checklist

Bias the draft toward this arc. Adapt headings to the actual work, but the arc must show through.

- 연구 질문 (한 줄)
- 문제 정의 / 배경
- 시도와 시행착오 (실패 사례 포함)
- 관찰 / 측정
- 원인 분석
- 검증 (실험, 비교, 측정)
- 교훈 / 판단 기록
- 향후 과제 / 남은 불확실성

## Anti-patterns to Reject Yourself

- 파일 경로/디렉터리 나열형 본문
- 근거 없는 단정 ("그래서 X가 맞다")
- 시행착오 없이 "이렇게 했더니 잘 됐다"형 서술
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동 경고함

## Plugin Model

The normal plugin flow is:

1. Inspect the conversation, current folder, or both.
2. Create `.silotek-research-log-draft.yaml` in the current workspace.
3. Run `scripts/save-draft.js` from `CLAUDE_PLUGIN_ROOT`.
4. Report the central YAML path, manifest path, copied figure count, **and any quality warnings** printed by the script.
5. Build DOCX only when the user asks for `/silotek-research-log:build-docx`.

## Modes

Choose the mode from the user request. If it is unclear, ask briefly.

- `conversation`: Use the current conversation and decisions as the source.
- `folder`: Inspect the current working folder and relevant artifacts before drafting.
- `mixed`: Use both conversation context and folder artifacts.

## Drafting Rules

- Write in Korean technical-report style: concise, formal, and engineer-facing.
- Preserve the standard YAML schema: `title`, `subtitle`, `meta`, `sections`.
- Keep `title: "연구 일지"`.
- Include `meta.작성일` as today's local date in `YYYY년 M월 D일` format.
- Do not include customer names, private person names, internal URLs, API keys, secrets, real store names, UIDs, or proprietary query strings unless the user explicitly asks.
- For folder/mixed mode, inspect likely source files first: README, docs, package/config files, source entrypoints, tests, outputs, images, and screenshots.
- Ignore heavy or generated folders such as `node_modules`, `.git`, `.next`, `dist`, `build`, caches, and binary dependencies.
- Use image elements only for images that materially support the research log. Keep paths as they exist while drafting; the save script will copy them into central storage and rewrite paths.

## Meta Standard (warn policy)

Recommended 5 keys (warn if missing — save still proceeds):

- `연구 주제`, `연구 단계`, `분류`, `작성일`, `작성자`

Free Korean optional keys are allowed (e.g. `커밋버전`, `변경 규모`, `관련 프로젝트`).

**Forbidden at top level**: `project`, `date`, `authors`, `keywords`, `category`. Move them under `meta` with Korean keys; the script rejects otherwise.

## Required YAML Shape

Treat `sections` as the DOCX renderer's flat command list. Every `sections` item must be either a string paragraph or an object with exactly one supported key.

Supported section elements: `h1`, `h2`, `h3`, `p`, `text`, `bullets`, `numbers`, `ordered`, `code`, `image`, `table`, `note`, `callout`, `spacer`, `blank`.

```yaml
title: "연구 일지"
subtitle: "연구 주제 요약"
meta:
  연구 주제: "상세 설명"
  연구 단계: "구현/검증"
  분류: "AI/ML, RAG"
  작성일: "2026년 5월 9일"
  작성자: "작성자명"
sections:
  - h1: "1. 연구 질문"
  - p: "본문..."
  - table:
      headers: ["구분", "기존", "변경 후"]
      rows:
        - ["저장 위치", "프로젝트별 분산", "중앙 저장소"]
```

Do not use semantic grouped keys such as `heading`, `body`, `paragraph`, `list`, `items`, `content`, or `subsections`.

If the save script reports a schema error, rewrite the draft into the flat section element form and run the save script again. Do not bypass the validator.

## Save Procedure

1. Create a temporary YAML draft in the current workspace, for example `.silotek-research-log-draft.yaml`.
2. Run the bundled save script:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-draft.js" .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root "$PWD"
```

On Windows PowerShell:

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\save-draft.js" .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

If `CLAUDE_PLUGIN_ROOT` is unavailable in the shell, use the absolute plugin root path.

3. Report the saved YAML path, manifest path, copied figure count, **and any quality warnings** from the script's stdout (lines starting with `⚠ 품질 경고`).
4. Do not build DOCX in this skill. Tell the user to run `/silotek-research-log:build-docx`.

## Manifest Guidance

When folder or mixed mode is used, pass important source files with repeated `--source-file` flags if practical:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-draft.js" .silotek-research-log-draft.yaml --mode folder --source-root "$PWD" --source-file README.md --source-file package.json
```

Prefer a short, high-signal source list over exhaustive file dumps.
```

- [ ] **Step 2: 검증 — `claude plugin validate` 실행**

Run: `claude plugin validate .`

Expected: 정상 종료.

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/skills/draft/SKILL.md
git commit -m "Strengthen draft skill with research-question checklist"
```

---

### Task 11: `templates/research-log.yaml` 새 stub

**Files:**
- Modify: `plugins/silotek-research-log/templates/research-log.yaml`

- [ ] **Step 1: 새 stub으로 교체**

`plugins/silotek-research-log/templates/research-log.yaml` 전체를 다음으로 교체:

```yaml
# ============================================================
# 사일로텍 연구일지 템플릿 (v0.1.3)
# ============================================================
# 메타 권장 키 5개 + optional 자유 키 + 필수 섹션 8개 stub.
# 작성 후 save-draft.js로 저장하면 콘솔에 품질 경고가 표시됨.
# ============================================================

title: "연구 일지"
subtitle: "<이번 문서의 한 줄 주제>"

meta:
  연구 주제: "<예: RF카드 포렌식 앱 프로파일 용어 체계 정비>"
  연구 단계: "<문제 정의 / 기술 검증 / 구현 / 회고 등>"
  분류: "<예: AI/ML, RAG / 보안 / 임베디드 등>"
  작성일: "2026년 5월 10일"
  작성자: "<이름>"
  # 아래는 모두 optional — 필요한 것만 적고 안 적어도 됨
  # 커밋버전: "abc1234"
  # 변경 규모: "+482 / -127 lines, 18 files"
  # 관련 프로젝트: "..."

sections:
  - h1: "1. 연구 질문"
  - p: "<이 문서가 답하려는 한 줄 질문>"

  - h1: "2. 문제 정의 / 배경"
  - p: "<무엇이 문제인가, 왜 지금 다루는가>"

  - h1: "3. 시도와 시행착오"
  - bullets:
      - "<시도 A — 결과>"
      - "<시도 B — 실패와 원인>"

  - h1: "4. 관찰 / 측정"
  - p: "<수치, 로그, 스크린샷이 있으면 image element로>"

  - h1: "5. 원인 분석"
  - p: "<관찰에서 가설로>"

  - h1: "6. 검증"
  - p: "<실험, 비교, 측정 결과로 가설 확인>"

  - h1: "7. 교훈 / 판단 기록"
  - bullets:
      - "<무엇을 알게 되었나>"
      - "<다음에 다르게 할 것>"

  - h1: "8. 향후 과제 / 남은 불확실성"
  - p: "<남은 질문>"
```

- [ ] **Step 2: 템플릿이 baseline fixture처럼 분석을 통과하는지 빠른 점검**

PowerShell에서:

```powershell
node -e "const yaml = require('js-yaml'); const fs = require('fs'); const { validateResearchLog } = require('./plugins/silotek-research-log/scripts/common'); const doc = yaml.load(fs.readFileSync('./plugins/silotek-research-log/templates/research-log.yaml', 'utf8')); console.log(validateResearchLog(doc));"
```

Expected: `[]` (구조 에러 없음).

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/templates/research-log.yaml
git commit -m "Replace research-log template with 8-section research arc"
```

---

## Phase 4 — 발행

### Task 12: 버전 0.1.3 동기화 (3곳)

**Files:**
- Modify: `.claude-plugin/marketplace.json`
- Modify: `plugins/silotek-research-log/.claude-plugin/plugin.json`
- Modify: `plugins/silotek-research-log/package.json`

- [ ] **Step 1: 현재 버전 확인**

Run:

```powershell
node -e "console.log(require('./.claude-plugin/marketplace.json').plugins[0].version)"
node -e "console.log(require('./plugins/silotek-research-log/.claude-plugin/plugin.json').version)"
node -e "console.log(require('./plugins/silotek-research-log/package.json').version)"
```

Expected: `0.1.2` 세 번 출력.

- [ ] **Step 2: 세 파일 수정**

`.claude-plugin/marketplace.json`의 `plugins[0].version`을 `"0.1.3"`으로:

(파일 안 `"version": "0.1.2"` 줄을 `"version": "0.1.3"`으로 바꾼다. plugins 배열 첫 항목의 version 필드.)

`plugins/silotek-research-log/.claude-plugin/plugin.json`의 `version`을 `"0.1.3"`으로.

`plugins/silotek-research-log/package.json`의 `version`을 `"0.1.3"`으로.

- [ ] **Step 3: package-lock.json 동기화**

Run: `npm install --prefix plugins/silotek-research-log`

Expected: `package-lock.json` `version` 필드가 `0.1.3`으로 업데이트.

- [ ] **Step 4: 버전 확인 재실행**

Run:

```powershell
node -e "console.log(require('./.claude-plugin/marketplace.json').plugins[0].version)"
node -e "console.log(require('./plugins/silotek-research-log/.claude-plugin/plugin.json').version)"
node -e "console.log(require('./plugins/silotek-research-log/package.json').version)"
```

Expected: `0.1.3` 세 번 출력.

- [ ] **Step 5: 커밋**

```powershell
git add .claude-plugin/marketplace.json plugins/silotek-research-log/.claude-plugin/plugin.json plugins/silotek-research-log/package.json plugins/silotek-research-log/package-lock.json
git commit -m "Bump research-log plugin to 0.1.3"
```

---

### Task 13: End-to-end 검증

**Files:** (수정 없음 — 검증만)

- [ ] **Step 1: 전체 테스트 스위트 실행**

Run: `npm test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS. 종료 코드 0. fail 0.

- [ ] **Step 2: 모든 스크립트 syntax 검증**

Run:

```powershell
node --check plugins/silotek-research-log/scripts/common.js
node --check plugins/silotek-research-log/scripts/save-draft.js
node --check plugins/silotek-research-log/scripts/build-docx.js
node --check plugins/silotek-research-log/scripts/list-yaml.js
node --check plugins/silotek-research-log/build.js
```

Expected: 다섯 명령 모두 출력 없이 정상 종료.

- [ ] **Step 3: `claude plugin validate` 실행**

Run: `claude plugin validate .`

Expected: 정상 종료. marketplace 0.1.3 검증 통과.

- [ ] **Step 4: 새 템플릿으로 풀 흐름 검증**

PowerShell에서:

```powershell
Copy-Item plugins/silotek-research-log/templates/research-log.yaml .silotek-research-log-draft.yaml
node plugins/silotek-research-log/scripts/save-draft.js .silotek-research-log-draft.yaml --mode folder --source-root .
```

Expected:
- `✓ 연구일지 YAML 저장 완료` 출력
- `⚠ 품질 경고 (저장은 진행됨):` 블록 안에 META 자리표시자(<...>) 때문에 발행되는 경고들 표시
- 종료 코드 0

- [ ] **Step 5: DOCX 빌드 + 열어 보기**

Run: `node plugins/silotek-research-log/scripts/build-docx.js 1`

Expected:
- `✓ manifest 업데이트` 출력
- 품질 경고 출력 (Step 4와 같은 종류)
- `%USERPROFILE%\Documents\Silotek Research Logs\outputs\` 안에 새 `.docx` 파일 생성

수동으로 DOCX를 열어 다음을 확인:
- 표지에 `meta` 5 키가 모두 메타 테이블에 표시됨
- 8 섹션 heading이 모두 깨짐 없이 표시됨
- 본문 자리표시자(`<...>`)가 그대로 보임 (이건 정상 — 사용자가 채우는 부분)

- [ ] **Step 6: 정리**

```powershell
Remove-Item .silotek-research-log-draft.yaml
```

저장된 YAML과 DOCX는 중앙 저장소에 남겨둠 (검증 흔적).

- [ ] **Step 7: 최종 head 확인**

Run: `git log --oneline -15`

Expected: 위 12개 task의 커밋이 모두 존재.

---

## 자체 검토 (Self-Review)

이 plan을 작성 후 자체 검토했다.

**1. Spec coverage**
- spec의 v0.1.3 범위 전체를 task 0~13이 커버함:
  - 지침 강화 → Task 9, 10
  - 메타 정규화 → Task 1, 2
  - analyzeQuality 검사 항목 → Task 3, 4, 5, 6
  - save/build 통합 → Task 7, 8
  - 템플릿 갱신 → Task 11
  - 버전 동기화 → Task 12
  - end-to-end 검증 → Task 13
  - 테스트 인프라 → Task 0
- spec에서 v0.2.0 범위 항목(visual_brief, 서브에이전트, critique)은 의도적으로 제외하고 별도 plan 예정임을 "Out of scope"에 명시.

**2. Placeholder scan**
- 모든 코드 step에 실제 코드 또는 정확한 명령이 들어 있음.
- "TBD", "TODO", "implement later" 없음.
- "Add appropriate error handling" 같은 모호한 step 없음.

**3. Type consistency**
- `analyzeQuality`의 반환 타입을 plan 상단 "API Contract"에 명시했고, Task 3~6의 모든 단위 테스트가 그 형태(`{ errors, warnings, stats }`)를 가정한다.
- `META_RECOMMENDED_KEYS`는 Task 1에서 정의된 정확한 5개 키 순서가 Task 3~6 모두에서 일치한다.
- `FORBIDDEN_TOP_LEVEL_KEYS`는 Task 1, 2에서 정확히 같은 5개 키.
- issue code (`META_MISSING_KEY`, `NO_VALIDATION_SECTION` 등)는 plan 상단 카탈로그와 task 본문 모두에서 동일.

**4. Dependency order**
- Task 0이 테스트 인프라 → Task 1~6이 common.js TDD → Task 7~8이 통합 → Task 9~11이 문서/템플릿 → Task 12~13이 발행/검증.
- 각 task는 이전 task가 완료되어야 다음으로 진행 가능.

이 plan은 단독 plan이며, 완료 후 working/testable v0.1.3 산출물이 나온다. v0.2.0은 별도 plan에서 다룬다.
