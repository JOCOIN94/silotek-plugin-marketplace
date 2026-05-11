---
description: Diagnose the Silotek tools plugin without mutating storage.
---

# Silotek Tools Setup Check

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
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
node (Join-Path $pluginRoot "scripts\$scriptName")
```

macOS/Linux shell:

```bash
script_name="setup-check.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name"
```

Report every warning plainly. If dependencies are missing, suggest running package install only after the diagnosis is complete.
