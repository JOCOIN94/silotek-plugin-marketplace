---
name: research-log-yaml-retouch
description: 기존 사일로텍 연구일지 YAML을 AI 판단으로 다시 다듬되, 원본 파일은 그대로 보존한다.
---

# 연구일지 YAML 리터치 (Research Log YAML Retouch)

이 스킬은 `/silotek-tools:research-log-yaml-retouch`에 쓴다.

## 절차

1. `scripts/resolve-yaml.js`로 번호, basename, 경로 중 하나를 통해 YAML을 찾는다.
2. 찾은 YAML을 직접 읽는다.
3. 더 강한 연구일지 개정판으로 YAML을 다시 쓴다.
4. 개정판을 `scripts/save-draft.js`로 저장한다.
5. 원본은 건드리지 않는다.

## 경계

- Node 재작성 엔진을 호출하지 않는다.
- 인위적인 "개정 노트" 섹션을 덧붙이지 않는다.
- Node 진단을 연구 품질 판단으로 취급하지 않는다.
- 원본 YAML을 보존한다.
- 다시 쓴 개정판을 `save-draft.js`로 저장한다.

## Windows PowerShell

```powershell
$scriptName = "resolve-yaml.js"
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
node (Join-Path $pluginRoot "scripts\$scriptName") <number|basename|path> --json
```

## macOS/Linux shell

```bash
script_name="resolve-yaml.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" "<number|basename|path>" --json
```
