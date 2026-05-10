# 사일로텍 연구일지 v0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사일로텍 연구일지 플러그인 v0.2.0을 발행한다 — 연구일지 성격 선택(구축/분석/검증) + visual_brief element key + research-diagrammer/research-critic 서브에이전트 + critique.js CLI fallback + 회귀 baseline 2개. silotek-web에서 본 "사용자가 의도한 성격(구축)과 다른 성격(분석)으로 작성됨" 재현을 차단한다.

**Architecture:** v0.1.3의 `analyzeQuality` 시그니처와 warn 정책 그대로 위에 쌓는다. `META_RECOMMENDED_KEYS`에 `연구 성격`을 추가하고 도메인 검증(`구축`/`분석`/`검증`)을 `analyzeQuality`에 한 단계 추가. `visual_brief`를 `SECTION_ELEMENT_KEYS`에 추가하고 build.js가 미첨부 시 회색 박스로 렌더. 두 서브에이전트는 플러그인 폴더 안 `agents/` 디렉터리에 markdown으로 직접 포함하되, Claude Code의 자동 등록 미지원 시 사용자가 `~/.claude/agents/`로 복사하는 fallback 안내. critique.js는 채점 기준 표를 코드로 옮긴 CLI fallback이며 9 영역 + "성격 일관성" 1 영역 = 10 영역 / 100점.

**Tech Stack:** Node.js 18+ (CommonJS), js-yaml, docx, adm-zip. 기존 `node:test` 인프라 그대로 사용. **신규 npm 의존성 0**. Claude Code agents/ Markdown 형식.

**Out of scope (이 plan에서 다루지 않음):**
- 성격 자동 보정 루프 (critic이 성격 불일치 발견 시 메인이 자동 재작성)
- 성격 4번째 옵션 ("진행 메모", "회고" 등)
- 다이어그램의 SVG → PNG 자동 변환 (서브에이전트 자율)
- 한국어 라벨이 아닌 영문 코드 매핑

---

## File Structure

**신규 생성:**

| 경로 | 책임 |
|---|---|
| `plugins/silotek-research-log/agents/research-diagrammer.md` | visual_brief 1개당 1회 호출되어 그림 생성 |
| `plugins/silotek-research-log/agents/research-critic.md` | save-draft 직후 호출되어 100점 채점 |
| `plugins/silotek-research-log/scripts/critique.js` | CLI fallback 채점기 (서브에이전트 미설치 환경) |
| `plugins/silotek-research-log/commands/critique.md` | `/silotek-research-log:critique <id>` 슬래시 명령 |
| `plugins/silotek-research-log/examples/yaml/rf-card-baseline.yaml` | 회귀 fixture (낮은 점수 기대) |
| `plugins/silotek-research-log/examples/yaml/plugin-direction-baseline.yaml` | 회귀 fixture (낮은 점수 기대) |
| `plugins/silotek-research-log/tests/critique.test.js` | critique.js 단위/통합 테스트 |
| `plugins/silotek-research-log/tests/fixtures/visual-brief-complete.yaml` | brief 정상 케이스 |
| `plugins/silotek-research-log/tests/fixtures/visual-brief-incomplete.yaml` | brief 필드 누락 케이스 |
| `plugins/silotek-research-log/tests/fixtures/invalid-research-nature.yaml` | meta.연구 성격 도메인 외 값 |

**수정:**

| 경로 | 변경 |
|---|---|
| `plugins/silotek-research-log/scripts/common.js` | `META_RECOMMENDED_KEYS`에 `연구 성격` 추가, `RESEARCH_NATURES` 상수 신규, `SECTION_ELEMENT_KEYS`에 `visual_brief` 추가, `validateResearchLog`에 brief 필드 검증, `analyzeQuality`에 `META_INVALID_VALUE` + `BRIEF_INCOMPLETE` 추가, `module.exports`에 신규 항목 노출 |
| `plugins/silotek-research-log/build.js` | `renderElement`의 switch 문에 `visual_brief` 케이스 추가 (회색 박스) |
| `plugins/silotek-research-log/templates/research-log.yaml` | `meta.연구 성격: "<구축 / 분석 / 검증>"` 한 줄 추가 |
| `plugins/silotek-research-log/commands/draft.md` | "연구일지 성격 판정" 섹션 + 성격별 강조점 가이드 + 서브에이전트 호출 가드 추가 |
| `plugins/silotek-research-log/skills/draft/SKILL.md` | 동일 갱신 |
| `plugins/silotek-research-log/tests/analyze-quality.test.js` | 신규 warn 검사 추가 |
| `plugins/silotek-research-log/tests/validate.test.js` | visual_brief 검증 테스트 추가 |
| `plugins/silotek-research-log/tests/fixtures/baseline.yaml` | `meta.연구 성격: "구축"` 추가 (META_INVALID_VALUE 안 뜨게) |
| `plugins/silotek-research-log/tests/fixtures/missing-meta.yaml` | `연구 성격` 키 그대로 누락 (META_MISSING_KEY 6개 발행) |
| `plugins/silotek-research-log/tests/fixtures/no-validation-section.yaml`, `no-images.yaml`, `short-text.yaml`, `anti-pattern.yaml`, `missing-image-file.yaml` | `meta.연구 성격` 키 추가 (META_INVALID_VALUE 안 뜨게) |
| `.claude-plugin/marketplace.json` | `plugins[0].version` → `"0.2.0"` |
| `plugins/silotek-research-log/.claude-plugin/plugin.json` | `version` → `"0.2.0"` |
| `plugins/silotek-research-log/package.json` | `version` → `"0.2.0"` |
| `CLAUDE.md` | v0.2.0 흐름 (성격 / visual_brief / 두 서브에이전트 / critique) 안내 추가 |

---

## API Contract — 신규/확장 함수와 상수

### `RESEARCH_NATURES` — 신규 상수

```js
const RESEARCH_NATURES = ['구축', '분석', '검증'];
```

`meta.연구 성격` 값 도메인. 그 외 값이면 `META_INVALID_VALUE` warn 발행. `module.exports`로 노출 (테스트가 import).

### `META_RECOMMENDED_KEYS` — 확장

v0.1.3: `['연구 주제', '연구 단계', '분류', '작성일', '작성자']` (5개)
v0.2.0: `['연구 주제', '연구 성격', '연구 단계', '분류', '작성일', '작성자']` (6개) — `연구 성격`을 두 번째 자리에 삽입.

### `SECTION_ELEMENT_KEYS` — 확장

v0.1.3 키 + `visual_brief` 추가.

### `validateResearchLog` — 확장

`visual_brief` element가 들어오면 다음 필드가 모두 string인지 검증:
- `purpose`, `claim`, `palette`, `caption` — string 필수
- `evidence`, `forbidden` — 배열 필수, 각 요소 string

빠지거나 타입 다르면 error 추가 (구조 결함이라 error 정책).

### `analyzeQuality` — 신규 warn 코드 2개

- `META_INVALID_VALUE` — `meta.연구 성격`이 RESEARCH_NATURES에 없는 값일 때. detail: `{ key: '연구 성격', value, allowed: RESEARCH_NATURES }`
- `BRIEF_INCOMPLETE` — visual_brief 필드 누락이 *경미한* 경우 (현재 spec에선 모든 필드를 validateResearchLog가 잡으므로 실제론 발행 빈도 낮음 — 미래 호환성)
- `NO_VISUAL_BRIEF` — brief 0개 + image 0개 동시일 때 (강한 경고). 기존 `NO_IMAGES`와 별개로, 시각 자료 결핍을 종합 표시.

### `critiqueScore(doc)` — `scripts/critique.js`의 신규 export

```js
/**
 * @returns {{
 *   total: number,                    // 0~100
 *   breakdown: { [area]: { score: number, max: number, notes: string[] } },
 *   missing: string[],                // 부족 항목 한 줄 요약
 *   suggestions: string[]             // 수정 제안
 * }}
 */
function critiqueScore(doc) { /* ... */ }
```

10 영역 / 100점:

| 영역 | 배점 | 검사 |
|---|---|---|
| 메타 정규화 | 10 | META_RECOMMENDED_KEYS 6키 모두 존재 + 형식 정상 |
| 연구 질문 명시 | 10 | h1 첫 섹션에 "연구 질문" 류 + 한 줄 답 |
| 시행착오 밀도 | 10 | 키워드 + 실패/원인 페어 |
| 검증 섹션 | 15 | 검증/실험/측정 키워드 + 정량 근거 |
| 시각 자료 | 10 | image+visual_brief 합 ≥ 1 |
| 표 활용 | 10 | table 1개 이상 |
| 판단의 근거성 | 10 | 안티패턴 hits 0 + 본문 길이 |
| 향후 과제 | 5 | 키워드 |
| 안티패턴 회피 | 5 | FOLDER_EXPLORATION_ANTI_PATTERN warn 미발행 |
| **성격 일관성** | **15** | meta.연구 성격이 RESEARCH_NATURES에 있고, 본문 강조점이 일치 (heading 키워드 가중) |

총합 = 10+10+10+15+10+10+10+5+5+15 = **100**.

(spec의 "기존 9 영역에서 5점 차감" → 정확한 차감 자리: spec의 critic 채점 표가 9 영역 / 100점이었음. v0.2.0 구현 시 위 표대로 10 영역 / 100점으로 재배분. 시각 자료(15→10)와 시행착오 밀도(15→10)에서 5씩 줄여 성격 일관성 15점 만듦. 합 100 유지.)

---

## Phase 1 — 메타 표준 확장 (Task 1~3)

### Task 1: `RESEARCH_NATURES` 상수 + `META_RECOMMENDED_KEYS` 확장

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js`
- Modify: `plugins/silotek-research-log/tests/validate.test.js` (테스트 추가)
- Modify: `plugins/silotek-research-log/tests/fixtures/baseline.yaml` (성격 추가)

- [ ] **Step 1: 실패 테스트 추가**

`plugins/silotek-research-log/tests/validate.test.js` 끝에 추가:

```js
const { RESEARCH_NATURES } = require('../scripts/common');

test('RESEARCH_NATURES exports the 3 user-confirmed Korean labels', () => {
  assert.deepEqual(RESEARCH_NATURES, ['구축', '분석', '검증']);
});

