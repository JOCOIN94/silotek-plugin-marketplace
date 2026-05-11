---
description: Create a standalone Silotek editorial diagram as HTML plus PNG.
---

# Diagram Create

Create an independent diagram using the `silotek-diagram-design` skill. This command does not require a research log.

Default output:

```text
.silotek-diagrams/
  diagram-N.html
  diagram-N.png
```

Workflow:

1. Clarify the diagram type only if the user's request is ambiguous.
2. Use `skills/silotek-diagram-design/SKILL.md` and the matching `references/type-*.md`.
3. Allocate the next available output with `scripts/next-diagram-path.js`.
4. Save one self-contained HTML file with exactly one inline SVG.
5. Rasterize it to PNG with `scripts/rasterize-svg.js`.
6. Report both paths.

Windows PowerShell:

```powershell
$scriptName = "next-diagram-path.js"
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
$alloc = node (Join-Path $pluginRoot "scripts\$scriptName") ".silotek-diagrams" --json | ConvertFrom-Json
# Write the diagram HTML to $alloc.htmlPath, then rasterize:
node (Join-Path $pluginRoot "scripts\rasterize-svg.js") $alloc.htmlPath $alloc.pngPath
```

macOS/Linux shell:

```bash
script_name="next-diagram-path.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" ".silotek-diagrams" --json
# Write the diagram HTML to the returned htmlPath, then rasterize:
node "$plugin_root/scripts/rasterize-svg.js" "<htmlPath>" "<pngPath>"
```

Keep the HTML sidecar because it is the editable source of the diagram.
