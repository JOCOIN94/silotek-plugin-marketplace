---
name: research-log-yaml-create
description: Create a Silotek research-log YAML record from conversation or workspace evidence, with source-mode and research-nature selection, and optional parallel diagram generation through the silotek-diagrammer subagent.
---

# Research Log YAML Create

Use this skill to create a Korean Silotek research-log YAML file. The output is a research artifact, not a folder exploration summary.

## Required Flow

1. Decide the source mode (see "Source Mode Selection").
2. Decide the research nature `meta.연구 성격` (see "Research Nature Selection").
3. Write `.silotek-research-log-draft.yaml` in the current workspace using the flat `sections` schema from `templates/research-log.yaml`, following the 8-section arc and the nature's emphasis.
4. While drafting, insert a `visual_brief` element wherever a figure makes the document clearer (see "Visuals"). Do not force figures — zero `visual_brief` elements is fine.
5. If there is at least one `visual_brief`, **confirm with the user**, then generate the diagrams in parallel and pair each as an `image` (see "Visuals").
6. Save with `scripts/save-draft.js` (see "Scripts").
7. Do not build DOCX. Tell the user to run `/silotek-tools:research-log-docx-create` for Word output.

## Source Mode Selection

- `conversation`: the current conversation and its decisions are the source.
- `folder`: inspect the current working folder — code, docs, config, tests, artifacts.
- `mixed`: use both.

If the source is obvious from context, confirm in one line — *"폴더 기반으로 작성합니다 (다르면 알려주세요)."* — and proceed. If it is ambiguous, present the three options and wait for the user's answer (use `AskUserQuestion` or print a short numbered menu — either is fine).

## Research Nature Selection

You MUST record `meta.연구 성격` as one of `구축` / `분석` / `검증`. Any other value triggers a `META_INVALID_VALUE` warning from `save-draft.js`.

| 성격 | 핵심 질문 | 본문 형태 |
|---|---|---|
| 구축 | "X를 어떻게 만들었나?" | 시간순 시도·시행착오 + 단계별 결과 |
| 분석 | "X의 현재 구조와 문제는?" | 대상 정의 + 현재 구조 + 원인 분석 + 권장 방향 |
| 검증 | "가설 X가 참인가?" | 가설 + 실험 설계 + 정량 데이터 + 결론 |

Signals — "구축/만든/구현/프로토타입" → 구축; "분석/현황/구조/체계 정비" → 분석; "검증/실험/비교/측정/가설" → 검증.

If the nature is obvious, confirm in one line and proceed. If ambiguous, present the menu and wait:

```
어떤 성격의 연구일지일까요?
1) 구축 — 구축/구현 과정
2) 분석 — 기존 체계 분석
3) 검증 — 검증 실험
```

### Nature-specific emphasis (within the 8-section arc)

- 구축: 시도/시행착오를 시간순으로 자세히, 각 단계 결과, 최종 동작 확인, 다음 빌드 단계.
- 분석: 분석 대상 명시, 현재 구조(스키마/호출 그래프/디렉터리 트리), 발견 문제의 원인, 코드/문서로 가설 확인, 권장 방향(Refactor/Replace/Keep).
- 검증: 연구 질문을 가설 한 줄로, 실험 설계 변경 이력, 정량 데이터, 결과 해석, 가설 결론(성립/부분 성립/기각).

## 8-Section Arc

본문은 다음 흐름을 따른다 (헤딩은 실제 작업에 맞게 조정하되 흐름은 드러나야 한다):

1. 연구 질문 — 한 줄
2. 문제 정의 / 배경
3. 시도와 시행착오 — 실패 사례 + 원인 분석 동반
4. 관찰 / 측정 — 수치·로그·스크린샷이 있으면 `image`로
5. 원인 분석 — 관찰에서 가설로
6. 검증 — 실험·비교·측정으로 가설 확인
7. 교훈 / 판단 기록
8. 향후 과제 / 남은 불확실성

## Anti-patterns to Reject Yourself

- 성격 미선택 상태로 본문 작성 시작.
- 파일 경로/디렉터리만 나열하는 본문.
- 검증 없는 단정 ("그래서 X가 맞다").
- 시행착오 없이 "이렇게 했더니 잘 됐다"형 단편 서술.
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동 경고함.

