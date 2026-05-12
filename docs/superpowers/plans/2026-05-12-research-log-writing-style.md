# 연구일지 본문 문체 규칙 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플러그인 레벨 `references/writing-style.md`(공식 보고서 행정체 규칙 ~20줄)를 신설하고 `research-log-yaml-create` 스킬에 연결해, 연구일지 본문 산문이 일관된 행정체로 작성되게 한다. 그리고 silotek-tools 0.4.1 → 0.4.2로 patch bump.

**Architecture:** 작은 reference 문서 하나가 문체 규칙을 담는다. `research-log-yaml-create/SKILL.md`에 그 문서를 가리키는 절 하나(쓰기 전 읽어 적용, 위반 초안 거부·재작성), 안티패턴 한 줄, 절차 step 3에 문구를 추가한다. `research-log-yaml-retouch`는 의도적으로 손대지 않는다. `structure.test.js`에 연결 가드 테스트 하나를 추가하고, 기존 버전 테스트를 0.4.2로 갱신한다. Node 스크립트는 변경하지 않는다(문체 판단은 Claude 쪽 영역).

**Tech Stack:** Markdown 문서, JSON 설정, Node.js `node:test`(플러그인 기존 테스트 스위트), `claude plugin validate`.

---

## File Structure

- `plugins/silotek-tools/references/writing-style.md` — **신규**. ~20줄 행정체 규칙. 플러그인 레벨 `references/` 디렉터리도 이번에 신설(첫 사례 — 선례: `silotek-diagrammer` 에이전트가 스킬-로컬 `references/`를 교차 참조).
- `plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md` — **수정**. 작은 편집 3개: (a) "## 필수 절차" step 3에 문구, (b) "## 8섹션 흐름"과 "## 스스로 걸러야 할 안티패턴" 사이에 "## 본문 문체 (Writing Style)" 절 신설, (c) 안티패턴 목록에 한 줄.
- `plugins/silotek-tools/tests/structure.test.js` — **수정**. 새 테스트 1개(writing-style.md 존재 + 핵심 마커 포함 + SKILL.md가 이를 참조); 기존 `'plugin version fields are all 0.4.1'` 테스트를 `0.4.2`로(제목 + assertion 5개).
- `.claude-plugin/marketplace.json`, `plugins/silotek-tools/.claude-plugin/plugin.json`, `plugins/silotek-tools/package.json`, `plugins/silotek-tools/package-lock.json` — **수정**. version `0.4.1` → `0.4.2`.

범위 밖(플랜 끝의 "Out of Scope" 참조): `research-log-yaml-retouch`, `CLAUDE.md`, README들, `templates/research-log.yaml`, 모든 Node 스크립트.

## Preconditions

- 브랜치 `feature/research-log-writing-style` 위에서 작업한다(이미 생성됨 — 설계 spec이 `461fc38`로 커밋돼 있음). `git branch --show-current`로 확인.
- 작업 트리에 사전 미커밋 변경이 있다: `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `plugins/silotek-tools/README.md`, `plugins/silotek-tools/assets/fonts/README.md`, 그리고 untracked `.claude/`. **이 중 어느 것도 스테이징·커밋하지 않는다.** 이 플랜의 모든 커밋은 명시적 파일 목록을 스테이징한다 — 그 목록만 그대로 쓴다.

---

### Task 1: `references/writing-style.md` 신설 + `research-log-yaml-create`에 연결

**Files:**
- Create: `plugins/silotek-tools/references/writing-style.md`
- Modify: `plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md`
- Test: `plugins/silotek-tools/tests/structure.test.js` (새 테스트 블록 추가)

- [ ] **Step 1: 실패하는 가드 테스트 추가**

`plugins/silotek-tools/tests/structure.test.js`의 **맨 끝** 마지막 `test(...)` 호출 다음에 빈 줄을 두고 아래 블록을 붙인다. 정확한 앵커 — 파일 마지막 테스트의 끝부분이 다음과 같다:

```js
    assert.match(text, /병렬|parallel/i);
    assert.match(text, /confirm/i);
  }
});
```

이를 다음으로 바꾼다(같은 내용 + 새 테스트 블록):

```js
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
```

- [ ] **Step 2: 스위트를 돌려 새 테스트가 실패하는지 확인**

Run: `npm.cmd test --prefix plugins/silotek-tools`
Expected: 새 테스트 `research-log-yaml-create references the body writing-style guide...`가 FAIL(`references/writing-style.md must exist` — 아직 파일 없음). 나머지 테스트는 모두 PASS.

- [ ] **Step 3: `plugins/silotek-tools/references/writing-style.md` 생성**

파일을 다음 내용 그대로 만든다(이로써 `plugins/silotek-tools/references/` 디렉터리도 생성된다):

```markdown
# 연구일지 본문 문체 (Writing Style)

