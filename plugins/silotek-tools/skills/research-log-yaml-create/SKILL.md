---
name: research-log-yaml-create
description: 대화 또는 작업 폴더의 근거로 사일로텍 연구일지 YAML 기록을 만든다. 소스 모드와 연구 성격을 선택하고, 필요하면 silotek-diagrammer 서브에이전트로 다이어그램을 병렬 생성한다.
---

# 연구일지 YAML 생성 (Research Log YAML Create)

이 스킬로 한국어 사일로텍 연구일지 YAML 파일을 만든다. 결과물은 "연구 산출물"이지 "폴더 탐색 요약"이 아니다.

draft YAML과 다이어그램 figures는 **중앙 보관소에 직접** 쓴다. 작업 폴더(사용자 레포)에는 어떤 파일도 만들지 않는다.

## 필수 절차

1. 소스 모드를 정한다 ("소스 모드 선택" 참조).
2. 연구 성격 `meta.연구 성격`을 정한다 ("연구 성격 선택" 참조).
3. 중앙 경로를 확보한다 — `scripts/next-basename.js --title "<연구 주제>" --date <오늘> --json` 실행. 반환된 `yamlPath`(중앙 `inputs/<basename>.yaml`)와 `figuresDir`(중앙 `figures/<basename>/`)를 이후 단계에서 그대로 쓴다. **레포 안 어디에도 쓰지 않는다.**
4. 3단계에서 받은 `yamlPath`에 YAML을 작성한다 — `templates/research-log.yaml`의 평탄한 `sections` 스키마, 8섹션 흐름, 성격별 강조, 본문 문체(`references/writing-style.md`)를 따른다.
5. 초안을 쓰는 동안, 그림이 문서를 더 명확하게 만드는 자리마다 `visual_brief` 요소를 넣는다 ("그림(Visuals)" 참조). 그림을 억지로 넣지 않는다 — `visual_brief`가 0개여도 괜찮다.
6. `visual_brief`가 1개 이상이면 **사용자에게 확인(confirm)** 을 받은 뒤, 다이어그램을 병렬로 생성하고 각각을 `image`로 짝짓는다 ("그림(Visuals)" 참조).
7. `scripts/save-draft.js`로 검증·manifest 기록한다 ("스크립트" 참조). 복사 단계는 없다 — 이미 중앙에 있다.
8. DOCX는 만들지 않는다. 워드 출력은 `/silotek-tools:research-log-docx-create`를 실행하라고 사용자에게 안내한다.

## 소스 모드 선택

- `conversation`: 현재 대화와 그 결정들이 근거다.
- `folder`: 현재 작업 폴더를 살펴본다 — 코드, 문서, 설정, 테스트, 산출물.
- `mixed`: 둘 다 사용한다.

근거가 맥락상 명백하면 한 줄로 확인하고 — *"폴더 기반으로 작성합니다 (다르면 알려주세요)."* — 진행한다. 모호하면 세 가지 옵션을 제시하고 사용자 답을 기다린다 (`AskUserQuestion`을 쓰거나 짧은 번호 메뉴를 출력하거나 — 둘 다 괜찮다).

> git 히스토리·커밋 메시지는 "있었던 일"이지 "현재 상태"가 아니다. 리팩터로 죽은 코드·orphan 파일은 히스토리에 그대로 남는다. 본문에 쓰는 비자명한 사실 주장은 모두 현재 코드·테스트·설정에 직접 대조해 확인한 뒤 적는다 — 커밋 메시지의 표현을 현재 사실로 옮겨 적지 않는다.

## 연구 성격 선택

`meta.연구 성격`은 반드시 `구축` / `분석` / `검증` 중 하나로 적는다. 그 밖의 값은 `save-draft.js`가 거부한다.

| 성격 | 핵심 질문 | 본문 형태 |
|---|---|---|
| 구축 | "X를 어떻게 만들었나?" | 시간순 시도·시행착오 + 단계별 결과 |
| 분석 | "X의 현재 구조와 문제는?" | 대상 정의 + 현재 구조 + 원인 분석 + 권장 방향 |
| 검증 | "가설 X가 참인가?" | 가설 + 실험 설계 + 정량 데이터 + 결론 |

