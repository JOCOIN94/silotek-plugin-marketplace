---
name: research-log-yaml-retouch
description: Revise an existing Silotek research-log YAML with AI judgment while preserving the original file.
---

# Research Log YAML Retouch

Use this skill for `/silotek-tools:research-log-yaml-retouch`.

## Flow

1. Resolve the YAML by number, basename, or path with `scripts/resolve-yaml.js`.
2. Read the resolved YAML directly.
3. Rewrite the YAML into a stronger research-log revision.
4. Save the revised version through `scripts/save-draft.js`.
5. Leave the original unchanged.

## Boundary

- Do not call a Node rewrite engine.
- Do not append an artificial revision-notes section.
- Do not treat Node diagnostics as research-quality judgment.
- Preserve the original YAML.
- Save the rewritten revision through `save-draft.js`.

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
