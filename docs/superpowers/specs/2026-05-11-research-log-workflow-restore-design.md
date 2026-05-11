# 연구일지 워크플로 복원·개선 설계

작성일: 2026-05-11
대상 플러그인: `plugins/silotek-tools` (현재 v0.3.1)

## 배경

`a2048b1 "Refactor silotek tools plugin boundary"` 커밋(2026-05-11)에서 `silotek-research-log` → `silotek-tools` 이름변경을 하면서 옛 `commands/draft.md`(171줄)·`skills/draft/SKILL.md`(201줄)·`agents/research-diagrammer.md`(61줄)·`agents/research-critic.md`(74줄)·`commands/critique.md`·`scripts/critique.js`(284줄)가 통째로 새 슬림 버전으로 대체되거나 삭제됐다. 그 과정에서 다음이 사라졌다:

1. **소스 모드 선택지** — 옛 draft는 "대화 / 폴더 / 혼합"이 모호하면 3옵션 메뉴를 띄우고, 연구 성격(구축/분석/검증)도 메뉴를 띄웠다. 새 `commands/research-log-yaml-create.md:11`은 "Decide whether the source is conversation, folder, or mixed" 한 줄뿐 — 사용자에게 물어보라는 지시가 없어 Claude가 조용히 `folder`로 결정한다.
2. **다중 다이어그램 병렬 생성** — 옛 draft는 각 `visual_brief`마다 `research-diagrammer` 서브에이전트를 호출했다. 새 흐름엔 서브에이전트가 없고(`plugins/silotek-tools/agents/` 부재), 메인 세션이 직렬로 `silotek-diagram-design`을 호출하라고만 한다. `commands/diagram-create.md`는 "어떤 다이어그램?" 단수 질문만 한다.
3. **다이어그램 → DOCX 자동 연결의 단절** — `build.js`는 저장된 YAML의 `sections` 안 `image` 요소만 렌더한다. 폴더를 스캔하지 않는다. 따라서 YAML 작성 후 따로 만든 다이어그램은 YAML에 수동으로 끼워넣어야 DOCX에 들어간다. 이건 `build.js` 버그가 아니라 (2)가 빠진 것의 증상이다.
4. **채점(research-critic / critique)** — 같이 삭제됨. 이번 범위 밖.

## 목표

1. `research-log-yaml-create`에 소스 모드(`conversation`/`folder`/`mixed`)와 연구 성격(`구축`/`분석`/`검증`) 선택 절차를 되살린다 — 명백하면 한 줄 confirm, 모호하면 선택지 제시 후 대기.
2. YAML 작성 중 식별한 N개 시각화 지점에 대해, 사용자 확인 후 N개 서브에이전트를 병렬 dispatch하여 각각 독립적으로 `silotek-diagram-design` 규칙대로 다이어그램 1장씩 생성하고, 결과를 YAML에 `image` 요소로 자동 연결한다.

## 범위 밖 (의식적 제외, 후속 항목으로만 기록)

- `research-critic` / `/critique` / `scripts/critique.js` 복원.
- `diagram-create` 커맨드의 다중 다이어그램 모드 — standalone 단일 그림 도구로 유지.
- 별도로 만든 standalone 다이어그램(`.silotek-diagrams/`)을 이미 저장된 연구일지 YAML로 끌어오는 import 경로 — (2)를 통합하면 신규 작성 시엔 문제가 해소되므로 잔여분만 후속으로 남긴다.

## 동작하는 게 무엇이고 안 건드리는 게 무엇인가

안 건드림(비파괴):

- `/silotek-tools:research-log-yaml-create`의 호출 방식 — 그대로 동작. 내부에 단계만 추가.
- YAML 스키마 — `sections` 요소 키, `visual_brief` 6개 필드(`purpose`, `claim`, `evidence`, `forbidden`, `palette`, `caption`). 이미 저장된 YAML·DOCX 빌드 그대로 유효.
- `save-draft.js` / `build-docx.js` / `resolve-yaml.js` / `rasterize-svg.js`의 CLI 인자.
- `build.js`의 `visual_brief` + `image` 페어 처리 로직(`build.js:414-435`) — image 파일이 있으면 회색 명세 박스를 숨기고 PNG 렌더, 없으면 회색 박스 유지. 이건 의도된 "그림 미작성 플레이스홀더" 동작이라 유지한다.
- `commands/diagram-create.md` + standalone `.silotek-diagrams/` 경로.

