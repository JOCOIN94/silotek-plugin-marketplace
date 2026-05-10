# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 레포 개요

이 레포는 Claude Code 플러그인 **marketplace** (`silotek-tools`)이며 현재 한 개 플러그인을 포함한다:

- [`silotek-research-log`](plugins/silotek-research-log/) — Claude Code 대화나 프로젝트 폴더를 기반으로 한국어 사일로텍 "연구일지" YAML 레코드와 포맷팅된 Word(.docx) 보고서를 생성한다.

Marketplace 등록부는 [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json), 플러그인 소스는 모두 [plugins/silotek-research-log/](plugins/silotek-research-log/) 아래에 있다.

## 아키텍처 (먼저 읽어야 할 것)

플러그인은 같은 Node 툴체인 위에 쌓인 두 계층이다.

### 1. 플러그인 표면 (Claude Code)

- [commands/setup.md](plugins/silotek-research-log/commands/setup.md), [commands/draft.md](plugins/silotek-research-log/commands/draft.md), [commands/build-docx.md](plugins/silotek-research-log/commands/build-docx.md) — 세 개 slash command (`/silotek-research-log:setup`, `:draft`, `:build-docx`).
- [skills/draft/SKILL.md](plugins/silotek-research-log/skills/draft/SKILL.md), [skills/build-docx/SKILL.md](plugins/silotek-research-log/skills/build-docx/SKILL.md) — drafting/build 동작을 안내하는 Claude Skill. Skill **description**은 영어(Anthropic 권장), 본문은 한국어 가능.

### 2. Node 엔진 (CLI 스크립트)

- [scripts/save-draft.js](plugins/silotek-research-log/scripts/save-draft.js) — draft YAML 검증, 참조 이미지 복사, 중앙 저장소에 기록.
- [scripts/build-docx.js](plugins/silotek-research-log/scripts/build-docx.js) — 저장된 YAML 선택 후 [build.js](plugins/silotek-research-log/build.js)의 `buildDocx()`로 DOCX 렌더링, manifest 업데이트.
- [scripts/list-yaml.js](plugins/silotek-research-log/scripts/list-yaml.js) — 중앙 저장소의 YAML 목록 출력.
- [scripts/common.js](plugins/silotek-research-log/scripts/common.js) — **single source of truth**: 저장 경로 해석, 스키마 검증(`validateResearchLog` / `SECTION_ELEMENT_KEYS`), basename slug, 이미지 재작성. `build.js`도 여기서 검증 함수를 import한다.
- [build.js](plugins/silotek-research-log/build.js) — DOCX 렌더러(`docx` + `adm-zip`로 `fontTable.xml` relationship 보정 포함). `scripts/build-docx.js`가 `require('../build')`로 사용. **직접 CLI로 실행하지 말 것** — 지금은 내부 라이브러리이며 파일 상단 주석의 `node build.js ...` 사용법은 oldversion 잔재.

### 데이터 흐름과 중앙 저장소

사용자 데이터는 **플러그인 폴더 안에 저장하지 않는다.** 사용자별 중앙 저장소를 사용한다.

```
Windows: %USERPROFILE%\Documents\Silotek Research Logs\
macOS:   $HOME/Documents/Silotek Research Logs/
```

`SILOTEK_RESEARCH_LOG_ROOT` 환경 변수로 경로를 override할 수 있다. 구조(첫 호출 시 `ensureStorage`가 자동 생성):
`inputs/` (YAML), `outputs/` (DOCX), `manifests/` (JSON 이력), `figures/<basename>/` (일지별 이미지 복사본).

**Drafting**: Claude가 사용자의 현재 작업 폴더에 `.silotek-research-log-draft.yaml`을 작성 → `save-draft.js`가 검증하고 중앙 `inputs/<date>-<slug>.yaml`로 복사, 참조된 이미지를 `figures/<basename>/`로 복사하면서 YAML의 image path도 다시 쓴 뒤 manifest를 함께 작성. DOCX는 **자동 생성하지 않는다** — `/silotek-research-log:build-docx`가 별도 단계.

