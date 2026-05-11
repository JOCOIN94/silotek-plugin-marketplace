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
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
node (Join-Path $pluginRoot "scripts\$scriptName") .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

macOS/Linux shell:

```bash
script_name="save-draft.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" .silotek-research-log-draft.yaml --mode "<conversation|folder|mixed>" --source-root "$PWD"
```

Report the saved YAML path, manifest path, copied figure count, and rasterized figure count.
