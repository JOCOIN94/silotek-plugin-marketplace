---
description: 다이어그램 시각자료 생성
---

# Diagram Create

Create an independent diagram using the `diagram-create` skill. This command does not require a research log.

Default output (inside the central Silotek Research Logs store):

```text
<central>/diagrams/<YYYY-MM-DD>/
  diagram-N.html
  diagram-N.png
```

This command writes nothing under the current working directory. `next-diagram-path.js` rejects relative or non-central paths and exits non-zero — use the `--standalone` flag to let it allocate today's central diagrams folder.

Workflow:

1. Clarify the diagram type only if the user's request is ambiguous.
2. Use `skills/diagram-create/SKILL.md` and the matching `references/type-*.md`.
3. Allocate the next available output with `scripts/next-diagram-path.js --standalone`.
4. Save one self-contained HTML file with exactly one inline SVG.
5. Rasterize it to PNG with `scripts/rasterize-svg.js`.
6. Report both paths.

Windows PowerShell:

```powershell
$scriptName = "next-diagram-path.js"
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\research-log")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate research-log: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
$alloc = node (Join-Path $pluginRoot "scripts\$scriptName") --standalone --json | ConvertFrom-Json
# Write the diagram HTML to $alloc.htmlPath, then rasterize:
node (Join-Path $pluginRoot "scripts\rasterize-svg.js") $alloc.htmlPath $alloc.pngPath
```

macOS/Linux shell:

```bash
script_name="next-diagram-path.js"
plugin_root=""
for base in "${CLAUDE_PLUGIN_ROOT}" "$PWD" "$PWD/plugins/research-log"; do
  if [ -n "$base" ] && [ -f "$base/scripts/$script_name" ]; then plugin_root="$base"; break; fi
done
if [ -z "$plugin_root" ]; then
  echo "Cannot locate research-log: scripts/$script_name not found via CLAUDE_PLUGIN_ROOT or current directory." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" --standalone --json
# Write the diagram HTML to the returned htmlPath, then rasterize:
node "$plugin_root/scripts/rasterize-svg.js" "<htmlPath>" "<pngPath>"
```

Keep the HTML sidecar because it is the editable source of the diagram.