test('META_RECOMMENDED_KEYS now includes 연구 성격 at index 1', () => {
  assert.equal(META_RECOMMENDED_KEYS.length, 6);
  assert.equal(META_RECOMMENDED_KEYS[1], '연구 성격');
  assert.deepEqual(
    META_RECOMMENDED_KEYS,
    ['연구 주제', '연구 성격', '연구 단계', '분류', '작성일', '작성자']
  );
});
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log -- tests/validate.test.js`

Expected: FAIL — `RESEARCH_NATURES` undefined, `META_RECOMMENDED_KEYS.length` is 5.

- [ ] **Step 3: `common.js` 갱신**

`plugins/silotek-research-log/scripts/common.js`의 line 27 (META_RECOMMENDED_KEYS 정의)와 line 28 (FORBIDDEN_TOP_LEVEL_KEYS 정의) 사이에 추가:

```js
const META_RECOMMENDED_KEYS = ['연구 주제', '연구 성격', '연구 단계', '분류', '작성일', '작성자'];
const RESEARCH_NATURES = ['구축', '분석', '검증'];
const FORBIDDEN_TOP_LEVEL_KEYS = ['project', 'date', 'authors', 'keywords', 'category'];
```

(line 27의 META_RECOMMENDED_KEYS 정의를 위 형태로 교체 — `연구 성격`을 두 번째 자리에 삽입.)

`module.exports` (line 477~495)에 `RESEARCH_NATURES`를 알파벳 순으로 추가:

```js
module.exports = {
  analyzeQuality,
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
  RESEARCH_NATURES,
  rewriteImages,
  uniqueBasename,
  validateResearchLog,
  formatValidationErrors,
  writeJson,
  writeYaml
};
```

- [ ] **Step 4: baseline.yaml 갱신 (META_MISSING_KEY 새로 안 뜨게)**

`plugins/silotek-research-log/tests/fixtures/baseline.yaml`의 `meta` 블록에 `연구 성격: "구축"` 한 줄 추가:

```yaml
title: "연구 일지"
subtitle: "테스트 baseline"
meta:
  연구 주제: "테스트 주제"
  연구 성격: "구축"
  연구 단계: "기술 검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 연구 질문"
  - p: "이 fixture가 모든 구조 검사를 통과하는지 확인한다."
```

- [ ] **Step 5: 테스트 실행으로 통과 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS (sanity 1 + validate 6 + analyze-quality 9 + save-draft 4 + build-docx 2 = 22 → 21이 됐을 수도, 새 테스트 2개 추가하면 24).

만약 기존 analyze-quality 테스트의 `missing-meta.yaml` 또는 다른 fixtures가 META_MISSING_KEY 갯수를 정확히 세는 assertion이 있다면 갯수 변경되어 깨질 수 있음. 깨진 assertion 발견 시 Step 6으로 넘어가서 fix.

- [ ] **Step 6: 만약 missing-meta 테스트가 깨졌다면 fix**

`plugins/silotek-research-log/tests/analyze-quality.test.js`의 `analyzeQuality warns for each missing META_RECOMMENDED key` 테스트는 `missing-meta.yaml`의 META_MISSING_KEY 갯수를 정확히 3 (연구 단계, 분류, 작성자)으로 검사한다. v0.2.0에서 `연구 성격`이 META_RECOMMENDED_KEYS에 추가되므로 missing-meta.yaml에도 그 키가 빠져 있어 갯수가 4가 됨.

테스트의 expected를 4로 수정:

```js
test('analyzeQuality warns for each missing META_RECOMMENDED key', () => {
  const result = analyzeQuality(loadFixture('missing-meta.yaml'));
  const metaWarnings = result.warnings.filter(w => w.code === 'META_MISSING_KEY');
  // 연구 성격, 연구 단계, 분류, 작성자 — 4건
  assert.equal(metaWarnings.length, 4);
  const missingKeys = metaWarnings.map(w => w.detail.key).sort();
  assert.deepEqual(missingKeys, ['분류', '연구 단계', '연구 성격', '작성자']);
});
```

또 다른 fixtures (no-validation-section.yaml, no-images.yaml, short-text.yaml, anti-pattern.yaml, missing-image-file.yaml)가 META_MISSING_KEY를 의도치 않게 발행하면 해당 fixtures의 `meta` 블록에도 `연구 성격: "<적절한 값>"` 한 줄 추가. 각 fixture의 의도 보존.

- [ ] **Step 7: 모든 테스트 다시 통과 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 8: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Add RESEARCH_NATURES constant and 연구 성격 to META_RECOMMENDED_KEYS"
```

---

### Task 2: `analyzeQuality` — `META_INVALID_VALUE` 검사

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js`
- Modify: `plugins/silotek-research-log/tests/analyze-quality.test.js`
- Create: `plugins/silotek-research-log/tests/fixtures/invalid-research-nature.yaml`

- [ ] **Step 1: fixture 생성**

`plugins/silotek-research-log/tests/fixtures/invalid-research-nature.yaml`:

```yaml
title: "연구 일지"
subtitle: "성격 도메인 외 값 케이스"
meta:
  연구 주제: "테스트"
  연구 성격: "회고"
  연구 단계: "회고"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 검증"
  - p: "본문 길이를 충분히 채운다. 사일로텍 연구일지의 v0.2.0 검사 항목 중 META_INVALID_VALUE는 meta.연구 성격이 RESEARCH_NATURES(구축/분석/검증) 중 하나가 아닐 때 발행된다. 이 fixture는 '회고'라는 도메인 외 값을 의도적으로 두어 해당 warn을 검증한다. 다른 warn은 fixture 본문 길이와 키워드를 통해 차단한다. 본문 길이가 800자 임계 미달이면 TEXT_TOO_SHORT가 같이 떠서 격리가 깨지므로 추가 문단을 두어 길이를 확보한다. 추가 문단 — 사일로텍 연구일지의 표준 흐름은 연구 질문에서 시작해 시행착오, 관찰, 원인 분석, 검증, 교훈, 향후 과제로 이어진다. 충분한 길이를 위해 같은 정도의 문단을 한 번 더 쓴다."
  - h2: "시행착오"
  - p: "시도와 실패 — 본문 채움."
  - h2: "향후 과제"
  - p: "남은 질문."
