---
name: research-log-docx-create
description: Convert a saved Silotek research-log YAML entry into a formatted DOCX report.
---

# Research Log DOCX Create

Use this skill for `/silotek-tools:research-log-docx-create`.

Do not invent or rewrite a research log here. This skill consumes an existing YAML entry.

## Flow

1. List YAML entries if the target is unclear.
2. Select by number, basename, or path.
3. Run `scripts/build-docx.js`.
4. Report the generated DOCX path.

## Windows PowerShell

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

## macOS/Linux shell

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

DOCX consumes PNG images. If a `visual_brief` is followed by an existing PNG `image`, the rendered DOCX shows the image and suppresses the gray fallback box.