이 규칙은 연구일지 YAML `sections`의 산문 텍스트에만 적용된다. 플러그인 자체 문서(스킬·커맨드·README·이 파일)에는 적용하지 않는다.

본문 산문은 공식 보고서 행정체로 쓴다:

- **종결어미**: 평서 현재형 `~한다 / ~된다 / ~이다`, 과거형 `~하였다 / ~되었다`. 회고체 `~했다` 연속과 짧은 단정문 나열을 피한다.
- **주체**: 무주체 객관체 (`~이 확인되었다 / ~을 수행한 결과`). 1인칭과 결정 주체를 노출하지 않는다.
- **어휘**: 동사는 명사화 형태를 우선한다 (`확정하였다 / 재정의하였다 / 분리하였다 / 통합하였다`). 구어적·물리적 동사(`못박다, 그었다, 빼냈다, 녹이다, 끊다, 잡았다, 풀었다, 받아들였다, 살리다, 깔다, 깨졌다` 등)를 피하고 명사화 동사로 바꾼다. `그래서` 대신 `이에 따라 / 이를 통해`.
- **구두점**: 콜론(`:`)으로 레이블과 부연을 도입한다. em dash(`—`)를 쓰지 않는다(콜론·괄호·새 문장으로 분해). 마침표로 문장을 단호히 끊는다.
- **구조**: 단락 첫 문장은 그 단락의 주제문이다(결론이 아니라 주제 제시). 인과를 한 문장에 압축하지 않는다(한 문장 한 정보 + 인과 연결어). 자기 비평은 본문에 섞지 말고 §5(원인 분석)·§7(교훈) 절로 분리한다.
- **식별자**: 커밋 해시·파일명·필드명·명령어는 백틱으로 격리한다(행정체에서도 정당). 영문 약어(YAML, DOCX, API, LLM)는 본문에 그대로 둔다.
- **예외**: §3(시도와 시행착오)의 사유 서술은 객관체를 유지하되 시간 흐름(`~한 후 / 직후 / 동 단계에서`)은 보존한다.
```

- [ ] **Step 4: `research-log-yaml-create/SKILL.md` — 편집 3개**

**편집 (a)** — 절차 step 3. 찾을 것:

```
3. 현재 작업 폴더에 `.silotek-research-log-draft.yaml`을 작성한다 — `templates/research-log.yaml`의 평탄한 `sections` 스키마, 8섹션 흐름, 성격별 강조를 따른다.
```

바꿀 것:

```
3. 현재 작업 폴더에 `.silotek-research-log-draft.yaml`을 작성한다 — `templates/research-log.yaml`의 평탄한 `sections` 스키마, 8섹션 흐름, 성격별 강조, 본문 문체(`references/writing-style.md`)를 따른다.
```

**편집 (b)** — 새 절 삽입. 찾을 것(8섹션 흐름 목록의 끝 + 바로 다음 헤딩):

```
8. 향후 과제 / 남은 불확실성

## 스스로 걸러야 할 안티패턴
```

바꿀 것:

```
8. 향후 과제 / 남은 불확실성

## 본문 문체 (Writing Style)

본문 산문(YAML `sections`의 텍스트)은 공식 보고서 행정체로 쓴다. 산문을 쓰기 전에 플러그인 루트의 `references/writing-style.md`를 읽어 적용한다 — 플러그인 루트 해석은 "스크립트" 절의 `$pluginRoot` 로직을 그대로 쓰고, 경로는 `Join-Path $pluginRoot "references\writing-style.md"` (POSIX: `"$plugin_root/references/writing-style.md"`)다. 회고체 종결어미("~했다"), em dash(—), "그래서" 연결, 1인칭·결정 주체 노출, 구어적 동사를 쓴 초안은 작성 단계에서 거부하고 재작성한다.

