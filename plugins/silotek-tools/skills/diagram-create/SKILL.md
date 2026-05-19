---
name: diagram-create
description: 사용자가 다이어그램·아키텍처·프로세스 맵·시퀀스·상태·ER·타임라인·스윔레인·사분면·중첩·트리·레이어·벤·피라미드 그림을 요청할 때, 또는 연구일지 작성이 visual_brief 그림 생성을 디스패치할 때 사용한다.
---

# 사일로텍 다이어그램 디자인 (Silotek Diagram Design)

사용자가 다이어그램, 아키텍처 그림, 프로세스 맵, 시퀀스 다이어그램, 상태 다이어그램, ER 다이어그램, 타임라인, 스윔레인, 사분면(quadrant), 중첩 구조, 트리, 레이어 뷰, 벤 다이어그램, 피라미드를 요청할 때 이 스킬을 쓴다.

이 스킬은 독립적이다. 연구일지 명령이 이 스킬을 호출할 수 있지만, `/silotek-tools:diagram-create`를 통해 단독으로도 동작해야 한다.

## 출력 계약

인라인 SVG를 정확히 하나 담은, 편집 가능한 HTML 사이드카를 만든다. 래스터라이저가 그 SVG를 PNG로 변환한다.

독립 실행(`/silotek-tools:diagram-create`) 기본 출력 — 중앙 보관소 내부:

```text
<중앙>/diagrams/<YYYY-MM-DD>/
  diagram-N.html
  diagram-N.png
```

연구일지 소비자는 대신 중앙 보관소의 절대 경로를 요청한다:

```text
<중앙>/figures/<basename>/
  diagram-N.html
  diagram-N.png
```

두 흐름 모두 출력 경로는 **중앙 보관소 내부의 절대 경로**다. 작업 폴더(현재 디렉터리)에는 어떤 산출물도 만들지 않는다 — `scripts/next-diagram-path.js`가 작업 폴더 기준 상대 경로와 중앙 외부 절대 경로를 거부하고 즉시 실패한다. 독립 흐름은 위치 인자 대신 `--standalone` 플래그를 써서 오늘 날짜 폴더(`<중앙>/diagrams/<YYYY-MM-DD>/`)를 자동 할당받는다. HTML을 쓰기 전에 이 스크립트로 파일명을 할당해, 기존 파일을 절대 덮어쓰지 않는다.

## 브리프 우선 원칙

`visual_brief`와 함께 호출되면, 브리프의 `claim`과 `evidence`가 그림이 반드시 표현해야 할 것을 정의한다. `evidence`의 각 항목은 최소 하나의 라벨 붙은 요소(노드, 엣지, 레인, 레이어, 영역, 행 등)로 매핑한다. 크기 취향을 맞추려고 근거 항목을 빼거나, 합치거나, 요약하지 않는다.

아래 숫자 가이드는 편집형 그림의 편안한 기본값일 뿐이다. 브리프가 더 요구하면 브리프가 이긴다. 표준 명령(`/silotek-tools:diagram-create`, 브리프 없음)에서는 사용자 요청문이 같은 역할을 한다.

한 장에 안 들어갈 때는 다음 순서로 처리한다:

1. 계층, 그룹, 타일, 서브박스로 압축해 한 장에 담는다.
2. 그래도 기본 래스터 폭(1152px)에서 안 읽히면, 보고에 "이 브리프는 N장으로 나눠야 함"을 적고 첫 장을 그린다.
3. 임의로 근거를 버리지 않는다. 읽을 수 없는 덩어리를 출고하지 않는다.

## Windows PowerShell

```powershell
$scriptName = "next-diagram-path.js"
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
node (Join-Path $pluginRoot "scripts\$scriptName") --standalone --json
```

## macOS/Linux shell

```bash
script_name="next-diagram-path.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" --standalone --json
```

## 디자인 규칙

- `references/style-guide.md`의 사일로텍 팔레트를 쓴다.
- 단일 룩은 Silotek light다. 별도 테마, 갤러리형, 손그림 변형을 만들지 않는다.
- 산문은 한국어로 쓰되, `viewBox`, `marker-end`, `swimlane`, `lifeline`, `activation bar`, `callout`, `eyebrow`, `happy path`, `focal node`처럼 자연스러운 기술 용어는 영어로 둔다.
- 색은 범주, 상태, 경로, 초점 같은 구분을 인코딩할 때만 쓴다. 구분이 없으면 navy, teal, gray와 강조 1개만 쓴다.
- 편집형 기본값은 주요 박스 9개 안팎이다. 브리프 근거가 더 많으면 더 그리고, 가독성은 그룹핑, 계층, 타일, 서브박스로 확보한다.
- focal node는 1~2개만 둔다. 이것은 요소 수 제한이 아니라 독자의 시선을 위한 신호 규칙이다.
- 4px 그리드와 단순한 선을 쓴다.
- 그림자, 그라데이션, 장식용 블롭, 이모지, 불필요한 일러스트를 피한다.
- Pretendard로 시작하는 폰트 스택으로 한국어 라벨을 안전하게 쓴다. monospace 전용 폰트를 가정하지 않는다.
- 원격 폰트, 스크립트, 원격 이미지, iframe, `foreignObject`를 로드하지 않는다.

## 타입 선택

`references/`에서 가장 가까운 레퍼런스 파일을 쓴다:

- `type-architecture.md`
- `type-flowchart.md`
- `type-sequence.md`
- `type-state.md`
- `type-er.md`
- `type-timeline.md`
- `type-swimlane.md`
- `type-quadrant.md`
- `type-nested.md`
- `type-tree.md`
- `type-layers.md`
- `type-venn.md`
- `type-pyramid.md`

`primitive-annotation.md`는 주 다이어그램과 경쟁하지 않는 곁말이 필요할 때만 쓴다.

## 안목 게이트 (Taste Gate)

저장하기 전에 점검한다:

- 1152px 기본 래스터 폭에서 라벨, 엣지, 범례가 읽히는가?
- 브리프 또는 사용자 요청문의 근거가 라벨 붙은 요소로 인코딩되어 있는가?
- 독자가 핵심 주장을 5초 안에 이해할 수 있는가?
- focal node 1~2개가 보이는가?
- 캡션과 라벨이 그것을 담는 도형보다 짧은가?
- 색이 실제 구분을 만들고 있는가, 아니면 장식으로만 쓰였는가?

아니라면, 파일을 쓰기 전에 구조를 그룹화하거나 분할한다. 근거를 버려서 단순화하지 않는다.
