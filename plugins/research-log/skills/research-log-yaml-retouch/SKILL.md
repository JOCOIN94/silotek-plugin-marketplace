---
name: research-log-yaml-retouch
description: 사용자가 이미 저장된 사일로텍 연구일지 YAML을 더 강한 개정판으로 다시 다듬어 달라고 요청할 때 사용한다.
---

# 연구일지 YAML 리터치 (Research Log YAML Retouch)

이 스킬은 `/research-log:research-log-yaml-retouch`에 쓴다.

## 절차

1. `scripts/resolve-yaml.js`로 번호, basename, 경로 중 하나를 통해 원본 YAML을 찾는다.
2. 찾은 YAML을 직접 읽는다.
3. `scripts/next-basename.js`로 새 중앙 경로(`yamlPath`)를 확보한다 — 같은 제목·날짜로 호출하면 충돌 회피 접미사(`-2`/`-3`)가 붙어 원본과 다른 basename을 받는다. 원하면 `--slug <text>`로 슬러그를 명시할 수도 있다.
4. 더 강한 연구일지 개정판을 새 `yamlPath`(중앙 `inputs/`)에 작성한다. 원본 파일에는 쓰지 않는다. `references/writing-style.md`를 적용하고, 원본의 회고체·em dash·리터럴 `\"`·"그래서" 연결·1인칭 결정 주체 노출·자기 객체화(`사용자 보고` 류)·작성 도구 자기 노출(`codex CLI로 진행 예정` 류)은 개정에서 우선 제거한다.
5. 본문 작성 직후 자가 검사 (저장 전):
   1) **기계 검출** — 확정적 위반 문자만 grep.
      PowerShell: `Select-String -Path <yamlPath> -Pattern '—|\\"'`
      POSIX:      `grep -nE '—|\\"' <yamlPath>`
      매치가 있으면 콜론·괄호·평문 `"..."` 로 재작성.
   2) **정책 판독** — `references/writing-style.md` 항목별로 본문 통독: 자기 객체화·작성 메타·회고체·구어·인과 압축. 위반은 재작성.
6. 개정판을 `scripts/save-draft.js`로 저장한다(검증·manifest).

## 경계

- Node 재작성 엔진을 호출하지 않는다.
- 인위적인 "개정 노트" 섹션을 덧붙이지 않는다.
- Node 진단을 연구 품질 판단으로 취급하지 않는다.
- 원본 YAML을 보존한다 — 항상 새 basename에 쓴다.
- 작업 폴더(레포)에 파일을 만들지 않는다. 모든 쓰기는 중앙 보관소로 직행한다.
- 문체 위반(em dash · 리터럴 `\"` · 회고체 · 자기 객체화 · 작성 도구 노출)은 개정의 우선 항목이다. Node 진단보다 먼저 잡는다.

## Windows PowerShell

```powershell
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\research-log"
  if (Test-Path (Join-Path $localRoot "scripts\resolve-yaml.js")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate research-log plugin root." }
# 1) 원본 찾기:
node (Join-Path $pluginRoot "scripts\resolve-yaml.js") <number|basename|path> --json
# 2) 새 중앙 경로 확보 (개정판용):
node (Join-Path $pluginRoot "scripts\next-basename.js") --title "<원본 제목>" --date <YYYY-MM-DD> --json
# 3) 검증 + manifest (yamlPath = 위 결과, 그 자리에 개정판 YAML이 쓰여 있어야 함):
node (Join-Path $pluginRoot "scripts\save-draft.js") "<yamlPath>" --mode conversation
```

## macOS/Linux shell

```bash
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/research-log/scripts/resolve-yaml.js" ]; then
  plugin_root="$PWD/plugins/research-log"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate research-log plugin root." >&2
  exit 1
fi
# 1) 원본 찾기:
node "$plugin_root/scripts/resolve-yaml.js" "<number|basename|path>" --json
# 2) 새 중앙 경로 확보:
node "$plugin_root/scripts/next-basename.js" --title "<원본 제목>" --date <YYYY-MM-DD> --json
# 3) 검증 + manifest:
node "$plugin_root/scripts/save-draft.js" "<yamlPath>" --mode conversation
```