추가:

- `agents/silotek-diagrammer.md` (신규 서브에이전트).
- `scripts/next-diagram-path.js`의 `--count N` 플래그.
- `research-log-yaml-create` 스킬·커맨드 본문의 선택 절차와 다중 다이어그램 흐름.

## 파일 구조 (생성/수정)

| 파일 | 변경 | 책임 |
|---|---|---|
| `plugins/silotek-tools/skills/research-log-yaml-create/SKILL.md` | 수정 | 소스 모드 선택 절차 + 연구 성격 판정 절차(분류 표·메뉴·성격별 강조점) 복원, 다중 다이어그램 흐름(브리프 N개 작성 → 확인 게이트 → 경로 일괄 할당 → 병렬 dispatch → image 페어링 → save) 추가 |
| `plugins/silotek-tools/commands/research-log-yaml-create.md` | 수정 | 위 흐름을 상위 레벨로 미러, 확인 게이트 명시 |
| `plugins/silotek-tools/agents/silotek-diagrammer.md` | **신규** | 그림 1장 생성 서브에이전트. 입력 = {`visual_brief` 1개, 추천 유형, 할당된 `diagram-K.html`/`diagram-K.png` 경로, 플러그인 루트 절대경로}. `silotek-diagram-design` 규칙대로 HTML(인라인 SVG 1개) 작성 → `rasterize-svg.js`로 PNG → {경로, alt text, evidence 사용 내역, forbidden 위반 0건} 보고. `tools: Read, Write, Bash, Glob, Grep` |
| `plugins/silotek-tools/scripts/next-diagram-path.js` | 수정 | `--count N` 플래그 추가 — 디스크 상태 기준 연속 N개 `{index, htmlPath, pngPath}`를 JSON 배열로 반환(파일 생성은 안 함, 대상 디렉터리 `mkdir`만). 병렬 dispatch 전 경로 일괄 할당용 |
| `plugins/silotek-tools/tests/next-diagram-path.test.js` | 수정 | `--count` 케이스 추가 |
| `plugins/silotek-tools/tests/structure.test.js` | 수정 | 새 에이전트 파일 존재·프론트매터 검증, SKILL/command 본문이 소스모드 3종·성격 메뉴·병렬 dispatch·확인 게이트 문구를 포함하는지 검증 |
| `CLAUDE.md` | 수정 | Architecture에 `agents/silotek-diagrammer.md` 추가, Data Flow에 확인 게이트·병렬 생성·`--count` 반영 |
| `plugins/silotek-tools/README.md` | 수정 | Research Log Flow 섹션 갱신 |
| `.claude-plugin/marketplace.json`, `plugins/silotek-tools/.claude-plugin/plugin.json`, `plugins/silotek-tools/package.json`, `plugins/silotek-tools/package-lock.json` | 수정 | 버전 0.3.1 → 0.4.0 동기화 |

`plugin.json`은 `agents/` 디렉터리를 자동 발견하므로 에이전트 등록 키 추가는 불필요하다. 자동 발견이 안 되면 `plugin.json`에 `agents` 키를 추가하는 것으로 대응한다.

## 데이터 흐름 — `research-log-yaml-create` 한 번 실행

