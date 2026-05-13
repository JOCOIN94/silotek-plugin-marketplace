---
description: Create and save a Silotek research-log YAML draft (with source-mode/nature selection and optional parallel diagram generation).
---

# Research Log YAML Create

Create a Korean Silotek research-log YAML record directly in the central store, then validate via `scripts/save-draft.js`. Use the `research-log-yaml-create` skill for the full rules. The YAML and diagram figures are written straight to the central store — no working-dir intermediates.

Workflow:

1. Decide the source mode. If obvious from context, confirm in one line; if ambiguous, present `conversation` / `folder` / `mixed` and wait for the user.
2. Decide the research nature `meta.연구 성격`: `구축`, `분석`, or `검증`. If obvious, confirm; if ambiguous, present the menu and wait.
3. Reserve the central paths by calling `scripts/next-basename.js --title "<연구 주제>" --date <YYYY-MM-DD> --json`. Use the returned `yamlPath` (central `inputs/<basename>.yaml`) and `figuresDir` (central `figures/<basename>/`) for every subsequent write — never write under the current working directory.
4. Write the YAML at the returned `yamlPath` using the flat `sections` schema from `templates/research-log.yaml`, following the 8-section arc and the nature's emphasis.
5. While drafting, insert a `visual_brief` wherever a figure makes the document clearer (with a recommended diagram type). Do not force figures.
6. If there is ≥1 `visual_brief`: list them and **confirm** ("다음 N개 그림을 만들까요? [예 / 일부만 / 아니오]"). On yes/partial, allocate paths with `next-diagram-path.js <figuresDir> --count <N>`, dispatch one `silotek-diagrammer` subagent per brief **in parallel (one message)**, then pair each returned PNG as an `image` element right after its `visual_brief` with `path: "../figures/<basename>/diagram-N.png"`. Leave skipped/failed briefs unpaired (DOCX shows a gray spec box).
7. Validate and record by running `node save-draft.js <yamlPath> --mode <mode>`. Do not create DOCX in this command.

## Windows PowerShell

```powershell
$scriptName = "save-draft.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
# Reserve central paths (basename, yamlPath, figuresDir):
node (Join-Path $pluginRoot "scripts\next-basename.js") --title "<연구 주제>" --date <YYYY-MM-DD> --json
# When generating diagrams (figuresDir = central figures/<basename>/):
node (Join-Path $pluginRoot "scripts\next-diagram-path.js") "<figuresDir>" --count <N> --json
# Validate + write manifest (yamlPath must already hold the drafted YAML):
node (Join-Path $pluginRoot "scripts\$scriptName") "<yamlPath>" --mode <conversation|folder|mixed>
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
# Reserve central paths:
node "$plugin_root/scripts/next-basename.js" --title "<연구 주제>" --date <YYYY-MM-DD> --json
# When generating diagrams:
node "$plugin_root/scripts/next-diagram-path.js" "<figuresDir>" --count "<N>" --json
# Validate + write manifest:
node "$plugin_root/scripts/$script_name" "<yamlPath>" --mode "<conversation|folder|mixed>"
```

Report the source mode, research nature, basename, central YAML path, manifest path, the list of generated diagrams, and any failed or skipped brief.