신호 — "구축/만든/구현/프로토타입" → 구축; "분석/현황/구조/체계 정비" → 분석; "검증/실험/비교/측정/가설" → 검증.

성격이 명백하면 한 줄로 확인하고 진행한다. 모호하면 메뉴를 제시하고 기다린다:

```
어떤 성격의 연구일지일까요?
1) 구축 — 구축/구현 과정
2) 분석 — 기존 체계 분석
3) 검증 — 검증 실험
```

### 성격별 강조 (8섹션 흐름 안에서)

- 구축: 시도/시행착오를 시간순으로 자세히, 각 단계 결과, 최종 동작 확인, 다음 빌드 단계.
- 분석: 분석 대상 명시, 현재 구조(스키마/호출 그래프/디렉터리 트리), 발견 문제의 원인, 코드/문서로 가설 확인, 권장 방향(Refactor/Replace/Keep).
- 검증: 연구 질문을 가설 한 줄로, 실험 설계 변경 이력, 정량 데이터, 결과 해석, 가설 결론(성립/부분 성립/기각).

## 8섹션 흐름

본문은 다음 흐름을 따른다 (헤딩은 실제 작업에 맞게 조정하되 흐름은 드러나야 한다):

1. 연구 질문 — 한 줄
2. 문제 정의 / 배경
3. 시도와 시행착오 — 실패 사례 + 원인 분석 동반
4. 관찰 / 측정 — 수치·로그·스크린샷이 있으면 `image`로
5. 원인 분석 — 관찰에서 가설로
6. 검증 — 실험·비교·측정으로 가설 확인
7. 교훈 / 판단 기록
8. 향후 과제 / 남은 불확실성

## 본문 문체 (Writing Style)

본문 산문(YAML `sections`의 텍스트)은 공식 보고서 행정체로 쓴다. 산문을 쓰기 전에 플러그인 루트의 `references/writing-style.md`를 읽어 적용한다 — 플러그인 루트 해석은 "스크립트" 절의 `$pluginRoot` 로직을 그대로 쓰고, 경로는 `Join-Path $pluginRoot "references\writing-style.md"` (POSIX: `"$plugin_root/references/writing-style.md"`)다. 회고체 종결어미("~했다"), em dash(—), "그래서" 연결, 1인칭·결정 주체 노출, 구어적 동사를 쓴 초안은 작성 단계에서 거부하고 재작성한다.

## 스스로 걸러야 할 안티패턴

- 성격 미선택 상태로 본문 작성 시작.
- 파일 경로/디렉터리만 나열하는 본문.
- 검증 없는 단정 ("그래서 X가 맞다").
- 커밋 메시지·과거 히스토리를 현재 상태로 옮겨 적은 단정 (현재 코드로 확인 안 함).
- 시행착오 없이 "이렇게 했더니 잘 됐다"형 단편 서술.
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동으로 경고함.
- 회고체 종결어미·em dash·"그래서" 연결·1인칭 결정 주체 노출 — `references/writing-style.md` 위반.
- 레포(작업 폴더) 안에 draft YAML이나 figures 파일을 만드는 행위. 항상 3단계에서 받은 중앙 경로에 쓴다.

## 그림 (Visuals)

`visual_brief`는 계획 요소다 — 그림 자체가 아니라 그림의 규격이다.

### 1. 초안을 쓰면서 brief를 작성

그림이 이해도를 높이는 자리마다 완전한 `visual_brief`를 넣고, `silotek-diagram-design`의 다이어그램 타입 중 하나를 추천 타입으로 정한다: `flowchart`, `er`, `state`, `timeline`, `quadrant`, `architecture`, `sequence`, `swimlane`, `nested`, `tree`, `layers`, `venn`, `pyramid`. 추천 타입을 brief와 함께 들고 있는다 (3단계에서 서브에이전트에 전달한다).

```yaml
- visual_brief:
    purpose: "..."
    claim: "..."
    evidence: ["...", "..."]
    forbidden: ["..."]
    palette: "navy / teal / gray, 밝은 배경"
    caption: "[그림 N] ..."
```

### 2. 생성 전 확인

초안을 다 쓴 뒤, brief 목록을 보여주고 생성 여부를 물어본다 (confirm):

