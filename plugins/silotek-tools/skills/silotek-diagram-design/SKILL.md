---
name: silotek-diagram-design
description: Create standalone Silotek editorial diagrams as self-contained HTML with one inline SVG, plus a PNG sidecar through rasterization.
---

# Silotek Diagram Design

Use this skill when the user asks for a diagram, architecture figure, process map, sequence diagram, state diagram, ER diagram, timeline, swimlane, quadrant, nested structure, tree, layers view, venn diagram, or pyramid.

This skill is independent. Research-log commands may call it, but it must also work on its own through `/silotek-tools:diagram-create`.

## Output Contract

Create an editable HTML sidecar containing exactly one inline SVG. The rasterizer will convert that SVG to PNG.

Default standalone output:

```text
.silotek-diagrams/
  diagram-N.html
  diagram-N.png
```

Research-log consumers may instead request:

```text
.silotek-research-log-figures/
  diagram-N.html
  diagram-N.png
```

Allocate filenames with `scripts/next-diagram-path.js` before writing the HTML so existing files are never overwritten.

## Windows PowerShell

```powershell
$scriptName = "next-diagram-path.js"
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
node (Join-Path $pluginRoot "scripts\$scriptName") ".silotek-diagrams" --json
```

## macOS/Linux shell

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
```

## Design Rules

- Use the Silotek palette from `references/style-guide.md`.
- Prefer navy, teal, gray, paper, and ink. Use at most two accent colors.
- Keep diagrams editorial, restrained, and readable.
- Keep major boxes to 9 or fewer unless the user explicitly asks for a dense technical reference.
- Use a 4px grid and simple lines.
- Avoid shadows, gradients, decorative blobs, emojis, and unnecessary illustration.
- Use Korean labels safely with a font stack beginning with Pretendard.
- Do not load remote fonts, scripts, remote images, iframes, or `foreignObject`.

## Type Selection

Use the closest reference file in `references/`:

- `type-architecture.md`
- `type-flowchart.md`
- `type-sequence.md`
- `type-state.md`
- `type-er.md`
- `type-timeline.md`
- `type-swimlane.md`
- `type-quadrant.md`
- `type-nested.md`
- `type-tree.md`
- `type-layers.md`
- `type-venn.md`
- `type-pyramid.md`

Use `primitive-annotation.md` and `primitive-sketchy.md` only when they improve clarity without making the figure look playful.

## Taste Gate

Before saving, check:

- Can a reader understand the main claim in 5 seconds?
- Is the evidence encoded as labeled nodes, relationships, order, grouping, or contrast?
- Is there a visible focal point?
- Are captions and labels shorter than the shapes that contain them?
- Does the diagram still work when rasterized to roughly 1152px wide?

If not, simplify the structure before writing the file.