```
사용자: /silotek-tools:research-log-yaml-create
  │
  1. 소스 모드 판정 (conversation / folder / mixed)
  │    - 컨텍스트에 명백 → 한 줄 confirm ("폴더 기반으로 작성합니다, 다르면 알려주세요") 후 진행
  │    - 모호 → 3옵션 메뉴 제시(1 대화 / 2 폴더 / 3 혼합), 답 대기
  │
  2. 연구 성격 판정 (구축 / 분석 / 검증)
  │    - 명백 신호("구축/만든/구현"→구축, "분석/현황/구조"→분석, "검증/실험/측정/가설"→검증) → 한 줄 confirm
  │    - 모호 → 메뉴 제시(1 구축 / 2 분석 / 3 검증), 답 대기
  │    - 선택값을 한국어로 meta.연구 성격에 기록 (도메인 외 값 → META_INVALID_VALUE 경고: 기존 동작 유지)
  │
  3. .silotek-research-log-draft.yaml 작성
  │    - 8단 보편 흐름(연구 질문 → 문제 정의 → 시도/시행착오 → 관찰/측정 → 원인 분석 → 검증 → 교훈 → 향후 과제)
  │    - 성격별 강조점 반영 (어느 섹션을 깊게/얕게)
  │    - 시각화가 이해를 높이는 지점마다 visual_brief 플레이스홀더 삽입
  │      (purpose / claim / evidence[] / forbidden[] / palette / caption + 추천 다이어그램 유형)
  │      ※ 그림을 억지로 넣지 않음 — 적절한 지점이 없으면 visual_brief 0개도 정상
  │
  4. 확인 게이트  ← 사용자 요구
  │    "다음 N개 그림을 만들까요?
  │       1) [flowchart] [그림 1] ... — 핵심: ...
  │       2) [er] [그림 2] ... — 핵심: ...
  │       ...
  │     [예 / 일부만(번호 지정) / 아니오]"
  │    - 아니오 → visual_brief만 남기고 5~7 건너뜀 → 8(save)로 (DOCX에서 회색 명세 박스로 표시됨)
  │    - 일부만 → 선택된 brief만 진행, 나머지는 image 없이 둠
  │    - 예 → 전부 진행
  │
  5. 경로 일괄 할당
  │    node <plugin-root>/scripts/next-diagram-path.js .silotek-research-log-figures --count <선택된 N> --json
  │    → [{index, htmlPath, pngPath}, ...] (diagram-K.html / diagram-K.png)
  │
  6. 병렬 dispatch — 한 메시지에 Task 도구 N개
  │    각 silotek-diagrammer 입력: { visual_brief 1개, 추천 유형, diagram-K.html, diagram-K.png, plugin-root }
  │    각 에이전트 동작:
  │      a. <plugin-root>/skills/silotek-diagram-design/SKILL.md + references/type-<유형>.md (+ 필요 시 assets/template*.html) 읽기
  │         (서브에이전트에 Skill 도구가 가용하면 silotek-diagram-design 스킬을 invoke해도 동일)
  │      b. evidence만 사용, forbidden 단어·시각 표현 모두 금지, palette 준수, 인라인 SVG 1개만,
  │         원격 폰트/스크립트/이미지/iframe/foreignObject 금지
  │      c. diagram-K.html 에 자기완결 HTML 작성
  │      d. node <plugin-root>/scripts/rasterize-svg.js <diagram-K.html> <diagram-K.png> 실행
  │      e. 보고: { htmlPath, pngPath, altText(한 줄), usedEvidence[], forbiddenViolations: 0 }
  │         forbidden 위반 1건이라도 있으면 다시 작성 후 보고
  │
  7. image 페어링
  │    메인 세션이 각 visual_brief 바로 뒤에 image 요소 삽입:
  │      - image:
  │          path: ".silotek-research-log-figures/diagram-K.png"   (워크스페이스 상대경로)
  │          caption: "<brief.caption>"
  │    ※ save-draft.js의 rewriteImages가 figures/<basename>/ 로 복사하고 path를 ../figures/<basename>/diagram-K.png 로
  │      자동 재작성하므로, 드래프트 YAML에는 워크스페이스 기준 상대경로만 쓰면 된다(기존 image 요소 규칙과 동일).
  │    실패/미생성 brief는 image 없이 둠 → DOCX에서 회색 명세 박스로 자동 표시
  │
  8. node <plugin-root>/scripts/save-draft.js .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root <cwd>
  │    (save-draft가 figures/로 복사, 참조 PNG 누락 시 sibling HTML에서 rasterize)
  │
  9. 보고:
  │    - 소스 모드, 연구 성격
  │    - 저장된 YAML 경로, manifest 경로
  │    - 복사된 figure 수, rasterize된 figure 수
  │    - 생성한 다이어그램 목록 (#, 파일, 유형, 대응 섹션, 핵심 메시지)
  │    - 실패/건너뛴 visual_brief (있으면)
  │    - 진단: errors / warnings, 요소 통계
  │    - "DOCX는 이 명령에서 생성하지 않음 — /silotek-tools:research-log-docx-create"
```

## `silotek-diagrammer` 서브에이전트 계약 (상세)

프론트매터:

```yaml
---
name: silotek-diagrammer
description: Generate one Silotek editorial diagram from a single visual_brief. The main session passes one brief, a recommended diagram type, the allocated diagram-K.html / diagram-K.png paths, and the plugin root. Follows silotek-diagram-design rules; stays strictly inside evidence and forbidden.
tools: Read, Write, Bash, Glob, Grep
---
```

본문 요지:

- 역할: 그림 **딱 한 장** 생성. 메인 세션이 병렬로 여러 인스턴스를 동시에 띄울 수 있음 — 너는 받은 한 개만 본다.
- 입력 형식 (메인이 프롬프트로 전달): `visual_brief` 6필드 + `recommendedType`(예: `flowchart`/`er`/`state`/`timeline`/`quadrant`/`architecture`/`sequence`/`swimlane`/`nested`/`tree`/`layers`/`venn`/`pyramid`) + `htmlPath` + `pngPath` + `pluginRoot`(절대경로).
- 절차:
  1. `<pluginRoot>/skills/silotek-diagram-design/SKILL.md` 와 `<pluginRoot>/skills/silotek-diagram-design/references/type-<recommendedType>.md` 를 Read. 필요하면 `assets/template.html` / `assets/template-full.html` 도. (Skill 도구가 가용하면 `silotek-diagram-design` 스킬 invoke로 대체 가능 — 결과 동일.)
  2. 디자인 규칙 준수: Silotek 팔레트(navy 포커스 / teal 강조 1색 / gray 보조), Pretendard 폰트 스택, 4px 그리드, 그림자·그라데이션·장식 블롭·이모지 금지, 주요 박스 9개 이하, 원격 자원·iframe·foreignObject 금지, 인라인 SVG 정확히 1개.
  3. 콘텐츠 규칙: `evidence`에 있는 사실만 표현. `forbidden` 항목은 단어로든 시각 표현으로든 절대 등장 금지. `caption`은 brief의 caption 그대로.
  4. `htmlPath` 에 자기완결 HTML 작성.
  5. `node <pluginRoot>/scripts/rasterize-svg.js <htmlPath> <pngPath>` 실행. 실패하면 SVG를 단순화해 재시도, 그래도 실패하면 에러 메시지를 보고에 포함.
  6. 자체 QA(저장 직전): evidence 항목이 어떤 형태로든 반영됐는가(전부 시각화일 필요는 없음, 일부 텍스트 반영 OK) / forbidden 위반 0건인가 / 팔레트 외 색 없는가 / 라스터 ~1152px에서도 읽히는가. 위반 시 다시 작성.
  7. 보고(메인에 반환): `{ htmlPath, pngPath, altText, usedEvidence: [...], forbiddenViolations: 0, rasterizeOk: true|false }`.
- 톤 가이드: 캡션 `[그림 N] ...` 형식, 화살표는 직선/직각, 이탤릭 금지, 강조는 색보다 굵기·테두리.
- fallback: 환경이 서브에이전트로 다이어그램 생성을 지원하지 않으면 메인 세션이 그 brief에 한해 직접 `silotek-diagram-design`을 써서 생성하거나, `visual_brief`만 남겨 DOCX 회색 박스로 처리.

## `next-diagram-path.js --count` 명세

- 인자: `node next-diagram-path.js <dir> [--count N] [--json]`.
- `--count` 미지정 또는 `--count 1` → 기존과 동일하게 단일 객체 `{dir, index, htmlPath, pngPath}` 반환(하위호환).
- `--count N` (N ≥ 1) → 디스크 상태 기준으로 비어 있는 첫 인덱스부터 연속 N개를 골라 배열 `[{dir, index, htmlPath, pngPath}, ...]` 반환. 파일 생성은 하지 않음(`fs.mkdirSync(targetDir, {recursive:true})`만).
  - 예: `.silotek-research-log-figures/`에 `diagram-1.html`, `diagram-1.png`만 있을 때 `--count 3` → index 2,3,4.
- `--json` 없으면 사람이 읽을 수 있게 `html: ...` / `png: ...` 줄을 N쌍 출력.
- 잘못된 `--count`(0, 음수, 비숫자)는 stderr 에러 + exit 1.

## 소스 모드 / 연구 성격 선택 — 복원 디테일

옛 `skills/draft/SKILL.md` · `commands/draft.md`의 절차를 되살린다(영문 스킬 본문 + 한국어 메뉴 verbatim 허용):