### YAML 스키마 (load-bearing)

`sections`는 flat command list다. 각 항목은 문자열 문단이거나 단일 키 객체. 허용 키는 [scripts/common.js](plugins/silotek-research-log/scripts/common.js)의 `SECTION_ELEMENT_KEYS`에 정의:

```
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank
```

금지 grouping 키(`heading`, `body`, `paragraph`, `list`, `items`, `content`, `subsections`)가 들어오면 `save-draft.js` / `build-docx.js`가 구조화된 오류와 함께 거부한다. [templates/research-log.yaml](plugins/silotek-research-log/templates/research-log.yaml)이 유일한 정식 템플릿이다. 프로젝트 로컬 `inputs/_template.yaml`을 다시 만들지 말 것 — v0.1.2에서 분기 방지를 위해 제거됨.

## 자주 쓰는 명령

`CLAUDE_PLUGIN_ROOT`는 Claude Code 안에서 명령이 실행될 때 자동 주입된다. 로컬 개발 시에는 `.\plugins\silotek-research-log` (PowerShell) 또는 `./plugins/silotek-research-log` (bash)로 대체.

```powershell
# 플러그인 Node 의존성 설치 — 플러그인 캐시에 (설치/업데이트 후 1회)
npm.cmd install --ignore-scripts --no-audit --no-fund --prefix "$env:CLAUDE_PLUGIN_ROOT"

# 로컬 개발용 의존성 설치 (이 레포에서 직접 작업할 때)
npm install --prefix .\plugins\silotek-research-log

# marketplace + plugin manifest 검증
claude plugin validate .

# 이 체크아웃의 플러그인을 marketplace 대신 직접 로드
claude --plugin-dir .\plugins\silotek-research-log

# 엔진 디버깅용 직접 실행
node .\plugins\silotek-research-log\scripts\list-yaml.js
node .\plugins\silotek-research-log\scripts\save-draft.js .\.silotek-research-log-draft.yaml --mode folder --source-root .
node .\plugins\silotek-research-log\scripts\build-docx.js 1
```

테스트는 `node:test` 기반으로 `plugins/silotek-research-log/tests/` 아래에 있다. `npm test --prefix plugins/silotek-research-log`로 실행한다 (Node 18+). 통합 테스트는 `tests/save-draft.test.js`, `tests/build-docx.test.js`가 spawn으로 실제 스크립트를 호출해 검증한다. 린터, 포매터는 여전히 설정되지 않았다.

## 버전 관리

플러그인 버전은 세 곳에 미러링되어 있다. 함께 올릴 것:

- [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json) → `plugins[0].version`
- [plugins/silotek-research-log/.claude-plugin/plugin.json](plugins/silotek-research-log/.claude-plugin/plugin.json) → `version`
- [plugins/silotek-research-log/package.json](plugins/silotek-research-log/package.json) → `version` (그 후 `npm install` 시 `package-lock.json`도 따라감)

## 버그처럼 보이지만 의도된 것

- 플러그인 폴더에 `inputs/`, `outputs/`, `figures/` 디렉터리가 **없다**. 일부러 그렇다 — 사용자 중앙 저장소에 산다. 플러그인 안에 다시 만들지 말 것.
- 로고는 [assets/logo_silotek.png](plugins/silotek-research-log/assets/logo_silotek.png)에 한 번만 둔다. `scripts/common.js`의 `ensureStorage`가 첫 실행 시 사용자 중앙 `figures/logo_silotek.png`로 자동 복사한다. 플러그인 자체 `figures/`에 사본을 두지 말 것.
- 레포 루트에 `research-log-tool_oldversion/` 폴더가 보일 수 있다 — 컨트리뷰터 로컬 CLI 백업이고 `.gitignore` 처리되어 있다. 플러그인의 일부가 아니다.
- 커밋 메시지 스타일은 영어 명령형(예: `Migrate research-log plugin to clean v0.1.2 layout`). README, commands, draft.md 본문은 한국어, SKILL.md description은 영어 — 이미 그렇게 자리 잡힌 톤.