## 스스로 걸러야 할 안티패턴
```

**편집 (c)** — 안티패턴 한 줄 추가. 찾을 것:

```
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동으로 경고함.
```

바꿀 것:

```
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동으로 경고함.
- 회고체 종결어미·em dash·"그래서" 연결·1인칭 결정 주체 노출 — `references/writing-style.md` 위반.
```

주의: `## 스크립트` 아래의 `## Windows PowerShell` / `## macOS/Linux shell` 하위 절은 건드리지 않는다 — `structure.test.js`가 모든 SKILL.md에 두 절이 있어야 한다고 요구한다. 편집 (b)의 새 텍스트는 해석된 `$pluginRoot` 변수와 `references/...` 경로를 쓰며 `${CLAUDE_PLUGIN_ROOT}/scripts` 형태가 아니므로, `'... do not rely on a bare CLAUDE_PLUGIN_ROOT script path'` 테스트에 걸리지 않는다.

- [ ] **Step 5: 스위트를 돌려 전부 통과하는지 확인**

Run: `npm.cmd test --prefix plugins/silotek-tools`
Expected: 모든 테스트 PASS — 새 테스트 `research-log-yaml-create references the body writing-style guide...` 포함, 그리고 기존 `'active docs do not expose stale draft, old namespace, or quality-scoring language'` 테스트도 PASS(새 SKILL.md 텍스트는 금지 패턴을 하나도 도입하지 않음).

- [ ] **Step 6: 플러그인 검증**

Run: `claude plugin validate .`
Expected: 에러 없음(새 플러그인 레벨 `references/` 디렉터리는 검증에 영향 없음).

- [ ] **Step 7: 커밋**