- **소스 모드**: `conversation`(현재 대화·결정 기반) / `folder`(현재 작업 폴더의 코드·문서·설정·테스트·산출물 조사) / `mixed`(둘 다). 신호가 명백하면 한 줄 confirm("…로 작성합니다, 다르면 알려주세요") 후 바로 진행. 모호하면 3옵션 메뉴를 출력하고 사용자 답을 기다림.
- **연구 성격**: 명백하면 한 줄 confirm, 모호하면 메뉴(`1) 구축 — 구축/구현 과정`, `2) 분석 — 기존 체계 분석`, `3) 검증 — 검증 실험`) 출력 후 대기. 선택값을 한국어로 `meta.연구 성격`에 기록. 성격별 강조점:
  - 구축: 시도/시행착오를 시간순으로 자세히, 각 단계 결과, 최종 동작 확인, 다음 빌드 단계.
  - 분석: 분석 대상 명시, 현재 구조(스키마/호출 그래프/디렉터리 트리), 문제 원인, 코드/문서로 가설 확인, 권장 방향(Refactor/Replace/Keep).
  - 검증: 연구 질문을 가설 한 줄로, 실험 설계 변경 이력, 정량 데이터, 결과 해석, 가설 결론(성립/부분 성립/기각).
- 안티패턴(스스로 거절): 성격 미선택 상태로 본문 시작, 파일 경로/디렉터리 나열형 본문, 검증 없는 단정, 시행착오 없는 "이렇게 했더니 잘 됐다"형 단편, "단순히 ~정리한다"·"구조를 살펴본다"류 폴더 탐구형 문장.

> 메뉴 제시는 `AskUserQuestion` 도구를 쓰든 텍스트 메뉴를 그대로 출력하든 무방. 스킬 본문엔 "명백하면 confirm, 모호하면 선택지 제시 후 대기"라는 원칙만 못박고 도구 사용은 강제하지 않는다.

## 테스트 / 검증

- `next-diagram-path.js --count N` — `tests/next-diagram-path.test.js`:
  - 빈 디렉터리에서 `--count 3` → index 1,2,3 / 경로 3쌍.
  - `diagram-1.html`만 있을 때 `--count 2` → index 2,3.
  - `--count` 미지정 → 기존 단일 객체 형태(하위호환) 유지.
  - `--count 0` / `--count -1` / `--count abc` → exit 1.
- `agents/silotek-diagrammer.md` — `tests/structure.test.js`: 파일 존재 + 프론트매터 파싱(`name === 'silotek-diagrammer'`, `description` 비어있지 않음, `tools` 존재).
- `skills/research-log-yaml-create/SKILL.md` & `commands/research-log-yaml-create.md` — `tests/structure.test.js`: 본문에 `conversation`/`folder`/`mixed` 셋 다 등장, 연구 성격 `구축`/`분석`/`검증` 셋 다 등장, "병렬"/"parallel" 또는 dispatch 관련 문구 등장, 확인 게이트 관련 문구 등장.
- 회귀: `npm test` 전체, `node --check` 전 스크립트(`common.js`, `save-draft.js`, `build-docx.js`, `rasterize-svg.js`, `setup-check.js`, `resolve-yaml.js`, `next-diagram-path.js`, `build.js`), `claude plugin validate .`.
- `setup-check.js`는 선택적으로 새 에이전트 파일 존재 체크 추가 가능(필수는 아님).

## 버전 / 문서

- 0.3.1 → **0.4.0** (비파괴 기능 추가 = SemVer MINOR). `.claude-plugin/marketplace.json` / `plugins/silotek-tools/.claude-plugin/plugin.json` / `plugins/silotek-tools/package.json` / `plugins/silotek-tools/package-lock.json` 네 곳 동기화.
- `CLAUDE.md`: "Architecture" Claude-facing 레이어에 `agents/silotek-diagrammer.md` 한 줄 추가, Node 레이어에 `next-diagram-path.js`의 `--count` 언급. "Data Flow"에 확인 게이트·병렬 생성 흐름 반영.
- `plugins/silotek-tools/README.md`: "Research Log Flow" 단계 목록을 위 데이터 흐름에 맞게 갱신, `agents/` 디렉터리 언급 추가.

## 미해결 / 후속

- standalone `.silotek-diagrams/` 다이어그램을 기존 저장 연구일지 YAML로 끌어오는 import 경로 — 필요해지면 별도 spec.
- `research-critic` / `/critique` 채점 복원 — 사용자가 원할 때 별도 spec.
- 서브에이전트에서 `Skill` 도구 가용성 — 환경 의존이라 본 설계는 "스킬 파일 직접 Read" 경로를 기본으로 두고 Skill 도구는 가용 시 대체로만 사용한다. 가용성이 안정적으로 확인되면 에이전트 프론트매터 `tools`에 `Skill`을 명시적으로 추가하는 후속 작업 가능.
