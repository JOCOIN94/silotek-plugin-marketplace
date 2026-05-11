---
description: Create and save a Silotek research-log YAML draft (with source-mode/nature selection and optional parallel diagram generation).
---

# Research Log YAML Create

Create a Korean Silotek research-log YAML record, then save it through `scripts/save-draft.js`. Use the `research-log-yaml-create` skill for the full rules.

Workflow:

1. Decide the source mode. If obvious from context, confirm in one line; if ambiguous, present `conversation` / `folder` / `mixed` and wait for the user.
2. Decide the research nature `meta.연구 성격`: `구축`, `분석`, or `검증`. If obvious, confirm; if ambiguous, present the menu and wait.
3. Write `.silotek-research-log-draft.yaml` using the flat `sections` schema from `templates/research-log.yaml`, following the 8-section arc and the nature's emphasis.
4. While drafting, insert a `visual_brief` wherever a figure makes the document clearer (with a recommended diagram type). Do not force figures.
5. If there is ≥1 `visual_brief`: list them and **confirm** ("다음 N개 그림을 만들까요? [예 / 일부만 / 아니오]"). On yes/partial, allocate paths with `next-diagram-path.js --count <N>`, dispatch one `silotek-diagrammer` subagent per brief **in parallel (one message)**, then pair each returned PNG as an `image` element right after its `visual_brief`. Leave skipped/failed briefs unpaired (DOCX shows a gray spec box).
6. Save with the bundled script. Do not create DOCX in this command.

## Windows PowerShell

```powershell
$scriptName = "save-draft.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
# Only when generating diagrams:
node (Join-Path $pluginRoot "scripts\next-diagram-path.js") ".silotek-research-log-figures" --count <N> --json
# Always:
node (Join-Path $pluginRoot "scripts\$scriptName") .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

## macOS/Linux shell

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
# Only when generating diagrams:
node "$plugin_root/scripts/next-diagram-path.js" ".silotek-research-log-figures" --count "<N>" --json
# Always:
node "$plugin_root/scripts/$script_name" .silotek-research-log-draft.yaml --mode "<conversation|folder|mixed>" --source-root "$PWD"
```

Report the source mode, research nature, saved YAML path, manifest path, copied figure count, rasterized figure count, the list of generated diagrams, and any failed or skipped brief.
