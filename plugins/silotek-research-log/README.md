# Silotek Research Log

Claude Code 대화, 프로젝트 폴더, 작업 산출물을 기반으로 사일로텍 연구일지 YAML과 DOCX 보고서를 생성하는 사내 Claude Code Plugin이다.

사용자는 slash command만 실행하고, 플러그인이 대화와 폴더 자료를 조사해 사용자 문서 폴더 아래 중앙 저장소에 YAML과 DOCX를 모은다.

## Commands

```text
/silotek-research-log:setup
/silotek-research-log:draft
/silotek-research-log:build-docx
```

- `/setup`: 플러그인 캐시 폴더 안에 Node 의존성을 설치한다.
- `/draft`: 현재 대화, 현재 폴더, 또는 둘 다를 조사해 연구일지 YAML 초안을 중앙 저장소에 저장한다.
- `/build-docx`: 중앙 저장소에 있는 YAML을 선택해 DOCX 보고서를 생성한다.

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
  작성일: "2026년 5월 9일"
  연구 단계: "구현/검증"
  분류: "AI/ML, RAG"
sections:
  - h1: "1. 연구 배경 및 목적"
  - h2: "1.1 배경"
  - p: "본문..."
```

`sections`는 flat command list여야 한다. 각 항목은 하나의 타입만 가진 객체로 작성한다.

지원 타입:

```text
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank
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

구현/검증/폴더 분석 연구일지는 기존 보고서 품질을 유지하기 위해 다음 흐름을 우선한다.

```text
1. 연구 배경 및 목적
2. 문제 정의
3. 시스템 구조 및 동작 방식
4. 구현 과정과 시행착오
5. 핵심 변경 사항
6. 변경 전후 비교
7. 핵심 교훈
8. 종합 분석
9. 결론 및 향후 과제
10. 참고 사항
```

모든 항목을 기계적으로 넣기보다 실제 작업 내용에 맞게 조정한다. 다만 단순 폴더 요약처럼 흐르지 않도록 `문제 -> 구조 -> 과정 -> 변경 -> 검증 -> 교훈 -> 결론`이 보이게 작성한다.

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
│   └── build-docx.md
├── skills/
│   ├── draft/SKILL.md
│   └── build-docx/SKILL.md
├── scripts/
│   ├── common.js
│   ├── list-yaml.js
│   ├── save-draft.js
│   └── build-docx.js
├── build.js
├── templates/research-log.yaml
└── package.json
```