```

- [ ] **Step 2: 실패 테스트 추가**

`plugins/silotek-research-log/tests/analyze-quality.test.js` 끝에 추가:

```js
test('analyzeQuality warns META_INVALID_VALUE when 연구 성격 is out of domain', () => {
  const result = analyzeQuality(loadFixture('invalid-research-nature.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('META_INVALID_VALUE'));
  const w = result.warnings.find(w => w.code === 'META_INVALID_VALUE');
  assert.equal(w.detail.key, '연구 성격');
  assert.equal(w.detail.value, '회고');
  assert.deepEqual(w.detail.allowed, ['구축', '분석', '검증']);
});

test('analyzeQuality does NOT warn META_INVALID_VALUE on baseline (구축)', () => {
  const result = analyzeQuality(loadFixture('baseline.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(!codes.includes('META_INVALID_VALUE'));
});
```

- [ ] **Step 3: 테스트 실행으로 실패 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log -- tests/analyze-quality.test.js`

Expected: 첫 테스트 FAIL.

- [ ] **Step 4: `analyzeQuality`에 META_INVALID_VALUE 검사 추가**

`plugins/silotek-research-log/scripts/common.js`의 `analyzeQuality` 함수 안, META_MISSING_KEY 루프 직후(`for (const key of META_RECOMMENDED_KEYS)` 블록 끝난 다음, KEYWORD_GROUPS 정의 직전)에 추가:

```js
  // META_INVALID_VALUE 검사 — 도메인 강제 키들
  if (meta['연구 성격'] !== undefined && meta['연구 성격'] !== null && String(meta['연구 성격']).trim() !== '') {
    const value = String(meta['연구 성격']).trim();
    if (!RESEARCH_NATURES.includes(value)) {
      warnings.push({
        code: 'META_INVALID_VALUE',
        message: `meta.연구 성격은 ${RESEARCH_NATURES.join(' / ')} 중 하나여야 합니다 (현재: "${value}").`,
        detail: { key: '연구 성격', value, allowed: RESEARCH_NATURES.slice() }
      });
    }
  }
```

- [ ] **Step 5: 테스트 실행으로 통과 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Detect META_INVALID_VALUE for 연구 성격 outside RESEARCH_NATURES"
```

---

### Task 3: `templates/research-log.yaml` 갱신

**Files:**
- Modify: `plugins/silotek-research-log/templates/research-log.yaml`

- [ ] **Step 1: meta 블록에 `연구 성격` 한 줄 추가**

`plugins/silotek-research-log/templates/research-log.yaml`의 `meta:` 블록 안 `연구 주제` 다음 줄에 추가. 결과 전체:

```yaml
# ============================================================
# 사일로텍 연구일지 템플릿 (v0.2.0)
# ============================================================
# 메타 권장 키 6개 + optional 자유 키 + 필수 섹션 8개 stub.
# 작성 후 save-draft.js로 저장하면 콘솔에 품질 경고가 표시됨.
# 연구 성격은 다음 셋 중 하나로 적는다: 구축 / 분석 / 검증.
# ============================================================

title: "연구 일지"
subtitle: "<이번 문서의 한 줄 주제>"

meta:
  연구 주제: "<예: RF카드 포렌식 앱 프로파일 용어 체계 정비>"
  연구 성격: "<구축 / 분석 / 검증 중 하나>"
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

- [ ] **Step 2: 템플릿이 validateResearchLog를 통과하는지 점검**

PowerShell:

```powershell
node -e "const yaml = require('js-yaml'); const fs = require('fs'); const { validateResearchLog } = require('./plugins/silotek-research-log/scripts/common'); const doc = yaml.load(fs.readFileSync('./plugins/silotek-research-log/templates/research-log.yaml', 'utf8')); console.log(validateResearchLog(doc));"
```

Expected: `[]`.

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/templates/research-log.yaml
git commit -m "Add 연구 성격 to research-log template (v0.2.0)"
```

---

## Phase 2 — 성격 판정 가이드 (Task 4~5)

### Task 4: `commands/draft.md` — 성격 판정 + 강조점 가이드 추가

**Files:**
- Modify: `plugins/silotek-research-log/commands/draft.md`

(Markdown 변경, TDD 부적절. 직접 교체 + claude plugin validate.)

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

## 연구일지 성격 판정 (필수, 작성 시작 전)

본문 작성 전에 반드시 다음 3가지 중 하나로 분류하고 사용자와 합의한다.

| 성격 | 핵심 질문 | 어떤 본문이 되나 |
|---|---|---|
| 구축 | "X를 어떻게 만들었나?" | 시간순 시도와 시행착오 + 단계별 결과 |
| 분석 | "X의 현재 구조와 문제는?" | 분석 대상 정의 + 현재 구조 + 원인 분석 + 권장 방향 |
| 검증 | "가설 X가 참인가?" | 가설 + 실험 설계 + 정량 데이터 + 결론 |

판정 절차:

1. 사용자 요청과 작업 폴더 컨텍스트에서 명백한 신호를 찾는다.
   - "구축", "만든", "개발", "프로토타입", "구현 과정" → **구축**
   - "분석", "현황", "구조", "체계 정비" → **분석**
   - "검증", "실험", "비교", "측정", "가설" → **검증**
2. 명백하면 한 줄 confirm: *"'구축' 성격으로 작성합니다 (다른 성격이면 알려주세요)."*
3. 모호하면 3옵션 메뉴를 그대로 출력하고 사용자 답을 기다린다:
   ```
   어떤 성격의 연구일지일까요?
   1) 구축 — 구축/구현 과정
   2) 분석 — 기존 체계 분석
   3) 검증 — 검증 실험
   ```
4. 결정값을 한국어로 `meta.연구 성격`에 기록한다 (`구축` / `분석` / `검증`).
5. 해당 성격의 강조점 가이드(아래)를 따라 본문을 작성한다.

## 작성 전 자가 질문 (필수)

성격 판정이 끝난 후, 본문 작성 전에 자기 자신에게 한 줄로 답한다:

> **이번 문서가 답하려는 연구 질문은 무엇인가?**

답이 떠오르지 않으면 사용자 작업 맥락에서 가장 좁은 질문을 직접 추론해 명시한다. 폴더 설명/요약이 답이 되면 안 된다.

## 필수 섹션 체크리스트 (8단 보편 흐름)

본문은 다음 흐름을 따른다. 모든 섹션을 기계적으로 넣지는 말고 실제 내용에 맞게 조정하되, 흐름은 드러나야 한다.

- [ ] **연구 질문** — 한 줄
- [ ] **문제 정의 / 배경** — 무엇이 문제인가, 왜 지금 다루는가
- [ ] **시도와 시행착오** — 실패 사례 포함, 원인 분석 동반
- [ ] **관찰 / 측정** — 수치, 로그, 스크린샷이 있으면 image element로
- [ ] **원인 분석** — 관찰에서 가설로
- [ ] **검증** — 실험, 비교, 측정 결과로 가설 확인
- [ ] **교훈 / 판단 기록** — 무엇을 알게 되었나
- [ ] **향후 과제 / 남은 불확실성** — 남은 질문

## 성격별 강조점

8단 흐름은 같지만, 어느 섹션을 깊이 쓰고 어느 섹션을 짧게 쓸지가 성격마다 다르다.

### 구축
- 시도와 시행착오(3): **시간순으로 자세히** — 무엇을 먼저, 무엇이 막혔고, 어떻게 우회했는지.
- 관찰/측정(4): 각 단계의 결과 (빌드 성공/실패, 동작 확인 스크린샷).
- 검증(6): 최종 동작 확인.
- 향후 과제(8): 다음 빌드 단계.

### 분석
- 문제 정의(2): **분석 대상**을 명시.
- 관찰/측정(4): 현재 구조 (스키마 / 호출 그래프 / 디렉터리 트리).
- 원인 분석(5): 발견된 문제의 원인.
- 검증(6): 가설을 코드/문서로 확인.
- 교훈(7): 권장 방향 (Refactor / Replace / Keep 등).

### 검증
- 연구 질문(1): **가설**을 한 줄로.
- 시도와 시행착오(3): 실험 설계 변경 이력.
- 관찰/측정(4): **정량 데이터** (수치, 분포, 그래프).
- 원인 분석(5): 결과 해석.
- 검증(6): 가설 결론 (성립 / 부분 성립 / 기각).

## 안티패턴 금지

다음 형태는 작성 직후 스스로 거절한다:

- 성격 미선택 상태로 본문 작성 시작 — 반드시 1단계 판정 후 진행
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

다음 6개 키를 권장한다. 빠지면 저장은 진행되지만 콘솔에 `META_MISSING_KEY` 경고가 출력된다.

- `연구 주제`
- `연구 성격` — `구축` / `분석` / `검증` 중 하나 (다른 값은 `META_INVALID_VALUE` 경고)
- `연구 단계`
- `분류`
- `작성일`
- `작성자`

추가로 필요한 한국어 키는 자유롭게 적는다 (예: `커밋버전`, `변경 규모`, `관련 프로젝트`).

**금지**: top-level에 `project`, `date`, `authors`, `keywords`, `category` 같은 영문 키를 두지 않는다 — 코드가 거절한다. 모두 `meta` 안의 한국어 키로 옮긴다.

## 시각 자료 — visual_brief

본문 안에 그림을 넣을 자리에는 `visual_brief` element를 미리 둔다. research-diagrammer 서브에이전트가 brief를 받아 그림을 생성한다.

```yaml
- visual_brief:
    purpose: "RF카드 인증의 이중 키 도메인 시각화"
    claim: "단말 검증과 서버 검증이 다른 키 도메인을 사용한다"
    evidence:
      - "단말은 카드 마스터 키 K_M으로 챌린지 응답"
      - "서버는 트랜잭션 키 K_T로 별도 서명"
    forbidden:
      - "K_M과 K_T가 동일하다는 추측"
    palette: "navy / teal / gray, 밝은 배경"
    caption: "[그림 1] RF카드 인증의 이중 키 도메인"
```

각 visual_brief 작성 직후 research-diagrammer를 호출하고, 결과 이미지 경로를 brief 다음 줄의 `image` element로 페어링한다.

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

3. save-draft가 끝나면 **즉시 research-critic 서브에이전트를 호출**해 점수와 부족 항목을 사용자에게 보고한다 (서브에이전트 미설치 시 fallback: `node "$env:CLAUDE_PLUGIN_ROOT\scripts\critique.js" <id>`).
4. 저장된 YAML 경로, manifest 경로, 복사된 이미지 개수, **출력된 품질 경고와 critic 점수**를 사용자에게 알려준다.
5. 이 명령에서는 DOCX를 자동 생성하지 않는다. 사용자가 Word 문서를 원하면 `/silotek-research-log:build-docx`를 안내한다.
```

- [ ] **Step 2: claude plugin validate**

Run: `claude plugin validate .`

Expected: 정상 종료.

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/commands/draft.md
git commit -m "Add 연구일지 성격 판정 and visual_brief guide to /draft"
```

---

### Task 5: `skills/draft/SKILL.md` — 성격 판정 + 강조점 가이드 추가

**Files:**
- Modify: `plugins/silotek-research-log/skills/draft/SKILL.md`

- [ ] **Step 1: 새 본문으로 교체**

`plugins/silotek-research-log/skills/draft/SKILL.md` 전체를 다음으로 교체. 영어 description 유지:

```markdown
---
description: Create a Silotek research-log YAML draft from the current conversation, a project/work folder, or both. Use when the user asks to write, summarize, archive, or convert research/development work into a standardized Silotek research log. Saves YAML and source metadata to the central Silotek Research Logs folder.
---

# Silotek Research Log Draft

Create a Korean Silotek research-log YAML record and save it through the bundled plugin script.

## Research-Log Nature Selection (Required, before any drafting)

You MUST classify the document into one of three natures and confirm with the user before writing the body.

| Nature | Core question | Body shape |
|---|---|---|
| 구축 | "X를 어떻게 만들었나?" | Chronological trial-and-error + per-step results |
| 분석 | "X의 현재 구조와 문제는?" | Target definition + current structure + root cause + recommended direction |
| 검증 | "가설 X가 참인가?" | Hypothesis + experimental design + quantitative data + conclusion |

Procedure:

1. Look for explicit signals in the user's request and folder context.
   - "구축", "만든", "개발", "프로토타입", "구현 과정" → 구축
   - "분석", "현황", "구조", "체계 정비" → 분석
   - "검증", "실험", "비교", "측정", "가설" → 검증
2. If clear: one-line confirm — *"'구축' 성격으로 작성합니다 (다른 성격이면 알려주세요)."* Proceed unless the user corrects.
3. If ambiguous: print the 3-option menu verbatim and wait for user response:
   ```
   어떤 성격의 연구일지일까요?
   1) 구축 — 구축/구현 과정
   2) 분석 — 기존 체계 분석
   3) 검증 — 검증 실험
   ```
4. Record the chosen nature in `meta.연구 성격` as Korean (`구축` / `분석` / `검증`). Other values trigger `META_INVALID_VALUE` warn.
5. Use the nature's emphasis guide (below) to shape the body within the standard 8-section arc.

## Self-Question Before Drafting (Required)

After nature selection, before writing the body, answer to yourself in one line:

> **What is the research question this document tries to answer?**

If you cannot answer in one line, infer the narrowest plausible question from the user's working context and write it out explicitly. A folder summary is not a research question.

## Required Section Checklist (universal 8-section arc)

Bias the draft toward this arc. Adapt headings to the actual work, but the arc must show through.

- 연구 질문 (한 줄)
- 문제 정의 / 배경
- 시도와 시행착오 (실패 사례 포함)
- 관찰 / 측정
- 원인 분석
- 검증 (실험, 비교, 측정)
- 교훈 / 판단 기록
- 향후 과제 / 남은 불확실성

## Nature-Specific Emphasis

### 구축
- 시도와 시행착오 (3): chronological detail — what came first, what blocked, how worked around.
- 관찰/측정 (4): per-step results.
- 검증 (6): final behavior confirmation.
- 향후 과제 (8): next build steps.

### 분석
- 문제 정의 (2): name the analysis target.
- 관찰/측정 (4): current structure (schema / call graph / directory tree).
- 원인 분석 (5): root cause of discovered issues.
- 검증 (6): verify hypothesis against code/docs.
- 교훈 (7): recommended direction (Refactor / Replace / Keep).

### 검증
- 연구 질문 (1): one-line hypothesis.
- 시도와 시행착오 (3): experimental design changes.
- 관찰/측정 (4): quantitative data.
- 원인 분석 (5): result interpretation.
- 검증 (6): hypothesis conclusion.

## Anti-patterns to Reject Yourself

- 성격 미선택 상태로 본문 작성 시작 — 반드시 1단계 판정 후 진행
- 파일 경로/디렉터리 나열형 본문
- 근거 없는 단정 ("그래서 X가 맞다")
- 시행착오 없이 "이렇게 했더니 잘 됐다"형 서술
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동 경고함

## Plugin Model

The normal plugin flow is:

1. Inspect the conversation, current folder, or both.
2. Classify nature and confirm with user.
3. Create `.silotek-research-log-draft.yaml` in the current workspace.
4. For each `visual_brief` element you author, immediately invoke the `research-diagrammer` subagent and pair the returned image path as the next `image` element.
5. Run `scripts/save-draft.js` from `CLAUDE_PLUGIN_ROOT`.
6. **Immediately after save-draft completes, invoke the `research-critic` subagent** with the saved YAML's absolute path. Report score and missing items to the user.
7. Build DOCX only when the user asks for `/silotek-research-log:build-docx`.

If the `research-diagrammer` or `research-critic` subagents are not registered, fall back: leave image elements empty and run `node "${CLAUDE_PLUGIN_ROOT}/scripts/critique.js" <id>` for scoring.

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
- Include `meta.연구 성격` as one of `구축` / `분석` / `검증`.
- Do not include customer names, private person names, internal URLs, API keys, secrets, real store names, UIDs, or proprietary query strings unless the user explicitly asks.
- For folder/mixed mode, inspect likely source files first: README, docs, package/config files, source entrypoints, tests, outputs, images, and screenshots.
- Ignore heavy or generated folders such as `node_modules`, `.git`, `.next`, `dist`, `build`, caches, and binary dependencies.
- Use `image` elements only for images that materially support the research log. Use `visual_brief` elements as placeholders that the diagrammer subagent fills.

## Meta Standard (warn policy)

Recommended 6 keys (warn if missing — save still proceeds):

- `연구 주제`, `연구 성격`, `연구 단계`, `분류`, `작성일`, `작성자`

`연구 성격` value domain: `구축` / `분석` / `검증`. Other values trigger `META_INVALID_VALUE` warn.

Free Korean optional keys are allowed (e.g. `커밋버전`, `변경 규모`, `관련 프로젝트`).

**Forbidden at top level**: `project`, `date`, `authors`, `keywords`, `category`. Move them under `meta` with Korean keys; the script rejects otherwise.

## Required YAML Shape

Treat `sections` as the DOCX renderer's flat command list. Every `sections` item must be either a string paragraph or an object with exactly one supported key.

Supported section elements: `h1`, `h2`, `h3`, `p`, `text`, `bullets`, `numbers`, `ordered`, `code`, `image`, `table`, `note`, `callout`, `spacer`, `blank`, **`visual_brief`** (v0.2.0).

```yaml
title: "연구 일지"
subtitle: "연구 주제 요약"
meta:
  연구 주제: "상세 설명"
  연구 성격: "구축"
  연구 단계: "구현/검증"
  분류: "AI/ML, RAG"
  작성일: "2026년 5월 9일"
  작성자: "작성자명"
sections:
  - h1: "1. 연구 질문"
  - p: "본문..."
  - visual_brief:
      purpose: "..."
      claim: "..."
      evidence: ["...", "..."]
      forbidden: ["..."]
      palette: "navy / teal / gray, 밝은 배경"
      caption: "[그림 1] ..."
  - image:
      path: "../figures/<basename>/diagram-1.svg"
      caption: "[그림 1] ..."
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

3. **Immediately after** save-draft exits 0, invoke `research-critic` (or fallback `node scripts/critique.js <id>`) and report the score + missing items to the user.
4. Report the saved YAML path, manifest path, copied figure count, **and any quality warnings** from the script's stdout (lines starting with `⚠ 품질 경고`).
5. Do not build DOCX in this skill. Tell the user to run `/silotek-research-log:build-docx`.

## Manifest Guidance

When folder or mixed mode is used, pass important source files with repeated `--source-file` flags if practical:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-draft.js" .silotek-research-log-draft.yaml --mode folder --source-root "$PWD" --source-file README.md --source-file package.json
```

Prefer a short, high-signal source list over exhaustive file dumps.
```

- [ ] **Step 2: claude plugin validate**

Run: `claude plugin validate .`

Expected: 정상 종료.

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/skills/draft/SKILL.md
git commit -m "Add 연구일지 성격 판정 and subagent invocation guide to draft skill"
```

---

## Phase 3 — visual_brief element (Task 6~8)

### Task 6: `SECTION_ELEMENT_KEYS`에 `visual_brief` 추가 + `validateResearchLog` 필드 검증

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js`
- Modify: `plugins/silotek-research-log/tests/validate.test.js`
- Create: `plugins/silotek-research-log/tests/fixtures/visual-brief-complete.yaml`
- Create: `plugins/silotek-research-log/tests/fixtures/visual-brief-incomplete.yaml`

- [ ] **Step 1: fixtures 생성**

`plugins/silotek-research-log/tests/fixtures/visual-brief-complete.yaml`:

```yaml
title: "연구 일지"
subtitle: "visual_brief 정상 케이스"
meta:
  연구 주제: "테스트"
  연구 성격: "구축"
  연구 단계: "기술 검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 검증"
  - p: "본문 길이 채움."
  - visual_brief:
      purpose: "테스트 다이어그램"
      claim: "A는 B다"
      evidence:
        - "근거 1"
        - "근거 2"
      forbidden:
        - "추측 1"
      palette: "navy / teal / gray"
      caption: "[그림 1] 테스트"
```

`plugins/silotek-research-log/tests/fixtures/visual-brief-incomplete.yaml`:

```yaml
title: "연구 일지"
subtitle: "visual_brief 필드 누락"
meta:
  연구 주제: "테스트"
  연구 성격: "구축"
  연구 단계: "기술 검증"
  분류: "테스트"
  작성일: "2026년 5월 10일"
  작성자: "테스터"
sections:
  - h1: "1. 검증"
  - visual_brief:
      purpose: "테스트"
      caption: "[그림 1] 테스트"
```

- [ ] **Step 2: 실패 테스트 추가**

`plugins/silotek-research-log/tests/validate.test.js` 끝에 추가:

```js
test('validateResearchLog accepts visual_brief with all required fields', () => {
  const errors = validateResearchLog(loadFixture('visual-brief-complete.yaml'));
  assert.deepEqual(errors, []);
});

test('validateResearchLog rejects visual_brief missing required fields', () => {
  const errors = validateResearchLog(loadFixture('visual-brief-incomplete.yaml'));
  assert.ok(errors.length >= 4); // claim, evidence, forbidden, palette 누락
  assert.ok(errors.some(e => /claim/.test(e)));
  assert.ok(errors.some(e => /evidence/.test(e)));
  assert.ok(errors.some(e => /forbidden/.test(e)));
  assert.ok(errors.some(e => /palette/.test(e)));
});
```

- [ ] **Step 3: 테스트 실행으로 실패 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log -- tests/validate.test.js`

Expected: visual_brief 테스트 둘 다 FAIL — visual_brief가 SECTION_ELEMENT_KEYS에 없어 첫 테스트는 "지원하지 않는 키" 에러, 둘째 테스트는 같은 이유로 다른 에러.

- [ ] **Step 4: `common.js` 갱신**

`plugins/silotek-research-log/scripts/common.js` line 7~23의 `SECTION_ELEMENT_KEYS`에 `visual_brief` 추가:

```js
const SECTION_ELEMENT_KEYS = new Set([
  'h1',
  'h2',
  'h3',
  'p',
  'text',
  'bullets',
  'numbers',
  'ordered',
  'code',
  'image',
  'table',
  'note',
  'callout',
  'spacer',
  'blank',
  'visual_brief'
]);
```

`validateResearchLog` 함수의 element 본문 검증 (현재 line 132~143의 `else if` 체인) 끝에 visual_brief 검증 추가. 정확한 위치는 `else if (key === 'table' && !isPlainObject(value))` 다음:

```js
      } else if (key === 'visual_brief') {
        if (!isPlainObject(value)) {
          errors.push(`${label}.visual_brief 값은 purpose/claim/evidence/forbidden/palette/caption을 담은 객체여야 합니다.`);
        } else {
          for (const fld of ['purpose', 'claim', 'palette', 'caption']) {
            if (typeof value[fld] !== 'string' || value[fld].trim() === '') {
              errors.push(`${label}.visual_brief.${fld}는 비어있지 않은 문자열이어야 합니다.`);
            }
          }
          for (const fld of ['evidence', 'forbidden']) {
            if (!Array.isArray(value[fld]) || value[fld].length === 0) {
              errors.push(`${label}.visual_brief.${fld}는 비어있지 않은 배열이어야 합니다.`);
            } else if (!value[fld].every(item => typeof item === 'string')) {
              errors.push(`${label}.visual_brief.${fld}의 모든 항목은 문자열이어야 합니다.`);
            }
          }
        }
      }
```

- [ ] **Step 5: 테스트 실행으로 통과 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 6: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Add visual_brief element key with field validation"
```

---

### Task 7: `analyzeQuality` — `NO_VISUAL_BRIEF` warn 추가

기존 `NO_IMAGES` warn은 image element 0개일 때만 봤음. v0.2.0에서는 image도 visual_brief도 둘 다 0개일 때 강한 경고 `NO_VISUAL_BRIEF` 신규 발행. 단순한 image 결핍보다 구조적 결핍 신호.

**Files:**
- Modify: `plugins/silotek-research-log/scripts/common.js` (analyzeQuality)
- Modify: `plugins/silotek-research-log/tests/analyze-quality.test.js`

- [ ] **Step 1: 실패 테스트 추가**

`plugins/silotek-research-log/tests/analyze-quality.test.js` 끝에 추가:

```js
test('analyzeQuality warns NO_VISUAL_BRIEF when both image and visual_brief are zero', () => {
  const result = analyzeQuality(loadFixture('no-images.yaml'));
  // no-images.yaml은 image 0개, visual_brief 0개
  const codes = result.warnings.map(w => w.code);
  assert.ok(codes.includes('NO_VISUAL_BRIEF'));
});

test('analyzeQuality does NOT warn NO_VISUAL_BRIEF when visual_brief exists', () => {
  const result = analyzeQuality(loadFixture('visual-brief-complete.yaml'));
  const codes = result.warnings.map(w => w.code);
  assert.ok(!codes.includes('NO_VISUAL_BRIEF'));
});
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log -- tests/analyze-quality.test.js`

Expected: 첫 테스트 FAIL.

- [ ] **Step 3: `analyzeQuality`에 NO_VISUAL_BRIEF 추가**

`plugins/silotek-research-log/scripts/common.js`의 `analyzeQuality` 함수에서 `NO_IMAGES` 검사 직후에 추가:

```js
  if (stats.imageCount === 0 && stats.visualBriefCount === 0) {
    warnings.push({
      code: 'NO_VISUAL_BRIEF',
      message: '이미지와 visual_brief가 모두 0개입니다. 시각 자료가 필요한 자리에 visual_brief element를 미리 두는 것을 강하게 권장합니다.',
      detail: { imageCount: stats.imageCount, visualBriefCount: stats.visualBriefCount }
    });
  }
```

위치: 기존 `if (stats.imageCount === 0) { ... }` 블록 끝난 직후, `if (stats.tableCount === 0) { ... }` 블록 직전.

- [ ] **Step 4: 테스트 실행으로 통과 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/common.js plugins/silotek-research-log/tests/
git commit -m "Warn NO_VISUAL_BRIEF when both image and visual_brief are absent"
```

---

### Task 8: `build.js` — `visual_brief` 회색 박스 렌더링

build.js의 `renderElement` switch 문에 `visual_brief` 케이스 추가. 페어링 image가 함께 오면 그림이 본문에 보이고 brief는 별도 박스로 *"[그림 N 명세] purpose / claim / caption"* 안내. 페어링 image가 없으면 *"[그림 미첨부] purpose / claim / caption"* 회색 박스로 표시 — 사용자가 누락을 즉시 인지.

이번 task에서는 단순히 brief의 caption + purpose + claim을 회색 박스로 출력. 페어링 검사는 단순화 (인접 image 존재 여부 확인은 v0.3.0).

**Files:**
- Modify: `plugins/silotek-research-log/build.js`
- Modify: `plugins/silotek-research-log/tests/build-docx.test.js`

- [ ] **Step 1: 실패 테스트 추가**

`plugins/silotek-research-log/tests/build-docx.test.js` 끝에 추가:

```js
test('build-docx renders visual_brief as a gray box (no error)', () => {
  // visual-brief-complete.yaml을 inputs/에 직접 두고 build
  const inputsDir = path.join(storage, 'inputs');
  fs.mkdirSync(inputsDir, { recursive: true });
  const target = path.join(inputsDir, '2026-05-10-vb-complete.yaml');
  fs.copyFileSync(path.join(FIXTURES, 'visual-brief-complete.yaml'), target);
  const built = runBuildDocx('2026-05-10-vb-complete', { storage });
  assert.equal(built.status, 0, `stderr: ${built.stderr}`);
  // 결과 docx 파일 생성 확인
  const docx = path.join(storage, 'outputs', '2026-05-10-vb-complete.docx');
  assert.ok(fs.existsSync(docx));
  assert.ok(fs.statSync(docx).size > 0);
});
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log -- tests/build-docx.test.js`

Expected: FAIL — `알 수 없는 요소 타입: visual_brief` 에러.

- [ ] **Step 3: `build.js`의 `renderElement`에 visual_brief 케이스 추가**

`plugins/silotek-research-log/build.js`의 switch 문(현재 line 270~308) 안에서 `note`/`callout` 케이스 다음에 추가:

```js
    case 'visual_brief': {
      // 회색 박스: [그림 명세] purpose / claim / caption
      const lines = [
        `[${value.caption || '그림 명세'}]`,
        `목적: ${value.purpose || '(미명시)'}`,
        `핵심 주장: ${value.claim || '(미명시)'}`
      ];
      const paragraphs = lines.map(line => new Paragraph({
        children: parseInlineText(line),
        spacing: { before: 60, after: 60 },
        shading: { fill: "EEEEEE", type: ShadingType.CLEAR }
      }));
      return paragraphs;
    }
```

위치: `case 'note':` `case 'callout':` 블록 (현재 line 297~305) 다음, `default:` 직전.

- [ ] **Step 4: 테스트 실행으로 통과 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```powershell
git add plugins/silotek-research-log/build.js plugins/silotek-research-log/tests/
git commit -m "Render visual_brief as gray box in build.js"
```

---

## Phase 4 — 서브에이전트 정의 (Task 9~10)

### Task 9: `agents/research-diagrammer.md` 생성

**Files:**
- Create: `plugins/silotek-research-log/agents/research-diagrammer.md`

(Markdown 파일, TDD 부적절. 직접 작성 + claude plugin validate.)

- [ ] **Step 1: agents 디렉터리 생성 + 파일 작성**

PowerShell:
```powershell
New-Item -ItemType Directory -Path plugins/silotek-research-log/agents -Force
```

`plugins/silotek-research-log/agents/research-diagrammer.md`:

```markdown
---
name: research-diagrammer
description: Generate a single research-log diagram from a Silotek visual_brief block. Use when the main session passes a brief with purpose, claim, evidence, forbidden, palette, and caption — produces an SVG (or PNG via image-generation skills) at the requested output path. Stays strictly within evidence and forbidden constraints.
tools: Read, Write
---

# 사일로텍 연구일지 다이어그램 생성

당신의 역할은 **단 하나의 그림**을 만드는 것이다. 메인 세션이 visual_brief 블록과 출력 경로를 넘기면, 그 brief가 정한 evidence만 사용해 그림 1장을 생성한다.

## 입력 (메인 세션이 전달)

```yaml
visual_brief:
  purpose: "..."
  claim: "..."
  evidence: ["...", "..."]
  forbidden: ["..."]
  palette: "navy / teal / gray, 밝은 배경"
  caption: "[그림 N] ..."
```

+ 출력 경로 (예: `figures/<basename>/diagram-1.svg` 또는 `.png`).

## 동작 규칙

1. **evidence만 사용**한다. evidence에 없는 사실을 그림에 그리지 마라.
2. **forbidden 항목은 절대 그림에 등장시키지 마라**. 단어든 시각적 표현이든.
3. **palette를 따른다** — 기본은 navy / teal / gray, 밝은 배경, 16:9 비율 또는 DOCX 본문 폭 기준. 작은 글씨 금지.
4. **출력 형식 자율**:
   - 우선: SVG 직접 작성 (Write 도구로 `.svg` 파일 생성). 텍스트 기반이라 외부 도구 무의존.
   - 차선: 사용 가능한 imagegen 시스템 skill 호출 (예: imagegen-frontend-mobile 등 — 환경에 설치돼 있을 때).
   - **mermaid, puppeteer, 외부 npm 도구는 사용하지 않는다.**
5. **장식 이미지 금지**. 구조/흐름/인과만 표현.
6. **캡션은 brief의 caption 그대로** 사용.

## 자체 QA (출력 직전)

- evidence 모든 항목이 그림에 어떤 형태로든 반영됐는가? (반드시는 아님 — 일부 evidence는 텍스트로만 반영해도 OK)
- forbidden 항목 중 하나라도 그림에 들어가지 않았는가? **하나라도 있으면 다시 작성**.
- palette 외 색이 들어가지 않았는가?

## 출력 (메인 세션에 보고)

다음 형식으로 보고:

```
- 파일 경로: <저장된 절대 경로>
- alt text: "<한 줄 설명>"
- 사용한 evidence: [...]
- forbidden 위반 0건 확인
```

메인 세션은 이 경로를 brief 직후 `image` element의 `path`로 페어링한다.

## 톤 가이드

- 캡션 형식: `[그림 N] ...`
- 화살표는 단순한 직선 또는 직각. 곡선 화살표 자제.
- 텍스트 라벨은 굵게 또는 일반. 이탤릭은 사용 금지 (한국어와 어울리지 않음).
- 중요 강조는 색상보다 굵기/박스 테두리로.
```

- [ ] **Step 2: claude plugin validate**

Run: `claude plugin validate .`

Expected: 정상 종료. (Claude Code 플러그인이 `agents/` 폴더를 자동 등록 지원하지 않으면 validate가 경고를 내거나 무시할 수 있음. 어느 쪽이든 OK — 미설치 환경에서는 사용자가 `~/.claude/agents/`에 복사하는 흐름.)

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/agents/
git commit -m "Add research-diagrammer subagent definition"
```

---

### Task 10: `agents/research-critic.md` 생성

**Files:**
- Create: `plugins/silotek-research-log/agents/research-critic.md`

- [ ] **Step 1: 파일 작성**

`plugins/silotek-research-log/agents/research-critic.md`:

```markdown
---
name: research-critic
description: Score a completed Silotek research-log YAML on a 100-point rubric across 10 areas (meta, research question, trial-and-error density, validation section, visual material, table use, evidence, future work, anti-pattern avoidance, nature consistency). Use after save-draft.js completes — reads the saved YAML at the path the main session passes, returns score breakdown, missing items, and concrete fix suggestions in Korean.
tools: Read
---

# 사일로텍 연구일지 채점

저장된 연구일지 YAML 한 개를 받아 100점 만점으로 채점한다. 메인 세션은 save-draft.js가 끝난 직후 자동으로 당신을 호출한다.

## 입력 (메인 세션이 전달)

저장된 YAML의 절대 경로 (예: `C:\Users\...\Documents\Silotek Research Logs\inputs\2026-05-10-...yaml`).

## 채점 영역 (10 영역 / 100점)

| 영역 | 배점 | 검사 |
|---|---|---|
| 메타 정규화 | 10 | META_RECOMMENDED_KEYS 6키(`연구 주제`/`연구 성격`/`연구 단계`/`분류`/`작성일`/`작성자`) 모두 존재 + 형식 정상 |
| 연구 질문 명시 | 10 | h1 첫 섹션에 "연구 질문" 류 + 한 줄 답 |
| 시행착오 밀도 | 10 | "시행착오/실패/문제" 키워드 + 실패-원인 페어 |
| 검증 섹션 | 15 | "검증/실험/측정" 키워드 + 정량 근거 |
| 시각 자료 | 10 | image+visual_brief 합 ≥ 1 |
| 표 활용 | 10 | table 1개 이상 |
| 판단의 근거성 | 10 | 안티패턴 hits 0 + 본문 길이 ≥ 800자 |
| 향후 과제 | 5 | "남은/향후/한계" 키워드 |
| 안티패턴 회피 | 5 | "단순히/구조를 살펴본다" 류 키워드 ≤ 1회 |
| **성격 일관성** | **15** | meta.연구 성격이 RESEARCH_NATURES(구축/분석/검증) 중 하나, 본문 강조점 일치 |

총합 = 10+10+10+15+10+10+10+5+5+15 = **100**.

## 성격 일관성 채점 (15점)

`meta.연구 성격`을 먼저 확인한다. RESEARCH_NATURES에 없으면 0점. 있으면 본문 heading 키워드를 보고 일치 여부 판단:

- `구축`: heading에 "시행착오"/"시도"/"단계"/"구현" 등이 강하게 등장 → 12~15점.
- `분석`: heading에 "현황"/"구조"/"원인" 등이 강하게 등장 → 12~15점.
- `검증`: heading에 "가설"/"실험"/"측정" 등이 강하게 등장 → 12~15점.
- 성격과 본문이 어긋남 (예: `구축`인데 본문이 "현재 구조 분석"으로 차 있음) → 5~8점.
- meta.연구 성격이 도메인 외 값 → 0점.

## 출력 (메인 세션에 보고)

다음 한국어 형식으로:

```
점수: <점수> / 100

영역별:
- 메타 정규화: <점수>/10 — <한 줄 노트>
- 연구 질문 명시: <점수>/10 — ...
- 시행착오 밀도: <점수>/10 — ...
- 검증 섹션: <점수>/15 — ...
- 시각 자료: <점수>/10 — ...
- 표 활용: <점수>/10 — ...
- 판단의 근거성: <점수>/10 — ...
- 향후 과제: <점수>/5 — ...
- 안티패턴 회피: <점수>/5 — ...
- 성격 일관성: <점수>/15 — ...

부족 항목:
- <영역> (<현재 점수>/<만점>): <구체 누락 내용>
- ...

수정 제안:
- <한 줄 액션 제안>
- ...
```

자동 보정은 하지 않는다 — 메인 세션과 사용자가 보정 결정.

## fallback

이 서브에이전트가 등록되지 않은 환경에서는 메인 세션이 `node "$env:CLAUDE_PLUGIN_ROOT/scripts/critique.js" <id>`를 직접 실행해 같은 채점을 받는다.
```

- [ ] **Step 2: claude plugin validate**

Run: `claude plugin validate .`

Expected: 정상 종료.

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/agents/research-critic.md
git commit -m "Add research-critic subagent with 10-area / 100-point rubric"
```

---

## Phase 5 — critique CLI fallback (Task 11~12)

### Task 11: `scripts/critique.js` 생성

CLI fallback. 위 채점 표를 코드로 구현. 서브에이전트 미설치 환경에서 동일 점수를 받기 위함.

**Files:**
- Create: `plugins/silotek-research-log/scripts/critique.js`
- Create: `plugins/silotek-research-log/tests/critique.test.js`

- [ ] **Step 1: 실패 테스트 작성**

`plugins/silotek-research-log/tests/critique.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { critiqueScore } = require('../scripts/critique');

function loadFixture(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, 'fixtures', name), 'utf8'
  ));
}

test('critiqueScore returns the documented shape', () => {
  const result = critiqueScore(loadFixture('baseline.yaml'));
  assert.equal(typeof result.total, 'number');
  assert.ok(result.total >= 0 && result.total <= 100);
  assert.equal(typeof result.breakdown, 'object');
  assert.ok(Array.isArray(result.missing));
  assert.ok(Array.isArray(result.suggestions));
});

test('critiqueScore breakdown sums to 100 max points', () => {
  const result = critiqueScore(loadFixture('baseline.yaml'));
  const maxSum = Object.values(result.breakdown).reduce((s, b) => s + b.max, 0);
  assert.equal(maxSum, 100);
});

test('critiqueScore gives 0 for nature consistency when 연구 성격 is invalid', () => {
  const result = critiqueScore(loadFixture('invalid-research-nature.yaml'));
  assert.equal(result.breakdown['성격 일관성'].score, 0);
});

test('critiqueScore deducts heavily on baseline (no images, no tables, etc)', () => {
  // baseline.yaml은 image 0, table 0, 본문 짧음 → 점수 낮아야
  const result = critiqueScore(loadFixture('baseline.yaml'));
  assert.ok(result.total < 60, `expected < 60, got ${result.total}`);
});
```

- [ ] **Step 2: 테스트 실행으로 실패 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log -- tests/critique.test.js`

Expected: FAIL — critique.js가 없음.

- [ ] **Step 3: `scripts/critique.js` 작성**

`plugins/silotek-research-log/scripts/critique.js`:

```js
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  analyzeQuality,
  ensureStorage,
  listYaml,
  loadYaml,
  META_RECOMMENDED_KEYS,
  RESEARCH_NATURES
} = require('./common');

