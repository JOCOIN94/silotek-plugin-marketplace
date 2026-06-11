---
description: 플러그인 상태 및 업데이트 체크
---

# Research Log Setup Check

Run a read-only diagnostic for the installed plugin state.

Check:

- Node dependencies
- Central storage path
- YAML template parsing
- Logo and font assets
- Package, plugin manifest, and marketplace consistency
- Diagram rasterizer availability

Do not create folders, install packages, or change user files from this command.

Windows PowerShell:

```powershell
$scriptName = "setup-check.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\research-log")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate research-log: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
node (Join-Path $pluginRoot "scripts\$scriptName")
```

macOS/Linux shell:

```bash
script_name="setup-check.js"
plugin_root=""
for base in "${CLAUDE_PLUGIN_ROOT}" "$PWD" "$PWD/plugins/research-log"; do
  if [ -n "$base" ] && [ -f "$base/scripts/$script_name" ]; then plugin_root="$base"; break; fi
done
if [ -z "$plugin_root" ]; then
  echo "Cannot locate research-log: scripts/$script_name not found via CLAUDE_PLUGIN_ROOT or current directory." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name"
```

Report every warning plainly. If dependencies are missing, suggest running package install only after the diagnosis is complete.
