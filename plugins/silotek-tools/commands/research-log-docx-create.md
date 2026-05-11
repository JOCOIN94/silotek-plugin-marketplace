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
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
node (Join-Path $pluginRoot "scripts\list-yaml.js")
node (Join-Path $pluginRoot "scripts\$scriptName") <number|basename|path>
```

macOS/Linux shell:

```bash
script_name="build-docx.js"
plugin_root=""
for base in "${CLAUDE_PLUGIN_ROOT}" "$PWD" "$PWD/plugins/silotek-tools"; do
  if [ -n "$base" ] && [ -f "$base/scripts/$script_name" ]; then plugin_root="$base"; break; fi
done
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools: scripts/$script_name not found via CLAUDE_PLUGIN_ROOT or current directory." >&2
  exit 1
fi
node "$plugin_root/scripts/list-yaml.js"
node "$plugin_root/scripts/$script_name" "<number|basename|path>"
```

DOCX consumes PNG images only. HTML diagram sidecars are kept for editing and preview, but are never embedded.