const RUBRIC = [
  { area: '메타 정규화', max: 10 },
  { area: '연구 질문 명시', max: 10 },
  { area: '시행착오 밀도', max: 10 },
  { area: '검증 섹션', max: 15 },
  { area: '시각 자료', max: 10 },
  { area: '표 활용', max: 10 },
  { area: '판단의 근거성', max: 10 },
  { area: '향후 과제', max: 5 },
  { area: '안티패턴 회피', max: 5 },
  { area: '성격 일관성', max: 15 }
];

function headingTexts(doc) {
  const out = [];
  for (const el of (doc.sections || [])) {
    if (el && typeof el === 'object' && !Array.isArray(el)) {
      const k = Object.keys(el)[0];
      if (k === 'h1' || k === 'h2' || k === 'h3') {
        if (typeof el[k] === 'string') out.push(el[k]);
      }
    }
  }
  return out;
}

function bodyText(doc) {
  let out = '';
  for (const el of (doc.sections || [])) {
    if (typeof el === 'string') { out += el + ' '; continue; }
    if (!el || typeof el !== 'object') continue;
    const k = Object.keys(el)[0];
    const v = el[k];
    if (typeof v === 'string') out += v + ' ';
    else if (Array.isArray(v)) {
      for (const x of v) if (typeof x === 'string') out += x + ' ';
    }
  }
  return out;
}

