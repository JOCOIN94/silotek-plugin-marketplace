# 연구일지 본문 문체 규칙 추가 설계

작성일: 2026-05-12
대상 플러그인: `plugins/silotek-tools` (현재 v0.4.1 → 이 작업으로 v0.4.2)

## 배경 / 문제

`research-log-yaml-create` 스킬은 8섹션 흐름·연구 성격(구축/분석/검증)·안티패턴은 지시하지만 **본문 산문의 문체(register)에 대해서는 아무 말도 하지 않는다.** 그래서 무인 실행 시 결과물의 어조가 들쭉날쭉하다 — 회고체 종결어미("~했다"), em dash(—) 남발, "그래서" 연결, 작은따옴표 비꼼, 1인칭·결정 주체 노출, 구어적·물리적 동사("못박다", "그었다", "녹이다" 등)가 섞여 공식 보고서 톤이 되지 않는다.

채팅에서 "행정체로 다시 써봐"라고 직접 지시하면 Claude는 잘 처리한다. 핵심은 그 지시를 **스킬에 박아 두는 것** — 운영자가 매번 말해주지 않아도 일관된 어조가 나오도록.

## 목표

1. 연구일지 본문 산문에만 적용되는 공식 보고서 행정체 규칙을 **간결한 단일 reference 문서**(`plugins/silotek-tools/references/writing-style.md`, ~20줄)로 둔다.
2. `research-log-yaml-create`가 산문 작성 전 이 문서를 읽어 적용하고, 위반 초안을 작성 단계에서 거부·재작성하도록 지시 한 절을 추가한다.
3. 버전을 v0.4.2로 patch bump (비-브레이킹).

## 결정 사항 (근거 포함)

- **소비자 = `research-log-yaml-create`만.** `research-log-yaml-retouch`는 손대지 않는다. retouch의 "회고체 → 행정체 회수" 시나리오는 *과거에 작성된 YAML*에만 의미가 있는데, `create`가 처음부터 행정체로 쓰면 그런 입력 자체가 드물다. retouch가 산문 스타일까지 재단속하게 만드는 것은 책임 과적이다. (나중에 필요해지면 같은 `references/writing-style.md`를 retouch SKILL.md에서도 참조하면 된다 — 파일이 분리돼 있으니 비용 없이 확장 가능.)
- **별도 파일.** `create` SKILL.md가 이미 ~180줄이라 ~20줄 규칙 뭉치를 따로 둔다. SKILL.md에는 "산문 쓰기 전 `references/writing-style.md`를 읽어 적용한다" 한 절만 가볍게 둔다.
- **위치 = 플러그인 레벨** (`plugins/silotek-tools/references/`, 신규 디렉터리). 기존 `references/`는 `skills/silotek-diagram-design/references/`(스킬-로컬)뿐이라 플러그인 레벨 `references/`는 신규 패턴이지만, `silotek-diagrammer` 에이전트가 이미 `<pluginRoot>/skills/.../references/...`를 교차 참조하는 선례가 있고, SKILL.md가 `$pluginRoot` 해석 로직을 이미 갖고 있다. (한 스킬 디렉터리 안에 두면, 나중에 다른 스킬이 공유할 때 위치가 비대칭이 된다.)
- **무게 = 린 (~20줄)**. 풀 버전(금지 동사 11행 치환 매핑 표, 항목별 세분 절, "위반 초안 거부" 강제 문구)은 과하고 어색한 강제 치환 위험이 있다. 핵심 7개 항목만, 금지 동사는 *예시*로만 나열한다.
- **파일명 = `writing-style.md`**. `style-guide.md`는 다이어그램 스킬-로컬 파일과 헷갈리므로 피한다. 영문 이름으로 기존 reference 파일들(`type-*.md`, `primitive-annotation.md`)과 일관.

## 범위 밖 (의식적 제외)

