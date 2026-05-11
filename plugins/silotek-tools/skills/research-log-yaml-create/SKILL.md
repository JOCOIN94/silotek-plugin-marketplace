---
name: research-log-yaml-create
description: Create a Silotek research-log YAML record from conversation or workspace evidence, optionally consuming the independent diagram design skill.
---

# Research Log YAML Create

Use this skill to create a Korean Silotek research-log YAML file. The output is a research artifact, not a folder exploration summary.

## Required Flow

1. Identify source mode: `conversation`, `folder`, or `mixed`.
2. Choose `meta.연구 성격`: `구축`, `분석`, or `검증`.
3. Build a flat YAML document using `templates/research-log.yaml`.
4. Write `.silotek-research-log-draft.yaml` in the current workspace.
5. Save it with `scripts/save-draft.js`.
6. Do not build DOCX unless the user explicitly asks for it.

## Visuals

`visual_brief` is a planning element. It is not the diagram skill itself.

When a figure is useful:

1. Add a complete `visual_brief` with `purpose`, `claim`, `evidence`, `forbidden`, `palette`, and `caption`.
2. Use `silotek-diagram-design` to allocate a `diagram-N` HTML/PNG pair under `.silotek-research-log-figures/`.
3. Add an immediate paired `image` element that points at the PNG.

`save-draft.js` can recover a missing PNG by rasterizing a sibling HTML sidecar unless `--no-rasterize` is used.

## Windows PowerShell

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

## macOS/Linux shell

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
