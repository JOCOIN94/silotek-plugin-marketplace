# AGENTS.md

This repository is a local Codex plugin marketplace named `silotek-tools`.

## Current Plugin

Source:

```text
plugins/silotek-tools/
```

Visible commands:

```text
/silotek-tools:setup-check
/silotek-tools:research-log-yaml-create
/silotek-tools:research-log-yaml-retouch
/silotek-tools:research-log-docx-create
/silotek-tools:diagram-create
```

## Architecture

Codex-facing layer:

- `commands/*.md`: slash command prompts.
- `skills/research-log-yaml-create/`: research-log YAML creation rules.
- `skills/research-log-yaml-retouch/`: AI rewrite and revised-copy workflow.
- `skills/research-log-docx-create/`: DOCX build workflow.
- `skills/silotek-diagram-design/`: independent Silotek light diagram authoring skill with self-contained HTML/SVG output rules.
- `agents/silotek-diagrammer.md`: per-diagram subagent; the research-log creation skill dispatches one instance per `visual_brief` in parallel.

Node layer:

- `scripts/common.js`: storage paths, YAML schema validation, deterministic artifact diagnostics, and image path rewriting.
- `scripts/resolve-yaml.js`: resolves a saved YAML by number, basename, or path for skill use.
- `scripts/save-draft.js`: validates a draft, auto-rasterizes missing PNGs from sibling HTML, copies figures, and saves YAML/manifests.
- `scripts/build-docx.js`: selects saved YAML and calls `build.js`.
- `scripts/next-diagram-path.js`: allocates the next available diagram HTML/PNG path; `--count N` returns N consecutive free paths for batch (parallel) allocation.
- `scripts/rasterize-svg.js`: extracts one inline SVG from HTML and renders PNG with `@resvg/resvg-js`.
- `scripts/setup-check.js`: read-only diagnostics.
- `build.js`: DOCX renderer.

Node scripts must not rewrite research logs or decide whether the research argument is strong enough. That judgment belongs to the Codex-facing skill instructions.

## Data Flow

Research logs use central storage outside the plugin directory:

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs\
macOS:   $HOME/Documents/Silotek Research Logs/
```

Storage directories:

```text
inputs/
outputs/
manifests/
figures/
```

Standalone diagrams default to:

```text
.silotek-diagrams/
  diagram-N.html
  diagram-N.png
```

Research-log diagrams default to:

```text
.silotek-research-log-figures/
  diagram-N.html
  diagram-N.png
```

`visual_brief` remains a planning element inside the research-log YAML. The diagram skill is separate and reusable; the research-log creation skill consumes it when a figure is needed.

`research-log-yaml-create` writes `visual_brief` placeholders while drafting, confirms with the user before generating, allocates paths with `next-diagram-path.js --count`, dispatches one `silotek-diagrammer` subagent per brief in parallel, and pairs each returned PNG as an immediate `image`. Skipped or failed briefs stay unpaired and render as the gray fallback box.

DOCX consumes PNG only. HTML sidecars are kept for editing and browser preview. If `visual_brief` is immediately followed by an existing `image`, `build.js` renders the image and suppresses the fallback gray brief box. If the image is missing, the fallback box is rendered.

## YAML Schema Notes

`sections` is a flat command list. Supported element keys are defined in `scripts/common.js` and include:

```text
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank, visual_brief
```

Do not introduce grouped section keys such as `heading`, `body`, `paragraph`, `list`, `items`, `content`, or `subsections`.

`visual_brief` requires:

```text
purpose, claim, evidence, forbidden, palette, caption
```

## Local Verification

```powershell
node --check plugins/silotek-tools/scripts/common.js
node --check plugins/silotek-tools/scripts/save-draft.js
node --check plugins/silotek-tools/scripts/build-docx.js
node --check plugins/silotek-tools/scripts/rasterize-svg.js
node --check plugins/silotek-tools/scripts/setup-check.js
node --check plugins/silotek-tools/scripts/resolve-yaml.js
node --check plugins/silotek-tools/scripts/next-diagram-path.js
node --check plugins/silotek-tools/build.js
npm.cmd test --prefix plugins/silotek-tools
Codex plugin validate .
```

## Versioning

Keep these in sync:

- `.Codex-plugin/marketplace.json`
- `plugins/silotek-tools/.Codex-plugin/plugin.json`
- `plugins/silotek-tools/package.json`
- `plugins/silotek-tools/package-lock.json`

Current breaking rename: v0.3.0, from `silotek-research-log` package to `silotek-tools`. v0.4.1 keeps source/nature selection and parallel diagram generation, and cleans the diagram skill into a single Silotek light rule set (non-breaking).