- `research-log-yaml-retouch` 스킬 — 위 "결정 사항" 참조. 손대지 않는다.
- Node 스크립트(`common.js` / `build.js` / `save-draft.js`) 변경 — 문체 자동 린트(em dash·"~했다" 검출 등)는 매력적이지만, "문체 판단은 Claude 쪽 스킬 영역"이라는 `CLAUDE.md` 경계를 지킨다. 후속 항목으로만 기록.
- `research-log-docx-create` — 저장된 YAML을 DOCX로 렌더만 하고 산문을 쓰거나 고치지 않으므로 대상 아님.
- `commands/research-log-yaml-create.md` — 스킬을 호출하는 얇은 래퍼라 손대지 않는다.
- `README.md` / `plugins/silotek-tools/README.md` 갱신 — 두 파일 모두 현재 uncommitted 수정 상태라 이번 변경에 끌어들이지 않는다.
- CHANGELOG 신설 — 저장소에 CHANGELOG 파일이 없으므로 만들지 않는다.

## 안 건드리는 것 (비파괴)

- YAML 스키마(`sections` 요소 키, `visual_brief` 6필드), `save-draft.js` / `build.js` / `resolve-yaml.js` / `rasterize-svg.js`의 동작·CLI 인자.
- `research-log-yaml-create`의 호출 방식, 기존 절차 단계 — 절을 추가하고 step 3 한 줄에 문구를 덧붙일 뿐.
- `research-log-yaml-retouch` 전체.
- 이미 저장된 연구일지 YAML과 DOCX 빌드 — 그대로 유효.
- `silotek-diagram-design` 스킬과 그 `references/`(스킬-로컬, 별개).

## 파일 변경 목록

| # | 파일 | 동작 | 내용 |
|---|---|---|---|
| 1 | `plugins/silotek-tools/references/writing-style.md` | **신규** | 행정체 문체 규칙 ~20줄 (아래 "내용" 참조). `references/` 디렉터리도 신설 |
| 2 | `plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md` | 수정 | (a) "## 필수 절차" step 3에 문구 추가, (b) "## 8섹션 흐름" 다음에 "## 본문 문체 (Writing Style)" 절 신설, (c) "## 스스로 걸러야 할 안티패턴"에 한 줄 추가 |
| 3 | `.claude-plugin/marketplace.json` | 수정 | `plugins[0].version` `0.4.1` → `0.4.2` |
| 4 | `plugins/silotek-tools/.claude-plugin/plugin.json` | 수정 | `version` `0.4.1` → `0.4.2` |
| 5 | `plugins/silotek-tools/package.json` | 수정 | `version` `0.4.1` → `0.4.2` |
| 6 | `plugins/silotek-tools/package-lock.json` | 수정 | `version` 및 `packages[""].version` 둘 다 `0.4.1` → `0.4.2` |
| 7 | `plugins/silotek-tools/tests/structure.test.js` | 수정 | `'plugin version fields are all 0.4.1'` 테스트 — 제목 문자열 + assertion 5개를 `0.4.2`로 |
| 8 | `CLAUDE.md` (저장소 루트) | 수정(권장) | "아키텍처" Claude 계층 목록에 `references/writing-style.md` 한 줄 + "버전 관리"에 v0.4.2 한 줄. **현재 uncommitted 수정 상태이므로 현재 내용 위에 추가** |

선택(구현 계획 검토 시 결정):

- `plugins/silotek-tools/templates/research-log.yaml`에 본문 문체 reference를 가리키는 주석 한 줄.
- `structure.test.js`에 작은 가드 — `references/writing-style.md` 존재 + `research-log-yaml-create/SKILL.md`가 이를 언급하는지 확인하는 assertion 한 블록.

## `references/writing-style.md` 내용 (확정안, ~20줄)

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

이 문서 자체는 플러그인 문서이므로 자기 규칙의 적용 대상이 아니다(첫 문단이 이를 명시).

## SKILL.md 추가 내용 (`research-log-yaml-create/SKILL.md`)

(a) "## 필수 절차" step 3 — 현재:

> 3. 현재 작업 폴더에 `.silotek-research-log-draft.yaml`을 작성한다 — `templates/research-log.yaml`의 평탄한 `sections` 스키마, 8섹션 흐름, 성격별 강조를 따른다.

→ 끝에 본문 문체 항목을 추가:

> 3. 현재 작업 폴더에 `.silotek-research-log-draft.yaml`을 작성한다 — `templates/research-log.yaml`의 평탄한 `sections` 스키마, 8섹션 흐름, 성격별 강조, 본문 문체(`references/writing-style.md`)를 따른다.

(b) "## 8섹션 흐름" 절 다음, "## 스스로 걸러야 할 안티패턴" 절 앞에 신설:

