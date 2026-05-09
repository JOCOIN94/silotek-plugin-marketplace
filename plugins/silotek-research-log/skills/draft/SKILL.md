---
description: Create a Silotek research-log YAML draft from the current conversation, a project/work folder, or both. Use when the user asks to write, summarize, archive, or convert research/development work into a standardized Silotek research log. Saves YAML and source metadata to the central Silotek Research Logs folder.
---

# Silotek Research Log Draft

Create a Korean Silotek research-log YAML record and save it through the bundled plugin script.

## Plugin Model

The normal plugin flow is:

1. Inspect the conversation, current folder, or both.
2. Create `.silotek-research-log-draft.yaml` in the current workspace.
3. Run `scripts/save-draft.js` from `CLAUDE_PLUGIN_ROOT`.
4. Report the central YAML path and manifest path.
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

## Report Quality

Do not produce a shallow folder summary. For implementation, debugging, verification, or folder-analysis logs, prefer this report arc:

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

Adapt the headings to the actual work. The important quality bar is that the document shows `problem -> structure -> process -> changes -> validation -> lessons -> conclusion`.

## Required YAML Shape

Treat `sections` as the DOCX renderer's flat command list. Every `sections` item must be either a string paragraph or an object with exactly one supported key.

Supported section elements: `h1`, `h2`, `h3`, `p`, `text`, `bullets`, `numbers`, `ordered`, `code`, `image`, `table`, `note`, `callout`, `spacer`, `blank`.

```yaml
title: "연구 일지"
subtitle: "연구 주제 요약"
meta:
  연구 주제: "상세 설명"
  작성일: "2026년 5월 9일"
  작성자: "작성자명 또는 생략 가능"
  연구 단계: "구현/검증"
  분류: "AI/ML, RAG"
sections:
  - h1: "1. 연구 배경 및 목적"
  - h2: "1.1 배경"
  - p: "본문..."
  - table:
      headers: ["구분", "기존", "변경 후"]
      rows:
        - ["저장 위치", "프로젝트별 분산", "중앙 저장소"]
```

Do not write this shape:

```yaml
sections:
  - heading: "1. 연구 배경"
    body: "본문..."
```

Do not use semantic grouped keys such as `heading`, `body`, `paragraph`, `list`, `items`, `content`, or `subsections`.

If the save script reports a schema error, rewrite the draft into the flat section element form and run the save script again. Do not bypass the validator.

## Save Procedure

1. Create a temporary YAML draft in the current workspace, for example `.silotek-research-log-draft.yaml`.
2. Run the bundled save script:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-draft.js" .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root "$PWD"
```

On Windows PowerShell, use:

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\save-draft.js" .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

If `CLAUDE_PLUGIN_ROOT` is unavailable in the shell, use the absolute plugin root path and run `node <plugin-root>/scripts/save-draft.js`.

3. Report the saved YAML path, manifest path, and copied figure count from the script output.
4. Do not build DOCX in this skill. Tell the user to run `/silotek-research-log:build-docx` when they want to create the Word document.

## Manifest Guidance

When folder or mixed mode is used, pass important source files with repeated `--source-file` flags if practical:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-draft.js" .silotek-research-log-draft.yaml --mode folder --source-root "$PWD" --source-file README.md --source-file package.json
```

Prefer a short, high-signal source list over exhaustive file dumps.