function critiqueScore(doc) {
  const meta = (doc && doc.meta) || {};
  const headings = headingTexts(doc);
  const allHeadings = headings.join(' ');
  const body = bodyText(doc);
  const quality = analyzeQuality(doc);
  const stats = quality.stats;

  const breakdown = {};
  const missing = [];
  const suggestions = [];

  // 1. 메타 정규화
  const metaMissing = META_RECOMMENDED_KEYS.filter(k =>
    meta[k] === undefined || meta[k] === null || String(meta[k]).trim() === ''
  );
  const metaScore = Math.max(0, 10 - metaMissing.length * 2);
  breakdown['메타 정규화'] = {
    score: metaScore, max: 10,
    notes: metaMissing.length ? [`누락: ${metaMissing.join(', ')}`] : ['모두 채워짐']
  };
  if (metaMissing.length) {
    missing.push(`메타 정규화 (${metaScore}/10): meta에 ${metaMissing.join(', ')} 누락`);
    suggestions.push(`meta 블록에 ${metaMissing.join(', ')} 추가`);
  }

  // 2. 연구 질문 명시
  const hasResearchQuestion = headings.some(h => /연구 질문|research question/i.test(h));
  const rqScore = hasResearchQuestion ? 10 : 4;
  breakdown['연구 질문 명시'] = {
    score: rqScore, max: 10,
    notes: hasResearchQuestion ? ['"연구 질문" heading 발견'] : ['"연구 질문" heading 없음']
  };
  if (!hasResearchQuestion) {
    missing.push(`연구 질문 명시 (${rqScore}/10): 첫 h1에 "연구 질문" 명시 필요`);
    suggestions.push('첫 섹션 heading을 "1. 연구 질문"으로, 한 줄 답을 적기');
  }

  // 3. 시행착오 밀도
  const hasTrialError = /시행착오|시도|실패|오류|문제/.test(allHeadings);
  const teScore = hasTrialError ? (/실패|오류/.test(body) ? 10 : 6) : 2;
  breakdown['시행착오 밀도'] = {
    score: teScore, max: 10,
    notes: hasTrialError ? ['시행착오 heading 있음'] : ['시행착오 heading 없음']
  };
  if (teScore < 10) {
    missing.push(`시행착오 밀도 (${teScore}/10): 실패 사례와 원인 페어 부족`);
    suggestions.push('"3. 시도와 시행착오" 섹션에 실패 사례 1개 이상 추가');
  }

  // 4. 검증 섹션
  const hasValidation = /검증|실험|비교|측정|평가/.test(allHeadings);
  const hasQuant = /\d+\s*(개|건|회|명|ms|s|MB|KB|%)/.test(body);
  const valScore = hasValidation ? (hasQuant ? 15 : 9) : 4;
  breakdown['검증 섹션'] = {
    score: valScore, max: 15,
    notes: [
      hasValidation ? '검증 heading 있음' : '검증 heading 없음',
      hasQuant ? '정량 근거 발견' : '정량 근거 없음'
    ]
  };
  if (valScore < 15) {
    missing.push(`검증 섹션 (${valScore}/15): ${!hasValidation ? '검증 heading 누락' : '정량 근거 부족'}`);
    suggestions.push('"6. 검증" 섹션에 측정값/비교표 추가');
  }

  // 5. 시각 자료
  const visualCount = stats.imageCount + stats.visualBriefCount;
  const visScore = visualCount === 0 ? 0 : visualCount === 1 ? 6 : 10;
  breakdown['시각 자료'] = {
    score: visScore, max: 10,
    notes: [`image ${stats.imageCount}개, visual_brief ${stats.visualBriefCount}개`]
  };
  if (visScore < 10) {
    missing.push(`시각 자료 (${visScore}/10): image+visual_brief 합 ${visualCount}개`);
    suggestions.push('visual_brief를 추가하고 research-diagrammer에 위임');
  }

  // 6. 표 활용
  const tabScore = stats.tableCount === 0 ? 0 : stats.tableCount === 1 ? 7 : 10;
  breakdown['표 활용'] = {
    score: tabScore, max: 10,
    notes: [`table ${stats.tableCount}개`]
  };
  if (tabScore < 10) {
    missing.push(`표 활용 (${tabScore}/10): 표 ${stats.tableCount}개`);
    suggestions.push('비교/요약 표를 1개 이상 추가');
  }

  // 7. 판단의 근거성
  const antiPatternHit = quality.warnings.some(w => w.code === 'FOLDER_EXPLORATION_ANTI_PATTERN');
  const lengthOk = stats.textLength >= 800;
  const judgScore = (antiPatternHit ? 0 : 5) + (lengthOk ? 5 : 0);
  breakdown['판단의 근거성'] = {
    score: judgScore, max: 10,
    notes: [
      antiPatternHit ? '안티패턴 발견' : '안티패턴 없음',
      `본문 ${stats.textLength}자`
    ]
  };
  if (judgScore < 10) {
    missing.push(`판단의 근거성 (${judgScore}/10): ${antiPatternHit ? '안티패턴 발견' : '본문 짧음'}`);
    if (!lengthOk) suggestions.push(`본문을 800자 이상으로 늘리기 (현재 ${stats.textLength})`);
  }

  // 8. 향후 과제
  const hasFuture = /남은|향후|한계|불확실|추후/.test(allHeadings);
  const fwScore = hasFuture ? 5 : 1;
  breakdown['향후 과제'] = {
    score: fwScore, max: 5,
    notes: [hasFuture ? '향후 heading 있음' : '향후 heading 없음']
  };
  if (fwScore < 5) {
    missing.push(`향후 과제 (${fwScore}/5): "8. 향후 과제" heading 누락`);
    suggestions.push('마지막 섹션에 "향후 과제" heading + 남은 질문 한 줄');
  }

  // 9. 안티패턴 회피
  const apAvoid = antiPatternHit ? 0 : 5;
  breakdown['안티패턴 회피'] = {
    score: apAvoid, max: 5,
    notes: [antiPatternHit ? '폴더 탐구형 키워드 다수' : '안티패턴 없음']
  };
  if (apAvoid < 5) {
    missing.push(`안티패턴 회피 (${apAvoid}/5): 폴더 탐구형 키워드 다수`);
    suggestions.push('"단순히", "구조를 살펴본다" 표현 제거');
  }

  // 10. 성격 일관성
  const nature = meta['연구 성격'];
  let natScore;
  let natNotes = [];
  if (!nature || !RESEARCH_NATURES.includes(String(nature).trim())) {
    natScore = 0;
    natNotes = [`meta.연구 성격이 ${RESEARCH_NATURES.join('/')} 중 하나가 아님 (현재: ${nature || '비어있음'})`];
  } else {
    const matchKeywords = {
      '구축': /시행착오|시도|단계|구현|구축|만들/,
      '분석': /현황|구조|원인|분석/,
      '검증': /가설|실험|측정|검증/
    };
    const re = matchKeywords[String(nature).trim()];
    if (re && re.test(allHeadings)) {
      natScore = 15;
      natNotes = [`'${nature}' 성격과 본문 강조점 일치`];
    } else {
      natScore = 7;
      natNotes = [`'${nature}' 성격이지만 본문 heading에 그 성격의 키워드가 약함`];
    }
  }
  breakdown['성격 일관성'] = { score: natScore, max: 15, notes: natNotes };
  if (natScore < 15) {
    missing.push(`성격 일관성 (${natScore}/15): ${natNotes[0]}`);
    suggestions.push("`meta.연구 성격`에 맞춰 heading 키워드를 강화하거나 성격을 정정");
  }

  const total = Object.values(breakdown).reduce((s, b) => s + b.score, 0);
  return { total, breakdown, missing, suggestions };
}

