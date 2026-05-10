# Silotek Research Log

Claude Code 대화, 프로젝트 폴더, 작업 산출물을 기반으로 사일로텍 연구일지 YAML과 DOCX 보고서를 생성하는 사내 Claude Code Plugin이다.

사용자는 slash command만 실행하고, 플러그인이 대화와 폴더 자료를 조사해 사용자 문서 폴더 아래 중앙 저장소에 YAML과 DOCX를 모은다.

## Commands

```text
/silotek-research-log:setup
/silotek-research-log:draft
/silotek-research-log:build-docx
/silotek-research-log:critique
```

- `/setup`: 플러그인 캐시 폴더 안에 Node 의존성을 설치한다.
- `/draft`: 현재 대화, 현재 폴더, 또는 둘 다를 조사해 연구일지 YAML 초안을 중앙 저장소에 저장한다. v0.2.0부터 작성 전에 `구축` / `분석` / `검증` 중 하나로 연구일지 성격을 사용자와 합의한다.
- `/build-docx`: 중앙 저장소에 있는 YAML을 선택해 DOCX 보고서를 생성한다.
- `/critique` (v0.2.0): 저장된 연구일지 YAML을 100점 만점 10개 영역으로 채점한다. `research-critic` 서브에이전트가 등록돼 있으면 그것을 호출하고, 미등록 환경에서는 `scripts/critique.js`가 fallback.

## Subagents (v0.2.0)

플러그인은 두 개의 Claude 서브에이전트 정의를 포함한다 (`agents/`):

- `research-diagrammer`: `visual_brief` 1개당 1회 호출되어 SVG 또는 imagegen skill로 그림 1장 생성. 외부 npm 도구 무의존.
- `research-critic`: `save-draft.js` 종료 직후 자동 호출되어 100점 채점. 결과(영역별 점수, 부족 항목, 수정 제안)를 사용자에게 보고.

두 에이전트가 자동 등록되지 않는 환경에서는 사용자가 `~/.claude/agents/`로 복사하거나, `scripts/critique.js`로 채점 fallback 사용.

## Storage

연구일지 데이터는 프로젝트별 폴더가 아니라 사용자별 중앙 저장소에 저장된다.

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```

구조:

```text
Silotek Research Logs/
├── inputs/      # YAML 원본
├── outputs/     # DOCX 산출물
├── manifests/   # 원본 프로젝트, 참고 파일, 생성 이력
└── figures/     # 일지별 이미지 복사본
```

## Install

사내 GitHub marketplace에서 설치한다.

```powershell
claude plugin marketplace add JOCOIN94/silotek-claude-plugins
claude plugin install silotek-research-log@silotek-tools --scope user
```

설치 후 Claude Code를 다시 시작하고 `/help` 또는 `/` 명령 목록에서 `silotek-research-log` 명령을 확인한다.

처음 설치한 사용자는 한 번만 다음 명령을 실행한다.

```text
/silotek-research-log:setup
```

의존성은 프로젝트 폴더나 시스템 전역이 아니라 Claude 플러그인 캐시의 해당 버전 폴더에 설치된다.

## Workflow

1. 연구/개발 작업을 Claude Code와 함께 진행한다.
2. 연구일지가 필요하면 `/silotek-research-log:draft`를 실행한다.
3. 플러그인이 필요한 범위의 대화와 폴더 자료를 조사해 YAML을 중앙 저장소에 저장한다.
4. Word 문서가 필요하면 `/silotek-research-log:build-docx`를 실행한다.

`/draft`는 DOCX를 자동 생성하지 않는다. 초안 저장과 문서 빌드를 분리해 사용자가 YAML을 확인하거나 여러 초안 중 하나를 선택할 수 있게 한다.

## YAML Schema

YAML은 다음 기본 구조를 사용한다.

```yaml
title: "연구 일지"
subtitle: "연구 주제"
meta:
  연구 주제: "상세 설명"
  연구 성격: "구축"        # 구축 / 분석 / 검증 중 하나 (v0.2.0)
  연구 단계: "구현/검증"
  분류: "AI/ML, RAG"
  작성일: "2026년 5월 9일"
  작성자: "이름"
