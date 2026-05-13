---
name: research-log-yaml-retouch
description: 기존 사일로텍 연구일지 YAML을 AI 판단으로 다시 다듬되, 원본 파일은 그대로 보존한다.
---

# 연구일지 YAML 리터치 (Research Log YAML Retouch)

이 스킬은 `/silotek-tools:research-log-yaml-retouch`에 쓴다.

## 절차

1. `scripts/resolve-yaml.js`로 번호, basename, 경로 중 하나를 통해 원본 YAML을 찾는다.
2. 찾은 YAML을 직접 읽는다.
3. `scripts/next-basename.js`로 새 중앙 경로(`yamlPath`)를 확보한다 — 같은 제목·날짜로 호출하면 충돌 회피 접미사(`-2`/`-3`)가 붙어 원본과 다른 basename을 받는다. 원하면 `--slug <text>`로 슬러그를 명시할 수도 있다.
4. 더 강한 연구일지 개정판을 새 `yamlPath`(중앙 `inputs/`)에 작성한다. 원본 파일에는 쓰지 않는다.
5. 개정판을 `scripts/save-draft.js`로 저장한다(검증·manifest).

## 경계

- Node 재작성 엔진을 호출하지 않는다.
- 인위적인 "개정 노트" 섹션을 덧붙이지 않는다.
- Node 진단을 연구 품질 판단으로 취급하지 않는다.
- 원본 YAML을 보존한다 — 항상 새 basename에 쓴다.
- 작업 폴더(레포)에 파일을 만들지 않는다. 모든 쓰기는 중앙 보관소로 직행한다.

## Windows PowerShell

```powershell
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\resolve-yaml.js")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
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
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/resolve-yaml.js" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
# 1) 원본 찾기:
node "$plugin_root/scripts/resolve-yaml.js" "<number|basename|path>" --json
# 2) 새 중앙 경로 확보:
node "$plugin_root/scripts/next-basename.js" --title "<원본 제목>" --date <YYYY-MM-DD> --json
# 3) 검증 + manifest:
node "$plugin_root/scripts/save-draft.js" "<yamlPath>" --mode conversation
```
