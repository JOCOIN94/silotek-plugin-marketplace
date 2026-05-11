---
description: Resolve an existing research-log YAML, rewrite it with the AI skill, and save a revised copy without overwriting the original.
---

# Research Log YAML Retouch

Use this when an existing research-log YAML needs a stronger research-log revision.

Workflow:

1. Resolve the existing YAML with `scripts/resolve-yaml.js`.
2. Read the resolved YAML directly.
3. The AI rewrites the YAML into a stronger research-log revision.
4. Save the new revision through `scripts/save-draft.js`.
5. Leave the original YAML unchanged.

The Node scripts only resolve files, validate schema, copy assets, and save the revision. Do not call a Node rewrite engine.

Windows PowerShell:

```powershell
$scriptName = "resolve-yaml.js"
$pluginRoot = $env:CLAUDE_PLUGIN_ROOT
if (-not $pluginRoot) {
  $localRoot = Join-Path (Get-Location) "plugins\silotek-tools"
  if (Test-Path (Join-Path $localRoot "scripts\$scriptName")) { $pluginRoot = $localRoot }
}
if (-not $pluginRoot) { throw "Cannot locate silotek-tools plugin root." }
node (Join-Path $pluginRoot "scripts\$scriptName") <number|basename|path> --json
```

macOS/Linux shell:

```bash
script_name="resolve-yaml.js"
plugin_root="${CLAUDE_PLUGIN_ROOT:-}"
if [ -z "$plugin_root" ] && [ -f "plugins/silotek-tools/scripts/$script_name" ]; then
  plugin_root="$PWD/plugins/silotek-tools"
fi
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools plugin root." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" "<number|basename|path>" --json
```

After rewriting the YAML, save the revision with `scripts/save-draft.js` using the same shell pattern.
