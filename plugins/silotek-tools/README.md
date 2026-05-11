# Silotek Tools

`silotek-tools` is a Claude Code plugin package for Silotek research logs and editorial diagrams.

## Commands

```text
/silotek-tools:setup-check
/silotek-tools:research-log-yaml-create
/silotek-tools:research-log-yaml-retouch
/silotek-tools:research-log-docx-create
/silotek-tools:diagram-create
```

## What Each Command Does

- `setup-check`: read-only diagnostics for dependencies, storage path, template parsing, assets, manifests, and rasterizer availability.
- `research-log-yaml-create`: writes a research-log YAML draft and saves it to the central store.
- `research-log-yaml-retouch`: resolves an existing YAML, lets the AI rewrite it, and saves a revised copy without overwriting the original.
- `research-log-docx-create`: builds DOCX from a saved YAML.
- `diagram-create`: creates a standalone HTML diagram plus PNG under `.silotek-diagrams/`.

## Diagram Skill

The independent diagram capability lives at:

```text
skills/silotek-diagram-design/
```

It was imported from the local fork of `JOCOIN94/diagram-design` and adapted as an internal skill. It keeps the type reference model and HTML plus inline SVG output convention, but removes website onboarding and standalone marketplace packaging.

For research logs, the `silotek-diagrammer` subagent (`agents/silotek-diagrammer.md`) wraps this skill so the main session can generate several diagrams in parallel — one dispatch per `visual_brief`.

The skill outputs editable HTML sidecars and rasterized PNG files. DOCX generation embeds PNG only; HTML is never embedded into Word.

## Research Log Flow

1. `/silotek-tools:research-log-yaml-create` decides the source mode (`conversation`/`folder`/`mixed`) and research nature (`구축`/`분석`/`검증`), confirming with the user when ambiguous.
2. It writes `.silotek-research-log-draft.yaml` with `visual_brief` placeholders wherever a figure helps.
3. It lists the briefs, confirms with the user, allocates paths via `scripts/next-diagram-path.js --count`, and dispatches one `silotek-diagrammer` subagent per brief in parallel — each runs `silotek-diagram-design`, writes `.silotek-research-log-figures/diagram-N.html`, and rasterizes `diagram-N.png`.
4. It pairs each returned PNG as an immediate `image` element. Skipped or failed briefs stay unpaired.
5. `scripts/save-draft.js` saves the YAML, copies figures into `figures/<basename>/`, and auto-rasterizes a sibling HTML when a referenced PNG is missing unless `--no-rasterize` is used.
6. `/silotek-tools:research-log-docx-create` builds DOCX from the saved YAML.

If a paired image exists, DOCX renders the image and suppresses the gray `visual_brief` fallback box. If the image is missing, the fallback box remains visible.

## Central Storage

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```

Storage layout:

```text
Silotek Research Logs/
  inputs/      YAML originals and revised copies
  outputs/     DOCX outputs
  manifests/   JSON history
  figures/     copied image assets per research log
```

## Local Commands

Windows PowerShell:

```powershell
npm.cmd install --prefix .\plugins\silotek-tools
node .\plugins\silotek-tools\scripts\setup-check.js
node .\plugins\silotek-tools\scripts\list-yaml.js
node .\plugins\silotek-tools\scripts\save-draft.js .silotek-research-log-draft.yaml --mode folder --source-root .
node .\plugins\silotek-tools\scripts\resolve-yaml.js 1 --json
node .\plugins\silotek-tools\scripts\build-docx.js 1
node .\plugins\silotek-tools\scripts\next-diagram-path.js .silotek-diagrams --json
npm.cmd test --prefix .\plugins\silotek-tools
```

macOS/Linux shell:

```bash
npm install --prefix ./plugins/silotek-tools
node ./plugins/silotek-tools/scripts/setup-check.js
node ./plugins/silotek-tools/scripts/list-yaml.js
node ./plugins/silotek-tools/scripts/save-draft.js .silotek-research-log-draft.yaml --mode folder --source-root "$PWD"
node ./plugins/silotek-tools/scripts/resolve-yaml.js 1 --json
node ./plugins/silotek-tools/scripts/build-docx.js 1
node ./plugins/silotek-tools/scripts/next-diagram-path.js .silotek-diagrams --json
npm test --prefix ./plugins/silotek-tools
```

## Migration

v0.3.0 is a breaking rename. Old command aliases are intentionally not kept.

```text
/plugin uninstall silotek-research-log@silotek-tools
/plugin marketplace update silotek-tools
/plugin install silotek-tools@silotek-tools --scope user
```
