---
description: YAML 파일 수정용 (개선필요)
---

# Research Log YAML Retouch

Use this when an existing research-log YAML needs a stronger research-log revision.

If the selector is a file path, it must point inside the central `inputs/` directory — `resolve-yaml.js` rejects paths under the current working directory. Prefer the list number or basename selector to avoid path ambiguity.

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
$pluginRoot = @(
  "${CLAUDE_PLUGIN_ROOT}",
  (Get-Location).Path,
  (Join-Path (Get-Location) "plugins\silotek-tools")
) | Where-Object { $_ -and (Test-Path (Join-Path $_ "scripts\$scriptName")) } | Select-Object -First 1
if (-not $pluginRoot) { throw "Cannot locate silotek-tools: scripts\$scriptName not found via CLAUDE_PLUGIN_ROOT or current directory." }
node (Join-Path $pluginRoot "scripts\$scriptName") <number|basename|path> --json
```

macOS/Linux shell:

```bash
script_name="resolve-yaml.js"
plugin_root=""
for base in "${CLAUDE_PLUGIN_ROOT}" "$PWD" "$PWD/plugins/silotek-tools"; do
  if [ -n "$base" ] && [ -f "$base/scripts/$script_name" ]; then plugin_root="$base"; break; fi
done
if [ -z "$plugin_root" ]; then
  echo "Cannot locate silotek-tools: scripts/$script_name not found via CLAUDE_PLUGIN_ROOT or current directory." >&2
  exit 1
fi
node "$plugin_root/scripts/$script_name" "<number|basename|path>" --json
```

After rewriting the YAML, save the revision with `scripts/save-draft.js` using the same shell pattern.
