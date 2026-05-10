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