```markdown
## 본문 문체 (Writing Style)

본문 산문(YAML `sections`의 텍스트)은 공식 보고서 행정체로 쓴다. 산문을 쓰기 전에 플러그인 루트의 `references/writing-style.md`를 읽어 적용한다 — 플러그인 루트 해석은 "스크립트" 절의 `$pluginRoot` 로직을 그대로 쓰고, 경로는 `Join-Path $pluginRoot "references\writing-style.md"` (POSIX: `"$plugin_root/references/writing-style.md"`)다. 회고체 종결어미("~했다"), em dash(—), "그래서" 연결, 1인칭·결정 주체 노출, 구어적 동사를 쓴 초안은 작성 단계에서 거부하고 재작성한다.
```

(c) "## 스스로 걸러야 할 안티패턴" 목록에 한 줄 추가:

```markdown
- 회고체 종결어미·em dash·"그래서" 연결·1인칭 결정 주체 노출 — `references/writing-style.md` 위반.
```

## 버전 bump 상세

5곳을 `0.4.1` → `0.4.2`로:

- `.claude-plugin/marketplace.json` → `plugins[0].version`
- `plugins/silotek-tools/.claude-plugin/plugin.json` → `version`
- `plugins/silotek-tools/package.json` → `version`
- `plugins/silotek-tools/package-lock.json` → 최상위 `version` **그리고** `packages[""].version` (둘 다)
- `plugins/silotek-tools/tests/structure.test.js` → `test('plugin version fields are all 0.4.1', ...)` 의 제목 문자열과 그 안 assertion 5개(`marketplace.plugins[0].version`, `plugin.version`, `pkg.version`, `lock.version`, `lock.packages[''].version`)

## 경로 해석 / 테스트 호환

- `research-log-yaml-create/SKILL.md`가 `references/writing-style.md`를 가리킬 때 `$pluginRoot`(이미 "## 스크립트" 절에 정의됨)를 쓰고, 경로는 `references/...`이지 `scripts/...`가 아니다. `structure.test.js`의 `'command and skill docs do not rely on a bare CLAUDE_PLUGIN_ROOT script path'` 테스트는 `${CLAUDE_PLUGIN_ROOT}/scripts` · `$env:CLAUDE_PLUGIN_ROOT\scripts` 패턴만 막으므로 이번 추가는 걸리지 않는다. ("## 본문 문체" 절이 "## 스크립트" 절을 앞서 참조하지만 — Claude는 SKILL.md 전체를 읽으므로 무방.)
- `structure.test.js`는 `commands/*.md`(정확히 5), 스킬 디렉터리(정확히 4), `agents/*.md`(정확히 1)만 화이트리스트로 검사한다. 플러그인 루트에 `references/` 디렉터리를 추가해도 구조 테스트에 걸리지 않는다.

## 검증 (구현 후)

```powershell
node --check plugins/silotek-tools/scripts/common.js   # .js 변경 없음 — 형식상
npm.cmd test --prefix plugins/silotek-tools            # 통과 (버전 테스트는 #7에서 함께 갱신)
claude plugin validate .                               # 통과 (플러그인 레벨 references/ 확인)
```

수동 확인:

- `plugins/silotek-tools/references/writing-style.md`가 ~20줄, 위 "내용" 확정안대로 생성됨.
- `research-log-yaml-create/SKILL.md`에 "## 본문 문체" 절 + 안티패턴 한 줄 + step 3 문구가 있고 `references/writing-style.md` 경로가 정확히 적힘.
- `research-log-yaml-retouch/SKILL.md`는 변경 없음.
- 버전이 5곳에서 `0.4.2`로 일치.
- `git status`로 의도한 파일만 변경됐는지(특히 uncommitted 상태였던 `CLAUDE.md`/README들과 충돌·오염 없는지) 확인.

## 후속 항목 (이번 범위 밖, 기록만)

- 필요해지면 `research-log-yaml-retouch/SKILL.md`에서도 `references/writing-style.md`를 참조 (회고체 입력 회수용).
- `save-draft.js`에 본문 산문 문체 린트(em dash·"~했다" 종결어미·"그래서" 연결 검출) 추가 — Claude/Node 경계 재검토 필요.
- `templates/research-log.yaml`에 문체 reference 주석.
- README들에 새 reference 문서 언급(현재 uncommitted 상태 정리 후).