```bash
git add plugins/silotek-tools/references/writing-style.md plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md plugins/silotek-tools/tests/structure.test.js
git commit -m "$(cat <<'EOF'
feat(silotek-tools): add references/writing-style.md and wire it into research-log-yaml-create

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: silotek-tools 0.4.1 → 0.4.2 bump

**Files:**
- Test: `plugins/silotek-tools/tests/structure.test.js` (기존 버전 테스트 갱신)
- Modify: `.claude-plugin/marketplace.json`
- Modify: `plugins/silotek-tools/.claude-plugin/plugin.json`
- Modify: `plugins/silotek-tools/package.json`
- Modify: `plugins/silotek-tools/package-lock.json`

- [ ] **Step 1: 버전 테스트를 0.4.2 기대값으로 갱신(이게 실패하는 테스트)**

`plugins/silotek-tools/tests/structure.test.js`에서 찾을 것:

```js
test('plugin version fields are all 0.4.1', () => {
  const marketplace = readJson(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'));
  const plugin = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));
  const pkg = readJson(path.join(PLUGIN_ROOT, 'package.json'));
  const lock = readJson(path.join(PLUGIN_ROOT, 'package-lock.json'));
  assert.equal(marketplace.plugins[0].version, '0.4.1');
  assert.equal(plugin.version, '0.4.1');
  assert.equal(pkg.version, '0.4.1');
  assert.equal(lock.version, '0.4.1');
  assert.equal(lock.packages[''].version, '0.4.1');
});
```

바꿀 것:

```js
test('plugin version fields are all 0.4.2', () => {
  const marketplace = readJson(path.join(REPO_ROOT, '.claude-plugin', 'marketplace.json'));
  const plugin = readJson(path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'));
  const pkg = readJson(path.join(PLUGIN_ROOT, 'package.json'));
  const lock = readJson(path.join(PLUGIN_ROOT, 'package-lock.json'));
  assert.equal(marketplace.plugins[0].version, '0.4.2');
  assert.equal(plugin.version, '0.4.2');
  assert.equal(pkg.version, '0.4.2');
  assert.equal(lock.version, '0.4.2');
  assert.equal(lock.packages[''].version, '0.4.2');
});
```

- [ ] **Step 2: 스위트를 돌려 버전 테스트가 실패하는지 확인**

Run: `npm.cmd test --prefix plugins/silotek-tools`
Expected: `plugin version fields are all 0.4.2`가 FAIL(JSON 파일들이 아직 `0.4.1`). Task 1 테스트들은 여전히 PASS.

- [ ] **Step 3: `.claude-plugin/marketplace.json` bump**

찾을 것: `      "version": "0.4.1",`
바꿀 것: `      "version": "0.4.2",`
(이것은 `plugins` 배열의 단일 항목 버전 — 파일에 한 번 등장.)

- [ ] **Step 4: `plugins/silotek-tools/.claude-plugin/plugin.json` bump**

찾을 것: `  "version": "0.4.1",`
바꿀 것: `  "version": "0.4.2",`
(한 번 등장.)

- [ ] **Step 5: `plugins/silotek-tools/package.json` bump**

찾을 것: `  "version": "0.4.1",`
바꿀 것: `  "version": "0.4.2",`
(한 번 등장 — 파일 상단의 패키지 자체 버전.)

- [ ] **Step 6: `plugins/silotek-tools/package-lock.json` bump(두 필드)**

이 파일에서 `"version": "0.4.1",`의 모든 등장을 `"version": "0.4.2",`로 바꾼다(replace-all). 정확히 두 개다: 최상위 `version`(3번 줄 부근)과 `packages[""].version`(9번 줄 부근). 어떤 의존성도 버전 `0.4.1`을 쓰지 않으므로 replace-all이 안전하다.

- [ ] **Step 7: 스위트를 돌려 전부 통과하는지 확인**

Run: `npm.cmd test --prefix plugins/silotek-tools`
Expected: 모든 테스트 PASS — `plugin version fields are all 0.4.2` 포함.

- [ ] **Step 8: 플러그인 검증**

Run: `claude plugin validate .`
Expected: 에러 없음.

- [ ] **Step 9: 커밋**

```bash
git add .claude-plugin/marketplace.json plugins/silotek-tools/.claude-plugin/plugin.json plugins/silotek-tools/package.json plugins/silotek-tools/package-lock.json plugins/silotek-tools/tests/structure.test.js
git commit -m "$(cat <<'EOF'
chore(silotek-tools): bump to 0.4.2

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: 최종 점검**

Run: `git log --oneline -3`
Expected: 상위 두 커밋이 `chore(silotek-tools): bump to 0.4.2`와 `feat(silotek-tools): add references/writing-style.md and wire it into research-log-yaml-create`, 그 아래에 설계 spec 커밋 `Add design spec: research-log body writing-style rules`.

Run: `git status --short`
Expected: 사전 미커밋 파일들(`.gitignore`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `plugins/silotek-tools/README.md`, `plugins/silotek-tools/assets/fonts/README.md`)과 untracked `.claude/`만 — 이 플랜에서 만든 것 중 unstaged/uncommitted로 남은 게 없어야 함.

---

## Out of Scope / Follow-ups

- **`research-log-yaml-retouch`** — 의도적으로 `references/writing-style.md`에 연결하지 않음. 과거 회고체 YAML을 일괄 회수할 필요가 생기면 그 SKILL.md에 `## 본문 문체 회수 (Writing Style)` 절을 추가해 같은 파일을 참조하면 된다. 이 플랜에는 없음.
- **`CLAUDE.md`(저장소 루트)** — 이상적으로는 `## 아키텍처`에 `references/writing-style.md` 한 줄, `## 버전 관리`에 v0.4.2 한 줄을 더해야 한다. **연기:** `CLAUDE.md`에 현재 미커밋 편집이 있어, 우리 변경을 그 WIP와 한 커밋에 묶는 것은 부적절하다. WIP가 정리된 뒤 수동으로 한다.
- **README들** — 같은 이유(`README.md`, `plugins/silotek-tools/README.md`에 미커밋 편집). 나중에 새 reference 문서를 언급한다.
- **`templates/research-log.yaml`** — `references/writing-style.md`를 가리키는 주석 한 줄이면 좋겠으나, 변경 최소화를 위해 제외.
- **`save-draft.js` 린트** — 섹션 산문의 em dash / `~했다` 종결어미 / `그래서` 연결을 자동 검출. `CLAUDE.md`의 "문체 판단은 Claude 쪽, Node 쪽 아님" 경계를 넘으므로, 그 경계 재검토가 선행돼야 한다.
```