```
다음 N개 그림을 만들까요?
  1) [flowchart] [그림 N] caption — 핵심: ...
  2) [er] [그림 N] caption — 핵심: ...
  ...
[예 / 일부만(번호) / 아니오]
```

- 아니오 → `visual_brief` 요소를 짝지어진 그림 없이 그대로 두고 바로 저장으로 간다. `build.js`가 짝 없는 brief마다 회색 규격 박스를 렌더한다.
- 일부만 → 선택된 brief만 생성하고 나머지는 짝 없이 둔다.

### 3. 경로 할당 후 병렬 dispatch

선택된 brief마다 HTML/PNG 한 쌍을 한 번의 호출로 할당한다. `figuresDir`은 3단계에서 받은 중앙 경로다 (`$pluginRoot`는 "스크립트" 참조):

```
node <plugin-root>/scripts/next-diagram-path.js "<figuresDir>" --count <N> --json
```

이 명령은 `{ index, htmlPath, pngPath }`의 JSON 배열을 출력한다 — 경로는 모두 중앙 `figures/<basename>/` 안 절대 경로다. 그다음 `silotek-diagrammer` 서브에이전트를 **brief당 1개씩 — 모두 한 메시지에 담아 병렬로 실행** 한다. 각 서브에이전트에 정확히 하나의 brief와 함께 다음을 전달한다:

- 해당 `visual_brief` 블록,
- 추천 다이어그램 타입,
- 할당된 `htmlPath`와 `pngPath` (둘 다 중앙 절대 경로),
- 플러그인 루트 절대 경로 (서브에이전트가 `skills/silotek-diagram-design/`을 읽을 수 있도록).

각 서브에이전트는 자기 HTML을 쓰고, `scripts/rasterize-svg.js`로 래스터화한 뒤, `{ htmlPath, pngPath, altText, usedEvidence, forbiddenViolations, rasterizeOk }`를 보고한다.

### 4. 결과를 `image`로 짝짓기

성공적으로 생성된 다이어그램마다, 그 `visual_brief` 바로 다음에 `image` 요소를 넣는다. 경로는 `inputs/<basename>.yaml` 기준 상대 경로로 적는다 (`build-docx.js`가 이 기준으로 해석함):

```yaml
- image:
    path: "../figures/<basename>/diagram-N.png"
    caption: "<해당 brief의 caption>"
```

실패했거나 건너뛴 brief는 `image` 없이 그대로 둔다 — `build.js`가 회색 규격 박스를 렌더한다. `--no-rasterize`를 쓰지 않는 한 `save-draft.js`는 형제 HTML 사이드카를 자동으로 래스터화해 누락된 PNG를 복구할 수 있다.

## 스크립트

플러그인 루트를 찾고, 중앙 경로를 확보하고, 필요하면 다이어그램 경로를 할당한 뒤, 저장(검증+manifest)한다.

### Windows PowerShell

```powershell
$scriptName = "save-draft.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
# 1) 중앙 경로 확보:
node (Join-Path $pluginRoot "scripts\next-basename.js") --title "<연구 주제>" --date <YYYY-MM-DD> --json
# 2) 다이어그램이 있을 때만 (figuresDir = 위 결과의 figuresDir):
node (Join-Path $pluginRoot "scripts\next-diagram-path.js") "<figuresDir>" --count <N> --json
# 3) 항상 (yamlPath = 위 결과의 yamlPath, 그 자리에 YAML이 이미 쓰여 있어야 함):
node (Join-Path $pluginRoot "scripts\$scriptName") "<yamlPath>" --mode <conversation|folder|mixed>
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
# 1) 중앙 경로 확보:
node "$plugin_root/scripts/next-basename.js" --title "<연구 주제>" --date <YYYY-MM-DD> --json
# 2) 다이어그램이 있을 때만:
node "$plugin_root/scripts/next-diagram-path.js" "<figuresDir>" --count "<N>" --json
# 3) 항상:
node "$plugin_root/scripts/$script_name" "<yamlPath>" --mode "<conversation|folder|mixed>"
```

소스 모드, 연구 성격, basename, 중앙 YAML 경로, manifest 경로, 생성된 다이어그램 목록(타입 + 해당 섹션 + 핵심 메시지), 실패하거나 건너뛴 brief, 그리고 검증 진단 결과를 보고한다.
