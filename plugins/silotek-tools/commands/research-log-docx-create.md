---
description: Convert a saved Silotek research-log YAML entry into a DOCX report.
---

# Research Log DOCX Create

Build DOCX from an existing YAML entry in the central Silotek Research Logs store.

Workflow:

1. List saved YAML entries.
2. Ask the user to choose by number, basename, or path if the target is unclear.
3. Run the DOCX builder.
4. Report the DOCX output path and manifest update.

Windows PowerShell:

```powershell
$scriptName = "build-docx.js"
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
node (Join-Path $pluginRoot "scripts\list-yaml.js")
node (Join-Path $pluginRoot "scripts\$scriptName") <number|basename|path>
```

macOS/Linux shell:

```bash
script_name="build-docx.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/list-yaml.js"
node "$plugin_root/scripts/$script_name" "<number|basename|path>"
```

DOCX consumes PNG images only. HTML diagram sidecars are kept for editing and preview, but are never embedded.