function formatReport(result, basename) {
  const lines = [];
  lines.push('');
  lines.push(`점수: ${result.total} / 100${basename ? `  (${basename})` : ''}`);
  lines.push('');
  lines.push('영역별:');
  for (const [area, b] of Object.entries(result.breakdown)) {
    const note = b.notes && b.notes.length ? b.notes.join('; ') : '';
    lines.push(`  - ${area}: ${b.score}/${b.max} — ${note}`);
  }
  if (result.missing.length) {
    lines.push('');
    lines.push('부족 항목:');
    for (const m of result.missing) lines.push(`  - ${m}`);
  }
  if (result.suggestions.length) {
    lines.push('');
    lines.push('수정 제안:');
    for (const s of result.suggestions) lines.push(`  - ${s}`);
  }
  return lines.join('\n');
}

function resolveYaml(selector, storage) {
  const entries = listYaml(storage);
  if (/^\d+$/.test(selector)) {
    const e = entries[Number(selector) - 1];
    if (!e) throw new Error(`목록 번호가 범위를 벗어남: ${selector}`);
    return e;
  }
  const direct = path.resolve(selector);
  if (fs.existsSync(direct)) {
    return { basename: path.basename(direct, path.extname(direct)), inputPath: direct };
  }
  const inCentral = path.join(storage.inputs, selector.endsWith('.yaml') ? selector : `${selector}.yaml`);
  if (fs.existsSync(inCentral)) {
    return { basename: path.basename(inCentral, path.extname(inCentral)), inputPath: inCentral };
  }
  throw new Error(`YAML을 찾을 수 없음: ${selector}`);
}

