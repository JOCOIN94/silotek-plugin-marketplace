---
name: research-log-docx-create
description: 사용자가 이미 저장된 사일로텍 연구일지 YAML을 DOCX 보고서로 빌드해 달라고 요청할 때 사용한다.
---

# 연구일지 DOCX 생성 (Research Log DOCX Create)

이 스킬은 `/research-log:research-log-docx-create`에 쓴다.

여기서 연구일지를 새로 지어내거나 다시 쓰지 않는다. 이 스킬은 이미 존재하는 YAML 항목을 소비한다.

## 절차

1. 대상이 불분명하면 YAML 항목 목록을 보여준다.
2. 번호, basename, 경로 중 하나로 선택한다.
3. `scripts/build-docx.js`를 실행한다.
4. 생성된 DOCX 경로를 보고한다.

## Windows PowerShell

```powershell
$scriptName = "build-docx.js"
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\research-log"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate research-log plugin root." }
node (Join-Path $pluginRoot "scripts\list-yaml.js")
node (Join-Path $pluginRoot "scripts\$scriptName") <number|basename|path>
```

## macOS/Linux shell

```bash
script_name="build-docx.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/research-log/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/research-log"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate research-log plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/list-yaml.js"
node "$plugin_root/scripts/$script_name" "<number|basename|path>"
```

DOCX는 PNG 이미지를 소비한다. `visual_brief` 뒤에 실제 PNG `image`가 따라오면, 렌더된 DOCX는 그 이미지를 보여주고 회색 폴백 박스를 숨긴다.