## Visuals

`visual_brief` is a planning element — the figure's spec, not the diagram itself.

### 1. Author briefs while drafting

Wherever a figure raises understanding, insert a complete `visual_brief` and decide a recommended diagram type from `silotek-diagram-design`: `flowchart`, `er`, `state`, `timeline`, `quadrant`, `architecture`, `sequence`, `swimlane`, `nested`, `tree`, `layers`, `venn`, `pyramid`. Keep the recommended type with the brief (you will pass it to the subagent in step 3).

```yaml
- visual_brief:
    purpose: "..."
    claim: "..."
    evidence: ["...", "..."]
    forbidden: ["..."]
    palette: "navy / teal / gray, 밝은 배경"
    caption: "[그림 N] ..."
```

### 2. Confirm before generating

After the draft is written, list the briefs and ask the user whether to generate them:

```
다음 N개 그림을 만들까요?
  1) [flowchart] [그림 N] caption — 핵심: ...
  2) [er] [그림 N] caption — 핵심: ...
  ...
[예 / 일부만(번호) / 아니오]
```

- 아니오 → leave the `visual_brief` elements without paired images and go straight to Save. `build.js` renders a gray spec box for each unpaired brief.
- 일부만 → generate only the selected briefs; leave the rest unpaired.

### 3. Allocate paths and dispatch in parallel

Allocate one HTML/PNG pair per selected brief in a single call (see "Scripts" for `$pluginRoot`):

```
node <plugin-root>/scripts/next-diagram-path.js .silotek-research-log-figures --count <N> --json
```

This prints a JSON array of `{ index, htmlPath, pngPath }`. Then dispatch the `silotek-diagrammer` subagent **once per brief — all in one message so they run in parallel**. Pass each subagent exactly one brief plus:

- the `visual_brief` block,
- the recommended diagram type,
- its allocated `htmlPath` and `pngPath`,
- the plugin root absolute path (so it can read `skills/silotek-diagram-design/`).

Each subagent writes its HTML, rasterizes it via `scripts/rasterize-svg.js`, and reports `{ htmlPath, pngPath, altText, usedEvidence, forbiddenViolations, rasterizeOk }`.

### 4. Pair each result as an `image`

For each successfully generated diagram, insert an `image` element immediately after its `visual_brief`:

```yaml
- image:
    path: ".silotek-research-log-figures/diagram-N.png"
    caption: "<the brief's caption>"
```

`save-draft.js` rewrites this to `../figures/<basename>/diagram-N.png` and copies the file. Leave any failed or skipped brief without an `image` — `build.js` renders its gray spec box. `save-draft.js` can also recover a missing PNG by rasterizing a sibling HTML sidecar unless `--no-rasterize` is used.

## Scripts

Resolve the plugin root, optionally allocate diagram paths, then save.

### Windows PowerShell

```powershell
$scriptName = "save-draft.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
# Only when generating diagrams:
node (Join-Path $pluginRoot "scripts\next-diagram-path.js") ".silotek-research-log-figures" --count <N> --json
# Always:
node (Join-Path $pluginRoot "scripts\$scriptName") .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

### macOS/Linux shell

```bash
script_name="save-draft.js"
plugin_root=""
for base in "${CLAUDE_PLUGIN_ROOT}" "$PWD" "$PWD/plugins/silotek-tools"; do
  if [ -n "$base" ] && [ -f "$base/scripts/$script_name" ]; then plugin_root="$base"; break; fi
done
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools: scripts/$script_name not found via CLAUDE_PLUGIN_ROOT or current directory." >&2
  exit 1
fi
# Only when generating diagrams:
node "$plugin_root/scripts/next-diagram-path.js" ".silotek-research-log-figures" --count "<N>" --json
# Always:
node "$plugin_root/scripts/$script_name" .silotek-research-log-draft.yaml --mode "<conversation|folder|mixed>" --source-root "$PWD"
```

Report the source mode, research nature, saved YAML path, manifest path, copied/rasterized figure counts, the list of generated diagrams (type + corresponding section + key message), any failed or skipped brief, and the validator diagnostics.