function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const filtered = args.filter(a => a !== '--json');
  if (!filtered.length || filtered.includes('--help') || filtered.includes('-h')) {
    console.log('사용법: node scripts/critique.js <yaml-id-or-path> [--json]');
    process.exit(filtered.length ? 0 : 1);
  }
  const storage = ensureStorage();
  const target = resolveYaml(filtered[0], storage);
  const doc = loadYaml(target.inputPath);
  const result = critiqueScore(doc);
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatReport(result, target.basename));
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`✗ 채점 실패: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { critiqueScore, formatReport };
```

- [ ] **Step 4: 테스트 실행으로 통과 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```powershell
git add plugins/silotek-research-log/scripts/critique.js plugins/silotek-research-log/tests/critique.test.js
git commit -m "Add scripts/critique.js with 10-area / 100-point rubric"
```

---

### Task 12: `commands/critique.md` 생성

**Files:**
- Create: `plugins/silotek-research-log/commands/critique.md`

- [ ] **Step 1: 파일 작성**

`plugins/silotek-research-log/commands/critique.md`:

```markdown
---
description: 저장된 사일로텍 연구일지 YAML을 채점하고 부족 항목·수정 제안을 보고합니다.
---

# 사일로텍 연구일지 채점

저장된 YAML 한 개를 받아 100점 만점 채점 결과를 사용자에게 보여준다.

## 사용법

```text
/silotek-research-log:critique <id|basename|yaml-path>
```

`<id>`는 `/silotek-research-log:build-docx --list`에 보이는 번호. basename은 `2026-05-10-...` 형태. yaml-path는 절대/상대 경로.

## 흐름

1. 가능하면 `research-critic` 서브에이전트를 호출한다 (Claude Code agents에 `research-critic`이 등록돼 있을 때).
   - 메인 세션이 저장된 YAML의 절대 경로를 인자로 넘긴다.
   - 서브에이전트가 한국어로 점수와 부족 항목을 보고.
2. `research-critic`이 등록되지 않은 환경에서는 fallback CLI 실행:

   Windows PowerShell:
   ```powershell
   node "$env:CLAUDE_PLUGIN_ROOT\scripts\critique.js" <id>
   ```

   macOS/Linux shell:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/critique.js" <id>
   ```

3. 결과를 사용자에게 그대로 보여준다 — 점수, 영역별 breakdown, 부족 항목, 수정 제안.
4. 사용자가 보강 요청하면 메인 세션이 부족 항목을 채워 다시 작성하고 `/silotek-research-log:draft`로 새 저장본을 만든다.

## JSON 출력 (CI / 자동화용)

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\critique.js" <id> --json
```

`{ total, breakdown, missing, suggestions }` JSON.

## 채점 기준 요약

10 영역 / 100점 — 자세한 표는 `agents/research-critic.md` 또는 `scripts/critique.js`의 `RUBRIC` 상수.
```

- [ ] **Step 2: claude plugin validate**

Run: `claude plugin validate .`

Expected: 정상 종료.

- [ ] **Step 3: 커밋**

```powershell
git add plugins/silotek-research-log/commands/critique.md
git commit -m "Add /silotek-research-log:critique slash command"
```

---

## Phase 6 — 회귀 baseline (Task 13)

### Task 13: `examples/yaml/` 회귀 baseline 2개

**Files:**
- Create: `plugins/silotek-research-log/examples/yaml/rf-card-baseline.yaml`
- Create: `plugins/silotek-research-log/examples/yaml/plugin-direction-baseline.yaml`
- Modify: `plugins/silotek-research-log/tests/critique.test.js`

- [ ] **Step 1: rf-card-baseline.yaml 작성**

`plugins/silotek-research-log/examples/yaml/rf-card-baseline.yaml`:

```yaml
title: "연구 일지"
subtitle: "RF카드 포렌식 앱 프로파일 용어 체계 정비"
meta:
  연구 주제: "RF카드 포렌식 앱 프로파일 용어 체계 정비"
  연구 성격: "분석"
  연구 단계: "기술 검증"
  분류: "보안, 임베디드"
  작성일: "2026년 4월 15일"
  작성자: "익명"
sections:
  - h1: "1. 배경"
  - p: "RF카드 포렌식 앱에서 프로파일 용어가 컴포넌트마다 일관되지 않다. 같은 객체를 \"카드\", \"매체\", \"태그\"로 부르는 세 곳을 발견했다. 본 문서는 현재 용어 체계를 정비하기 위한 분석 결과다."
  - h1: "2. 현재 구조"
  - p: "용어 매핑은 다음과 같이 갈라져 있다. 단말 측: \"카드\". 서버 측: \"매체\". 분석 보고서: \"태그\". 이 셋이 동일 대상을 가리키지만 매번 변환 코드가 들어가야 한다."
  - h1: "3. 변경 제안"
  - bullets:
      - "용어 1: \"카드\"로 단일화"
      - "용어 2: 서버측 \"매체\"는 deprecate"
      - "용어 3: 보고서 \"태그\"는 \"카드 식별자\"로"
  - h1: "4. 위험 평가"
  - p: "기존 클라이언트 호환성. 데이터베이스 컬럼명. 외부 보고서 포맷."
  - table:
      headers: ["계층", "기존", "변경 후"]
      rows:
        - ["단말", "카드", "카드"]
        - ["서버", "매체", "카드"]
        - ["보고서", "태그", "카드 식별자"]
  - h1: "5. 결론"
  - p: "단말 \"카드\"를 표준으로 채택. 서버측 \"매체\" 점진 제거. 보고서 \"태그\"를 \"카드 식별자\"로 변경 권고."
```

- [ ] **Step 2: plugin-direction-baseline.yaml 작성**

`plugins/silotek-research-log/examples/yaml/plugin-direction-baseline.yaml`:

```yaml
title: "연구 일지"
subtitle: "사내 Claude Code 플러그인·Skill 기반 AI 자동화 방향성"
meta:
  연구 주제: "사내 Claude Code 플러그인·Skill 기반 AI 자동화 방향성"
  연구 성격: "분석"
  연구 단계: "방향성 검토"
  분류: "AI/자동화"
  작성일: "2026년 4월 22일"
  작성자: "익명"
sections:
  - h1: "1. 배경"
  - p: "사내 여러 팀에서 Claude Code 플러그인과 Skill을 산발적으로 도입하고 있다. 표준 가이드 없이 도입 중이라 중복과 누락이 동시에 발생한다. 본 문서는 자동화 방향성을 정리한다."
  - h1: "2. 현재 도입 현황"
  - p: "팀 A: 자체 plugin 1개. 팀 B: SKILL.md 3개. 팀 C: 자체 명령어 모음."
  - h1: "3. 표준화 제안"
  - bullets:
      - "공유 marketplace 운영"
      - "Skill 작성 가이드 한 곳"
      - "Plugin 버전 관리 정책"
  - h1: "4. 우선순위"
  - p: "단계 1 — marketplace 인프라. 단계 2 — Skill 가이드. 단계 3 — Plugin 버전."
  - table:
      headers: ["단계", "기간", "산출물"]
      rows:
        - ["1", "2주", "marketplace 운영"]
        - ["2", "1주", "Skill 가이드"]
        - ["3", "1주", "버전 정책"]
  - h1: "5. 결론"
  - p: "marketplace 우선 도입. 단계적 표준화 진행."
```

- [ ] **Step 3: 회귀 테스트 추가**

`plugins/silotek-research-log/tests/critique.test.js` 끝에 추가:

```js
function loadExample(name) {
  return yaml.load(fs.readFileSync(
    path.join(__dirname, '..', 'examples', 'yaml', name), 'utf8'
  ));
}

test('rf-card-baseline scores below 60 (low quality regression)', () => {
  const result = critiqueScore(loadExample('rf-card-baseline.yaml'));
  assert.ok(result.total < 60, `expected < 60, got ${result.total}`);
  // 시각 자료 영역이 0이거나 낮아야 (image+brief 0개)
  assert.equal(result.breakdown['시각 자료'].score, 0);
  // 검증 섹션 점수 낮아야 (검증 heading 없음)
  assert.ok(result.breakdown['검증 섹션'].score < 15);
});

test('plugin-direction-baseline scores below 65 (low quality regression)', () => {
  const result = critiqueScore(loadExample('plugin-direction-baseline.yaml'));
  assert.ok(result.total < 65, `expected < 65, got ${result.total}`);
  assert.equal(result.breakdown['시각 자료'].score, 0);
});
```

- [ ] **Step 4: 테스트 실행으로 회귀 통과 확인**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS. baseline들이 의도된 범위(< 60, < 65)에 점수.

