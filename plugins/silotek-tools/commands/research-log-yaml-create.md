---
description: Create and save a Silotek research-log YAML draft from the current conversation, folder, or both.
---

# Research Log YAML Create

Create a Korean Silotek research-log YAML record, then save it through `scripts/save-draft.js`.

Workflow:

1. Decide whether the source is `conversation`, `folder`, or `mixed`.
2. Classify the log as one of `구축`, `분석`, or `검증`.
3. Write `.silotek-research-log-draft.yaml` in the current workspace.
4. Use the flat `sections` schema from `templates/research-log.yaml`.
5. When a visual is needed, write a `visual_brief`, use `silotek-diagram-design` to create HTML/PNG under `.silotek-research-log-figures/`, then add the matching `image` element immediately after the brief.
6. Save with the bundled script. Do not create DOCX in this command.

Windows PowerShell:

```powershell
$scriptName = "save-draft.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
node (Join-Path $pluginRoot "scripts\$scriptName") .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

macOS/Linux shell:

```bash
script_name="save-draft.js"
plugin_root=""
for base in "${CLAUDE_PLUGIN_ROOT}" "$PWD" "$PWD/plugins/silotek-tools"; do
  if [ -n "$base" ] && [ -f "$base/scripts/$script_name" ]; then plugin_root="$base"; break; fi
done
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools: scripts/$script_name not found via CLAUDE_PLUGIN_ROOT or current directory." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" .silotek-research-log-draft.yaml --mode "<conversation|folder|mixed>" --source-root "$PWD"
```

Report the saved YAML path, manifest path, copied figure count, and rasterized figure count.