sections:
  - h1: "1. 연구 질문"
  - p: "본문..."
  - visual_brief:           # v0.2.0 — research-diagrammer가 그림으로 변환
      purpose: "..."
      claim: "..."
      evidence: ["...", "..."]
      forbidden: ["..."]
      palette: "navy / teal / gray, 밝은 배경"
      caption: "[그림 1] ..."
```

`meta` 권장 6키 (모두 비어있지 않으면 권장 — 빠지면 `META_MISSING_KEY` warn):
`연구 주제`, `연구 성격`, `연구 단계`, `분류`, `작성일`, `작성자`. `연구 성격` 도메인은 `구축` / `분석` / `검증` (다른 값은 `META_INVALID_VALUE` warn).

`sections`는 flat command list여야 한다. 각 항목은 하나의 타입만 가진 객체로 작성한다.

지원 타입:

```text
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank, visual_brief
```

금지 타입:

```text
heading, body, paragraph, list, items, content, subsections
```

잘못된 예:

```yaml
sections:
  - heading: "1. 연구 배경"
    body: "본문..."
```

스키마가 틀리면 `save-draft.js`와 `build-docx.js`가 실패하도록 되어 있다. 오류가 나면 YAML을 flat 형식으로 고친 뒤 다시 실행한다.

## Report Structure

연구일지는 단순 폴더 요약이 아니라 연구 산출물을 지향한다. 본문은 다음 8단 흐름을 따른다.

```text
1. 연구 질문 (한 줄)
2. 문제 정의 / 배경
3. 시도와 시행착오 (실패 사례 포함)
4. 관찰 / 측정
5. 원인 분석
6. 검증 (실험, 비교, 측정)
7. 교훈 / 판단 기록
8. 향후 과제 / 남은 불확실성
```

모든 항목을 기계적으로 넣기보다 실제 작업 내용에 맞게 조정한다. 다만 `문제 -> 구조 -> 과정 -> 변경 -> 검증 -> 교훈 -> 결론`의 흐름은 드러나야 한다.

작성 후 `save-draft.js`와 `build-docx.js`가 자동으로 품질 검사(`analyzeQuality`)를 실행하여 콘솔에 경고를 출력한다. 검증/시행착오/향후 키워드 누락, 이미지·표 0개, 본문 800자 미만, 폴더 탐구형 키워드 등이 잡힌다. 경고는 저장/빌드를 막지 않는다 (warn 정책).

## Local Development

플러그인 개발자가 로컬에서 검증할 때:

```powershell
npm install --prefix .\plugins\silotek-research-log
claude plugin validate .
claude --plugin-dir .\plugins\silotek-research-log
```

보조 스크립트:

```powershell
node .\plugins\silotek-research-log\scripts\list-yaml.js
node .\plugins\silotek-research-log\scripts\save-draft.js .silotek-research-log-draft.yaml --mode folder --source-root .
node .\plugins\silotek-research-log\scripts\build-docx.js 1
```

`build.js`는 DOCX 렌더러 호환 레이어로 남아 있지만, 일반 사용 흐름은 `/silotek-research-log:*` 명령과 `scripts/` 래퍼를 기준으로 한다.

## Files

```text
plugins/silotek-research-log/
├── .claude-plugin/plugin.json
├── commands/
│   ├── setup.md
│   ├── draft.md
│   ├── build-docx.md
│   └── critique.md           # v0.2.0
├── skills/
│   ├── draft/SKILL.md
│   └── build-docx/SKILL.md
├── agents/                   # v0.2.0
│   ├── research-diagrammer.md
│   └── research-critic.md
├── scripts/
│   ├── common.js
│   ├── list-yaml.js
│   ├── save-draft.js
│   ├── build-docx.js
│   └── critique.js           # v0.2.0
├── examples/
│   └── yaml/                 # v0.2.0 회귀 baseline
│       ├── rf-card-baseline.yaml
│       └── plugin-direction-baseline.yaml
├── tests/                    # v0.1.3 도입, v0.2.0 확장 (35 tests, node:test)
│   ├── helpers/
│   ├── fixtures/
│   ├── *.test.js
├── build.js
├── templates/research-log.yaml
└── package.json
```