- [ ] **Step 5: 커밋**

```powershell
git add plugins/silotek-research-log/examples/ plugins/silotek-research-log/tests/critique.test.js
git commit -m "Add 2 regression baselines (rf-card / plugin-direction)"
```

---

## Phase 7 — 발행 (Task 14~16)

### Task 14: 버전 0.2.0 동기화

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

Expected: `0.1.3` 세 번.

- [ ] **Step 2: 세 파일 수정**

`.claude-plugin/marketplace.json`의 `plugins[0].version`을 `"0.2.0"`으로.
`plugins/silotek-research-log/.claude-plugin/plugin.json`의 `version`을 `"0.2.0"`으로.
`plugins/silotek-research-log/package.json`의 `version`을 `"0.2.0"`으로.

- [ ] **Step 3: package-lock.json 동기화**

Run: `npm.cmd install --prefix plugins/silotek-research-log`

Expected: `package-lock.json`의 `version` → `0.2.0`.

- [ ] **Step 4: 버전 확인 재실행**

Run:
```powershell
node -e "console.log(require('./.claude-plugin/marketplace.json').plugins[0].version)"
node -e "console.log(require('./plugins/silotek-research-log/.claude-plugin/plugin.json').version)"
node -e "console.log(require('./plugins/silotek-research-log/package.json').version)"
```

Expected: `0.2.0` 세 번.

- [ ] **Step 5: 커밋**

```powershell
git add .claude-plugin/marketplace.json plugins/silotek-research-log/.claude-plugin/plugin.json plugins/silotek-research-log/package.json plugins/silotek-research-log/package-lock.json
git commit -m "Bump research-log plugin to 0.2.0"
```

---

### Task 15: `CLAUDE.md` 갱신

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: v0.2.0 기능 안내 추가**

`CLAUDE.md`의 "## 아키텍처 (먼저 읽어야 할 것)" 섹션 안 "1. 플러그인 표면 (Claude Code)" 블록을 다음으로 교체:

```markdown
### 1. 플러그인 표면 (Claude Code)

- [commands/setup.md](plugins/silotek-research-log/commands/setup.md), [commands/draft.md](plugins/silotek-research-log/commands/draft.md), [commands/build-docx.md](plugins/silotek-research-log/commands/build-docx.md), [commands/critique.md](plugins/silotek-research-log/commands/critique.md) — 네 개 slash command (`/silotek-research-log:setup`, `:draft`, `:build-docx`, `:critique`).
- [skills/draft/SKILL.md](plugins/silotek-research-log/skills/draft/SKILL.md), [skills/build-docx/SKILL.md](plugins/silotek-research-log/skills/build-docx/SKILL.md) — drafting/build 동작을 안내하는 Claude Skill. Skill **description**은 영어(Anthropic 권장), 본문은 한국어 가능.
- [agents/research-diagrammer.md](plugins/silotek-research-log/agents/research-diagrammer.md), [agents/research-critic.md](plugins/silotek-research-log/agents/research-critic.md) — 두 개 서브에이전트 (v0.2.0). 메인 세션이 자동 호출하며, Claude Code 환경이 플러그인 안 `agents/` 자동 등록을 지원하지 않으면 사용자가 `~/.claude/agents/`에 복사. 미설치 시 `scripts/critique.js`가 fallback.
```

또 같은 파일의 "### YAML 스키마 (load-bearing)" 섹션 본문을 다음으로 교체:

```markdown
### YAML 스키마 (load-bearing)

`sections`는 flat command list다. 각 항목은 문자열 문단이거나 단일 키 객체. 허용 키는 [scripts/common.js](plugins/silotek-research-log/scripts/common.js)의 `SECTION_ELEMENT_KEYS`에 정의:

```
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank, visual_brief
```

`visual_brief`(v0.2.0)는 `purpose / claim / evidence / forbidden / palette / caption` 6필드를 모두 가진다. research-diagrammer 서브에이전트가 brief를 받아 그림을 만들고, 메인 세션이 결과 image element와 페어링한다.

금지 grouping 키(`heading`, `body`, `paragraph`, `list`, `items`, `content`, `subsections`)가 들어오면 `save-draft.js` / `build-docx.js`가 구조화된 오류와 함께 거부한다. [templates/research-log.yaml](plugins/silotek-research-log/templates/research-log.yaml)이 유일한 정식 템플릿이다.

`meta` 권장 키 6개 (`연구 주제`, `연구 성격`, `연구 단계`, `분류`, `작성일`, `작성자`). `연구 성격`은 `구축` / `분석` / `검증` 중 하나 (`META_INVALID_VALUE` warn). top-level에 `project`/`date`/`authors`/`keywords`/`category` 같은 영문 키는 거절.
```

또 "## 자주 쓰는 명령" 섹션에 critique 명령을 추가:

```powershell
# 채점 (서브에이전트 미설치 환경 fallback)
node .\plugins\silotek-research-log\scripts\critique.js 1
```

- [ ] **Step 2: 커밋**

```powershell
git add CLAUDE.md
git commit -m "Document v0.2.0 features in CLAUDE.md"
```

---

### Task 16: End-to-end 검증

**Files**: (수정 없음 — 검증만)

- [ ] **Step 1: 전체 테스트 스위트**

Run: `npm.cmd test --prefix plugins/silotek-research-log`

Expected: 모든 테스트 PASS. 종료 코드 0. (v0.1.3 20개 + v0.2.0 신규 약 12개 = 32개 안팎)

- [ ] **Step 2: 모든 스크립트 syntax 검증**

```powershell
node --check plugins/silotek-research-log/scripts/common.js
node --check plugins/silotek-research-log/scripts/save-draft.js
node --check plugins/silotek-research-log/scripts/build-docx.js
node --check plugins/silotek-research-log/scripts/list-yaml.js
node --check plugins/silotek-research-log/scripts/critique.js
node --check plugins/silotek-research-log/build.js
```

Expected: 6개 명령 모두 출력 없이 정상 종료.

- [ ] **Step 3: claude plugin validate**

Run: `claude plugin validate .`

Expected: 정상 종료. marketplace 0.2.0.

- [ ] **Step 4: 새 템플릿으로 풀 흐름 검증**

PowerShell:
```powershell
$tmpDir = New-Item -ItemType Directory -Path ([System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "silotek-e2e-" + [System.Guid]::NewGuid().ToString("N").Substring(0,8))) -Force
$env:SILOTEK_RESEARCH_LOG_ROOT = $tmpDir.FullName
Copy-Item plugins/silotek-research-log/templates/research-log.yaml .silotek-research-log-draft.yaml
node plugins/silotek-research-log/scripts/save-draft.js .silotek-research-log-draft.yaml --mode folder --source-root .
```

Expected:
- `✓ 연구일지 YAML 저장 완료`
- `⚠ 품질 경고` 블록에 META_MISSING_KEY (placeholder 때문) + META_INVALID_VALUE + NO_VISUAL_BRIEF 등이 표시됨
- 종료 코드 0

- [ ] **Step 5: critique CLI 동작 확인**

Run: `node plugins/silotek-research-log/scripts/critique.js 1`

Expected:
- "점수: <낮은 점수> / 100" 출력
- 영역별 10 줄 출력
- 부족 항목 / 수정 제안 출력
- 종료 코드 0

JSON 모드:
```powershell
node plugins/silotek-research-log/scripts/critique.js 1 --json
```

Expected: JSON 출력. `breakdown` 객체에 10 키.

- [ ] **Step 6: DOCX 빌드 + visual_brief 박스 확인**

Run: `node plugins/silotek-research-log/scripts/build-docx.js 1`

Expected: 빌드 성공. 결과 DOCX 파일을 열어 다음 확인:
- 표지 메타 테이블에 `연구 성격` 행이 있어야 함 (값이 placeholder라도)
- 본문에 visual_brief 회색 박스가 보이거나 (visual_brief가 본문에 있다면), 없으면 8 섹션 heading만

- [ ] **Step 7: 회귀 baseline 점수 확인**

```powershell
node plugins/silotek-research-log/scripts/critique.js plugins/silotek-research-log/examples/yaml/rf-card-baseline.yaml
node plugins/silotek-research-log/scripts/critique.js plugins/silotek-research-log/examples/yaml/plugin-direction-baseline.yaml
```

Expected:
- rf-card → 60점 미만, 시각 자료 0/10
- plugin-direction → 65점 미만, 시각 자료 0/10

- [ ] **Step 8: 정리**

```powershell
Remove-Item .silotek-research-log-draft.yaml -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force $env:SILOTEK_RESEARCH_LOG_ROOT
$env:SILOTEK_RESEARCH_LOG_ROOT = $null
```

- [ ] **Step 9: 최종 git log 확인**

Run: `git log --oneline -20`

Expected: Phase 1~7의 모든 커밋(약 16개)이 main(`e385e5e`) 위에 직선으로 쌓여 있음.

---

## 자체 검토 (Self-Review)

**1. Spec coverage**
- v0.2.0 spec 신규 결정 (성격 8/9/10/11) → Task 1~5
- 기존 v0.2.0 spec (visual_brief / diagrammer / critic / critique.js / 회귀 baseline) → Task 6~13
- 발행 (CLAUDE.md / 버전 / e2e) → Task 14~16
- v0.1.3에서 결정된 정책(warn 우선, error는 구조 결함만)은 그대로 계승

**2. Placeholder scan**
- 모든 코드 step에 실제 코드 또는 정확한 명령
- "TBD", "implement later" 없음
- "Add error handling" 같은 모호한 step 없음

**3. Type consistency**
- `RESEARCH_NATURES` = `['구축', '분석', '검증']` (한국어 라벨, 사용자 결정 11)
- `META_RECOMMENDED_KEYS` 6개 키 순서 일관: `['연구 주제', '연구 성격', '연구 단계', '분류', '작성일', '작성자']`
- `critiqueScore` 반환 shape `{ total, breakdown, missing, suggestions }` Task 11과 11의 테스트, agents/research-critic.md, commands/critique.md 모두 일치
- 채점 표 합 100점 (Task 11 구현, Task 10 agent 정의 표 둘 다 동일)

**4. Dependency order**
- Task 1 (상수) → Task 2 (META_INVALID_VALUE) → Task 3 (template)
- Task 4 (draft.md) → Task 5 (SKILL.md) — 같은 패턴
- Task 6 (visual_brief 스키마) → Task 7 (NO_VISUAL_BRIEF) → Task 8 (build.js 렌더)
- Task 9, 10 (agents) — 독립 가능
- Task 11 (critique.js) → Task 12 (commands/critique.md) → Task 13 (회귀 baseline 점수 검증)
- Task 14, 15, 16 — 발행 단계, 마지막

이 plan은 단독 plan이며 완료 후 working/testable v0.2.0 산출물이 나온다.
