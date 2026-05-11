# Silotek Claude Plugins

Internal Claude Code plugin marketplace for Silotek workflows.

## Plugin

This repository currently exposes one plugin package:

- `silotek-tools`: research-log YAML creation, YAML retouching, DOCX export, setup diagnostics, and standalone diagram creation.

Plugin source:

```text
plugins/silotek-tools/
```

Marketplace registry:

```text
.claude-plugin/marketplace.json
```

## Visible Commands

```text
/silotek-tools:setup-check
/silotek-tools:research-log-yaml-create
/silotek-tools:research-log-yaml-retouch
/silotek-tools:research-log-docx-create
/silotek-tools:diagram-create
```

## Install

From Claude Code:

```text
/plugin marketplace add <this-repo-or-marketplace-url>
/plugin install silotek-tools@silotek-tools --scope user
```

For this v0.3.0 breaking rename, remove the old package first if it is already installed:

```text
/plugin uninstall silotek-research-log@silotek-tools
/plugin marketplace update silotek-tools
/plugin install silotek-tools@silotek-tools --scope user
```

## Local Development

Windows PowerShell:

```powershell
npm.cmd install --prefix .\plugins\silotek-tools
claude plugin validate .
claude --plugin-dir .\plugins\silotek-tools
```

Useful local checks:

```powershell
node .\plugins\silotek-tools\scripts\setup-check.js
node .\plugins\silotek-tools\scripts\list-yaml.js
node .\plugins\silotek-tools\scripts\save-draft.js .silotek-research-log-draft.yaml --mode folder --source-root .
node .\plugins\silotek-tools\scripts\build-docx.js 1
npm.cmd test --prefix .\plugins\silotek-tools
```

## Storage

Research-log data is stored outside the plugin directory:

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```

The plugin keeps YAML, DOCX, manifests, and copied figures in that central store. Standalone diagrams default to `.silotek-diagrams/` in the current workspace.
