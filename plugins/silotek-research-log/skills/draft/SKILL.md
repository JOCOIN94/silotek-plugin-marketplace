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
