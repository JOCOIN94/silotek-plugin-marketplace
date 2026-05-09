---
description: Build a formatted Silotek research-log DOCX from an existing YAML draft in the central Silotek Research Logs folder. Use when the user asks to make, generate, convert, export, or rebuild a Word/DOCX research log.
---

# Silotek Research Log DOCX Builder

Build DOCX output from an existing research-log YAML.

## Behavior

- Use this skill only after a YAML draft exists.
- Do not invent a new research log in this skill. If the user needs a new draft, use `/silotek-research-log:draft` first.
- By default, list available YAML files and ask the user to choose one.
- If the user provides a filename, basename, or number, build that YAML directly.

## Commands

List available YAML records:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/list-yaml.js"
```

Build by number or basename:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-docx.js" 1
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-docx.js" 2026-05-09-rag-validation
```

On Windows PowerShell, use:

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\list-yaml.js"
node "$env:CLAUDE_PLUGIN_ROOT\scripts\build-docx.js" 1
```

If `CLAUDE_PLUGIN_ROOT` is unavailable in the shell, use the absolute plugin root path and run `node <plugin-root>/scripts/build-docx.js`.

## Response

After building, report:

- source YAML path
- generated DOCX path
- manifest update path
- any warnings printed by the script
